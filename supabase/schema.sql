-- ==============================================================================
-- AgriSense IoT - Consolidated Supabase Database Schema
-- To apply: Copy and paste this script directly into Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.device_state (
    device_id TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'MANUAL' CHECK (mode IN ('MANUAL', 'AUTO')),
    relays JSONB NOT NULL DEFAULT '{"pump": false, "light": false, "buzzer": false, "spare": false}'::jsonb,
    firmware_version TEXT DEFAULT '1.0.0',
    uptime_seconds BIGINT DEFAULT 0,
    wifi_rssi INTEGER DEFAULT NULL,
    last_seen TIMESTAMPTZ DEFAULT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    ip_address TEXT DEFAULT NULL,
    free_heap INTEGER DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sensor_readings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES public.device_state(device_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    soil_raw INTEGER NOT NULL,
    water_raw INTEGER NOT NULL,
    light_raw INTEGER NOT NULL,
    temperature_c NUMERIC(5,2) DEFAULT NULL,
    humidity_pct NUMERIC(5,2) DEFAULT NULL,
    pir_motion BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_rssi INTEGER DEFAULT NULL,
    mode TEXT NOT NULL DEFAULT 'MANUAL' CHECK (mode IN ('MANUAL', 'AUTO')),
    relay_states JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_time
    ON public.sensor_readings (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp
    ON public.sensor_readings (timestamp DESC);

CREATE TABLE IF NOT EXISTS public.device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.device_state(device_id) ON DELETE CASCADE,
    command TEXT NOT NULL CHECK (
        command IN (
            'PUMP_ON', 'PUMP_OFF',
            'LIGHT_ON', 'LIGHT_OFF',
            'BUZZER_ON', 'BUZZER_OFF',
            'ALL_OFF',
            'SET_MODE_AUTO', 'SET_MODE_MANUAL'
        )
    ),
    payload JSONB DEFAULT '{}'::jsonb,
    requested_by TEXT DEFAULT 'dashboard',
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
        status IN ('QUEUED', 'EXECUTING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ DEFAULT NULL,
    executed_at TIMESTAMPTZ DEFAULT NULL,
    message TEXT DEFAULT NULL,
    error_details TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_device_commands_device_status
    ON public.device_commands (device_id, status, created_at ASC);

CREATE TABLE IF NOT EXISTS public.alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL REFERENCES public.device_state(device_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (
        type IN (
            'LOW_WATER',
            'PUMP_OVERTIME',
            'MOTION_DETECTED',
            'DEVICE_OFFLINE',
            'SENSOR_ANOMALY',
            'SYSTEM'
        )
    ),
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_events_device_time
    ON public.alert_events (device_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS public.device_settings (
    device_id TEXT PRIMARY KEY REFERENCES public.device_state(device_id) ON DELETE CASCADE,
    soil_air_dry_raw INTEGER NOT NULL DEFAULT 3500,
    soil_water_saturated_raw INTEGER NOT NULL DEFAULT 1400,
    soil_auto_irrigate_threshold_raw INTEGER NOT NULL DEFAULT 3100,
    soil_auto_stop_threshold_raw INTEGER NOT NULL DEFAULT 2200,
    water_empty_raw INTEGER NOT NULL DEFAULT 150,
    water_full_raw INTEGER NOT NULL DEFAULT 2800,
    water_low_cutoff_raw INTEGER NOT NULL DEFAULT 600,
    pump_max_runtime_seconds INTEGER NOT NULL DEFAULT 120,
    pump_cooldown_seconds INTEGER NOT NULL DEFAULT 300,
    telemetry_interval_seconds INTEGER NOT NULL DEFAULT 15,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.device_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read device_state" ON public.device_state;
CREATE POLICY "Allow anon read device_state" ON public.device_state FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read sensor_readings" ON public.sensor_readings;
CREATE POLICY "Allow anon read sensor_readings" ON public.sensor_readings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read device_commands" ON public.device_commands;
CREATE POLICY "Allow anon read device_commands" ON public.device_commands FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read alert_events" ON public.alert_events;
CREATE POLICY "Allow anon read alert_events" ON public.alert_events FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon read device_settings" ON public.device_settings;
CREATE POLICY "Allow anon read device_settings" ON public.device_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon insert device_commands" ON public.device_commands;
CREATE POLICY "Allow anon insert device_commands" ON public.device_commands FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Seed Initial Device Record
INSERT INTO public.device_state (
    device_id,
    mode,
    relays,
    firmware_version,
    uptime_seconds,
    last_seen,
    is_online,
    updated_at
) VALUES (
    'ESP32-AGRI-01',
    'MANUAL',
    '{"pump": false, "light": false, "buzzer": false, "spare": false}'::jsonb,
    'v1.0.0',
    0,
    NULL,
    FALSE,
    NOW()
)
ON CONFLICT (device_id) DO NOTHING;

INSERT INTO public.device_settings (
    device_id,
    soil_air_dry_raw,
    soil_water_saturated_raw,
    soil_auto_irrigate_threshold_raw,
    soil_auto_stop_threshold_raw,
    water_empty_raw,
    water_full_raw,
    water_low_cutoff_raw,
    pump_max_runtime_seconds,
    pump_cooldown_seconds,
    telemetry_interval_seconds
) VALUES (
    'ESP32-AGRI-01',
    3500,
    1400,
    3100,
    2200,
    150,
    2800,
    600,
    120,
    300,
    15
)
ON CONFLICT (device_id) DO NOTHING;
