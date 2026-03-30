import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';
import { PortalLayoutWrapper } from '@/components/layout/PortalLayoutWrapper';
import { OrgProvider } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import type { OrgBranding } from '@/app/partners/[slug]/layout';
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
    .select('role, full_name, avatar_url, plan_tier, organization_id')
    .eq('id', userId)
    .single();

  const role = (profile?.role as UserRole) || 'student';
  const fullName = profile?.full_name || 'Usuário';
  const avatarUrl = profile?.avatar_url ?? undefined;
  const initialSidebarCollapsed = parseSidebarCollapsedCookie(sidebarCookieValue);

  // Alunos B2B sempre veem a sidebar do parceiro, mesmo em rotas /portal/*
  const isB2b = profile?.plan_tier?.startsWith('b2b_') && profile?.organization_id;
  if (isB2b) {
    type OrgRow = {
      id: string; name: string; slug: string; logo_url: string | null;
      brand_primary: string | null; brand_secondary: string | null;
      brand_accent: string | null; plan_tier: string | null;
      max_students: number | null; invite_code: string | null;
      permissions: Record<string, boolean> | null;
    };
    const adminClient = createAdminClient();
    const orgRes = await adminClient
      .from('organizations')
      .select('id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions')
      .eq('id', profile.organization_id)
      .single();
    const org = orgRes.data as OrgRow | null;

    if (org) {
      const brandPrimary   = org.brand_primary   ?? '#6366f1';
      const brandSecondary = org.brand_secondary ?? '#8b5cf6';
      const brandAccent    = org.brand_accent    ?? '#f59e0b';

      const branding: OrgBranding = {
        id:              org.id,
        name:            org.name,
        slug:            org.slug,
        logo_url:        org.logo_url ?? null,
        brand_primary:   brandPrimary,
        brand_secondary: brandSecondary,
        brand_accent:    brandAccent,
        plan_tier:       profile.plan_tier ?? 'b2b_student',
        max_students:    org.max_students ?? 0,
        invite_code:     org.invite_code ?? null,
        permissions:     org.permissions ?? {},
      };

      return (
        <OrgProvider
          org={branding}
          userProfile={{ fullName, avatarUrl: profile.avatar_url ?? null, role }}
        >
          <style>{`
            :root {
              --brand-primary: ${brandPrimary};
              --brand-secondary: ${brandSecondary};
              --brand-accent: ${brandAccent};
            }
          `}</style>
          <PartnerLayout variant="student">
            {children}
          </PartnerLayout>
        </OrgProvider>
      );
    }
  }

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
