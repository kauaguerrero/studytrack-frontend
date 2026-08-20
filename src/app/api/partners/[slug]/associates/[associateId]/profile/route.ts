import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RequesterRow = { role: string | null; organization_id: string | null };
type OrgRow = { id: string; slug: string };

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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; associateId: string }> },
) {
  const { slug, associateId } = await context.params;
  const auth = await authorize(slug);
  if (!auth.ok) return auth.response;
  const { adminClient, orgId } = auth;

  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '28'), 7), 365);
  const now = new Date();
  const rangeStart = new Date(now.getTime() - days * 24 * 3_600_000).toISOString();
  const todayStart = (() => { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); })();
  const weekStart = new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString();
  const monthStart = new Date(now.getTime() - 30 * 24 * 3_600_000).toISOString();

  const profilesTable = adminClient.from('profiles') as any;
  const essaysTable = adminClient.from('essays') as any;
  const correctionsTable = adminClient.from('essay_corrections') as any;
  const compScoresTable = adminClient.from('essay_competency_scores') as any;

  // 1. Get associate profile — must belong to this org
  const { data: associate, error: profError } = await profilesTable
    .select('id, full_name, email, avatar_url, organization_id, associate_permissions, created_at')
    .eq('id', associateId)
    .eq('role', 'associate')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (profError || !associate) {
    return NextResponse.json({ error: 'Associado não encontrado.' }, { status: 404 });
  }

  type AssocRow = {
    id: string; full_name: string | null; email: string | null;
    avatar_url: string | null; organization_id: string;
    associate_permissions: { can_correct?: boolean; can_import?: boolean; can_view_students?: boolean; active?: boolean } | null;
    created_at: string;
  };
  const assoc = associate as AssocRow;

  // 2. Org essays (for score/turnaround lookup)
  const { data: orgEssays } = await essaysTable
    .select('id, student_id, total_score, submitted_at, corrected_at, status')
    .eq('org_id', orgId);

  type EssayRow = {
    id: string; student_id: string | null;
    total_score: number | null; submitted_at: string | null;
    corrected_at: string | null; status: string;
  };
  const essayList = (orgEssays || []) as EssayRow[];
  const essayMap = new Map(essayList.map(e => [e.id, e]));
  const orgEssayIds = essayList.map(e => e.id);
  const safeEssayIds = orgEssayIds.length > 0 ? orgEssayIds : ['00000000-0000-0000-0000-000000000000'];

  // 3. All corrections by this associate on org essays
  // Fonte autoritativa é essay_corrections (gravada ao submeter a correção), não
  // essay_annotations tipo 'correction' — anotações de texto são opcionais e o
  // corretor pode avaliar (notas + comentário geral) sem marcar nenhum trecho,
  // o que zerava as métricas mesmo com redações efetivamente corrigidas.
  const { data: allCorrections } = await correctionsTable
    .select('essay_id, corrected_at')
    .eq('corrector_id', associateId)
    .in('essay_id', safeEssayIds)
    .order('corrected_at', { ascending: false });

  type AnnRow = { essay_id: string; created_at: string };
  const allAnns = ((allCorrections || []) as { essay_id: string; corrected_at: string }[])
    .map(c => ({ essay_id: c.essay_id, created_at: c.corrected_at })) as AnnRow[];

  // 4. Pending essays for org
  const { count: pendingCount } = await essaysTable
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');

  // 5. Overall metrics
  let scoreSum = 0, scoreCount = 0, bestScore: number | null = null;
  let turnaroundSum = 0, turnaroundCount = 0;
  for (const ann of allAnns) {
    const essay = essayMap.get(ann.essay_id);
    if (essay?.total_score != null) {
      scoreSum += essay.total_score;
      scoreCount++;
      if (bestScore === null || essay.total_score > bestScore) bestScore = essay.total_score;
    }
    if (essay?.submitted_at && essay?.corrected_at) {
      const diff = (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000;
      if (diff >= 0 && diff < 8_760) { turnaroundSum += diff; turnaroundCount++; }
    }
  }

  const corrsToday = allAnns.filter(a => a.created_at >= todayStart).length;
  const corrsWeek = allAnns.filter(a => a.created_at >= weekStart).length;
  const corrsMonth = allAnns.filter(a => a.created_at >= monthStart).length;
  const corrsTotal = allAnns.length;

  // 6. Daily evolution for requested range
  const dailyBuckets: Record<string, {
    corrections: number; scoreSum: number; scoreCount: number;
    tSum: number; tCount: number;
  }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3_600_000);
    dailyBuckets[d.toISOString().slice(0, 10)] = { corrections: 0, scoreSum: 0, scoreCount: 0, tSum: 0, tCount: 0 };
  }
  const rangeAnns = allAnns.filter(a => a.created_at >= rangeStart);
  for (const ann of rangeAnns) {
    const day = ann.created_at.slice(0, 10);
    const b = dailyBuckets[day];
    if (!b) continue;
    b.corrections++;
    const essay = essayMap.get(ann.essay_id);
    if (essay?.total_score != null) { b.scoreSum += essay.total_score; b.scoreCount++; }
    if (essay?.submitted_at && essay?.corrected_at) {
      const diff = (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000;
      if (diff >= 0 && diff < 8_760) { b.tSum += diff; b.tCount++; }
    }
  }
  const daily_evolution = Object.entries(dailyBuckets).map(([date, b]) => ({
    date,
    corrections: b.corrections,
    avg_score: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount) : null,
    avg_turnaround_hours: b.tCount > 0 ? Math.round((b.tSum / b.tCount) * 10) / 10 : null,
  }));

  // 7. Competency averages (across all corrected essays, up to 400)
  const correctedIds = allAnns.map(a => a.essay_id).slice(0, 400);
  let competency_avgs: { competency: string; avg: number; count: number }[] = [];
  if (correctedIds.length > 0) {
    const { data: compData } = await compScoresTable
      .select('competency, score')
      .in('essay_id', correctedIds);
    const compBuckets: Record<string, { sum: number; count: number }> = {
      '1': { sum: 0, count: 0 }, '2': { sum: 0, count: 0 }, '3': { sum: 0, count: 0 },
      '4': { sum: 0, count: 0 }, '5': { sum: 0, count: 0 },
    };
    for (const cs of (compData || []) as { competency: number; score: number }[]) {
      const key = String(cs.competency);
      if (key in compBuckets) { compBuckets[key].sum += cs.score; compBuckets[key].count++; }
    }
    competency_avgs = ['1', '2', '3', '4', '5']
      .filter(k => compBuckets[k].count >= 1)
      .map(k => ({
        competency: `C${k}`,
        avg: Math.round(compBuckets[k].sum / compBuckets[k].count),
        count: compBuckets[k].count,
      }));
  }

  // 8. Recent corrections (last 15)
  const recentAnns = allAnns.slice(0, 15);
  const recentStudentIds = [...new Set(
    recentAnns.map(a => essayMap.get(a.essay_id)?.student_id).filter((id): id is string => !!id)
  )];
  const studentNameMap = new Map<string, string>();
  if (recentStudentIds.length > 0) {
    const { data: students } = await profilesTable
      .select('id, full_name')
      .in('id', recentStudentIds);
    for (const s of (students || []) as { id: string; full_name: string | null }[]) {
      if (s.full_name) studentNameMap.set(s.id, s.full_name);
    }
  }
  const recent_corrections = recentAnns.map(ann => {
    const essay = essayMap.get(ann.essay_id);
    const diff = essay?.submitted_at && essay?.corrected_at
      ? (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000
      : null;
    return {
      essay_id: ann.essay_id,
      student_name: essay?.student_id ? (studentNameMap.get(essay.student_id) ?? null) : null,
      submitted_at: essay?.submitted_at ?? null,
      corrected_at: ann.created_at,
      total_score: essay?.total_score ?? null,
      turnaround_hours: diff !== null && diff >= 0 && diff < 8_760 ? Math.round(diff * 10) / 10 : null,
    };
  });

  return NextResponse.json({
    profile: {
      id: assoc.id,
      full_name: assoc.full_name,
      email: assoc.email,
      avatar_url: assoc.avatar_url,
      active: assoc.associate_permissions?.active !== false,
      associate_permissions: {
        can_correct: assoc.associate_permissions?.can_correct !== false,
        can_import: assoc.associate_permissions?.can_import === true,
        can_view_students: assoc.associate_permissions?.can_view_students === true,
      },
      created_at: assoc.created_at,
    },
    metrics: {
      corrections_today: corrsToday,
      corrections_week: corrsWeek,
      corrections_month: corrsMonth,
      corrections_total: corrsTotal,
      avg_essay_score: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      best_essay_score: bestScore,
      avg_turnaround_hours: turnaroundCount > 0 ? Math.round((turnaroundSum / turnaroundCount) * 10) / 10 : null,
      pending_essays: pendingCount ?? 0,
    },
    daily_evolution,
    competency_avgs,
    recent_corrections,
  });
}
