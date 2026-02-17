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
  secretariat: '/portal/secretariat',
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
  // #region agent log
  const debugInfo: any = {step: 0, timestamp: Date.now()};
  console.log('[DEBUG-CALLBACK] Callback initiated', {url: request.url, timestamp: new Date().toISOString()});
  fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:32',message:'Callback initiated',data:{url:request.url,timestamp:Date.now()},timestamp:Date.now(),hypothesisId:'A,B,C,D'})}).catch(()=>{});
  // #endregion
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const error_description = searchParams.get('error_description')
  const recoveryType = searchParams.get('type') // Detecta se é reset de senha
  
  const requestedNext = searchParams.get('next')
  // #region agent log
  debugInfo.step = 1;
  debugInfo.hasCode = !!code;
  debugInfo.codePrefix = code?.substring(0,10);
  debugInfo.hasError = !!oauthError;
  console.log('[DEBUG-CALLBACK] Parameters', {hasCode:!!code,codePrefix:code?.substring(0,10),oauthError,error_description,recoveryType,requestedNext});
  fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:40',message:'Parameters extracted',data:{hasCode:!!code,code:code?.substring(0,10),oauthError,error_description,recoveryType,requestedNext},timestamp:Date.now(),hypothesisId:'A,D'})}).catch(()=>{});
  // #endregion

  if (code) {
    const cookieStore = await cookies()
    const capturedSets: CookieSet[] = []
    const capturedRemoves: CookieRemove[] = []

    const roleCookie = cookieStore.get('onboarding_role')?.value
    // #region agent log
    const existingCookies = cookieStore.getAll().map(c => c.name);
    console.log('[DEBUG-CALLBACK] CookieStore', {existingCookiesCount: existingCookies.length, existingCookies, roleCookie});
    fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:46',message:'CookieStore initialized',data:{existingCookies,roleCookie},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

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
    // #region agent log
    console.log('[DEBUG-CALLBACK] Before exchange', {codePrefix:code.substring(0,10)});
    fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:66',message:'Before exchangeCodeForSession',data:{codePrefix:code.substring(0,10)},timestamp:Date.now(),hypothesisId:'A,C,D,E'})}).catch(()=>{});
    // #endregion

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    // #region agent log
    debugInfo.step = 3;
    debugInfo.exchangeError = error?.message;
    debugInfo.exchangeErrorCode = (error as any)?.code;
    debugInfo.exchangeStatus = error?.status;
    debugInfo.capturedCookies = capturedSets.length;
    console.log('[DEBUG-CALLBACK] After exchange', {hasError:!!error,errorMessage:error?.message,errorStatus:error?.status,errorCode:(error as any)?.code,capturedSetsCount:capturedSets.length,capturedRemovesCount:capturedRemoves.length});
    fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:68',message:'After exchangeCodeForSession',data:{hasError:!!error,errorMessage:error?.message,errorStatus:error?.status,errorCode:(error as any)?.code,capturedSetsCount:capturedSets.length,capturedRemovesCount:capturedRemoves.length},timestamp:Date.now(),hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion

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
          .select('whatsapp_phone, role, school_id')
          .eq('id', user.id)
          .single()

        const cookieRole = roleCookie
        const metaRole = user.user_metadata?.role
        const dbRole = profile?.role
        const isTeacher = cookieRole === 'teacher' || metaRole === 'teacher' || dbRole === 'teacher'

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
        // #region agent log
        debugInfo.step = 4;
        debugInfo.successPath = 'role-dashboard';
        debugInfo.appliedCookies = capturedSets.length;
        console.log('[DEBUG-CALLBACK] Success redirect', {redirectUrl,appliedCookies:capturedSets.length,cookieNames:capturedSets.map(s=>s.name)});
        res.headers.set('X-Debug-Step', String(debugInfo.step));
        res.headers.set('X-Debug-Success', 'true');
        fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:139',message:'Success redirect with cookies',data:{redirectUrl,appliedCookies:capturedSets.length},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return res
      }

      const defaultNext = searchParams.get('next') ?? '/portal'
      redirectUrl = `${origin}${defaultNext === requestedNext ? '/portal' : defaultNext}`
      const res = NextResponse.redirect(redirectUrl)
      applyCapturedCookies(res, capturedSets, capturedRemoves)
      return res
    }
    // 🔐 FIX: Aplicar cookies capturados mesmo em caso de erro
    // Isso evita perder o estado parcial do Supabase na primeira tentativa
    if (capturedSets.length > 0 || capturedRemoves.length > 0) {
      debugInfo.step = 98;
      debugInfo.finalPath = 'error-redirect-with-cookies';
      debugInfo.appliedCookiesOnError = capturedSets.length;
      const message = "Sessão OAuth em andamento. Tentando novamente..."
      const errorRedirectWithCookies = NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}&debug=${encodeURIComponent(JSON.stringify(debugInfo))}`)
      applyCapturedCookies(errorRedirectWithCookies, capturedSets, capturedRemoves)
      // #region agent log
      errorRedirectWithCookies.headers.set('X-Debug-Step', String(debugInfo.step));
      errorRedirectWithCookies.headers.set('X-Debug-Cookies-Applied', 'true');
      console.log('[DEBUG-CALLBACK] Error redirect WITH cookies applied', {capturedSets: capturedSets.length});
      fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:151',message:'Error redirect WITH cookies',data:{capturedSets:capturedSets.length,capturedRemoves:capturedRemoves.length},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return errorRedirectWithCookies
    }
  }
  // #region agent log
  debugInfo.step = 99;
  debugInfo.finalPath = 'error-redirect-no-cookies-captured';
  console.log('[DEBUG-CALLBACK] Error redirect path', {error_description,oauthError,hasCode:!!code});
  fetch('http://127.0.0.1:7242/ingest/d98e8a81-19bf-449a-a82a-80e8da19381f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'callback/route.ts:151',message:'Error redirect WITHOUT cookies',data:{error_description,oauthError,hasCode:!!code},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const message = error_description || oauthError || "Sessão expirada ou inválida. Tente entrar novamente."
  const errorRedirect = NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}&debug=${encodeURIComponent(JSON.stringify(debugInfo))}`)
  // #region agent log
  errorRedirect.headers.set('X-Debug-Step', String(debugInfo.step));
  errorRedirect.headers.set('X-Debug-Info', JSON.stringify(debugInfo));
  // #endregion
  return errorRedirect
}