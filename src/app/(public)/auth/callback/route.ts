import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  
  // 1. Tenta capturar o destino via URL
  const requestedNext = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()

    // 2. Tenta capturar a preferência via Cookie (Fallback robusto)
    const roleCookie = cookieStore.get('onboarding_role')?.value;

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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // A. Se existe um destino forçado na URL, respeite-o.
        if (requestedNext) {
            const metaRole = user.user_metadata?.role;
            if (metaRole) {
                await supabase.from('profiles').upsert({ 
                    id: user.id, 
                    role: metaRole,
                    email: user.email,
                    full_name: user.user_metadata.full_name,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            }
            return NextResponse.redirect(`${origin}${requestedNext}`)
        }

        // B. Lógica de Onboarding (Sem next forçado na URL)
        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_phone, role')
          .eq('id', user.id)
          .single()

        // Se não tem telefone, é onboarding.
        if (!profile || !profile.whatsapp_phone) {
            const cookieRole = roleCookie;
            const metaRole = user.user_metadata?.role;
            const dbRole = profile?.role;

            const isTeacher = cookieRole === 'teacher' || metaRole === 'teacher' || dbRole === 'teacher';
            
            if (isTeacher) {
                // Força a correção no banco se estiver errado
                if (dbRole !== 'teacher') {
                    await supabase.from('profiles').upsert({ 
                        id: user.id, 
                        role: 'teacher',
                        email: user.email,
                        full_name: user.user_metadata?.full_name
                    }, { onConflict: 'id' });
                }
                
                // Limpa o cookie de preferência
                const response = NextResponse.redirect(`${origin}/portal/onboarding/teacher/school`)
                response.cookies.delete('onboarding_role')
                return response
            } else {
                // Aluno
                return NextResponse.redirect(`${origin}/portal/onboarding/objetivo`)
            }
        }
      }
      
      // C. Usuário já completo -> Portal
      const defaultNext = searchParams.get('next') ?? '/portal';
      return NextResponse.redirect(`${origin}${defaultNext === requestedNext ? '/portal' : defaultNext}`)
    }
  }

  // Tratamento de erro
  const message = error_description || "Sessão expirada ou inválida. Tente entrar novamente.";
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
}