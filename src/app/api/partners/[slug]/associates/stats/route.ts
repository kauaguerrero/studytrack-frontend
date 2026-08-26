import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RequesterRow = { role: string | null; organization_id: string | null };
type OrgRow = { id: string; slug: string };
type AnnRow = { author_id: string; essay_id: string; created_at: string };
type TrendPoint = { date: string; corrections: number };
type DateRangeKeys = { fromKey: string; toKey: string };

const VALID_ESSAY_TYPES = ['enem', 'ufu', 'ueg', 'fuvest', 'vunesp'];

async function authorize(slug: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };
  }
  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: 'Supabase Admin não configurado.' }, { status: 500 }) };
  }
  const profilesTable = adminClient.from('profiles') as any;
  const organizationsTable = adminClient.from('organizations') as any;
  const [{ data: requester }, { data: org }] = await Promise.all([
    profilesTable.select('role, organization_id').eq('id', user.id).maybeSingle(),
    organizationsTable.select('id, slug').eq('slug', slug).maybeSingle(),
  ]) as [{ data: RequesterRow | null }, { data: OrgRow | null }];
  if (!org?.id) return { ok: false as const, response: NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 }) };
  const role = requester?.role ?? '';
  if (role !== 'admin' && role !== 'founder') {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) };
  }
  if (role === 'founder' && requester?.organization_id !== org.id) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 }) };
  }
  return { ok: true as const, adminClient, orgId: org.id };
}

// ─── Helpers de data em BRT (mesma lógica de /api/partners/[slug]/essays/overview) ──
// BRT é UTC-3 fixo (sem horário de verão desde 2019).

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function brtHourOf(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date));
}

function startOfWeekBrtKey(): string {
  const todayKey = toBrtDateKey(new Date());
  const [y, m, d] = todayKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const weekDay = (utcDate.getUTCDay() + 6) % 7; // segunda-feira = 0
  utcDate.setUTCDate(utcDate.getUTCDate() - weekDay);
  const yy = utcDate.getUTCFullYear();
  const mm = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function startOfMonthBrtKey(): string {
  const todayKey = toBrtDateKey(new Date());
  const [y, m] = todayKey.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function daysBetweenKeys(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const start = Date.UTC(ay, (am || 1) - 1, ad || 1);
  const end = Date.UTC(by, (bm || 1) - 1, bd || 1);
  return Math.round((end - start) / 86400000);
}

/** 00:00 BRT = 03:00 UTC do mesmo dia. */
function brtDateKeyToUtcStartIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 3, 0, 0)).toISOString();
}

