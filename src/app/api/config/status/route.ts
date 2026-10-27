import { NextResponse } from 'next/server';
import { ENV_DEFINITIONS, isEnvConfigured } from '@/lib/env';
import { getSupabaseServerClient } from '@/lib/supabase/server';


export async function GET() {
  const variableStatuses = ENV_DEFINITIONS.map((def) => {
    const val = process.env[def.key];
    const configured = isEnvConfigured(val);
    return {
      key: def.key,
      description: def.description,
      isConfigured: configured,
      isPublic: def.isPublic,
      isSecret: def.isSecret,
      requiredFor: def.requiredFor,
      source: def.source,
      vercelScope: def.vercelScope,
    };
  });

  // Supabase Connection Health Check
  const supabase = getSupabaseServerClient();
  let supabaseHealth: {
    status: 'CONNECTED' | 'UNCONFIGURED' | 'ERROR';
    message: string;
    latencyMs?: number;
    tablesDetected?: string[];
  };

  let hardwareStatus: {
    isOnline: boolean;
    lastSeen: string | null;
    deviceId: string;
    note: string;
  } = {
    isOnline: false,
    lastSeen: null,
    deviceId: process.env.DEFAULT_DEVICE_ID || 'ESP32-AGRI-01',
    note: 'No hardware telemetry received yet. Awaiting live ESP32 ingestion.',
  };

  if (!supabase) {
    supabaseHealth = {
      status: 'UNCONFIGURED',
      message: 'NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are missing or set to template placeholders.',
    };
  } else {
    const startTime = Date.now();
    try {
      // Test Supabase REST connectivity by querying the device_state or sensor_readings table
      const { data, error } = await supabase
        .from('device_state')
        .select('device_id, is_online, last_seen')
        .eq('device_id', process.env.DEFAULT_DEVICE_ID || 'ESP32-AGRI-01')
        .maybeSingle();

      const latencyMs = Date.now() - startTime;

      if (error) {
        // If error indicates table doesn't exist yet (PGRST205 / 42P01 / schema cache error)
        if (
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('does not exist')
        ) {
          supabaseHealth = {
            status: 'CONNECTED',
            message: 'Supabase credentials valid and connected. Database tables are pending SQL migration (public.device_state not found: PGRST205). Run supabase/schema.sql in Supabase SQL Editor.',
            latencyMs,
          };
        } else {
          supabaseHealth = {
            status: 'ERROR',
            message: `Supabase query returned: ${error.message} (${error.code || 'unknown'})`,
            latencyMs,
          };
        }
      } else {
        supabaseHealth = {
          status: 'CONNECTED',
          message: 'Supabase database connection healthy and schema tables verified.',
          latencyMs,
        };

        if (data && data.last_seen) {
          const lastSeenDate = new Date(data.last_seen);
          const diffSeconds = Math.round((Date.now() - lastSeenDate.getTime()) / 1000);
          const isRecentlySeen = diffSeconds >= 0 && diffSeconds < 60; // 60s timeout

          hardwareStatus = {
            isOnline: isRecentlySeen && Boolean(data.is_online),
            lastSeen: data.last_seen,
            deviceId: data.device_id || 'ESP32-AGRI-01',
            note: isRecentlySeen
              ? `Hardware active (last seen ${diffSeconds}s ago)`
              : `Hardware last seen ${diffSeconds}s ago (Offline)`,
          };
        }
      }
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      supabaseHealth = {
        status: 'ERROR',
        message: `Supabase connection failed: ${message}`,
        latencyMs,
      };
    }
  }

  // Calculate configuration summary
  const totalVars = variableStatuses.length;
  const configuredVars = variableStatuses.filter((v) => v.isConfigured).length;
  const isFullyConfigured = configuredVars === totalVars && supabaseHealth.status === 'CONNECTED';

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    isFullyConfigured,
    stats: {
      total: totalVars,
      configured: configuredVars,
      pending: totalVars - configuredVars,
    },
    supabaseHealth,
    hardwareStatus,
    variables: variableStatuses,
  });
}
