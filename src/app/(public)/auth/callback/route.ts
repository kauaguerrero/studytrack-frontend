import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/types/roles'

type CookieSet = { name: string; value: string; options: CookieOptions }
type CookieRemove = { name: string; options: CookieOptions }

const ROLE_TO_DASHBOARD: Record<UserRole, string> = {
  student: '/',
  admin: '/portal/admin',
  dev: '/portal',
  founder: '/portal',  // /portal redireciona founder para /partners/<slug>/dashboard
  associate: '/portal',
}

/** Aplica cookies capturados na resposta de redirect (evita perder sessão no OAuth). */
function applyCapturedCookies(redirectResponse: NextResponse, sets: CookieSet[], removes: CookieRemove[]) {
  for (const { name, value, options } of sets) {
    redirectResponse.cookies.set(name, value, options)
  }
  for (const { name, options } of removes) {
    redirectResponse.cookies.delete({ name, ...options })
  }
}

function resolveRole(cookieRole: string | undefined, metaRole: string | undefined, dbRole: string | undefined): UserRole {
  const r = dbRole || metaRole || cookieRole || 'student'
  return (ROLE_TO_DASHBOARD[r as UserRole] ? r : 'student') as UserRole
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const recoveryType = searchParams.get('type') // Detecta se é reset de senha
  
  const requestedNext = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const capturedSets: CookieSet[] = []
    const capturedRemoves: CookieRemove[] = []

    const roleCookie = cookieStore.get('onboarding_role')?.value

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            capturedSets.push({ name, value, options })
          },
          remove(name: string, options: CookieOptions) {
            capturedRemoves.push({ name, options })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Sem isso, uma falha de troca de código (ex: PKCE "flow state not found",
      // code_verifier ausente/expirado) desaparecia sem deixar rastro — o usuário
      // só via "sessão expirada" e a gente não tinha como saber o motivo real.
      console.error('[auth/callback] exchangeCodeForSession falhou', {
        message: error.message,
        status: error.status,
        code: error.code,
        requestedNext,
      })

      // Falha específica e conhecida do PKCE em navegador mobile: o cookie do
      // code_verifier não sobrevive à ida-e-volta pelo domínio do Google. A
      // própria origem desse erro já mostrou que a 2ª tentativa quase sempre
      // funciona — em vez de despachar o usuário pra uma tela de erro genérica
      // e esperar ele entender que precisa tentar de novo, manda ele de volta
      // pra tela certa (com branding do parceiro) já sinalizando pra reiniciar
      // o login do Google sozinho. Stopgap enquanto o fluxo do Google migra
      // pra implicit flow (que elimina essa dependência de cookie por completo).
      if (error.code === 'pkce_code_verifier_not_found' || /code verifier/i.test(error.message ?? '')) {
        const registerMatch = requestedNext?.match(/^\/partners\/([^/]+)\/register\?invite=([A-Za-z0-9]+)/)
        const partnerSlugMatch = requestedNext?.match(/^\/partners\/([^/]+)\//)
        let retryUrl: string
        if (registerMatch) {
          const [, slug, inviteCode] = registerMatch
          retryUrl = `${origin}/partners/${slug}/register?code=${inviteCode}&autoRetryGoogle=1`
        } else if (partnerSlugMatch) {
          const [, slug] = partnerSlugMatch
          retryUrl = `${origin}/partners/${slug}/login?next=${encodeURIComponent(requestedNext!)}&autoRetryGoogle=1`
        } else {
          retryUrl = `${origin}/auth/login?next=${encodeURIComponent(requestedNext ?? '/portal')}&autoRetryGoogle=1`
        }
        return NextResponse.redirect(retryUrl)
      }
    }

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      let redirectUrl: string

      if (user) {
        if (recoveryType === 'recovery') {
          redirectUrl = `${origin}/auth/reset/confirm`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        if (requestedNext) {
          redirectUrl = `${origin}${requestedNext}`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, school_id, organization_id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          redirectUrl = `${origin}/`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        // Perfil completo → redireciona para o dashboard da role
        const cookieRole = roleCookie
        const metaRole = user.user_metadata?.role
        const dbRole = profile?.role
        const role = resolveRole(cookieRole, metaRole, dbRole)
        redirectUrl = `${origin}${ROLE_TO_DASHBOARD[role]}`
        const res = NextResponse.redirect(redirectUrl)
        applyCapturedCookies(res, capturedSets, capturedRemoves)
        return res
      }

      const defaultNext = searchParams.get('next') ?? '/portal'
      redirectUrl = `${origin}${defaultNext === requestedNext ? '/portal' : defaultNext}`
      const res = NextResponse.redirect(redirectUrl)
      applyCapturedCookies(res, capturedSets, capturedRemoves)
      return res
    }
  }

  const message = error_description || oauthError || "Sessão expirada ou inválida. Tente entrar novamente."
  const partnerStudentMatch = requestedNext?.match(/^\/partners\/([^/]+)\/student(?:\/|$)/)
  if (partnerStudentMatch) {
    const slug = partnerStudentMatch[1]
    return NextResponse.redirect(
      `${origin}/partners/${slug}/login?next=${encodeURIComponent(requestedNext!)}&error=${encodeURIComponent(message)}`
    )
  }
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
}
