// Teste de paridade da otimização Tier 1: a rota
// src/app/api/partners/[slug]/essays/overview/route.ts vai passar a calcular o
// objeto `metrics` via um RPC Postgres (partner_essays_overview_metrics) em vez
// de puxar até 500 redações + 2 varreduras de contagem + todas as competências
// e agregar em JS.
//
// Este script:
//   1. Porta VERBATIM os helpers + o cálculo de cada campo de `metrics` da rota.
//   2. Roda a matriz (org × essay_type × preset de data) contra o banco real,
//      calculando `metrics` do jeito atual (JS).  ->  snapshot "reference".
//   3. Se o RPC existir, chama-o para cada célula e compara campo a campo
//      (tolerância 1e-9 para médias; igualdade exata p/ inteiros/contagens).
//
// Uso:
//   node scripts/test-overview-metrics-parity.mjs                 # só JS (baseline)
//   node scripts/test-overview-metrics-parity.mjs --compare-rpc   # JS vs RPC
//
// Salva o snapshot JS em scratchpad/overview-metrics-<ts>.json e imprime
// PASS/FAIL da comparação com o RPC.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ---------- env ----------
function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch { /* ignora */ }
}
loadEnv('.env.local');
loadEnv('.env');
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

const COMPARE_RPC = process.argv.includes('--compare-rpc');

// ===================================================================
// HELPERS — cópia verbatim de overview/route.ts
// ===================================================================
function toBrtDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}
function startOfWeekBrtKey() {
  const todayKey = toBrtDateKey(new Date());
  const [y, m, d] = todayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekDay = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - weekDay);
  const yy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function startOfMonthBrtKey() {
  const todayKey = toBrtDateKey(new Date());
  const [y, m] = todayKey.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}
function addDaysToKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function brtDateKeyToUtcStartIso(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 3, 0, 0)).toISOString();
}
function isEssayPending(status) { return status === 'pending' || status === 'awaiting_second'; }
function isEssayCorrected(status) { return status === 'corrected' || status === 'second_corrected' || status === 'seen'; }
function effectiveEssayScore(essay) {
  if (!isEssayCorrected(essay.status)) return null;
  const score = essay.status === 'second_corrected' && typeof essay.average_score === 'number'
    ? essay.average_score : essay.total_score;
  return typeof score === 'number' ? score : null;
}
function historicalImportDate(essay) {
  if (!essay.is_historical) return null;
  return essay.imported_at || essay.corrected_at || essay.submitted_at || null;
}

const ESSAY_COMPETENCY_COUNTS = { enem: 5, ufu: 5, ueg: 5, fuvest: 4, vunesp: 4 };
const VALID_TYPES = ['enem', 'ufu', 'ueg', 'fuvest', 'vunesp'];

