import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ProfileRow = {
  role: string | null;
  organization_id: string | null;
};

type EssayRow = {
  id: string;
  student_id: string;
  status: 'pending' | 'corrected' | 'seen' | 'awaiting_second' | 'second_corrected';
  submitted_at: string;
  corrected_at: string | null;
  imported_at?: string | null;
  is_historical?: boolean | null;
  total_score: number | null;
  average_score?: number | null;
  text: string | null;
  second_corrector_id?: string | null;
  correction_lock_user_id?: string | null;
  correction_lock_at?: string | null;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  [key: string]: unknown;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

function parsePageParam(value: string | null, fallback: number, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
}

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function startOfWeekBrtKey(): string {
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

/** BRT é UTC-3 fixo (sem horário de verão desde 2019) — 00:00 BRT = 03:00 UTC do mesmo dia. */
function brtDateKeyToUtcStartIso(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 3, 0, 0)).toISOString();
}

function isEssayPending(status: EssayRow['status']): boolean {
  return status === 'pending' || status === 'awaiting_second';
}

function isEssayCorrected(status: EssayRow['status']): boolean {
  return status === 'corrected' || status === 'second_corrected' || status === 'seen';
}

function effectiveEssayScore(essay: EssayRow): number | null {
  if (!isEssayCorrected(essay.status)) return null;
  const score = essay.status === 'second_corrected' && typeof essay.average_score === 'number'
    ? essay.average_score
    : essay.total_score;
  return typeof score === 'number' ? score : null;
}

