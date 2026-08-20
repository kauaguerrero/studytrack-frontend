import { createClient } from '@supabase/supabase-js'

/**
 * Client dedicado só pro login com Google — flowType 'implicit', não o PKCE
 * usado pelo resto do app (@supabase/ssr, cookie-backed, essencial pro
 * middleware/SSR). O implicit flow devolve os tokens direto no fragment da
 * URL de retorno, sem exchange server-side nenhum — elimina a dependência de
 * um cookie (code_verifier) sobreviver à ida-e-volta cross-site pelo domínio
 * do Google, que é a causa confirmada de falhas intermitentes em navegador
 * mobile (erro `pkce_code_verifier_not_found`).
 *
 * @supabase/ssr's createBrowserClient FORÇA flowType: "pkce" internamente,
 * sem opção de override — por isso esse client é criado direto via
 * @supabase/supabase-js, isolado do singleton usado no resto do app
 * (src/lib/supabase/client.ts). Login por email/senha e reset de senha
 * continuam via o client normal, sem nenhuma mudança.
 *
 * Isolamento é proposital: se o client PKCE também tentasse processar uma
 * URL com hash de implicit flow, ele rejeitaria com
 * AuthPKCEGrantCodeExchangeError ("Not a valid PKCE flow url.").
 */
let client: ReturnType<typeof createClient> | null = null

export function getGoogleOAuthClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: false,
        },
      }
    )
  }
  return client
}
