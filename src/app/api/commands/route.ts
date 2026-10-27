import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED_COMMANDS = [
  'PUMP_ON',
  'PUMP_OFF',
  'LIGHT_ON',
  'LIGHT_OFF',
  'BUZZER_ON',
  'BUZZER_OFF',
  'ALL_OFF',
  'SET_MODE_AUTO',
  'SET_MODE_MANUAL',
] as const;

const CreateCommandSchema = z.object({
  deviceId: z.string().default('ESP32-AGRI-01'),
  command: z.enum(ALLOWED_COMMANDS),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * POST /api/commands
 * Enqueues a validated operator command from the dashboard.
 */
export async function POST(req: Request) {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parseResult = CreateCommandSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid command request', details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const { deviceId, command, payload } = parseResult.data;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database service is currently unconfigured.' },
        { status: 503 }
      );
    }

    // 1. Fetch current device state to check safety interlocks
    const { data: deviceState } = await supabase
      .from('device_state')
      .select('mode, is_online')
      .eq('device_id', deviceId)
      .maybeSingle();

    // 2. Validate AUTO vs MANUAL mode constraint (Emergency ALL_OFF and mode changes are always permitted)
    if (
      deviceState?.mode === 'AUTO' &&
      command !== 'ALL_OFF' &&
      command !== 'SET_MODE_MANUAL' &&
      command !== 'SET_MODE_AUTO'
    ) {
      return NextResponse.json(
        {
          error: 'Manual actuator override is restricted while operating in AUTOMATIC mode. Switch to MANUAL mode first.',
        },
        { status: 400 }
      );
    }

    // 3. Low-water pump interlock check:
    if (command === 'PUMP_ON') {
      const { data: latestReading } = await supabase
        .from('sensor_readings')
        .select('water_raw')
        .eq('device_id', deviceId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestReading && latestReading.water_raw < 600) {
        return NextResponse.json(
          {
            error: `Low-water safety interlock active: Water reservoir reading (ADC ${latestReading.water_raw} < 600) is below safety cutoff. Pump actuation is locked.`,
          },
          { status: 400 }
        );
      }
    }

    // 4. Prevent duplicate pending command submissions
    const { data: existingActive } = await supabase
      .from('device_commands')
      .select('id, command, status, created_at')
      .eq('device_id', deviceId)
      .eq('command', command)
      .in('status', ['QUEUED', 'EXECUTING'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingActive) {
      return NextResponse.json(
        {
          success: true,
          commandId: existingActive.id,
          status: existingActive.status,
          message: `Command ${command} is already ${existingActive.status.toLowerCase()} on the device queue.`,
          isDuplicate: true,
        },
        { status: 200 }
      );
    }

    // 5. Insert new command into queue
    const nowIso = new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from('device_commands')
      .insert({
        device_id: deviceId,
        command,
        payload,
        requested_by: 'dashboard_operator',
        status: 'QUEUED',
        created_at: nowIso,
      })
      .select('id, command, status, created_at')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: `Failed to queue command: ${insertError?.message || 'Insert error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        commandId: inserted.id,
        command: inserted.command,
        status: 'QUEUED',
        message: `Command ${command} successfully queued for hardware polling dispatch.`,
        createdAt: inserted.created_at,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Command dispatch failure: ${errorMsg}` }, { status: 500 });
  }
}

/**
 * GET /api/commands?deviceId=ESP32-AGRI-01&commandId=...
 * Query recent commands and check specific command execution status.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const commandId = searchParams.get('commandId');
    const deviceId = searchParams.get('deviceId') || process.env.DEFAULT_DEVICE_ID || 'ESP32-AGRI-01';
    const limit = Math.min(Number(searchParams.get('limit') || '20'), 50);

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service is unconfigured.' }, { status: 503 });
    }

    if (commandId) {
      const { data: cmd, error } = await supabase
        .from('device_commands')
        .select('*')
        .eq('id', commandId)
        .maybeSingle();

      if (error || !cmd) {
        return NextResponse.json({ error: 'Command not found.' }, { status: 404 });
      }

      return NextResponse.json({ command: cmd });
    }

    const { data: commands, error } = await supabase
      .from('device_commands')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: `Query error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ commands: commands || [] });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Query error: ${errorMsg}` }, { status: 500 });
  }
}
