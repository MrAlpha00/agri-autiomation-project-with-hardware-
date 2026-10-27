import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId') || process.env.DEFAULT_DEVICE_ID || 'ESP32-AGRI-01';

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        isLive: false,
        message: 'Backend database connection is unconfigured.',
        deviceState: null,
        latestTelemetry: null,
      });
    }

    // 1. Fetch current device state
    const { data: stateData, error: stateError } = await supabase
      .from('device_state')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (stateError) {
      return NextResponse.json({
        isLive: false,
        message: `Database query: ${stateError.message}`,
        deviceState: null,
        latestTelemetry: null,
      });
    }

    if (!stateData) {
      return NextResponse.json({
        isLive: false,
        message: 'No device record found.',
        deviceState: null,
        latestTelemetry: null,
      });
    }

    // Determine online status based on 60s timeout
    const lastSeenDate = stateData.last_seen ? new Date(stateData.last_seen) : null;
    const diffSeconds = lastSeenDate ? Math.round((Date.now() - lastSeenDate.getTime()) / 1000) : null;
    const isActuallyOnline = diffSeconds !== null && diffSeconds >= 0 && diffSeconds < 60;

    // 2. Fetch latest sensor reading
    const { data: latestReading } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      isLive: Boolean(latestReading),
      deviceState: {
        deviceId: stateData.device_id,
        mode: stateData.mode,
        relays: stateData.relays,
        firmwareVersion: stateData.firmware_version,
        uptimeSeconds: stateData.uptime_seconds,
        wifiRssi: stateData.wifi_rssi,
        lastSeen: stateData.last_seen,
        isOnline: isActuallyOnline,
        diffSeconds,
      },
      latestTelemetry: latestReading
        ? {
            soilRaw: latestReading.soil_raw,
            waterRaw: latestReading.water_raw,
            lightRaw: latestReading.light_raw,
            temperatureC: latestReading.temperature_c,
            humidityPct: latestReading.humidity_pct,
            pirMotion: latestReading.pir_motion,
            timestamp: latestReading.timestamp,
            mode: latestReading.mode,
            relayStates: latestReading.relay_states,
            wifiRssi: latestReading.wifi_rssi,
          }
        : null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
