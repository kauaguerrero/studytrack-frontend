import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error_description = searchParams.get('error_description')
  const recoveryType = searchParams.get('type') // Detecta se é reset de senha
  
  // 1. Tenta capturar o destino via URL
  const requestedNext = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()

    // 2. Tenta capturar a preferência via Cookie
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
        // A. Se é um reset de senha, redireciona direto para confirmação
        if (recoveryType === 'recovery') {
          return NextResponse.redirect(`${origin}/auth/reset/confirm`)
        }

        // A. Se existe um destino forçado na URL (Fluxo de Cadastro)
        if (requestedNext) {
            const metaRole = user.user_metadata?.role;
            if (metaRole) {
                // CORREÇÃO: Usamos update() em vez de upsert().
                // O perfil já foi criado pelo Trigger do banco. Aqui só garantimos que
                // os dados do metadata (como role e nome) sejam aplicados ao perfil.
                await supabase.from('profiles').update({ 
                    role: metaRole,
                    full_name: user.user_metadata.full_name,
                    last_active_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', user.id); // Importante: Update precisa do WHERE (eq)
            }
            return NextResponse.redirect(`${origin}${requestedNext}`)
        }

        // B. Lógica de Roteamento Inteligente (Login recorrente)
        const { data: profile } = await supabase
          .from('profiles')
          .select('whatsapp_phone, role, school_id')
          .eq('id', user.id)
          .single()

        // Determina o papel do usuário (Prioridade: Cookie > Metadata > Banco)
        const cookieRole = roleCookie;
        const metaRole = user.user_metadata?.role;
        const dbRole = profile?.role;
        const isTeacher = cookieRole === 'teacher' || metaRole === 'teacher' || dbRole === 'teacher';

        // Se for professor E JÁ TIVER ESCOLA vinculada, manda para o painel direto.
        if (isTeacher && profile?.school_id) {
             return NextResponse.redirect(`${origin}/portal/teacher`)
        }

        // Se não tem perfil completo (telefone) ou escola (se for prof), vai pro Onboarding
        if (!profile || !profile.whatsapp_phone) {
            
            if (isTeacher) {
                // Se o banco diz 'student' (padrão do trigger) mas é teacher (via cookie/meta), corrige.
                if (dbRole !== 'teacher') {
                    // CORREÇÃO: Update seguro para corrigir a role sem violar RLS de insert
                    await supabase.from('profiles').update({ 
                        role: 'teacher',
                        full_name: user.user_metadata?.full_name
                    }).eq('id', user.id);
                }
                
                const response = NextResponse.redirect(`${origin}/portal/onboarding/teacher/school`)
                response.cookies.delete('onboarding_role')
                return response
            } else {
                // Aluno vai para o objetivo
                return NextResponse.redirect(`${origin}/portal/onboarding/objetivo`)
            }
        }
      }
      
      // C. Usuário já completo -> Portal (Hub decide para onde vai)
      const defaultNext = searchParams.get('next') ?? '/portal';
      return NextResponse.redirect(`${origin}${defaultNext === requestedNext ? '/portal' : defaultNext}`)
    }
  }

  // Tratamento de erro
  const message = error_description || "Sessão expirada ou inválida. Tente entrar novamente.";
  return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(message)}`)
}