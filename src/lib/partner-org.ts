import 'server-only';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Busca da organização por slug, usada pelo layout de /partners/[slug]/*.
 *
 * O layout roda em TODA navegação entre páginas do painel (dashboard, alunos,
 * redações, config, ranking...) e a linha da org (~15 colunas, incluindo o
 * array JSON `approved_student_photos` e o objeto `permissions`) é a maior
 * fatia de egress dessas navegações. Branding/permissões de org mudam raro,
 * então cacheamos a linha por slug com TTL curto (60s) — hit rate alto para
 * um usuário navegando, e qualquer alteração (cores, permissão de módulo,
 * slug renomeado, org nova) propaga em no máximo 1 min. Invalidação imediata
 * possível via revalidateTag('partner-org' | `partner-org:<slug>`).
 *
 * O que NÃO passa por aqui e continua por-request no layout:
 *   - auth / perfil do usuário (decisão de não cachear auth)
 *   - checagem cross-org (compara profile.organization_id fresco vs org.id)
 *   - contagem de associados para a sidebar
 *   - pingDemoOrgAccess (side-effect de acesso, precisa rodar sempre)
 */

export interface PartnerOrgRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_primary: string | null;
  brand_secondary: string | null;
  brand_accent: string | null;
  plan_tier: string | null;
  max_students: number | null;
  invite_code: string | null;
  permissions: Record<string, boolean> | null;
  typewriter_tagline: unknown;
  approved_student_photos: unknown;
  is_mock: boolean | null;
  timezone: string | null;
  essay_window_enabled: boolean | null;
  essay_window_start_day: string | null;
  essay_window_start_time: string | null;
  essay_window_end_day: string | null;
  essay_window_end_time: string | null;
}

const ORG_COLUMNS =
  'id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions, typewriter_tagline, approved_student_photos, is_mock, timezone, essay_window_enabled, essay_window_start_day, essay_window_start_time, essay_window_end_day, essay_window_end_time';

// Sem acesso a APIs de request (headers/cookies) aqui dentro — só o slug e o
// admin client (service role, sem contexto de request). Requisito do
// unstable_cache. Tenta o slug decodificado e, se não achar, o slug cru
// (cobre casos de %2B → + vindos de Link com encodeURIComponent).
async function fetchPartnerOrgBySlug(
  decodedSlug: string,
  rawSlug: string,
): Promise<PartnerOrgRow | null> {
  const admin = createAdminClient();

  let res = await admin
    .from('organizations')
    .select(ORG_COLUMNS)
    .eq('slug', decodedSlug)
    .single();

  if (!res.data && decodedSlug !== rawSlug) {
    res = await admin
      .from('organizations')
      .select(ORG_COLUMNS)
      .eq('slug', rawSlug)
      .single();
  }

  return (res.data as PartnerOrgRow | null) ?? null;
}

export function getPartnerOrgBySlug(
  decodedSlug: string,
  rawSlug: string,
): Promise<PartnerOrgRow | null> {
  return unstable_cache(
    () => fetchPartnerOrgBySlug(decodedSlug, rawSlug),
    ['partner-org-by-slug', decodedSlug, rawSlug],
    { revalidate: 60, tags: ['partner-org', `partner-org:${decodedSlug}`] },
  )();
}
