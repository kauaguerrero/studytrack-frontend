/**
 * Raiz do portal da organização: /partners/[slug]
 *
 * Duas páginas moram aqui:
 *
 * 1. **Página pública da org** (`org_public_sites.enabled = true`) — o site
 *    institucional da escola, servido a visitantes anônimos. É a URL que a
 *    escola divulga. Founder/admin da org também veem com `?preview=1`, mesmo
 *    com a página desligada, com uma faixa de "Pré-visualização".
 *
 * 2. **Cartão de entrada** (comportamento histórico, inalterado) — quando a
 *    org não tem página pública, ou não está publicada. Usuário autenticado
 *    continua sendo redirecionado para o lugar certo, como sempre foi.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { GraduationCap, BookOpen, ArrowRight, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrgPublicSite } from '@/lib/org-public-site.server';
import { OrgSiteTemplate } from '@/components/org-site/OrgSiteTemplate';

const SITE_BASE_URL = 'https://studytrack.com.br';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function sanitizeCssHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

interface OrgLandingProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Preview só para quem administra a org. Sem isso, `?preview=1` publicaria
 * qualquer rascunho para qualquer visitante.
 */
async function canPreview(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .maybeSingle();

  const profile = data as { role: string | null; organization_id: string | null } | null;
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.role !== 'founder' && profile.role !== 'associate') return false;

  const { data: orgData } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle();
  const org = orgData as { id: string } | null;
  return Boolean(org && profile.organization_id === org.id);
}

export async function generateMetadata({ params, searchParams }: OrgLandingProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getOrgPublicSite(slug);

  // Preview e página desligada não devem ser indexados, e o cartão de entrada
  // nunca foi indexável (robots.ts já bloqueava /partners/).
  if (!site) {
    const preview = (await searchParams).preview;
    return { robots: { index: false, follow: false }, title: preview ? 'Pré-visualização' : undefined };
  }

  const title = site.seo.title || site.org.name;
  const description = site.seo.description || undefined;
  const url = `${SITE_BASE_URL}/partners/${slug}`;
  const image = site.seo.og_image_url || site.org.logo_url || undefined;

  return {
    title,
    description,
    // Sobrescreve o template "%s | StudyTrack" do layout raiz: a página é da
    // escola, não da StudyTrack.
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      url,
      siteName: site.org.name,
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: site.org.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function Page({ params, searchParams }: OrgLandingProps) {
  const { slug } = await params;
  const previewRequested = (await searchParams).preview === '1';

  // --- 1. Página pública publicada: serve a visitante anônimo ---------------
  const publishedSite = await getOrgPublicSite(slug);
  if (publishedSite) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Usuário logado continua indo para o próprio painel (comportamento
    // histórico da rota) — a menos que peça explicitamente a pré-visualização.
    if (!user || previewRequested) {
      const preview = previewRequested && (await canPreview(slug));
      return <OrgSiteTemplate site={{ ...publishedSite, preview }} baseUrl={SITE_BASE_URL} />;
    }
  } else if (previewRequested && (await canPreview(slug))) {
    // --- 2. Preview de página ainda desligada ------------------------------
    const draft = await getOrgPublicSite(slug, { preview: true });
    if (draft) return <OrgSiteTemplate site={draft} baseUrl={SITE_BASE_URL} />;
  }

  // --- 3. Comportamento histórico (cartão de entrada) -----------------------
  return <OrgEntryCard slug={slug} />;
}

async function OrgEntryCard({ slug }: { slug: string }) {
  // Busca dados públicos da org (nome, branding)
  type OrgRow = {
    id: string; name: string; logo_url: string | null;
    brand_primary: string | null; brand_secondary: string | null; brand_accent: string | null;
  };
  const adminClient = createAdminClient();
  const orgRes = await adminClient
    .from('organizations')
    .select('id, name, logo_url, brand_primary, brand_secondary, brand_accent')
    .eq('slug', slug)
    .single();

  const org = orgRes.data as OrgRow | null;

  if (!org) {
    redirect('/');
  }

  // Se usuário já está logado, redireciona para o lugar certo
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'founder' || profile?.role === 'admin') {
      redirect(`/partners/${slug}/dashboard`);
    }
    if (profile?.role === 'associate') {
      redirect(`/partners/${slug}/redacoes`);
    }
    if (profile?.role === 'student') {
      redirect(`/partners/${slug}/student/dashboard`);
    }
  }

  const primary = sanitizeCssHexColor(org.brand_primary, '#6366f1');
  const secondary = sanitizeCssHexColor(org.brand_secondary, '#8b5cf6');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}15 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="rounded-2xl border bg-white shadow-xl dark:bg-slate-900 overflow-hidden">
          {/* Header com cor da marca */}
          <div
            className="px-8 py-8 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            {org.logo_url ? (
              <Image
                src={org.logo_url}
                alt={org.name}
                width={72}
                height={72}
                className="mx-auto mb-4 rounded-xl object-contain"
              />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white/20">
                <GraduationCap className="h-8 w-8" />
              </div>
            )}
            <h1 className="text-2xl font-bold">{org.name}</h1>
            <p className="mt-1 text-sm opacity-80">Plataforma de Estudos StudyTrack</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-4">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Acesse sua conta para continuar estudando
            </p>

            {/* Botão de acesso para alunos */}
            <Button
              asChild
              className="w-full gap-2 text-white"
              style={{ backgroundColor: primary }}
            >
              <Link href={`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`}>
                <BookOpen className="h-4 w-4" />
                Acessar como Aluno
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>

            {/* Link para founder */}
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href={`/auth/login?next=/partners/${slug}/dashboard`}>
                <Users className="h-4 w-4" />
                Acesso do Responsável
              </Link>
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Não tem conta?{' '}
              <Link
                href={`/partners/${slug}/register`}
                className="underline hover:text-slate-600"
                style={{ color: primary }}
              >
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        {/* Rodapé StudyTrack */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by{' '}
          <Link href="https://studytrack.com.br" className="underline hover:text-slate-600">
            StudyTrack
          </Link>
        </p>
      </div>
    </div>
  );
}
