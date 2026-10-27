import { NextResponse } from 'next/server';
import { isEnvConfigured } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    // 1. Authenticate Hardware Device
    const expectedSecret = process.env.DEVICE_SHARED_SECRET;
    if (!isEnvConfigured(expectedSecret)) {
      return NextResponse.json(
        { error: 'Server authentication secret is unconfigured.' },
        { status: 500 }
      );
    }

    const providedSecret = req.headers.get('x-device-secret');
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing x-device-secret header.' },
        { status: 401 }
      );
    }

    // 2. Parse deviceId from query
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId') || process.env.DEFAULT_DEVICE_ID || 'ESP32-AGRI-01';

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase server client is not configured.' },
        { status: 503 }
      );
    }

    // 3. Auto-expire old executing commands older than 60 seconds (TIMED_OUT)
    const timeoutWindow = new Date(Date.now() - 60 * 1000).toISOString();
    await supabase
      .from('device_commands')
      .update({
        status: 'TIMED_OUT',
        error_details: 'Execution timed out awaiting hardware acknowledgement (60s watchdog).',
      })
      .eq('device_id', deviceId)
      .eq('status', 'EXECUTING')
      .lt('claimed_at', timeoutWindow);

    // 4. Query oldest pending command(s)
    const { data: queuedCommands, error: fetchError } = await supabase
      .from('device_commands')
      .select('id, command, payload')
      .eq('device_id', deviceId)
      .eq('status', 'QUEUED')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching pending commands:', fetchError);
      return NextResponse.json(
        { error: `Database error: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!queuedCommands || queuedCommands.length === 0) {
      return NextResponse.json({ commands: [] });
    }

    // 5. Claim the commands atomically so multiple polls do not repeatedly execute the same command
    const commandIds = queuedCommands.map((c) => c.id);
    const nowIso = new Date().toISOString();

    const { error: claimError } = await supabase
      .from('device_commands')
      .update({
        status: 'EXECUTING',
        claimed_at: nowIso,
      })
      .in('id', commandIds);

    if (claimError) {
      console.error('Error claiming commands:', claimError);
      return NextResponse.json(
        { error: `Failed to claim commands: ${claimError.message}` },
        { status: 500 }
      );
    }

    // 6. Return commands in the exact expected format
    const formatted = queuedCommands.map((c) => ({
      id: c.id,
      command: c.command,
      payload: (c.payload as Record<string, unknown>) || {},
    }));

    return NextResponse.json({ commands: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Command dispatch error: ${message}` }, { status: 500 });
  }
}
