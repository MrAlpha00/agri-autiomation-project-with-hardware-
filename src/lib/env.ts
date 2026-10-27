/**
 * Environment Variable Helper & Validation
 * Safe server-side environment checks that never leak secret values to the client.
 */

// Known template placeholder values from .env.example
const PLACEHOLDER_VALUES = new Set([
  'https://your-project-id.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key',
  'your-anon-key',
  'your-supabase-service-role-key',
  'generate_a_secure_random_hex_key_here_for_esp32_auth',
  '123456789:ABCdefGHIjklMNOpqrSTUvwxyz',
  '123456789',
]);

/**
 * Checks whether an environment variable is properly set with a non-placeholder value.
 */
export function isEnvConfigured(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (PLACEHOLDER_VALUES.has(trimmed)) return false;
  if (trimmed.includes('your-project-id') || trimmed.includes('your-anon-key') || trimmed.includes('generate_a_secure')) {
    return false;
  }
  return true;
}

export interface ConfigVariableMeta {
  key: string;
  description: string;
  isPublic: boolean;
  isSecret: boolean;
  requiredFor: string;
  source: string;
  vercelScope: 'Production, Preview, Development';
}

export const ENV_DEFINITIONS: ConfigVariableMeta[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase Project HTTPS URL for database queries and real-time feeds',
    isPublic: true,
    isSecret: false,
    requiredFor: 'Dashboard real-time queries & backend API routes',
    source: 'Supabase Dashboard -> Project Settings -> API -> Project URL',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase Anonymous API Key (RLS-enforced, browser-safe)',
    isPublic: true,
    isSecret: false,
    requiredFor: 'Client-side read queries and subscription listeners',
    source: 'Supabase Dashboard -> Project Settings -> API -> anon public key',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase Service Role Key (Bypasses RLS, strictly server-only)',
    isPublic: false,
    isSecret: true,
    requiredFor: 'ESP32 telemetry ingestion and command dispatch API routes',
    source: 'Supabase Dashboard -> Project Settings -> API -> service_role secret key',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'DEVICE_SHARED_SECRET',
    description: 'Pre-shared cryptographic token sent in x-device-secret header by ESP32',
    isPublic: false,
    isSecret: true,
    requiredFor: 'Authenticating HTTP telemetry and polling from ESP32 DevKit V1',
    source: 'Generated random 32+ character hex string matched in ESP32 firmware',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'TELEGRAM_BOT_TOKEN',
    description: 'Telegram Bot API Token for safety alerts and remote commanding',
    isPublic: false,
    isSecret: true,
    requiredFor: 'Sending alerts on low water, pump timeouts, or motion alerts',
    source: 'Telegram @BotFather -> /newbot or /token',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'TELEGRAM_CHAT_ID',
    description: 'Authorized Telegram User or Group Chat ID for alerts',
    isPublic: false,
    isSecret: false,
    requiredFor: 'Target recipient for Telegram alert messages',
    source: 'Telegram @userinfobot or message update chat.id',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'NEXT_PUBLIC_CAMERA_STREAM_URL',
    description: 'HTTP MJPEG stream URL of ESP32-CAM (or secure proxy/tunnel)',
    isPublic: true,
    isSecret: false,
    requiredFor: 'Dashboard video viewer panel',
    source: 'Local ESP32-CAM stream address or Cloudflare/Tailscale tunnel URL',
    vercelScope: 'Production, Preview, Development',
  },
  {
    key: 'NEXT_PUBLIC_CAMERA_CAPTURE_URL',
    description: 'HTTP snapshot endpoint of ESP32-CAM',
    isPublic: true,
    isSecret: false,
    requiredFor: 'Manual snapshot capture on demand',
    source: 'Local ESP32-CAM capture address or Cloudflare/Tailscale tunnel URL',
    vercelScope: 'Production, Preview, Development',
  },
];
