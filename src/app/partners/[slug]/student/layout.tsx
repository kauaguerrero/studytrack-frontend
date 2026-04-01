/**
 * Layout para alunos B2B no portal de parceiros.
 */

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OrgProvider } from '@/contexts/OrgContext';
import { StudentThemeProvider, type StudentTheme } from '@/contexts/StudentThemeContext';
import { StudentThemeShell } from '@/components/partners/StudentThemeShell';

// Definição local para evitar erro de importação circular ou módulos não encontrados
export interface OrgBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  plan_tier?: string;
  max_students?: number;
  invite_code?: string | null;
  permissions?: any;
}

interface StudentLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function PartnerStudentLayout({ children, params }: StudentLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Autenticação
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect(`/auth/login?next=/partners/${slug}/student/dashboard`);
  }

  const adminClient = createAdminClient();

  // 2. Busca perfil via adminClient para garantir leitura de organization_id sem bloqueio de RLS
  type ProfileRow = { role: string | null; organization_id: string | null; full_name: string | null; avatar_url: string | null; theme_preference: string | null; must_change_password: boolean | null };
  const profileRes = await adminClient
    .from('profiles')
    .select('role, organization_id, full_name, avatar_url, theme_preference, must_change_password')
    .eq('id', user.id)
    .single();
  const profile = profileRes.data as ProfileRow | null;

  if (!profile) {
    redirect(`/auth/login?next=/partners/${slug}/student/dashboard`);
  }

  // 3. Busca org (admin para bypass RLS)
  type OrgRow = {
    id: string; name: string; logo_url: string | null;
    brand_primary: string | null; brand_secondary: string | null; brand_accent: string | null;
  };
  const orgRes = await adminClient
    .from('organizations')
    .select('id, name, logo_url, brand_primary, brand_secondary, brand_accent')
    .eq('slug', slug)
    .single();
  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect(`/partners/${slug}/register`);
  }

  const role = (profile.role as string) || 'student';
  if (role === 'student' && profile.organization_id !== org.id) {
    redirect(`/partners/${slug}/register`);
  }
  if (!['student', 'founder', 'admin'].includes(role)) {
    redirect(`/auth/login?next=/partners/${slug}/student/dashboard`);
  }

  const brandPrimary   = org.brand_primary   ?? '#6366f1';
  const brandSecondary = org.brand_secondary ?? '#8b5cf6';
  const brandAccent    = org.brand_accent    ?? '#f59e0b';

  const validThemes = ['light', 'dark', 'system'] as const;
  const rawTheme = profile.theme_preference ?? 'system';
  const initialTheme: StudentTheme = (validThemes as readonly string[]).includes(rawTheme)
    ? (rawTheme as StudentTheme)
    : 'system';

  const branding: OrgBranding = {
    id:               org.id,
    name:             org.name,
    slug,
    logo_url:         org.logo_url,
    brand_primary:    brandPrimary,
    brand_secondary:  brandSecondary,
    brand_accent:     brandAccent,
    plan_tier:        'b2b_student',
    max_students:     0,
    invite_code:      null,
    permissions:      {},
  };

  return (
    <OrgProvider
      org={branding}
      userProfile={{
        fullName:  profile.full_name  ?? 'Aluno',
        avatarUrl: profile.avatar_url ?? null,
        role,
      }}
    >
      {/* Inline script: resolve o tema a partir do localStorage antes do primeiro paint do React,
          eliminando o flash quando localStorage difere do valor do banco (SSR). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var k='partner-student-theme-${slug}';var s=localStorage.getItem(k);var r=s==='dark'?'dark':s==='light'?'light':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');window.__pst=window.__pst||{};window.__pst['${slug}']=r;}catch(e){}})()`,
        }}
      />
      <style>{`
        :root {
          --brand-primary: ${brandPrimary};
          --brand-secondary: ${brandSecondary};
          --brand-accent: ${brandAccent};
        }
      `}</style>

      <StudentThemeProvider slug={slug} initialTheme={initialTheme}>
        <StudentThemeShell mustChangePassword={profile.must_change_password === true}>
          {children}
        </StudentThemeShell>
      </StudentThemeProvider>
    </OrgProvider>
  );
}