import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/types/roles'

type CookieSet = { name: string; value: string; options: CookieOptions }
type CookieRemove = { name: string; options: CookieOptions }

const ROLE_TO_DASHBOARD: Record<UserRole, string> = {
  student: '/portal/student/dashboard',
  teacher: '/portal/teacher',
  manager: '/portal/manager',
  admin: '/portal/admin',
  dev: '/portal',
  secretariat: '/portal/secretariat',
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
          const metaRole = user.user_metadata?.role
          if (metaRole) {
            await supabase.from('profiles').update({ 
              role: metaRole,
              full_name: user.user_metadata.full_name,
              last_active_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).eq('id', user.id)
          }
          redirectUrl = `${origin}${requestedNext}`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_phone, role, school_id, organization_id')
          .eq('id', user.id)
          .single()

        const cookieRole = roleCookie
        const metaRole = user.user_metadata?.role
        const dbRole = profile?.role
        const isTeacher = cookieRole === 'teacher' || metaRole === 'teacher' || dbRole === 'teacher'

        // Teacher legado vinculado a organização parceira deve ir para correção de redações
        if (isTeacher && profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('slug')
            .eq('id', profile.organization_id)
            .maybeSingle()
          if (org?.slug) {
            redirectUrl = `${origin}/partners/${org.slug}/redacoes`
            const res = NextResponse.redirect(redirectUrl)
            applyCapturedCookies(res, capturedSets, capturedRemoves)
            return res
          }
        }

        if (isTeacher && profile?.school_id) {
          redirectUrl = `${origin}/portal/teacher`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        if (!profile || !profile.whatsapp_phone) {
          if (isTeacher) {
            if (dbRole !== 'teacher') {
              await supabase.from('profiles').update({ 
                role: 'teacher',
                full_name: user.user_metadata?.full_name
              }).eq('id', user.id)
            }
            redirectUrl = `${origin}/portal/onboarding/teacher/school`
            const res = NextResponse.redirect(redirectUrl)
            res.cookies.delete('onboarding_role')
            applyCapturedCookies(res, capturedSets, capturedRemoves)
            return res
          }
          redirectUrl = `${origin}/portal/onboarding/objetivo`
          const res = NextResponse.redirect(redirectUrl)
          applyCapturedCookies(res, capturedSets, capturedRemoves)
          return res
        }

        // Perfil completo → redireciona para o dashboard da role
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
