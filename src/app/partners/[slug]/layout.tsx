/**
 * Layout do Portal de Parceiros (/partners/[slug]/*)
 *
 * Responsabilidades:
 * 1. Valida que o usuário está autenticado (redirect se não)
 * 2. Valida que o usuário tem role `founder`, `admin` ou `associate`
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
import { normalizeOrgTypewriterTagline, type OrgTypewriterTagline } from '@/lib/org-typewriter-tagline';
import { normalizeOrgApprovedPhotos, type OrgApprovedPhoto } from '@/lib/org-approved-photos';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function sanitizeCssHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

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
  typewriter_tagline: OrgTypewriterTagline;
  approved_student_photos: OrgApprovedPhoto[];
}

interface PartnersLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

function isAssociateRole(role: string | null | undefined): boolean {
  return role === 'associate';
}

export default async function PartnersLayout({ children, params }: PartnersLayoutProps) {
  const { slug } = await params;

  const h = await headers();
  const pathname = h.get('x-pathname') ?? '';

  // Rotas públicas — não requerem auth
  const isPublicRoute =
    pathname === `/partners/${slug}` ||
    pathname === `/partners/${slug}/register` ||
    pathname === `/partners/${slug}/login` ||
    pathname === `/partners/${slug}/reset` ||
    pathname === `/partners/${slug}/reset/confirm`;
  // Nota: pathname === '' foi removido — quando o header x-pathname não chegar,
  // o layout cai no fluxo normal de autenticação e injeta OrgProvider corretamente.

  // Rotas de aluno B2B — auth e validação delegadas ao student/layout.tsx
  // Só pula quando pathname é conhecido; se vier vazio, trata como rota de parceiro.
  const isStudentRoute =
    pathname !== '' && pathname.startsWith(`/partners/${slug}/student`);

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
  type ProfileRow = {
    role: string | null;
    organization_id: string | null;
    plan_tier: string | null;
    full_name: string | null;
    avatar_url: string | null;
    theme_preference: string | null;
    must_change_password: boolean | null;
  };
  const profileRes = await adminClient
    .from('profiles')
    .select('role, organization_id, plan_tier, full_name, avatar_url, theme_preference, must_change_password')
    .eq('id', user.id)
    .single();
  const profile = profileRes.data as ProfileRow | null;

  // Aluno B2B com org vinculada — delega para student/layout.tsx em vez de redirecionar
  if (profile?.role === 'student' && profile?.organization_id) {
    // Em alguns requests de navegação (dev/hot-reload), o header x-pathname pode
    // não chegar aqui. Nesses casos, redirecionar para o dashboard cria self-redirect
    // (307 para a mesma URL). Se o path não é conhecido, apenas delega aos filhos.
    if (isStudentRoute || pathname === '') {
      return <>{children}</>;
    }
    redirect(`/partners/${slug}/student/dashboard`);
  }

  // Roles sem acesso ao painel de parceiros
  if (!profile || !['founder', 'admin', 'associate'].includes(profile.role ?? '')) {
    redirect('/portal');
  }

  // Busca org pelo slug (usa adminClient para evitar bloqueio de RLS)
  type OrgRow = {
    id: string; name: string; slug: string; logo_url: string | null;
    brand_primary: string | null; brand_secondary: string | null;
    brand_accent: string | null; plan_tier: string | null;
    max_students: number | null; invite_code: string | null;
    permissions: Record<string, boolean> | null;
    typewriter_tagline: unknown;
    approved_student_photos: unknown;
  };
  // Tenta o slug decodificado (Next.js já decodifica params, mas o encodeURIComponent
  // no Link do admin garante que %2B → + chega aqui corretamente).
  // Fallback tenta decodificar mais uma vez caso haja double-encoding.
  let decodedSlug = slug;
  try { decodedSlug = decodeURIComponent(slug); } catch { /* mantém slug original */ }

  let orgRes = await adminClient
    .from('organizations')
    .select('id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions, typewriter_tagline, approved_student_photos')
    .eq('slug', decodedSlug)
    .single();

  // Fallback: tenta com o slug original (sem decodificação extra)
  if (!orgRes.data && decodedSlug !== slug) {
    orgRes = await adminClient
      .from('organizations')
      .select('id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions, typewriter_tagline, approved_student_photos')
      .eq('slug', slug)
      .single();
  }

  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect('/portal');
  }

  // Founder e associado técnico só acessam a própria org; admin acessa qualquer uma
  if ((profile.role === 'founder' || isAssociateRole(profile.role)) && profile.organization_id !== org.id) {
    redirect('/portal');
  }

  // Associate só pode acessar páginas de redações (lista e detalhe de correção).
  // Com pathname vazio (dev/turbopack), delega para o client-side sem bloquear aqui.
  if (isAssociateRole(profile.role) && pathname !== '' && !/^\/partners\/[^/]+\/redacoes(\/[^/]+)?$/.test(pathname)) {
    redirect(`/partners/${slug}/redacoes`);
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
    typewriter_tagline: normalizeOrgTypewriterTagline(org.typewriter_tagline),
    approved_student_photos: normalizeOrgApprovedPhotos(org.approved_student_photos),
  };
  const safePrimary = sanitizeCssHexColor(branding.brand_primary, '#6366f1');
  const safeSecondary = sanitizeCssHexColor(branding.brand_secondary, '#8b5cf6');
  const safeAccent = sanitizeCssHexColor(branding.brand_accent, '#f59e0b');
  const safeThemePreference = profile.theme_preference === 'dark' || profile.theme_preference === 'light'
    ? profile.theme_preference
    : 'system';
  const safeSlugJson = JSON.stringify(slug)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  const safeThemeJson = JSON.stringify(safeThemePreference)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return (
    <OrgProvider
      org={branding}
      userProfile={{
        fullName: profile.full_name ?? 'Usuário',
        avatarUrl: profile.avatar_url ?? null,
        role: profile.role ?? 'founder',
        isTestAccount: profile.plan_tier === 'b2b_test',
        themePreference: safeThemePreference,
        mustChangePassword: profile.must_change_password === true,
      }}
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var slug=${safeSlugJson};var pref=${safeThemeJson};var key='partner-founder-theme-'+slug;var stored=localStorage.getItem(key);var storedFixed=(stored==='light'||stored==='dark')?stored:null;var prefFixed=(pref==='light'||pref==='dark')?pref:null;var base=storedFixed||prefFixed||'system';var resolved=base==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):base;var root=document.documentElement;if(resolved==='dark'){root.classList.add('dark');}else{root.classList.remove('dark');}root.style.colorScheme=resolved;root.dataset.partnerTheme=resolved;if(!storedFixed){localStorage.setItem(key,resolved);}}catch(e){}})();`,
        }}
      />
      {/* CSS variables de branding injetadas via style tag server-side */}
      <style>{`
        :root {
          --brand-primary: ${safePrimary};
          --brand-secondary: ${safeSecondary};
          --brand-accent: ${safeAccent};
        }
      `}</style>
      <div className="partner-founder-scope" data-partner-slug={slug}>
        {children}
      </div>
    </OrgProvider>
  );
}
