// Teste de paridade para a otimização do layout de /partners/[slug].
//
// Objetivo: provar que extrair a busca da org para uma função cacheada
// (unstable_cache) NÃO muda o que o layout recebe do banco nem o objeto
// `branding` derivado dele.
//
// Roda a MESMA query que o layout roda (mesma lista de colunas, mesmo
// .eq('slug').single(), mesmo fallback de slug cru) + a contagem de
// associados, para todos os slugs conhecidos, e imprime um snapshot
// estável (chaves ordenadas). Rode antes e depois da mudança e faça o diff.
//
//   node scripts/test-partner-org-cache.mjs > /tmp/before.json
//   ... aplica mudança ...
//   node scripts/test-partner-org-cache.mjs > /tmp/after.json
//   diff /tmp/before.json /tmp/after.json

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- carrega .env.local (sem dependência externa) ---
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch { /* ignora */ }
}
loadEnv('.env.local');
loadEnv('.env');

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// Idêntico ao layout / ao novo src/lib/partner-org.ts
const ORG_COLUMNS =
  'id, name, slug, logo_url, brand_primary, brand_secondary, brand_accent, plan_tier, max_students, invite_code, permissions, typewriter_tagline, approved_student_photos, is_mock';

// Cópia verbatim da lógica de busca do layout (decoded + fallback cru).
async function fetchPartnerOrgBySlug(decodedSlug, rawSlug) {
  let res = await admin.from('organizations').select(ORG_COLUMNS).eq('slug', decodedSlug).single();
  if (!res.data && decodedSlug !== rawSlug) {
    res = await admin.from('organizations').select(ORG_COLUMNS).eq('slug', rawSlug).single();
  }
  return res.data ?? null;
}

// Cópia verbatim de normalizeOrgTypewriterTagline / normalizeOrgApprovedPhotos
// (src/lib/org-*.ts) — para reproduzir o objeto `branding` do layout.
const DEFAULT_TAGLINE = { staticText: 'Nós nascemos para', animatedTexts: ['estudar.', 'evoluir.', 'aprovar.'] };
const T_LIMITS = { staticTextMax: 80, animatedTextMax: 48, animatedMax: 6 };
function normalizeOrgTypewriterTagline(value) {
  if (!value || typeof value !== 'object') return DEFAULT_TAGLINE;
  const c = value;
  const staticText = typeof c.staticText === 'string' ? c.staticText.trim() : '';
  const animatedTexts = Array.isArray(c.animatedTexts)
    ? c.animatedTexts.filter((i) => typeof i === 'string').map((i) => i.trim()).filter(Boolean)
    : [];
  if (!staticText || animatedTexts.length === 0) return DEFAULT_TAGLINE;
  return {
    staticText: staticText.slice(0, T_LIMITS.staticTextMax),
    animatedTexts: animatedTexts.slice(0, T_LIMITS.animatedMax).map((i) => i.slice(0, T_LIMITS.animatedTextMax)),
  };
}
const VALID_URL_RE = /^https?:\/\//i;
function normalizeOrgApprovedPhotos(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      const path = typeof item.path === 'string' ? item.path.trim() : '';
      const alt = typeof item.alt === 'string' && item.alt.trim() ? item.alt.trim() : `Aprovado ${index + 1}`;
      if (!url || !VALID_URL_RE.test(url) || !path) return null;
      return { url, path, alt };
    })
    .filter(Boolean);
}

function buildBranding(org, associateCount) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo_url: org.logo_url ?? null,
    brand_primary: org.brand_primary ?? '#6366f1',
    brand_secondary: org.brand_secondary ?? '#8b5cf6',
    brand_accent: org.brand_accent ?? '#f59e0b',
    plan_tier: org.plan_tier ?? 'b2b_basic',
    max_students: org.max_students ?? 200,
    invite_code: org.invite_code ?? null,
    permissions: org.permissions ?? {},
    typewriter_tagline: normalizeOrgTypewriterTagline(org.typewriter_tagline),
    approved_student_photos: normalizeOrgApprovedPhotos(org.approved_student_photos),
    hasAssociates: (associateCount ?? 0) > 0,
    is_mock: org.is_mock ?? false,
  };
}

// ordena chaves recursivamente pra o JSON.stringify sair estável
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  }
  return v;
}

const SLUGS = [
  'academiadasespecificas',
  'ave-palavra',
  'dialetica',
  'maxima-educacao-cursinho-preparatorio-enem-pas-vestibular',
  'opus-redacao',
  'prevestibular-aprovacao',
  'puptmais',
  'studytrack',
  'slug-que-nao-existe-xyz',
];

const out = {};
for (const slug of SLUGS) {
  const org = await fetchPartnerOrgBySlug(slug, slug);
  if (!org) {
    out[slug] = { found: false };
    continue;
  }
  const { count: associateCount } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .eq('role', 'associate');
  out[slug] = {
    found: true,
    raw_row_keys: Object.keys(org).sort(),
    branding: buildBranding(org, associateCount),
  };
}

console.log(JSON.stringify(sortKeys(out), null, 2));
