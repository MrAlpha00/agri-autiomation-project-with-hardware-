import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isEnvConfigured } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const AckPayloadSchema = z.object({
  deviceId: z.string().min(1),
  commandId: z.string().uuid(),
  status: z.enum(['SUCCEEDED', 'FAILED']),
  message: z.string().default(''),
});

export async function POST(req: Request) {
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

    // 2. Validate payload
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
    }

    const parseResult = AckPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const { deviceId, commandId, status, message } = parseResult.data;
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase server client is not configured.' },
        { status: 503 }
      );
    }

    // 3. Verify that the command exists and belongs to the requesting device
    const { data: commandRecord, error: findError } = await supabase
      .from('device_commands')
      .select('id, device_id, command, status')
      .eq('id', commandId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: `Query error: ${findError.message}` }, { status: 500 });
    }

    if (!commandRecord) {
      return NextResponse.json(
        { error: `Command ${commandId} not found or does not belong to device ${deviceId}.` },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();

    // 4. Update command status and preserve failure details
    const { error: updateError } = await supabase
      .from('device_commands')
      .update({
        status,
        executed_at: nowIso,
        message,
        error_details: status === 'FAILED' ? (message || 'Command reported failure by hardware') : null,
      })
      .eq('id', commandId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update command acknowledgement: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 5. If the command succeeded, update the corresponding device_state relay or mode
    if (status === 'SUCCEEDED') {
      const { data: currentState } = await supabase
        .from('device_state')
        .select('relays, mode')
        .eq('device_id', deviceId)
        .maybeSingle();

      const existingRelays = (currentState?.relays as Record<string, boolean>) || {
        pump: false,
        light: false,
        buzzer: false,
        spare: false,
      };

      let relaysUpdated = false;
      let newMode = currentState?.mode || 'MANUAL';

      switch (commandRecord.command) {
        case 'PUMP_ON':
          existingRelays.pump = true;
          relaysUpdated = true;
          break;
        case 'PUMP_OFF':
          existingRelays.pump = false;
          relaysUpdated = true;
          break;
        case 'LIGHT_ON':
          existingRelays.light = true;
          relaysUpdated = true;
          break;
        case 'LIGHT_OFF':
          existingRelays.light = false;
          relaysUpdated = true;
          break;
        case 'BUZZER_ON':
          existingRelays.buzzer = true;
          relaysUpdated = true;
          break;
        case 'BUZZER_OFF':
          existingRelays.buzzer = false;
          relaysUpdated = true;
          break;
        case 'ALL_OFF':
          existingRelays.pump = false;
          existingRelays.light = false;
          existingRelays.buzzer = false;
          existingRelays.spare = false;
          relaysUpdated = true;
          break;
        case 'SET_MODE_AUTO':
          newMode = 'AUTO';
          break;
        case 'SET_MODE_MANUAL':
          newMode = 'MANUAL';
          break;
      }

      await supabase
        .from('device_state')
        .update({
          relays: relaysUpdated ? existingRelays : undefined,
          mode: newMode,
          updated_at: nowIso,
        })
        .eq('device_id', deviceId);
    }

    return NextResponse.json({
      success: true,
      deviceId,
      commandId,
      status,
      executedAt: nowIso,
      message,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Acknowledgement error: ${errorMsg}` }, { status: 500 });
  }
}