// ===================================================================
// Cálculo do `metrics` — cópia verbatim de overview/route.ts (bloco ~328-444)
// ===================================================================
async function computeMetricsJS({ orgId, filterByType, submittedAtGte, submittedAtLt, dateRangeActive, secondCorrectorId }) {
  const maxComp = filterByType ? (ESSAY_COMPETENCY_COUNTS[filterByType] ?? 5) : 5;

  // #1 — metrics scan (9 colunas, limit 500)
  let mq = admin.from('essays')
    .select('id, student_id, status, submitted_at, corrected_at, imported_at, is_historical, total_score, average_score')
    .eq('org_id', orgId)
    .order('submitted_at', { ascending: false })
    .limit(500);
  if (filterByType) mq = mq.eq('essay_type', filterByType);
  if (submittedAtGte) mq = mq.gte('submitted_at', submittedAtGte);
  if (submittedAtLt) mq = mq.lt('submitted_at', submittedAtLt);
  const metricsList = (await mq).data || [];

  // #5 + #6 — pending_by_type
  const pbtA = await admin.from('essays').select('essay_type').eq('org_id', orgId).eq('status', 'pending');
  const pbtB = await admin.from('essays').select('essay_type').eq('org_id', orgId).eq('status', 'awaiting_second').eq('second_corrector_id', secondCorrectorId);
  const pendingByType = {};
  for (const row of (pbtA.data || [])) { const t = row.essay_type || 'geral'; pendingByType[t] = (pendingByType[t] || 0) + 1; }
  for (const row of (pbtB.data || [])) { const t = row.essay_type || 'geral'; pendingByType[t] = (pendingByType[t] || 0) + 1; }

  // #7 — competências dos corrigidos da janela
  const correctedIds = metricsList.filter((e) => isEssayCorrected(e.status)).map((e) => e.id);
  const competencyRows = correctedIds.length
    ? ((await admin.from('essay_competency_scores').select('essay_id, competency, score').in('essay_id', correctedIds)).data || [])
    : [];

  // #8 — profiles (p/ ranking)
  const studentIds = Array.from(new Set(metricsList.map((e) => e.student_id).filter(Boolean)));
  const profiles = studentIds.length
    ? ((await admin.from('profiles').select('id, full_name, avatar_url').in('id', studentIds)).data || [])
    : [];
  const studentsMap = new Map(profiles.map((s) => [s.id, s]));

  // ---- agregação (verbatim) ----
  const weekStart = startOfWeekBrtKey();
  const receivedWeek = dateRangeActive
    ? metricsList.length
    : metricsList.filter((e) => toBrtDateKey(new Date(e.submitted_at)) >= weekStart).length;
  const historicalReceivedWeek = dateRangeActive
    ? metricsList.filter((e) => historicalImportDate(e) !== null).length
    : metricsList.filter((e) => {
        const importedAt = historicalImportDate(e);
        return importedAt ? toBrtDateKey(new Date(importedAt)) >= weekStart : false;
      }).length;
  const pendingCount = metricsList.filter((e) => isEssayPending(e.status)).length;

  const scored = metricsList
    .map((essay) => ({ essay, score: effectiveEssayScore(essay) }))
    .filter((item) => item.score !== null);
  const scores = scored.map((item) => item.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const highestScore = scores.length ? Math.max(...scores) : null;
  const lowestScore = scores.length ? Math.min(...scores) : null;

  const byStudent = new Map();
  scored.forEach(({ essay, score }) => {
    const st = studentsMap.get(essay.student_id);
    const current = byStudent.get(essay.student_id);
    if (!current) {
      byStudent.set(essay.student_id, {
        sum: score, count: 1,
        avatar_url: st?.avatar_url ?? null,
        full_name: st?.full_name ?? null,
        last_essay_at: essay.corrected_at || essay.submitted_at || null,
      });
      return;
    }
    current.sum += score; current.count += 1;
    const prevTs = new Date(current.last_essay_at || 0).getTime();
    const nextTs = new Date(essay.corrected_at || essay.submitted_at || 0).getTime();
    if (nextTs > prevTs) current.last_essay_at = essay.corrected_at || essay.submitted_at || current.last_essay_at;
  });

  const competencyMap = {};
  const perEssayCompetency = new Map();
  for (const row of competencyRows) {
    const essayId = String(row.essay_id || '');
    const c = Number(row.competency);
    const score = Number(row.score);
    if (!essayId || !Number.isFinite(score)) continue;
    const k = `${essayId}:${c}`;
    const cur = perEssayCompetency.get(k) || { competency: c, scores: [] };
    cur.scores.push(score);
    perEssayCompetency.set(k, cur);
  }
  for (const row of perEssayCompetency.values()) {
    const c = Number(row.competency);
    if (c < 1 || c > maxComp) continue;
    if (!competencyMap[c]) competencyMap[c] = { sum: 0, count: 0 };
    competencyMap[c].sum += row.scores.reduce((s, x) => s + x, 0) / row.scores.length;
    competencyMap[c].count += 1;
  }
  const competencyScores = Array.from({ length: maxComp }, (_, i) => i + 1).map((c) => ({
    competency: c,
    avg: competencyMap[c]?.count ? Math.round(competencyMap[c].sum / competencyMap[c].count) : null,
    count: competencyMap[c]?.count ?? 0,
  }));

  const withCorrectionTime = metricsList.filter((e) => isEssayCorrected(e.status) && e.corrected_at && e.submitted_at);
  const avgCorrectionDays = withCorrectionTime.length
    ? Math.round(withCorrectionTime.reduce((acc, e) => {
        const diff = new Date(e.corrected_at).getTime() - new Date(e.submitted_at).getTime();
        return acc + diff / (1000 * 60 * 60 * 24);
      }, 0) / withCorrectionTime.length)
    : null;

  const studentScoreHistory = new Map();
  for (const essay of [...metricsList]
    .filter((e) => effectiveEssayScore(e) !== null)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())) {
    const arr = studentScoreHistory.get(essay.student_id) || [];
    arr.push(Number(effectiveEssayScore(essay)));
    studentScoreHistory.set(essay.student_id, arr);
  }
  const studentsWithHistory = Array.from(studentScoreHistory.values()).filter((arr) => arr.length >= 2);
  const improved = studentsWithHistory.filter((arr) => arr[arr.length - 1] > arr[arr.length - 2]).length;
  const improvementRate = studentsWithHistory.length > 0 ? Math.round((improved / studentsWithHistory.length) * 100) : null;

  const ranking = Array.from(byStudent.entries())
    .map(([student_id, value]) => ({
      student_id,
      full_name: value.full_name,
      avatar_url: value.avatar_url,
      avg_score: value.count > 0 ? value.sum / value.count : 0,
      last_essay_at: value.last_essay_at,
    }))
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 10);

  return {
    received_week: receivedWeek,
    historical_received_week: historicalReceivedWeek,
    pending_count: pendingCount,
    avg_score: avgScore,
    highest_score: highestScore,
    lowest_score: lowestScore,
    ranking,
    competency_scores: competencyScores,
    weakest_competency: null,
    avg_correction_days: avgCorrectionDays,
    improvement_rate: improvementRate,
    improvement_students_improved: improved,
    improvement_students_eligible: studentsWithHistory.length,
    pending_by_type: pendingByType,
  };
}

