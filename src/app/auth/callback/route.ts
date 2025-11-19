import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Se tiver um parâmetro "next" na URL, usamos ele, senão vai pro dashboard
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()

    // Cria o cliente Supabase no lado do servidor para trocar o código por sessão
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

    // Troca o código pela sessão do usuário
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Sucesso! Redireciona para a área logada
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se der erro, volta pro login com um aviso
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}