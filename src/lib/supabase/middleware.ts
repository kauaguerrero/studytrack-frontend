import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@/types/roles';

export async function updateSession(request: NextRequest) {
  // 1. Configuração inicial da resposta
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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Atualiza request (para o backend ver agora)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // Recria a resposta para garantir consistência
          response = NextResponse.next({ request });
          
          // Atualiza resposta (para o navegador salvar)
          cookiesToSet.forEach(({ name, value, options }) => 
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // 0. Callback OAuth (Segurança)
  if (path.startsWith('/auth/callback')) {
    return response;
  }

  // 2. Verifica/Renova Token
  // IMPORTANTE: Isso dispara o setAll se o token mudou
  const { data: { user } } = await supabase.auth.getUser();

  // Função auxiliar para redirecionar SEM perder os cookies renovados acima
  const redirect = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    // Copia os cookies da resposta original (que tem o token novo) para o redirect
    const cookiesToCopy = response.cookies.getAll();
    cookiesToCopy.forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // 3. Heartbeat de Atividade (DAU/MAU)
  if (user) {
    const activityCookie = request.cookies.get('st_activity_heartbeat');
    if (!activityCookie) {
      // Async fire-and-forget (não esperamos o await para não travar a req)
      supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', user.id).then();
      response.cookies.set('st_activity_heartbeat', 'true', { maxAge: 3600 });
    }
  }

  // 4. Rotas Públicas
  if (path === '/' || path.startsWith('/auth') || path.startsWith('/api') || path.includes('.')) {
    if (user && (path === '/auth/login' || path === '/auth/register')) {
      return redirect(new URL('/portal', request.url));
    }
    return response;
  }

  // 5. Proteção do Portal (RBAC)
  if (path.startsWith('/portal')) {
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return redirect(redirectUrl);
    }

    // Role Check
    let currentRole: UserRole = user.user_metadata?.role || 'student';

    if (path.startsWith('/portal/manager') || path.startsWith('/portal/teacher') || path.startsWith('/portal/secretariat')) {
        // Busca rápida (RLS agora funciona sem recursão)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role) currentRole = profile.role as UserRole;
    }

    // Redirecionamentos de Role
    if (path.startsWith('/portal/teacher')) {
      if (currentRole !== 'teacher' && currentRole !== 'admin') {
        const dest = currentRole === 'manager' ? '/portal/manager' 
                   : currentRole === 'secretariat' ? '/portal/secretariat'
                   : '/portal/student/dashboard';
        return redirect(new URL(dest, request.url));
      }
    }

    if (path.startsWith('/portal/manager')) {
      if (currentRole !== 'manager' && currentRole !== 'admin') {
         const dest = currentRole === 'teacher' ? '/portal/teacher' 
                    : currentRole === 'secretariat' ? '/portal/secretariat'
                    : '/portal/student/dashboard';
         return redirect(new URL(dest, request.url));
      }
    }

    if (path.startsWith('/portal/secretariat')) {
      if (currentRole !== 'secretariat' && currentRole !== 'admin') {
        const dest = currentRole === 'manager' ? '/portal/manager'
                   : currentRole === 'teacher' ? '/portal/teacher'
                   : '/portal/student/dashboard';
        return redirect(new URL(dest, request.url));
      }
    }
  }

  // Migração Legado
  if (path === '/dashboard') return redirect(new URL('/portal/student/dashboard', request.url));
  
  return response;
}