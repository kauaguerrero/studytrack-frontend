import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type MetricWindow = 'today' | 'week' | 'month' | 'total';
type RequesterRow = { role: string | null; organization_id: string | null };
type OrgRow = { id: string; slug: string };
type AnnRow = { author_id: string; essay_id: string; created_at: string };
type EssayRow = { id: string; total_score: number | null; submitted_at: string | null; corrected_at: string | null; status: string };
type TrendPoint = { date: string; corrections: number };
type DateRangeKeys = { fromKey: string; toKey: string };

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

/** 00:00 BRT = 03:00 UTC do mesmo dia. */
function brtDateKeyToUtcStartIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 3, 0, 0)).toISOString();
}

function getDateRangeKeys(win: MetricWindow, todayKey: string): DateRangeKeys | null {
  switch (win) {
    case 'today':
      return { fromKey: todayKey, toKey: todayKey };
    case 'week':
      return { fromKey: startOfWeekBrtKey(), toKey: todayKey };
    case 'month':
      return { fromKey: startOfMonthBrtKey(), toKey: todayKey };
    case 'total':
      return null;
  }
}

function buildTrend(win: MetricWindow, anns: AnnRow[], dateRangeKeys: DateRangeKeys | null, todayKey: string): TrendPoint[] {
  if (win === 'today') {
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) buckets[String(h).padStart(2, '0')] = 0;
    for (const ann of anns) {
      const key = String(brtHourOf(new Date(ann.created_at))).padStart(2, '0');
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }
  if (win === 'week' || win === 'month') {
    const buckets: Record<string, number> = {};
    let cursor = dateRangeKeys?.fromKey ?? todayKey;
    const toKey = dateRangeKeys?.toKey ?? todayKey;
    while (cursor <= toKey) {
      buckets[cursor] = 0;
      cursor = addDaysToKey(cursor, 1);
    }
    for (const ann of anns) {
      const day = toBrtDateKey(new Date(ann.created_at));
      if (day in buckets) buckets[day]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }
  // total: últimos 12 meses (calendário BRT)
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;
  const { adminClient, orgId } = auth;

  const url = new URL(request.url);
  const win = (['today', 'week', 'month', 'total'].includes(url.searchParams.get('window') ?? '')
    ? url.searchParams.get('window')
    : 'week') as MetricWindow;

  const todayKey = toBrtDateKey(new Date());
  const dateRangeKeys = getDateRangeKeys(win, todayKey);
  const windowStartIso = dateRangeKeys ? brtDateKeyToUtcStartIso(dateRangeKeys.fromKey) : null;
  const windowEndIso = dateRangeKeys ? brtDateKeyToUtcStartIso(addDaysToKey(dateRangeKeys.toKey, 1)) : null;

  const profilesTable = adminClient.from('profiles') as any;
  const essaysTable = adminClient.from('essays') as any;
  const correctionsTable = adminClient.from('essay_corrections') as any;

  // 1. Associates
  const { data: associates } = await profilesTable
    .select('id, full_name, email, avatar_url, organization_id, associate_permissions')
    .eq('organization_id', orgId)
    .eq('role', 'associate')
    .order('full_name', { ascending: true });

  type AssociateRow = {
    id: string; full_name: string | null; email: string | null;
    avatar_url: string | null; organization_id: string | null;
    associate_permissions: { can_correct?: boolean; can_import?: boolean; can_view_students?: boolean; active?: boolean } | null;
  };
  const associateList = (associates || []) as AssociateRow[];
  const associateIds = associateList.map(a => a.id);

  // 2. Pending essays — redações pendentes ENVIADAS dentro do período selecionado
  // (mesma regra da página de Redações: o filtro de período restringe por
  // submitted_at, não pela data da correção).
  let pendingQuery = essaysTable
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');
  if (windowStartIso) pendingQuery = pendingQuery.gte('submitted_at', windowStartIso);
  if (windowEndIso) pendingQuery = pendingQuery.lt('submitted_at', windowEndIso);
  const { count: pendingCount } = await pendingQuery;

  if (associateIds.length === 0) {
    return NextResponse.json({
      window: win,
      date_filter: dateRangeKeys ? { preset: win, from: dateRangeKeys.fromKey, to: dateRangeKeys.toKey } : null,
      summary: {
        total_associates: 0, active_associates: 0, inactive_associates: 0,
        pending_essays: pendingCount ?? 0, corrections_in_window: 0, total_corrections: 0,
        avg_essay_score: null, avg_turnaround_hours: null,
      },
      associate_stats: {},
      trend: buildTrend(win, [], dateRangeKeys, todayKey),
    });
  }

  // 3. Org essays (para lookup de nota/turnaround)
  const { data: orgEssays } = await essaysTable
    .select('id, total_score, submitted_at, corrected_at, status')
    .eq('org_id', orgId);
  const essayMap = new Map<string, EssayRow>(((orgEssays || []) as EssayRow[]).map(e => [e.id, e]));
  const orgEssayIds = Array.from(essayMap.keys());
  const safeEssayIds = orgEssayIds.length > 0 ? orgEssayIds : ['00000000-0000-0000-0000-000000000000'];

  // 4. Todas as correções (histórico completo — alimenta o "Total" acumulado,
  // que é deliberadamente independente do período selecionado)
  // Fonte autoritativa é essay_corrections (gravada ao submeter a correção), não
  // essay_annotations tipo 'correction' — anotações de texto são opcionais e o
  // corretor pode avaliar (notas + comentário geral) sem marcar nenhum trecho,
  // o que zerava as métricas mesmo com redações efetivamente corrigidas.
  const { data: allCorrections } = await correctionsTable
    .select('corrector_id, essay_id, corrected_at')
    .in('corrector_id', associateIds)
    .in('essay_id', safeEssayIds);

  const allAnns = ((allCorrections || []) as { corrector_id: string; essay_id: string; corrected_at: string }[])
    .map(c => ({ author_id: c.corrector_id, essay_id: c.essay_id, created_at: c.corrected_at }));

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
    const essay = essayMap.get(ann.essay_id);
    if (essay?.total_score != null) { s.window_score_sum += essay.total_score; s.window_score_count++; }
    if (essay?.submitted_at && essay?.corrected_at) {
      const diff = (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000;
      if (diff >= 0 && diff < 8_760) { s.window_turnaround_sum += diff; s.window_turnaround_count++; }
    }
  }

  const trend = buildTrend(win, windowAnns, dateRangeKeys, todayKey);

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
    window: win,
    date_filter: dateRangeKeys ? { preset: win, from: dateRangeKeys.fromKey, to: dateRangeKeys.toKey } : null,
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
