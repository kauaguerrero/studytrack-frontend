import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserRole } from '@/types/roles';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  const normalizeRole = (role: unknown): UserRole | null => {
    if (!role) return null;
    const s = String(role).trim().toLowerCase();
    const allowed: UserRole[] = ['student', 'teacher', 'manager', 'admin', 'secretariat'];
    return allowed.includes(s as UserRole) ? (s as UserRole) : null;
  };

  // 1. OTIMIZAÇÃO CRÍTICA: Ignorar arquivos estáticos IMEDIATAMENTE (Evita Deadlock)
  if (
    path.startsWith('/_next') ||
    path.startsWith('/static') ||
    path.startsWith('/auth/callback') ||
    path.includes('.')
  ) {
    return supabaseResponse;
  }

  // 2. Só instancia o Supabase se for uma rota de página
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Validação de Sessão
  const { data: { user }, error } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === 'development') {
      console.log('[MIDDLEWARE][DEBUG] path:', path);
      console.log('[MIDDLEWARE][DEBUG] user ID:', user?.id || 'null');
      console.log('[MIDDLEWARE][DEBUG] cookies na requisição:', request.cookies.getAll().map(c => c.name));
  }

  // 4. Rotas Públicas e Redirect de Auth
  if (path === '/' || path.startsWith('/auth') || path.startsWith('/api')) {
    if (user && (path === '/auth/login' || path === '/auth/register')) {
      return NextResponse.redirect(new URL('/portal', request.url));
    }
    return supabaseResponse;
  }

  // 5. Proteção do Portal (RBAC)
  if (path.startsWith('/portal')) {
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    let currentRole: UserRole = (normalizeRole(user.user_metadata?.role) ?? 'student') as UserRole;
    let profileRoleForLog: unknown = null;

    if (
      path.startsWith('/portal/manager') ||
      path.startsWith('/portal/teacher') ||
      path.startsWith('/portal/secretariat') ||
      path.startsWith('/portal/admin')
    ) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        profileRoleForLog = profile?.role ?? null;
        const dbRole = normalizeRole(profile?.role);
        if (dbRole) currentRole = dbRole;
    }

    // Redirects baseados em Role
    if (path.startsWith('/portal/teacher') && currentRole !== 'teacher' && currentRole !== 'admin') {
        const dest = currentRole === 'manager' ? '/portal/manager' : currentRole === 'secretariat' ? '/portal/secretariat' : '/portal/student/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
    }

    if (path.startsWith('/portal/admin') && currentRole !== 'admin') {
        if (process.env.NODE_ENV === 'production') {
          console.log('[RBAC][ADMIN] redirect detected', {
            path,
            currentRole,
            metaRole: user.user_metadata?.role,
            profileRole: profileRoleForLog,
            userId: user.id,
          });
        }
        const dest = currentRole === 'manager' ? '/portal/manager' : currentRole === 'teacher' ? '/portal/teacher' : currentRole === 'secretariat' ? '/portal/secretariat' : '/portal/student/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
    }

    if (path.startsWith('/portal/manager') && currentRole !== 'manager' && currentRole !== 'admin') {
         const dest = currentRole === 'teacher' ? '/portal/teacher' : currentRole === 'secretariat' ? '/portal/secretariat' : '/portal/student/dashboard';
         return NextResponse.redirect(new URL(dest, request.url));
    }

    if (path.startsWith('/portal/secretariat') && currentRole !== 'secretariat' && currentRole !== 'admin') {
        const dest = currentRole === 'manager' ? '/portal/manager' : currentRole === 'teacher' ? '/portal/teacher' : '/portal/student/dashboard';
        return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return supabaseResponse;
}