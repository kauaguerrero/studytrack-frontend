import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@/types/roles';

export async function updateSession(request: NextRequest) {
  // Cria uma resposta inicial que permite modificar cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // 1. Verifica autenticação básica
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // ================================================================
  // DATA INTEGRITY FIX: HEARTBEAT DE ATIVIDADE (DAU/MAU)
  // ================================================================
  // Atualiza o 'last_active_at' apenas se o usuário estiver logado
  // e se não tivermos atualizado na última hora (Throttle).
  if (user) {
    const activityCookie = request.cookies.get('st_activity_heartbeat');
    
    // Se o cookie não existe, atualizamos o DB e criamos o cookie
    if (!activityCookie) {
      // Executa o update de forma assíncrona (não bloqueante para o UX, mas await aqui garante execução no Edge)
      await supabase
        .from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);

      // Define cookie para expirar em 1 hora (3600s)
      // Isso impede que cada clique do usuário gere uma escrita no banco
      response.cookies.set('st_activity_heartbeat', 'true', { maxAge: 3600 });
    }
  }

  // ----------------------------------------------------------------
  // ROTAS PÚBLICAS (Ignora tudo e deixa passar)
  // ----------------------------------------------------------------
  if (path === '/' || path.startsWith('/auth') || path.startsWith('/api') || path.includes('.')) {
    // Apenas redireciona se usuário logado tentar acessar login/register
    if (user && (path === '/auth/login' || path === '/auth/register')) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    return response;
  }

  // ----------------------------------------------------------------
  // PROTEÇÃO DO PORTAL
  // ----------------------------------------------------------------
  if (path.startsWith('/portal')) {
    if (!user) {
      // Se não tá logado, manda pro login salvando a origem
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    // Validação de Role Robusta
    // Não confie apenas no metadata do user. Busque o role real no DB.
    // Fazemos isso apenas em rotas sensíveis para não pesar o banco.
    let currentRole: UserRole = 'student';
    
    // Tenta pegar do metadata primeiro para velocidade
    currentRole = user.user_metadata?.role || 'student';

    // Se a rota for de gestão ou professor, validamos no banco para garantir
    // que não é um aluno com cookie velho tentando acesso.
    if (path.startsWith('/portal/manager') || path.startsWith('/portal/teacher')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role) {
           currentRole = profile.role as UserRole;
        }
    }

    // Roteamento de Segurança (RBAC)
    
    // CASO 1: Tentativa de acesso a PROFESSOR
    if (path.startsWith('/portal/teacher')) {
      if (currentRole !== 'teacher' && currentRole !== 'admin') {
        // Se não é professor, chuta para a área correta dele
        if (currentRole === 'manager') return NextResponse.redirect(new URL('/portal/manager', request.url));
        return NextResponse.redirect(new URL('/portal/student/dashboard', request.url));
      }
    }

    // CASO 2: Tentativa de acesso a GESTOR
    if (path.startsWith('/portal/manager')) {
      if (currentRole !== 'manager' && currentRole !== 'admin') {
         if (currentRole === 'teacher') return NextResponse.redirect(new URL('/portal/teacher', request.url));
         return NextResponse.redirect(new URL('/portal/student/dashboard', request.url));
      }
    }

    // CASO 3: Professor/Gestor tentando acessar área de ALUNO
    // (Opcional: Redirecionar para manter UX limpa)
    if (path.startsWith('/portal/student')) {
       if (currentRole === 'teacher') return NextResponse.redirect(new URL('/portal/teacher', request.url));
       if (currentRole === 'manager') return NextResponse.redirect(new URL('/portal/manager', request.url));
    }
  }

  // ----------------------------------------------------------------
  // REDIRECIONAMENTOS DE MIGRAÇÃO (Rotas Antigas)
  // ----------------------------------------------------------------
  if (path === '/dashboard') return NextResponse.redirect(new URL('/portal/student/dashboard', request.url));
  
  return response;
}