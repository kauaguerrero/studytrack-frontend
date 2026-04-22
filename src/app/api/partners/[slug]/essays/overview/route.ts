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
  status: 'pending' | 'corrected' | 'seen';
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  text: string | null;
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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
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
  const isAssociate = role === 'associate' || role === 'teacher';
  if (!isAdmin && !isFounder && !isAssociate) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if ((isFounder || isAssociate) && requester.organization_id !== org.id) {
    return NextResponse.json({ error: 'Acesso negado à organização.' }, { status: 403 });
  }

  const essayFields = 'id, student_id, status, submitted_at, corrected_at, total_score, text, theme';
  const pendingFrom = (pendingPage - 1) * pendingLimit;
  const pendingTo = pendingFrom + pendingLimit - 1;
  const correctedFrom = (correctedPage - 1) * correctedLimit;
  const correctedTo = correctedFrom + correctedLimit - 1;

  const [essaysMetricsRes, pendingRes, correctedRes] = await Promise.all([
    admin
      .from('essays')
      .select('*')
      .eq('org_id', org.id)
      .order('submitted_at', { ascending: false })
      .limit(500),
    admin
      .from('essays')
      .select(essayFields, { count: 'exact' })
      .eq('org_id', org.id)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
      .range(pendingFrom, pendingTo),
    admin
      .from('essays')
      .select(essayFields, { count: 'exact' })
      .eq('org_id', org.id)
      .in('status', ['corrected', 'seen'])
      .order('submitted_at', { ascending: false })
      .range(correctedFrom, correctedTo),
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

  let competencyRows: { competency: number; score: number }[] = [];
  if (metricsList.length > 0) {
    const correctedIds = metricsList
      .filter((e) => e.status === 'corrected' || e.status === 'seen')
      .map((e) => e.id);

    if (correctedIds.length > 0) {
      const { data: compData } = await (admin.from('essay_competency_scores') as any)
        .select('competency, score')
        .in('essay_id', correctedIds);
      competencyRows = (compData || []) as { competency: number; score: number }[];
    }
  }

  const pendingItemsRaw = ((pendingRes.error ? [] : pendingRes.data) || []) as EssayRow[];
  const correctedItemsRaw = ((correctedRes.error ? [] : correctedRes.data) || []) as EssayRow[];
  const pendingTotal = pendingRes.error ? 0 : (pendingRes.count || 0);
  const correctedTotal = correctedRes.error ? 0 : (correctedRes.count || 0);
  const pendingTotalPages = Math.max(1, Math.ceil(pendingTotal / pendingLimit));
  const correctedTotalPages = Math.max(1, Math.ceil(correctedTotal / correctedLimit));

  const studentIds = Array.from(new Set(
    [...metricsList, ...pendingItemsRaw, ...correctedItemsRaw]
      .map((e) => e.student_id)
      .filter(Boolean),
  ));

  let studentsMap = new Map<string, StudentRow>();
  if (studentIds.length > 0) {
    const { data: students } = await (admin.from('profiles') as any)
      .select('id, full_name, email, avatar_url')
      .in('id', studentIds);
    studentsMap = new Map(((students || []) as StudentRow[]).map((s) => [s.id, s]));
  }

  const weekStart = startOfWeekBrtKey();
  const receivedWeek = metricsList.filter((e) => toBrtDateKey(new Date(e.submitted_at)) >= weekStart).length;
  const pendingCount = metricsList.filter((e) => e.status === 'pending').length;

  const scored = metricsList.filter((e) => (e.status === 'corrected' || e.status === 'seen') && typeof e.total_score === 'number');
  const scores = scored.map((e) => Number(e.total_score || 0));
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const highestScore = scores.length ? Math.max(...scores) : null;
  const lowestScore = scores.length ? Math.min(...scores) : null;

  const byStudent = new Map<string, { sum: number; count: number; avatar_url: string | null; full_name: string | null; last_essay_at: string | null }>();
  scored.forEach((essay) => {
    const st = studentsMap.get(essay.student_id);
    const current = byStudent.get(essay.student_id);
    if (!current) {
      byStudent.set(essay.student_id, {
        sum: Number(essay.total_score || 0),
        count: 1,
        avatar_url: st?.avatar_url ?? null,
        full_name: st?.full_name ?? null,
        last_essay_at: essay.corrected_at || essay.submitted_at || null,
      });
      return;
    }
    current.sum += Number(essay.total_score || 0);
    current.count += 1;
    const prevTs = new Date(current.last_essay_at || 0).getTime();
    const nextTs = new Date(essay.corrected_at || essay.submitted_at || 0).getTime();
    if (nextTs > prevTs) current.last_essay_at = essay.corrected_at || essay.submitted_at || current.last_essay_at;
  });

  // Média por competência (C1-C5)
  const competencyMap: Record<number, { sum: number; count: number }> = {};
  for (const row of competencyRows) {
    const c = Number(row.competency);
    if (c < 1 || c > 5) continue;
    if (!competencyMap[c]) competencyMap[c] = { sum: 0, count: 0 };
    competencyMap[c].sum += Number(row.score || 0);
    competencyMap[c].count += 1;
  }
  const competencyScores = [1, 2, 3, 4, 5].map((c) => ({
    competency: c,
    avg: competencyMap[c]?.count
      ? Math.round(competencyMap[c].sum / competencyMap[c].count)
      : null,
    count: competencyMap[c]?.count ?? 0,
  }));

  // Competência mais fraca
  const withData = competencyScores.filter((c) => c.avg !== null);
  const weakestCompetency = withData.length >= 2
    ? withData.reduce((min, cur) => (cur.avg as number) < (min.avg as number) ? cur : min)
    : null;

  // Tempo médio de correção em dias
  const withCorrectionTime = metricsList.filter(
    (e) => (e.status === 'corrected' || e.status === 'seen') && e.corrected_at && e.submitted_at,
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
    .filter((e) => (e.status === 'corrected' || e.status === 'seen') && e.total_score !== null)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())) {
    const arr = studentScoreHistory.get(essay.student_id) || [];
    arr.push(Number(essay.total_score));
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
    return {
      ...item,
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
    metrics: {
      received_week: receivedWeek,
      pending_count: pendingCount,
      avg_score: avgScore,
      highest_score: highestScore,
      lowest_score: lowestScore,
      ranking,
      competency_scores: competencyScores,
      weakest_competency: weakestCompetency,
      avg_correction_days: avgCorrectionDays,
      improvement_rate: improvementRate,
    },
    pending_items: pendingItemsRaw.map(hydrateEssay),
    corrected_items: correctedItemsRaw.map(hydrateEssay),
    pagination: {
      pending: {
        page: pendingPage,
        limit: pendingLimit,
        total: pendingTotal,
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
