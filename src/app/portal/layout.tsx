import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';
import { PortalLayoutWrapper } from '@/components/layout/PortalLayoutWrapper';
import { UserRole } from '@/types/roles';
import {
  SIDEBAR_COOKIE_NAME,
  parseSidebarCollapsedCookie,
} from '@/lib/sidebar-cookie';
import PortalLoading from './loading';

/**
 * Async sub-component that fetches the user profile.
 * Wrapped in <Suspense> so auth check (getUser) is the only blocking call —
 * the profile fetch streams in while the loading fallback is shown.
 */
async function PortalShell({
  userId,
  sidebarCookieValue,
  children,
}: {
  userId: string;
  sidebarCookieValue: string | undefined;
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', userId)
    .single();

  const role = (profile?.role as UserRole) || 'student';
  const fullName = profile?.full_name || 'Usuário';
  const avatarUrl = profile?.avatar_url ?? undefined;
  const initialSidebarCollapsed = parseSidebarCollapsedCookie(sidebarCookieValue);

  return (
    <PortalLayoutWrapper
      role={role}
      fullName={fullName}
      avatarUrl={avatarUrl}
      initialSidebarCollapsed={initialSidebarCollapsed}
    >
      {children}
    </PortalLayoutWrapper>
  );
}

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  // Auth check is the only blocking await — required for the redirect.
  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Cookie reading is synchronous and fast — done here outside Suspense.
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME);

  return (
    <Suspense fallback={<PortalLoading />}>
      <PortalShell
        userId={user.id}
        sidebarCookieValue={sidebarCookie?.value}
      >
        {children}
      </PortalShell>
    </Suspense>
  );
}
