import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  
  // Default para '/portal' (o Hub)
  let next = searchParams.get('next') ?? '/portal'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Verificação de Onboarding
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_phone')
          .eq('id', user.id)
          .single()

        // Se não tiver perfil ou não tiver telefone, força o onboarding.
        if (!profile || !profile.whatsapp_phone) {
          next = '/onboarding/objetivo'
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se houver erro, redireciona para o login com mensagem amigável
  // Decodifica o erro do provedor ou usa um genérico
  const message = error_description || "Sessão expirada ou inválida. Tente entrar novamente.";
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
}