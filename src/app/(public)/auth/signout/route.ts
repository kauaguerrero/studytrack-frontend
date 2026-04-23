import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
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
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // O método set foi chamado de um Server Component.
            // Isso pode ser ignorado se houver middleware atualizando a sessão.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
          }
        },
      },
    }
  )

  // Verifica se existe sessão antes de deslogar
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
  }

  const requestedNext = requestUrl.searchParams.get('next')
  if (requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')) {
    return NextResponse.redirect(new URL(requestedNext, request.url), {
      status: 302,
    })
  }

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const partnerMatch = refererUrl.pathname.match(/^\/partners\/([^/]+)(?:\/|$)/)
      if (partnerMatch) {
        const slug = partnerMatch[1]
        return NextResponse.redirect(new URL(`/partners/${slug}/register`, request.url), {
          status: 302,
        })
      }
    } catch {
      // Ignora referer inválido e cai no fallback padrão.
    }
  }

  // Fallback padrão para fluxos genéricos da StudyTrack
  return NextResponse.redirect(new URL('/auth/login', request.url), {
    status: 302,
  })
}
