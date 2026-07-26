import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type MetricWindow = 'today' | 'week' | 'month' | 'total';
type RequesterRow = { role: string | null; organization_id: string | null };
type OrgRow = { id: string; slug: string };
type AnnRow = { author_id: string; essay_id: string; created_at: string };
type EssayRow = { id: string; total_score: number | null; submitted_at: string | null; corrected_at: string | null; status: string };
type TrendPoint = { date: string; corrections: number };

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

function getWindowStart(win: MetricWindow, now: Date): string | null {
  switch (win) {
    case 'today': {
      const s = new Date(now);
      s.setUTCHours(0, 0, 0, 0);
      return s.toISOString();
    }
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 3_600_000).toISOString();
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 3_600_000).toISOString();
    case 'total':
      return null;
  }
}

function buildTrend(win: MetricWindow, annotations: AnnRow[], now: Date): TrendPoint[] {
  if (win === 'today') {
    const buckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) buckets[String(h).padStart(2, '0')] = 0;
    for (const ann of annotations) {
      const h = new Date(ann.created_at).getUTCHours();
      const key = String(h).padStart(2, '0');
      if (key in buckets) buckets[key]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }
  if (win === 'week') {
    const buckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3_600_000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const ann of annotations) {
      const day = ann.created_at.slice(0, 10);
      if (day in buckets) buckets[day]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }
  if (win === 'month') {
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3_600_000);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const ann of annotations) {
      const day = ann.created_at.slice(0, 10);
      if (day in buckets) buckets[day]++;
    }
    return Object.entries(buckets).map(([date, corrections]) => ({ date, corrections }));
  }
  // total: last 12 months
  const buckets: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = 0;
  }
  for (const ann of annotations) {
    const key = ann.created_at.slice(0, 7);
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

  const now = new Date();
  const windowStart = getWindowStart(win, now);

  const profilesTable = adminClient.from('profiles') as any;
  const essaysTable = adminClient.from('essays') as any;
  const annotationsTable = adminClient.from('essay_annotations') as any;

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

  // 2. Pending essays
  const { count: pendingCount } = await essaysTable
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('status', 'pending');

  if (associateIds.length === 0) {
    const empty = { corrections_in_window: 0, total_corrections: 0, avg_essay_score: null, avg_turnaround_hours: null };
    return NextResponse.json({
      window: win,
      summary: {
        total_associates: 0, active_associates: 0, inactive_associates: 0,
        pending_essays: pendingCount ?? 0, corrections_in_window: 0, total_corrections: 0,
        avg_essay_score: null, avg_turnaround_hours: null,
      },
      associate_stats: {},
      trend: buildTrend(win, [], now),
    });
  }

  // 3. Org essays (for score/turnaround lookup)
  const { data: orgEssays } = await essaysTable
    .select('id, total_score, submitted_at, corrected_at, status')
    .eq('org_id', orgId);
  const essayMap = new Map<string, EssayRow>(((orgEssays || []) as EssayRow[]).map(e => [e.id, e]));
  const orgEssayIds = Array.from(essayMap.keys());
  const safeEssayIds = orgEssayIds.length > 0 ? orgEssayIds : ['00000000-0000-0000-0000-000000000000'];

  // 4. All corrections (all time)
  const { data: allAnnotations } = await annotationsTable
    .select('author_id, essay_id, created_at')
    .in('author_id', associateIds)
    .in('essay_id', safeEssayIds)
    .eq('type', 'correction');

  const allAnns = (allAnnotations || []) as AnnRow[];

  // 5. Window annotations (for trend + in-window counts)
  const windowAnns = windowStart
    ? allAnns.filter(a => a.created_at >= windowStart)
    : allAnns;

  // Accumulate per-associate stats
  const stats: Record<string, {
    corrections_in_window: number; total_corrections: number;
    score_sum: number; score_count: number;
    turnaround_sum: number; turnaround_count: number;
  }> = {};
  for (const id of associateIds) {
    stats[id] = { corrections_in_window: 0, total_corrections: 0, score_sum: 0, score_count: 0, turnaround_sum: 0, turnaround_count: 0 };
  }

  for (const ann of allAnns) {
    const s = stats[ann.author_id];
    if (!s) continue;
    s.total_corrections++;
    const essay = essayMap.get(ann.essay_id);
    if (essay?.total_score != null) { s.score_sum += essay.total_score; s.score_count++; }
    if (essay?.submitted_at && essay?.corrected_at) {
      const diff = (new Date(essay.corrected_at).getTime() - new Date(essay.submitted_at).getTime()) / 3_600_000;
      if (diff >= 0 && diff < 8_760) { s.turnaround_sum += diff; s.turnaround_count++; }
    }
    if (windowStart && ann.created_at >= windowStart) s.corrections_in_window++;
    else if (!windowStart) s.corrections_in_window++;
  }

  const trend = buildTrend(win, windowAnns, now);

  const activeAssociates = associateList.filter(a => a.associate_permissions?.active !== false).length;
  const inactiveAssociates = associateList.length - activeAssociates;
  const correctionsInWindow = Object.values(stats).reduce((s, a) => s + a.corrections_in_window, 0);
  const totalCorrections = Object.values(stats).reduce((s, a) => s + a.total_corrections, 0);
  const allScoreSum = Object.values(stats).reduce((s, a) => s + a.score_sum, 0);
  const allScoreCount = Object.values(stats).reduce((s, a) => s + a.score_count, 0);
  const allTurnaroundSum = Object.values(stats).reduce((s, a) => s + a.turnaround_sum, 0);
  const allTurnaroundCount = Object.values(stats).reduce((s, a) => s + a.turnaround_count, 0);

  const associateStats: Record<string, object> = {};
  for (const [id, s] of Object.entries(stats)) {
    associateStats[id] = {
      corrections_in_window: s.corrections_in_window,
      total_corrections: s.total_corrections,
      avg_essay_score: s.score_count > 0 ? Math.round(s.score_sum / s.score_count) : null,
      avg_turnaround_hours: s.turnaround_count > 0 ? Math.round((s.turnaround_sum / s.turnaround_count) * 10) / 10 : null,
    };
  }

  return NextResponse.json({
    window: win,
    summary: {
      total_associates: associateList.length,
      active_associates: activeAssociates,
      inactive_associates: inactiveAssociates,
      pending_essays: pendingCount ?? 0,
      corrections_in_window: correctionsInWindow,
      total_corrections: totalCorrections,
      avg_essay_score: allScoreCount > 0 ? Math.round(allScoreSum / allScoreCount) : null,
      avg_turnaround_hours: allTurnaroundCount > 0 ? Math.round((allTurnaroundSum / allTurnaroundCount) * 10) / 10 : null,
    },
    associate_stats: associateStats,
    trend,
  });
}