function buildTrend(anns: AnnRow[], dateRangeKeys: DateRangeKeys | null, todayKey: string): TrendPoint[] {
  // Sem período: distribui o histórico completo em 12 meses (calendário BRT).
  if (!dateRangeKeys) {
    const buckets: Record<string, number> = {};
    const [ty, tm] = todayKey.split('-').map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    for (const ann of anns) {
      const key = toBrtDateKey(new Date(ann.created_at)).slice(0, 7);
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }

  // Período de um único dia (hoje/ontem/personalizado de 1 dia): buckets por hora BRT.
  if (dateRangeKeys.fromKey === dateRangeKeys.toKey) {
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) buckets[String(h).padStart(2, '0')] = 0;
    for (const ann of anns) {
      const key = String(brtHourOf(new Date(ann.created_at))).padStart(2, '0');
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }

  // Período de vários dias (semana/mês/personalizado): buckets por dia BRT.
  const buckets: Record<string, number> = {};
  let cursor = dateRangeKeys.fromKey;
  while (cursor <= dateRangeKeys.toKey) {
    buckets[cursor] = 0;
    cursor = addDaysToKey(cursor, 1);
  }
  for (const ann of anns) {
    const day = toBrtDateKey(new Date(ann.created_at));
    if (day in buckets) buckets[day]++;
  }
  return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;
  const { adminClient, orgId } = auth;

  const url = new URL(request.url);

  const essayTypeParam = url.searchParams.get('essay_type') ?? 'all';
  const filterByType = VALID_ESSAY_TYPES.includes(essayTypeParam) ? essayTypeParam : null;

  const todayKey = toBrtDateKey(new Date());
  const datePreset = url.searchParams.get('date_preset');
  const dateFromParam = url.searchParams.get('date_from');
  const dateToParam = url.searchParams.get('date_to');
  const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

  let dateRangeKeys: DateRangeKeys | null = null;
  if (datePreset === 'today') {
    dateRangeKeys = { fromKey: todayKey, toKey: todayKey };
  } else if (datePreset === 'yesterday') {
    const yesterdayKey = addDaysToKey(todayKey, -1);
    dateRangeKeys = { fromKey: yesterdayKey, toKey: yesterdayKey };
  } else if (datePreset === 'week') {
    dateRangeKeys = { fromKey: startOfWeekBrtKey(), toKey: todayKey };
  } else if (datePreset === 'month') {
    dateRangeKeys = { fromKey: startOfMonthBrtKey(), toKey: todayKey };
  } else if (
    dateFromParam && dateToParam &&
    DATE_KEY_RE.test(dateFromParam) && DATE_KEY_RE.test(dateToParam) &&
    dateFromParam <= dateToParam
  ) {
    const inclusiveDays = daysBetweenKeys(dateFromParam, dateToParam) + 1;
    if (inclusiveDays >= 1 && inclusiveDays <= 60) {
      dateRangeKeys = { fromKey: dateFromParam, toKey: dateToParam };
    }
  }

  const windowStartIso = dateRangeKeys ? brtDateKeyToUtcStartIso(dateRangeKeys.fromKey) : null;
  const windowEndIso = dateRangeKeys ? brtDateKeyToUtcStartIso(addDaysToKey(dateRangeKeys.toKey, 1)) : null;

  const profilesTable = adminClient.from('profiles') as any;
  const essaysTable = adminClient.from('essays') as any;
  const correctionsTable = adminClient.from('essay_corrections') as any;

  // Associados, pendentes e correções (com a redação de cada uma já
  // embutida via join) — três consultas totalmente independentes entre si,
  // disparadas em paralelo num único round-trip ao Supabase. A consulta de
  // correções não precisa esperar a lista de associados: filtra direto por
  // `corrector.organization_id`/`corrector.role` via join com `profiles`,
  // e por `essay.org_id`/`essay.essay_type` via join com `essays` — o que
  // também elimina a necessidade de buscar todas as redações da org à parte
  // só para consultar nota/turnaround (uma correção só é contada quando o
  // join encontra a redação e o corretor correspondentes).
  let pendingQuery = essaysTable
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');
  if (filterByType) pendingQuery = pendingQuery.eq('essay_type', filterByType);
  if (windowStartIso) pendingQuery = pendingQuery.gte('submitted_at', windowStartIso);
  if (windowEndIso) pendingQuery = pendingQuery.lt('submitted_at', windowEndIso);

  // Fonte autoritativa é essay_corrections (gravada ao submeter a correção),
  // não essay_annotations tipo 'correction' — anotações de texto são
  // opcionais e o corretor pode avaliar (notas + comentário geral) sem
  // marcar nenhum trecho, o que zerava as métricas mesmo com redações
  // efetivamente corrigidas.
  let correctionsQuery = correctionsTable
    .select('corrector_id, essay_id, corrected_at, essay:essays!inner(total_score, submitted_at, corrected_at, essay_type, org_id), corrector:profiles!inner(organization_id, role)')
    .eq('essay.org_id', orgId)
    .eq('corrector.organization_id', orgId)
    .eq('corrector.role', 'associate');
  if (filterByType) correctionsQuery = correctionsQuery.eq('essay.essay_type', filterByType);

  const [
    { data: associates },
    { count: pendingCount },
    { data: allCorrections },
  ] = await Promise.all([
    profilesTable
      .select('id, full_name, email, avatar_url, organization_id, associate_permissions')
      .eq('organization_id', orgId)
      .eq('role', 'associate')
      .order('full_name', { ascending: true }),
    pendingQuery,
    correctionsQuery,
  ]);

  type AssociateRow = {
    id: string; full_name: string | null; email: string | null;
    avatar_url: string | null; organization_id: string | null;
    associate_permissions: { can_correct?: boolean; can_import?: boolean; can_view_students?: boolean; active?: boolean } | null;
  };
  const associateList = (associates || []) as AssociateRow[];
  const associateIds = associateList.map(a => a.id);

  const dateFilterResponse = dateRangeKeys ? { preset: datePreset ?? 'custom', from: dateRangeKeys.fromKey, to: dateRangeKeys.toKey } : null;

  if (associateIds.length === 0) {
    return NextResponse.json({
      essay_type_filter: essayTypeParam,
      date_filter: dateFilterResponse,
      summary: {
        total_associates: 0, active_associates: 0, inactive_associates: 0,
        pending_essays: pendingCount ?? 0, corrections_in_window: 0, total_corrections: 0,
        avg_essay_score: null, avg_turnaround_hours: null,
      },
      associate_stats: {},
      trend: buildTrend([], dateRangeKeys, todayKey),
    });
  }

  type CorrectionWithEssayRow = {
    corrector_id: string; essay_id: string; corrected_at: string;
    essay: { total_score: number | null; submitted_at: string | null; corrected_at: string | null } | null;
  };
  const allAnns = ((allCorrections || []) as CorrectionWithEssayRow[])
    .map(c => ({ author_id: c.corrector_id, essay_id: c.essay_id, created_at: c.corrected_at, essay: c.essay }));

  // 5. Correções dentro do período selecionado (limites BRT) — alimenta o
  // gráfico de tendência, a contagem "no período" e (diferente de antes) a
  // nota média e o tempo médio, que agora respeitam o filtro de período.
  const windowAnns = windowStartIso && windowEndIso
    ? allAnns.filter(a => a.created_at >= windowStartIso && a.created_at < windowEndIso)
    : allAnns;

  const stats: Record<string, {
    corrections_in_window: number; total_corrections: number;
    window_score_sum: number; window_score_count: number;
    window_turnaround_sum: number; window_turnaround_count: number;
  }> = {};
  for (const id of associateIds) {
    stats[id] = {
      corrections_in_window: 0, total_corrections: 0,
      window_score_sum: 0, window_score_count: 0,
      window_turnaround_sum: 0, window_turnaround_count: 0,
    };
  }

  for (const ann of allAnns) {
    const s = stats[ann.author_id];
    if (s) s.total_corrections++;
  }
  for (const ann of windowAnns) {
    const s = stats[ann.author_id];
    if (!s) continue;
    s.corrections_in_window++;
    const essay = ann.essay;
    if (essay?.total_score != null) { s.window_score_sum += essay.total_score; s.window_score_count++; }
    if (essay?.submitted_at && essay?.corrected_at) {
      const diff = (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000;
      if (diff >= 0 && diff < 8_760) { s.window_turnaround_sum += diff; s.window_turnaround_count++; }
    }
  }

  const trend = buildTrend(windowAnns, dateRangeKeys, todayKey);

  const activeAssociates = associateList.filter(a => a.associate_permissions?.active !== false).length;
  const inactiveAssociates = associateList.length - activeAssociates;
  const correctionsInWindow = Object.values(stats).reduce((s, a) => s + a.corrections_in_window, 0);
  const totalCorrections = Object.values(stats).reduce((s, a) => s + a.total_corrections, 0);
  const windowScoreSum = Object.values(stats).reduce((s, a) => s + a.window_score_sum, 0);
  const windowScoreCount = Object.values(stats).reduce((s, a) => s + a.window_score_count, 0);
  const windowTurnaroundSum = Object.values(stats).reduce((s, a) => s + a.window_turnaround_sum, 0);
  const windowTurnaroundCount = Object.values(stats).reduce((s, a) => s + a.window_turnaround_count, 0);

  const associateStats: Record<string, object> = {};
  for (const [id, s] of Object.entries(stats)) {
    associateStats[id] = {
      corrections_in_window: s.corrections_in_window,
      total_corrections: s.total_corrections,
      avg_essay_score: s.window_score_count > 0 ? Math.round(s.window_score_sum / s.window_score_count) : null,
      avg_turnaround_hours: s.window_turnaround_count > 0 ? Math.round((s.window_turnaround_sum / s.window_turnaround_count) * 10) / 10 : null,
    };
  }

  return NextResponse.json({
    essay_type_filter: essayTypeParam,
    date_filter: dateFilterResponse,
    summary: {
      total_associates: associateList.length,
      active_associates: activeAssociates,
      inactive_associates: inactiveAssociates,
      pending_essays: pendingCount ?? 0,
      corrections_in_window: correctionsInWindow,
      total_corrections: totalCorrections,
      avg_essay_score: windowScoreCount > 0 ? Math.round(windowScoreSum / windowScoreCount) : null,
      avg_turnaround_hours: windowTurnaroundCount > 0 ? Math.round((windowTurnaroundSum / windowTurnaroundCount) * 10) / 10 : null,
    },
    associate_stats: associateStats,
    trend,
  });
}
