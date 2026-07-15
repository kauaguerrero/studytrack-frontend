import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Login CSRF: sem isso, um site externo consegue POSTar tokens de UMA conta dele
    // pra essa rota (bypassando preflight com Content-Type: text/plain) e fazer o
    // navegador da vítima gravar o cookie de sessão dele — a vítima fica "logada"
    // como o atacante sem perceber. Origin só é ausente em clientes não-browser,
    // que não são o vetor de ataque aqui (o alvo é sempre o navegador da vítima).
    const origin = request.headers.get('origin')
    const selfOrigin = new URL(request.url).origin
    if (origin && origin !== selfOrigin) {
      return NextResponse.json({ error: 'Origem não permitida' }, { status: 403 })
    }

    const { access_token, refresh_token } = await request.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Tokens ausentes' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const response = NextResponse.json({ ok: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll() // ← lê cookies reais em vez de []
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.setSession({ access_token, refresh_token })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return response
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }
}