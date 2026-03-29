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

  // Rotas públicas dentro de /partners/[slug]/ não passam pela validação de founder.
  // O middleware injeta x-pathname nos request headers para detectarmos aqui.
  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';
  const isPublicRoute = pathname === `/partners/${slug}` || pathname === `/partners/${slug}/register`;
  // Rotas de aluno B2B têm seu próprio layout (student/layout.tsx) com auth própria
  const isStudentRoute = pathname.startsWith(`/partners/${slug}/student`);
  if (isPublicRoute || isStudentRoute) {
    return <>{children}</>;
  }

  const supabase = await createClient();

  // 1. Autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/auth/login?next=/partners/${slug}`);
  }

  // 2. Busca perfil com role e organization_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile || !['founder', 'admin'].includes(profile.role ?? '')) {
    redirect('/portal');
  }

  // 3. Busca org pelo slug (usa admin para evitar bloqueio de RLS)
  // Tipagem explícita necessária pois o Supabase infere 'never' sem schema gerado.
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
    .eq('slug', slug)
    .single();

  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect('/portal');
  }

  // 4. Founder só acessa a própria org; admin acessa qualquer uma
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
