import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

type Period = 'today' | 'week' | 'month' | 'year' | 'lifetime';

function getMondayISO(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function getPrevMondayISO(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff - 7);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function getPrevPeriodBounds(period: Period): { start: string; end: string } | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
      const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      return { start: y.toISOString().slice(0, 10), end: t.toISOString().slice(0, 10) };
    }
    case 'week':
      return { start: getPrevMondayISO(), end: getMondayISO() };
    case 'month': {
      const cur = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      return { start: prev.toISOString().slice(0, 10), end: cur.toISOString().slice(0, 10) };
    }
    case 'year':
      return { start: `${now.getUTCFullYear() - 1}-01-01`, end: `${now.getUTCFullYear()}-01-01` };
    case 'lifetime':
      return null;
  }
}

function getPeriodStart(period: Period): string | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        .toISOString()
        .slice(0, 10);
    case 'week': {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() + diff);
      monday.setUTCHours(0, 0, 0, 0);
      return monday.toISOString().slice(0, 10);
    }
    case 'month':
      return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
    case 'year':
      return `${now.getUTCFullYear()}-01-01`;
    case 'lifetime':
      return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const period = (new URL(request.url).searchParams.get('period') ?? 'week') as Period;
  const periodStart = getPeriodStart(period);

  const admin = createAdminClient();
  const db = admin as any;

  const { data: orgs } = await db.from('organizations').select('id');
  const orgIds: string[] = (orgs ?? []).map((o: any) => o.id);
  const total_orgs = orgIds.length;

  if (total_orgs === 0) {
    return NextResponse.json({
      total_orgs: 0, total_students: 0,
      active_period: 0, questions_period: 0, simulados_period: 0, essays_period: 0,
      prev_active_period: 0, prev_questions_period: 0, prev_simulados_period: 0, prev_essays_period: 0,
      per_org: [], period, period_start: periodStart,
    });
  }

  const { data: b2bProfiles } = await db
    .from('profiles')
    .select('id, organization_id, last_activity_date')
    .in('organization_id', orgIds)
    .eq('role', 'student');

  const profiles: any[] = b2bProfiles ?? [];
  const total_students = profiles.length;
  const profileIds = profiles.map((p: any) => p.id);

  const active_period = periodStart
    ? profiles.filter((p: any) => p.last_activity_date && p.last_activity_date >= periodStart).length
    : profiles.filter((p: any) => p.last_activity_date).length;

  let questions_period = 0;
  let simulados_period = 0;

  if (profileIds.length > 0) {
    let usageQuery = db
      .from('daily_usage')
      .select('user_id, questions_count, simulations_count')
      .in('user_id', profileIds);
    if (periodStart) usageQuery = usageQuery.gte('usage_date', periodStart);

    const { data: usage } = await usageQuery;
    for (const row of usage ?? []) {
      questions_period += row.questions_count ?? 0;
      simulados_period += row.simulations_count ?? 0;
    }
  }

  let essaysQuery = db
    .from('essays')
    .select('id', { count: 'exact', head: true })
    .in('org_id', orgIds);
  if (periodStart) essaysQuery = essaysQuery.gte('submitted_at', `${periodStart}T00:00:00Z`);
  const { count: essays_period } = await essaysQuery;

  const prevBounds = getPrevPeriodBounds(period);

  // Ativos período anterior
  const prev_active_period = prevBounds
    ? profiles.filter(
        (p: any) =>
          p.last_activity_date &&
          p.last_activity_date >= prevBounds.start &&
          p.last_activity_date < prevBounds.end
      ).length
    : 0;

  // Questões e simulados período anterior
  let prev_questions_period = 0;
  let prev_simulados_period = 0;

  if (profileIds.length > 0 && prevBounds) {
    const { data: prevUsage } = await db
      .from('daily_usage')
      .select('questions_count, simulations_count')
      .in('user_id', profileIds)
      .gte('usage_date', prevBounds.start)
      .lt('usage_date', prevBounds.end);

    for (const row of prevUsage ?? []) {
      prev_questions_period += row.questions_count ?? 0;
      prev_simulados_period += row.simulations_count ?? 0;
    }
  }

  // Redações período anterior
  let prev_essays_period = 0;
  if (prevBounds) {
    const { count } = await db
      .from('essays')
      .select('id', { count: 'exact', head: true })
      .in('org_id', orgIds)
      .gte('submitted_at', `${prevBounds.start}T00:00:00Z`)
      .lt('submitted_at', `${prevBounds.end}T00:00:00Z`);
    prev_essays_period = count ?? 0;
  }

  const per_org = await Promise.all(
    orgIds.map(async (org_id: string) => {
      const orgProfileIds = profiles
        .filter((p: any) => p.organization_id === org_id)
        .map((p: any) => p.id);

      const org_active = periodStart
        ? profiles.filter((p: any) =>
            p.organization_id === org_id &&
            p.last_activity_date &&
            p.last_activity_date >= periodStart
          ).length
        : profiles.filter((p: any) => p.organization_id === org_id && p.last_activity_date).length;

      let org_questions = 0;
      let org_simulados = 0;

      if (orgProfileIds.length > 0) {
        let q = db
          .from('daily_usage')
          .select('questions_count, simulations_count')
          .in('user_id', orgProfileIds);
        if (periodStart) q = q.gte('usage_date', periodStart);
        const { data: orgUsage } = await q;
        for (const row of orgUsage ?? []) {
          org_questions += row.questions_count ?? 0;
          org_simulados += row.simulations_count ?? 0;
        }
      }

      let eq = db
        .from('essays')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org_id);
      if (periodStart) eq = eq.gte('submitted_at', `${periodStart}T00:00:00Z`);
      const { count: org_essays } = await eq;

      return {
        org_id,
        active_period: org_active,
        questions_period: org_questions,
        simulados_period: org_simulados,
        essays_period: org_essays ?? 0,
      };
    })
  );

  return NextResponse.json({
    total_orgs,
    total_students,
    active_period,
    questions_period,
    simulados_period,
    essays_period: essays_period ?? 0,
    prev_active_period,
    prev_questions_period,
    prev_simulados_period,
    prev_essays_period,
    per_org,
    period,
    period_start: periodStart,
  });
}
