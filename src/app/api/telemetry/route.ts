import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isEnvConfigured } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const TelemetryPayloadSchema = z.object({
  deviceId: z.string().min(1),
  firmwareVersion: z.string().default('v1.0.0'),
  uptimeMs: z.number().nonnegative(),
  soilRaw: z.number().int().min(0).max(4095),
  waterRaw: z.number().int().min(0).max(4095),
  lightRaw: z.number().int().min(0).max(4095),
  temperatureC: z.number().nullable().optional(),
  humidityPct: z.number().nullable().optional(),
  pirMotion: z.boolean().default(false),
  mode: z.enum(['MANUAL', 'AUTO']).default('MANUAL'),
  relayStates: z.object({
    pump: z.boolean(),
    light: z.boolean(),
    buzzer: z.boolean(),
    spare: z.boolean().optional().default(false),
  }),
  wifiRssi: z.number().int().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate Hardware Device via x-device-secret header
    const expectedSecret = process.env.DEVICE_SHARED_SECRET;
    if (!isEnvConfigured(expectedSecret)) {
      return NextResponse.json(
        { error: 'Server authentication secret (DEVICE_SHARED_SECRET) is unconfigured.' },
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

    // 2. Validate JSON body
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const parseResult = TelemetryPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Payload validation failed', details: parseResult.error.flatten() },
        { status: 422 }
      );
    }

    const data = parseResult.data;
    const nowIso = new Date().toISOString();
    const uptimeSeconds = Math.floor(data.uptimeMs / 1000);

    // 3. Connect to Supabase via Service Role client
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase server client is not configured.' },
        { status: 503 }
      );
    }

    // 4. Insert new sensor reading
    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        device_id: data.deviceId,
        timestamp: nowIso,
        soil_raw: data.soilRaw,
        water_raw: data.waterRaw,
        light_raw: data.lightRaw,
        temperature_c: data.temperatureC ?? null,
        humidity_pct: data.humidityPct ?? null,
        pir_motion: data.pirMotion,
        wifi_rssi: data.wifiRssi ?? null,
        mode: data.mode,
        relay_states: data.relayStates,
      });

    if (insertError) {
      console.error('Error inserting sensor reading:', insertError);
      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    // 5. Upsert device_state (marking device online with active heartbeat)
    const { error: upsertError } = await supabase
      .from('device_state')
      .upsert(
        {
          device_id: data.deviceId,
          mode: data.mode,
          relays: data.relayStates,
          firmware_version: data.firmwareVersion,
          uptime_seconds: uptimeSeconds,
          wifi_rssi: data.wifiRssi ?? null,
          last_seen: nowIso,
          is_online: true,
          updated_at: nowIso,
        },
        { onConflict: 'device_id' }
      );

    if (upsertError) {
      console.error('Error upserting device state:', upsertError);
    }

    // 6. Safety Watchdogs & Alert Events:
    // Check low-water cutoff (ADC < 600 default)
    if (data.waterRaw < 600) {
      // Record low-water alert event if not recently logged in last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentAlerts } = await supabase
        .from('alert_events')
        .select('id')
        .eq('device_id', data.deviceId)
        .eq('type', 'LOW_WATER')
        .gte('timestamp', tenMinutesAgo)
        .limit(1);

      if (!recentAlerts || recentAlerts.length === 0) {
        await supabase.from('alert_events').insert({
          device_id: data.deviceId,
          type: 'LOW_WATER',
          severity: 'CRITICAL',
          message: `Water tank level critical (Raw ADC: ${data.waterRaw} < 600). Pump safety interlock active.`,
          metadata: { waterRaw: data.waterRaw, threshold: 600 },
          timestamp: nowIso,
        });
      }
    }

    // Check PIR motion alert
    if (data.pirMotion) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentMotion } = await supabase
        .from('alert_events')
        .select('id')
        .eq('device_id', data.deviceId)
        .eq('type', 'MOTION_DETECTED')
        .gte('timestamp', fiveMinutesAgo)
        .limit(1);

      if (!recentMotion || recentMotion.length === 0) {
        await supabase.from('alert_events').insert({
          device_id: data.deviceId,
          type: 'MOTION_DETECTED',
          severity: 'INFO',
          message: 'PIR motion detected on GPIO26.',
          timestamp: nowIso,
        });
      }
    }

    return NextResponse.json({
      success: true,
      deviceId: data.deviceId,
      timestamp: nowIso,
      received: {
        soilRaw: data.soilRaw,
        waterRaw: data.waterRaw,
        temperatureC: data.temperatureC,
        humidityPct: data.humidityPct,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Telemetry ingestion failed: ${message}` }, { status: 500 });
  }
}
