import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isEnvConfigured } from '@/lib/env';

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton browser Supabase client using public anon credentials.
 * Returns null if credentials are not configured or placeholder values.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isEnvConfigured(url) || !isEnvConfigured(anonKey)) {
    return null;
  }

  try {
    browserClient = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return browserClient;
  } catch (err) {
    console.error('Failed to initialize Supabase browser client:', err);
    return null;
  }
}
