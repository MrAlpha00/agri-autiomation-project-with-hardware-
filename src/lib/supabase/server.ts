import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isEnvConfigured } from '@/lib/env';

let serverAdminClient: SupabaseClient | null = null;

/**
 * Returns a server-only Supabase client initialized with the Service Role key.
 * This client bypasses RLS and is intended exclusively for Route Handlers
 * (e.g. telemetry ingestion, command management, internal health checks).
 *
 * NEVER expose or invoke this on the client browser.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isEnvConfigured(url) || !isEnvConfigured(serviceKey)) {
    return null;
  }

  if (serverAdminClient) return serverAdminClient;

  try {
    serverAdminClient = createClient(url!, serviceKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return serverAdminClient;
  } catch (err) {
    console.error('Failed to initialize Supabase server client:', err);
    return null;
  }
}
