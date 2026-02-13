import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Evita "Invalid Refresh Token" no console: o auto-refresh em background
        // falha quando o refresh_token expira. O middleware faz a renovação.
        autoRefreshToken: false,
      },
    }
  )
}