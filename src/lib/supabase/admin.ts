import { createClient } from '@supabase/supabase-js';
import 'server-only';

let _admin: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (_admin) return _admin;

  // Server-only: não use NEXT_PUBLIC_* para chaves sensíveis
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin client: env SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY ausentes.');
  }

  _admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _admin;
}

