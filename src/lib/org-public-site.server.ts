import 'server-only';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  filterContentForPublic,
  resolveSiteTheme,
  type OrgPublicSiteView,
  type SiteContent,
  type SiteSeo,
} from '@/lib/org-public-site';

/**
 * Leitura da Página Pública da Organização para o SSR.
 *
 * Lê o Supabase direto (padrão dos server components deste repo — ver
 * getPartnerOrgBySlug em src/lib/partner-org.ts) em vez de chamar o Flask:
 * a página precisa das meta tags renderizadas no servidor para o crawler do
 * WhatsApp, e é a URL que a escola divulga — não deve depender de um segundo
 * serviço estar de pé. A validação e a sanitização do conteúdo acontecem na
 * ESCRITA, no Flask (org_public_site_schema.py), então o que chega aqui já
 * está limpo; o que resta é o filtro de consentimento, aplicado abaixo.
 *
 * O Flask expõe o mesmo JSON em GET /api/partners/<slug>/public-site para o
 * editor/preview do admin e consumidores externos.
 */

interface SiteRow {
  enabled: boolean;
  template: string;
  content: SiteContent | null;
  theme_overrides: Record<string, string> | null;
  seo: SiteSeo | null;
  published_at: string | null;
  updated_at: string | null;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
}

async function fetchSiteRow(slug: string): Promise<{ org: OrgRow; site: SiteRow } | null> {
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, logo_url, brand_primary, brand_accent')
    .eq('slug', slug)
    .maybeSingle();

  if (!org) return null;

  const { data: site } = await admin
    .from('org_public_sites')
    .select('enabled, template, content, theme_overrides, seo, published_at, updated_at')
    .eq('organization_id', (org as OrgRow).id)
    .maybeSingle();

  if (!site) return null;
  return { org: org as OrgRow, site: site as SiteRow };
}

/**
 * TTL de 120s: a página muda raramente, e uma edição precisa aparecer rápido
 * o bastante para o founder conferir. Invalidação imediata possível via
 * revalidateTag('org-public-site' | `org-public-site:<slug>`) — usada pela
 * rota de escrita.
 */
function getCachedSiteRow(slug: string) {
  return unstable_cache(
    () => fetchSiteRow(slug),
    ['org-public-site', slug],
    { revalidate: 120, tags: ['org-public-site', `org-public-site:${slug}`] },
  )();
}

/**
 * Devolve a página montada, ou null quando a org não existe, não tem página,
 * ou a página está desligada e não é um preview autorizado.
 *
 * `preview` só deve vir true depois de a rota confirmar que quem pede é
 * founder/admin da org — a checagem de permissão não é feita aqui.
 */
export async function getOrgPublicSite(
  slug: string,
  { preview = false }: { preview?: boolean } = {},
): Promise<OrgPublicSiteView | null> {
  const row = await getCachedSiteRow(slug);
  if (!row) return null;

  const { org, site } = row;
  if (!site.enabled && !preview) return null;

  const content = filterContentForPublic(site.content, { preview });
  // Sem seção nenhuma não há página — evita publicar uma URL em branco.
  if (Object.keys(content).length === 0) return null;

  return {
    enabled: Boolean(site.enabled),
    preview,
    template: site.template || 'premium_v1',
    content,
    theme: resolveSiteTheme(org, site.theme_overrides),
    seo: site.seo ?? {},
    org: {
      name: org.name,
      slug: org.slug,
      logo_url: org.logo_url,
      login_url: `/partners/${org.slug}/login`,
      register_url: `/partners/${org.slug}/register`,
    },
  };
}

/** Slugs com página publicada — usado por robots.ts e sitemap.ts. */
export async function listPublishedSiteSlugs(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { data } = await admin
        .from('org_public_sites')
        .select('organization_id, organizations!inner(slug)')
        .eq('enabled', true);

      const rows = (data ?? []) as unknown as { organizations: { slug: string } | null }[];
      return rows.map((r) => r.organizations?.slug).filter((s): s is string => Boolean(s));
    },
    ['org-public-site-slugs'],
    { revalidate: 300, tags: ['org-public-site'] },
  )();
}
