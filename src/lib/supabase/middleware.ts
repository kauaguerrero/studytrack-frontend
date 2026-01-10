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

    // --- AQUI ESTÁ A CORREÇÃO CRÍTICA ---
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
    // (Opcional: você pode querer permitir, mas geralmente confunde a UX)
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