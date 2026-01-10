import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { UserMetadata } from '@/types/roles';

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // ----------------------------------------------------------------
  // REGRA 0: Correção de Rotas Antigas (Migração)
  // ----------------------------------------------------------------
  if (path === '/dashboard') {
    return NextResponse.redirect(new URL('/portal/student/dashboard', request.url));
  }
  if (path === '/admin') {
    return NextResponse.redirect(new URL('/portal/manager', request.url));
  }

  // ----------------------------------------------------------------
  // REGRA 1: Redirecionar usuário logado fora das páginas de Auth
  // ----------------------------------------------------------------
  if (user && path.startsWith('/auth') && !path.includes('/signout')) {
    const role = (user.user_metadata as UserMetadata)?.role || 'student';
    
    if (role === 'manager') return NextResponse.redirect(new URL('/portal/manager', request.url));
    if (role === 'teacher') return NextResponse.redirect(new URL('/portal/teacher', request.url));
    
    return NextResponse.redirect(new URL('/portal/student/dashboard', request.url));
  }

  // ----------------------------------------------------------------
  // REGRA 2: Proteção das Rotas do Portal
  // ----------------------------------------------------------------
  if (path.startsWith('/portal')) {
    if (!user) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    const role = (user.user_metadata as UserMetadata)?.role || 'student';

    if (path.startsWith('/portal/teacher') && role !== 'teacher' && role !== 'admin') {
      return NextResponse.redirect(new URL('/portal/student/dashboard?error=unauthorized', request.url));
    }

    if (path.startsWith('/portal/manager') && role !== 'manager' && role !== 'admin') {
       const target = role === 'teacher' ? '/portal/teacher' : '/portal/student/dashboard';
       return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return response;
}