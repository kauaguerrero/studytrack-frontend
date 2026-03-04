import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // O @supabase/ssr gerencia cookies, chunking e fluxo PKCE nativamente.
  // Sobrescrever o storage quebra a compatibilidade com o Middleware.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}