function historicalImportDate(essay: EssayRow): string | null {
  if (!essay.is_historical) return null;
  return essay.imported_at || essay.corrected_at || essay.submitted_at || null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const essayTypeFilter = url.searchParams.get('essay_type') ?? 'all';
  const validTypes = ['enem', 'ufu', 'ueg', 'fuvest', 'vunesp'];
  const filterByType = validTypes.includes(essayTypeFilter) ? essayTypeFilter : null;
  const pendingSortAscending = url.searchParams.get('pending_sort') !== 'desc';

  const datePreset = url.searchParams.get('date_preset');
  const dateFromParam = url.searchParams.get('date_from');
  const dateToParam = url.searchParams.get('date_to');
  const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
  const todayKey = toBrtDateKey(new Date());

  let dateRangeKeys: { fromKey: string; toKey: string } | null = null;
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

  const submittedAtGte = dateRangeKeys ? brtDateKeyToUtcStartIso(dateRangeKeys.fromKey) : null;
  const submittedAtLt = dateRangeKeys ? brtDateKeyToUtcStartIso(addDaysToKey(dateRangeKeys.toKey, 1)) : null;

  const ESSAY_COMPETENCY_COUNTS: Record<string, number> = {
    enem: 5, ufu: 5, ueg: 5, fuvest: 4, vunesp: 4,
  };
  const maxComp = filterByType ? (ESSAY_COMPETENCY_COUNTS[filterByType] ?? 5) : 5;
  const pendingPage = parsePageParam(url.searchParams.get('pending_page'), 1, 1000);
  const pendingLimit = parsePageParam(url.searchParams.get('pending_limit'), 10, 50);
  const correctedPage = parsePageParam(url.searchParams.get('corrected_page'), 1, 1000);
  const correctedLimit = parsePageParam(url.searchParams.get('corrected_limit'), 10, 50);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<ProfileRow>(),
  ]);

  if (!org?.id) return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  if (!requester) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });

  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder';
  const isAssociate = role === 'associate';
  if (!isAdmin && !isFounder && !isAssociate) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if ((isFounder || isAssociate) && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const essayFields = 'id, student_id, status, essay_type, submitted_at, corrected_at, imported_at, is_historical, total_score, average_score, text, theme, second_corrector_id, correction_lock_user_id, correction_lock_at';
  const pendingFrom = (pendingPage - 1) * pendingLimit;
  const pendingTo = pendingFrom + pendingLimit - 1;
  const correctedFrom = (correctedPage - 1) * correctedLimit;
  const correctedTo = correctedFrom + correctedLimit - 1;

  const [essaysMetricsRes, pendingRes, assignedSecondRes, correctedRes, pendingByTypeRes, assignedSecondByTypeRes] = await Promise.all([
    (() => {
      let q = admin
        .from('essays')
        .select('*')
        .eq('org_id', org.id)
        .order('submitted_at', { ascending: false })
        .limit(500);
      if (filterByType) q = q.eq('essay_type', filterByType);
      if (submittedAtGte) q = q.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) q = q.lt('submitted_at', submittedAtLt);
      return q;
    })(),
    (() => {
      // "Aguardando correção" mostra as redações pendentes enviadas dentro
      // do período selecionado no filtro (mesma regra do tipo de redação).
      let query = admin
        .from('essays')
        .select(essayFields, { count: 'exact' })
        .eq('org_id', org.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query
        .eq('status', 'pending')
        .order('submitted_at', { ascending: pendingSortAscending })
        .range(pendingFrom, pendingTo);
    })(),
    (() => {
      let query = admin
        .from('essays')
        .select(essayFields)
        .eq('org_id', org.id)
        .eq('status', 'awaiting_second')
        .eq('second_corrector_id', user.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query.order('submitted_at', { ascending: true });
    })(),
    (() => {
      let query = admin
        .from('essays')
        .select(essayFields, { count: 'exact' })
        .eq('org_id', org.id);
      if (filterByType) query = query.eq('essay_type', filterByType);
      if (submittedAtGte) query = query.gte('submitted_at', submittedAtGte);
      if (submittedAtLt) query = query.lt('submitted_at', submittedAtLt);
      return query
        .in('status', ['corrected', 'second_corrected', 'seen'])
        .order('submitted_at', { ascending: false })
        .range(correctedFrom, correctedTo);
    })(),
    // Independentes do filtro de tipo/período: usados para avisar o corretor
    // sobre pendências em bancas diferentes da que está sendo visualizada.
    admin.from('essays').select('essay_type').eq('org_id', org.id).eq('status', 'pending'),
    admin.from('essays').select('essay_type').eq('org_id', org.id).eq('status', 'awaiting_second').eq('second_corrector_id', user.id),
  ]);

  if (essaysMetricsRes.error) {
    return NextResponse.json(
      {
        error: 'Não foi possível carregar redações.',
        details: process.env.NODE_ENV === 'development' ? essaysMetricsRes.error?.message : undefined,
      },
      { status: 500 },
    );
  }

  const metricsList = (essaysMetricsRes.data || []) as EssayRow[];

  let competencyRows: { essay_id: string; competency: number; score: number }[] = [];
  if (metricsList.length > 0) {
    const correctedIds = metricsList
      .filter((e) => isEssayCorrected(e.status))
      .map((e) => e.id);

    if (correctedIds.length > 0) {
      const { data: compData } = await admin
        .from('essay_competency_scores')
        .select('essay_id, competency, score')
        .in('essay_id', correctedIds);
      competencyRows = (compData || []) as { essay_id: string; competency: number; score: number }[];
    }
  }

  const pendingItemsRaw = ((pendingRes.error ? [] : pendingRes.data) || []) as EssayRow[];
  const assignedSecondItemsRaw = ((assignedSecondRes.error ? [] : assignedSecondRes.data) || []) as EssayRow[];
  const correctedItemsRaw = ((correctedRes.error ? [] : correctedRes.data) || []) as EssayRow[];
  const pendingTotal = pendingRes.error ? 0 : (pendingRes.count || 0);
  const pendingDisplayTotal = pendingTotal + assignedSecondItemsRaw.length;
  const correctedTotal = correctedRes.error ? 0 : (correctedRes.count || 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingDisplayTotal / pendingLimit));
  const correctedTotalPages = Math.max(1, Math.ceil(correctedTotal / correctedLimit));

  // Pendentes por banca (todas, sem filtro de tipo/período) — alimenta o
  // aviso de "redações pendentes em outras bancas" na UI.
  const pendingByType: Record<string, number> = {};
  for (const row of (pendingByTypeRes.error ? [] : pendingByTypeRes.data) || []) {
    const t = (row as { essay_type: string | null }).essay_type || 'geral';
    pendingByType[t] = (pendingByType[t] || 0) + 1;
  }
  for (const row of (assignedSecondByTypeRes.error ? [] : assignedSecondByTypeRes.data) || []) {
    const t = (row as { essay_type: string | null }).essay_type || 'geral';
    pendingByType[t] = (pendingByType[t] || 0) + 1;
  }

  const studentIds = Array.from(new Set(
    [...metricsList, ...pendingItemsRaw, ...assignedSecondItemsRaw, ...correctedItemsRaw]
      .map((e) => e.student_id)
      .filter(Boolean),
  ));

  let studentsMap = new Map<string, StudentRow>();
  if (studentIds.length > 0) {
    const { data: students } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', studentIds);
    studentsMap = new Map(((students || []) as StudentRow[]).map((s) => [s.id, s]));
  }

  const lockUserIds = Array.from(new Set(
    [...pendingItemsRaw, ...assignedSecondItemsRaw, ...correctedItemsRaw]
      .map((e) => e.correction_lock_user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  ));
  let lockUsersMap = new Map<string, StudentRow>();
  if (lockUserIds.length > 0) {
    const { data: lockUsers } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', lockUserIds);
    lockUsersMap = new Map(((lockUsers || []) as StudentRow[]).map((s) => [s.id, s]));
  }

  // Quando há filtro de período ativo, `metricsList` já veio restrito a esse
  // intervalo pela query (submitted_at) — "recebidas" passa a contar o
  // intervalo selecionado em vez da semana corrente fixa.
  const weekStart = startOfWeekBrtKey();
  const receivedWeek = dateRangeKeys
    ? metricsList.length
    : metricsList.filter((e) => toBrtDateKey(new Date(e.submitted_at)) >= weekStart).length;
  const historicalReceivedWeek = dateRangeKeys
    ? metricsList.filter((e) => historicalImportDate(e) !== null).length
    : metricsList.filter(
        (e) => {
          const importedAt = historicalImportDate(e);
          return importedAt ? toBrtDateKey(new Date(importedAt)) >= weekStart : false;
        },
      ).length;
  const pendingCount = metricsList.filter((e) => isEssayPending(e.status)).length;

  const scored = metricsList
    .map((essay) => ({ essay, score: effectiveEssayScore(essay) }))
    .filter((item): item is { essay: EssayRow; score: number } => item.score !== null);
  const scores = scored.map((item) => item.score);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const highestScore = scores.length ? Math.max(...scores) : null;
  const lowestScore = scores.length ? Math.min(...scores) : null;

  const byStudent = new Map<string, { sum: number; count: number; avatar_url: string | null; full_name: string | null; last_essay_at: string | null }>();
  scored.forEach(({ essay, score }) => {
    const st = studentsMap.get(essay.student_id);
    const current = byStudent.get(essay.student_id);
    if (!current) {
      byStudent.set(essay.student_id, {
        sum: score,
        count: 1,
        avatar_url: st?.avatar_url ?? null,
        full_name: st?.full_name ?? null,
        last_essay_at: essay.corrected_at || essay.submitted_at || null,
      });
      return;
    }
    current.sum += score;
    current.count += 1;
    const prevTs = new Date(current.last_essay_at || 0).getTime();
    const nextTs = new Date(essay.corrected_at || essay.submitted_at || 0).getTime();
    if (nextTs > prevTs) current.last_essay_at = essay.corrected_at || essay.submitted_at || current.last_essay_at;
  });

  // Média por competência (dinâmico conforme tipo da banca)
  const competencyMap: Record<number, { sum: number; count: number }> = {};
  const perEssayCompetency = new Map<string, { competency: number; scores: number[] }>();
  for (const row of competencyRows) {
    const essayId = String(row.essay_id || '');
    const c = Number(row.competency);
    const score = Number(row.score);
    if (!essayId || !Number.isFinite(score)) continue;
    const key = `${essayId}:${c}`;
    const current = perEssayCompetency.get(key) || { competency: c, scores: [] };
    current.scores.push(score);
    perEssayCompetency.set(key, current);
  }
  for (const row of perEssayCompetency.values()) {
    const c = Number(row.competency);
    if (c < 1 || c > maxComp) continue;
    if (!competencyMap[c]) competencyMap[c] = { sum: 0, count: 0 };
    competencyMap[c].sum += row.scores.reduce((sum, score) => sum + score, 0) / row.scores.length;
    competencyMap[c].count += 1;
  }
  const competencyScores = Array.from({ length: maxComp }, (_, i) => i + 1).map((c) => ({
    competency: c,
    avg: competencyMap[c]?.count
      ? Math.round(competencyMap[c].sum / competencyMap[c].count)
      : null,
    count: competencyMap[c]?.count ?? 0,
  }));

  // weakest_competency calculado no cliente com normalização por máximo por competência
  const weakestCompetency = null;

  // Tempo médio de correção em dias
  const withCorrectionTime = metricsList.filter(
    (e) => isEssayCorrected(e.status) && e.corrected_at && e.submitted_at,
  );
  const avgCorrectionDays = withCorrectionTime.length
    ? Math.round(
        withCorrectionTime.reduce((acc, e) => {
          const diff =
            new Date(e.corrected_at as string).getTime() -
            new Date(e.submitted_at).getTime();
          return acc + diff / (1000 * 60 * 60 * 24);
        }, 0) / withCorrectionTime.length,
      )
    : null;

  // Taxa de melhoria: % de alunos cuja última nota > penúltima
  const studentScoreHistory = new Map<string, number[]>();
  for (const essay of [...metricsList]
    .filter((e) => effectiveEssayScore(e) !== null)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())) {
    const arr = studentScoreHistory.get(essay.student_id) || [];
    arr.push(Number(effectiveEssayScore(essay)));
    studentScoreHistory.set(essay.student_id, arr);
  }
  const studentsWithHistory = Array.from(studentScoreHistory.values()).filter((arr) => arr.length >= 2);
  const improved = studentsWithHistory.filter((arr) => arr[arr.length - 1] > arr[arr.length - 2]).length;
  const improvementRate = studentsWithHistory.length > 0
    ? Math.round((improved / studentsWithHistory.length) * 100)
    : null;

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

  const hydrateEssay = (item: EssayRow) => {
    const student = studentsMap.get(item.student_id);
    const lockUser = item.correction_lock_user_id ? lockUsersMap.get(item.correction_lock_user_id) : null;
    return {
      ...item,
      correction_lock_user: lockUser
        ? {
            id: lockUser.id,
            full_name: lockUser.full_name,
            avatar_url: lockUser.avatar_url,
          }
        : null,
      text: item.text || '',
      student: {
        id: item.student_id,
        full_name: student?.full_name ?? null,
        email: student?.email ?? null,
        avatar_url: student?.avatar_url ?? null,
      },
      student_plan: null,
    };
  };

  return NextResponse.json({
    essay_type_filter: essayTypeFilter,
    date_filter: dateRangeKeys
      ? { preset: datePreset ?? 'custom', from: dateRangeKeys.fromKey, to: dateRangeKeys.toKey }
      : null,
    metrics: {
      received_week: receivedWeek,
      historical_received_week: historicalReceivedWeek,
      pending_count: pendingCount,
      avg_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      ranking,
      competency_scores: competencyScores,
      weakest_competency: weakestCompetency,
      avg_correction_days: avgCorrectionDays,
      improvement_rate: improvementRate,
      improvement_students_improved: improved,
      improvement_students_eligible: studentsWithHistory.length,
      pending_by_type: pendingByType,
    },
    pending_items: [...assignedSecondItemsRaw, ...pendingItemsRaw].map(hydrateEssay),
    corrected_items: correctedItemsRaw.map(hydrateEssay),
    pagination: {
      pending: {
        page: pendingPage,
        limit: pendingLimit,
        total: pendingDisplayTotal,
        total_pages: pendingTotalPages,
      },
      corrected: {
        page: correctedPage,
        limit: correctedLimit,
        total: correctedTotal,
        total_pages: correctedTotalPages,
      },
    },
  });
}
