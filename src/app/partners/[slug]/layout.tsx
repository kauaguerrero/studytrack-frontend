/**
 * Layout do Portal de Parceiros (/partners/[slug]/*)
 *
 * Responsabilidades:
 * 1. Valida que o usuário está autenticado (redirect se não)
 * 2. Valida que o usuário tem role `founder` ou `admin`
 * 3. Valida que o founder pertence à organização do slug (anti cross-org)
 * 4. Injeta CSS variables de branding da org no layout
 * 5. Fornece o OrgContext para todos os filhos
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrgProvider } from '@/contexts/OrgContext';

export interface OrgBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  plan_tier: string;
  max_students: number;
  invite_code: string | null;
  permissions: Record<string, boolean>;
}

interface PartnersLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function PartnersLayout({ children, params }: PartnersLayoutProps) {
  const { slug } = await params;

  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';

  // Rotas públicas — não requerem auth
  const isPublicRoute =
    pathname === `/partners/${slug}` ||
    pathname === `/partners/${slug}/register` ||
    pathname === ''; // fallback se header não chegar

  // Rotas de aluno B2B — auth e validação delegadas ao student/layout.tsx
  const isStudentRoute =
    pathname.startsWith(`/partners/${slug}/student`) ||
    pathname.includes('/student/'); // fallback robusto se x-pathname vier incompleto

  if (isPublicRoute || isStudentRoute) {
    return <>{children}</>;
  }

  // A partir daqui: rotas do painel do parceiro (founder/admin)
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/auth/login?next=/partners/${slug}`);
  }

  // Usa adminClient para garantir leitura de organization_id sem bloqueio de RLS
  const adminClient = createAdminClient();
  type ProfileRow = { role: string | null; organization_id: string | null; full_name: string | null; avatar_url: string | null };
  const profileRes = await adminClient
    .from('profiles')
    .select('role, organization_id, full_name, avatar_url')
    .eq('id', user.id)
    .single();
  const profile = profileRes.data as ProfileRow | null;

  // Aluno B2B com org vinculada — delega para student/layout.tsx em vez de redirecionar
  if (profile?.role === 'student' && profile?.organization_id) {
    return <>{children}</>;
  }

  // Roles sem acesso ao painel de parceiros
  if (!profile || !['founder', 'admin'].includes(profile.role ?? '')) {
    redirect('/portal');
  }

  // Busca org pelo slug (usa adminClient para evitar bloqueio de RLS)
  type OrgRow = {
    id: string; name: string; slug: string; logo_url: string | null;
    brand_primary: string | null; brand_secondary: string | null;
    brand_accent: string | null; plan_tier: string | null;
    max_students: number | null; invite_code: string | null;
    permissions: Record<string, boolean> | null;
  };
  const orgRes = await adminClient
    .from('organizations')
    .select('id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions')
    .eq('slug', slug)
    .single();

  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect('/portal');
  }

  // Founder só acessa a própria org; admin acessa qualquer uma
  if (profile.role === 'founder' && profile.organization_id !== org.id) {
    redirect('/portal');
  }

  const branding: OrgBranding = {
    id:              org.id,
    name:            org.name,
    slug:            org.slug,
    logo_url:        org.logo_url ?? null,
    brand_primary:   org.brand_primary ?? '#6366f1',
    brand_secondary: org.brand_secondary ?? '#8b5cf6',
    brand_accent:    org.brand_accent ?? '#f59e0b',
    plan_tier:       org.plan_tier ?? 'b2b_basic',
    max_students:    org.max_students ?? 200,
    invite_code:     org.invite_code ?? null,
    permissions:     org.permissions ?? {},
  };

  return (
    <OrgProvider org={branding} userProfile={{ fullName: profile.full_name ?? 'Usuário', avatarUrl: profile.avatar_url ?? null, role: profile.role }}>
      {/* CSS variables de branding injetadas via style tag server-side */}
      <style>{`
        :root {
          --brand-primary: ${branding.brand_primary};
          --brand-secondary: ${branding.brand_secondary};
          --brand-accent: ${branding.brand_accent};
        }
      `}</style>
      {children}
    </OrgProvider>
  );
}