// ===================================================================
// preset de data -> gte/lt  (cópia verbatim da rota, ramos 'month'/'week'/none)
// ===================================================================
function dateParamsForPreset(preset) {
  const todayKey = toBrtDateKey(new Date());
  let dateRangeKeys = null;
  if (preset === 'week') dateRangeKeys = { fromKey: startOfWeekBrtKey(), toKey: todayKey };
  else if (preset === 'month') dateRangeKeys = { fromKey: startOfMonthBrtKey(), toKey: todayKey };
  const submittedAtGte = dateRangeKeys ? brtDateKeyToUtcStartIso(dateRangeKeys.fromKey) : null;
  const submittedAtLt = dateRangeKeys ? brtDateKeyToUtcStartIso(addDaysToKey(dateRangeKeys.toKey, 1)) : null;
  return { submittedAtGte, submittedAtLt, dateRangeActive: dateRangeKeys !== null };
}

// ---------- deep compare ----------
function diffMetrics(js, rpc, path = '') {
  const out = [];
  const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 1e-9;
  const keys = new Set([...Object.keys(js || {}), ...Object.keys(rpc || {})]);
  for (const k of keys) {
    const p = path ? `${path}.${k}` : k;
    const a = js?.[k], b = rpc?.[k];
    if (Array.isArray(a) || Array.isArray(b)) {
      const aa = a || [], bb = b || [];
      if (aa.length !== bb.length) { out.push(`${p}: length ${aa.length} != ${bb.length}`); continue; }
      for (let i = 0; i < aa.length; i++) {
        if (typeof aa[i] === 'object') out.push(...diffMetrics(aa[i], bb[i], `${p}[${i}]`));
        else if (aa[i] !== bb[i] && !near(aa[i], bb[i])) out.push(`${p}[${i}]: ${JSON.stringify(aa[i])} != ${JSON.stringify(bb[i])}`);
      }
    } else if (a && b && typeof a === 'object') {
      out.push(...diffMetrics(a, b, p));
    } else if (a !== b && !near(a, b)) {
      out.push(`${p}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
    }
  }
  return out;
}

// ---------- matriz ----------
const ORGS = [
  { slug: 'ave-palavra', id: '5a0ba57b-2569-489d-8151-9308a532f4a1', types: ['enem', 'vunesp'] },
  { slug: 'academiadasespecificas', id: '319aa41b-daba-4884-a31c-e2de8d8e1f72', types: ['enem'] },
  { slug: 'puptmais', id: '1d821c0d-9ba8-49d3-9f63-a5bd42e7fb61', types: ['enem'], second_corrector: 'd97df91b-7ce9-4bbf-bbaf-390b6e044578' },
  { slug: 'opus-redacao', id: '6ffc8292-a074-44aa-abe5-cf4372d69d82', types: ['enem', 'ueg', 'ufu'] },
  { slug: 'prevestibular-aprovacao', id: '6487a042-a09f-441c-a359-c8f2a346af2e', types: ['enem'] },
  { slug: 'dialetica', id: '6f5a2863-832f-444e-995e-7c87bd0e43e6', types: ['enem'] },
];
const DUMMY_CORRECTOR = '00000000-0000-0000-0000-0000000000ff';
const PRESETS = [null, 'month', 'week'];

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}

const snapshot = {};
let rpcChecked = 0, rpcFailed = 0;

for (const org of ORGS) {
  const secondCorrector = org.second_corrector || DUMMY_CORRECTOR;
  for (const rawType of ['all', ...org.types]) {
    const filterByType = VALID_TYPES.includes(rawType) ? rawType : null;
    for (const preset of PRESETS) {
      const cellKey = `${org.slug} | type=${rawType} | preset=${preset ?? 'none'}`;
      const { submittedAtGte, submittedAtLt, dateRangeActive } = dateParamsForPreset(preset);

      const jsMetrics = await computeMetricsJS({
        orgId: org.id, filterByType, submittedAtGte, submittedAtLt, dateRangeActive, secondCorrectorId: secondCorrector,
      });
      snapshot[cellKey] = sortKeys(jsMetrics);

      if (COMPARE_RPC) {
        const { data: rpcMetrics, error } = await admin.rpc('partner_essays_overview_metrics', {
          p_org_id: org.id,
          p_essay_type: filterByType,
          p_submitted_gte: submittedAtGte,
          p_submitted_lt: submittedAtLt,
          p_date_range_active: dateRangeActive,
          p_second_corrector_id: secondCorrector,
        });
        rpcChecked++;
        if (error) { rpcFailed++; console.log(`FAIL ${cellKey}\n  rpc error: ${error.message}`); continue; }
        const diffs = diffMetrics(jsMetrics, rpcMetrics);
        if (diffs.length) { rpcFailed++; console.log(`FAIL ${cellKey}`); diffs.forEach((d) => console.log(`  - ${d}`)); }
        else console.log(`ok   ${cellKey}`);
      }
    }
  }
}

console.log('\n' + JSON.stringify(sortKeys(snapshot), null, 2));
if (COMPARE_RPC) {
  console.error(`\n=== RPC parity: ${rpcChecked - rpcFailed}/${rpcChecked} células OK ===`);
  process.exit(rpcFailed ? 1 : 0);
}
