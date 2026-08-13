import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

type Period = 'today' | 'week' | 'month' | 'year' | 'lifetime';

const UTC_MINUS_3_OFFSET_MINUTES = -180;
const STATS_CACHE_TTL_MS = 30_000;

const statsCache = new Map<string, { expiresAt: number; payload: any }>();

function getOffsetLocalDate(now = new Date()): Date {
  const shifted = new Date(now.getTime() + UTC_MINUS_3_OFFSET_MINUTES * 60_000);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  ));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function localDateToUtcStartISO(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, 0, 0, 0) - (UTC_MINUS_3_OFFSET_MINUTES * 60_000);
  return new Date(utcMillis).toISOString();
}

function getMondayISO(): string {
  const today = getOffsetLocalDate();
  const day = today.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + diff);
  return isoDate(monday);
}

function getPrevMondayISO(): string {
  const today = getOffsetLocalDate();
  const day = today.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + diff - 7);
  return isoDate(monday);
}

function getPrevPeriodBounds(period: Period): { startDate: string; endDate: string; startUtc: string; endUtc: string } | null {
  const today = getOffsetLocalDate();
  switch (period) {
    case 'today': {
      const y = new Date(today);
      y.setUTCDate(today.getUTCDate() - 1);
      const startDate = isoDate(y);
      const endDate = isoDate(today);
      return {
        startDate,
        endDate,
        startUtc: localDateToUtcStartISO(startDate),
        endUtc: localDateToUtcStartISO(endDate),
      };
    }
    case 'week': {
      const startDate = getPrevMondayISO();
      const endDate = getMondayISO();
      return {
        startDate,
        endDate,
        startUtc: localDateToUtcStartISO(startDate),
        endUtc: localDateToUtcStartISO(endDate),
      };
    }
    case 'month': {
      const cur = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const startDate = isoDate(prev);
      const endDate = isoDate(cur);
      return {
        startDate,
        endDate,
        startUtc: localDateToUtcStartISO(startDate),
        endUtc: localDateToUtcStartISO(endDate),
      };
    }
    case 'year': {
      const startDate = `${today.getUTCFullYear() - 1}-01-01`;
      const endDate = `${today.getUTCFullYear()}-01-01`;
      return {
        startDate,
        endDate,
        startUtc: localDateToUtcStartISO(startDate),
        endUtc: localDateToUtcStartISO(endDate),
      };
    }
    case 'lifetime':
      return null;
  }
}

function getPeriodStart(period: Period): string | null {
  const today = getOffsetLocalDate();
  switch (period) {
    case 'today':
      return isoDate(today);
    case 'week':
      return getMondayISO();
    case 'month':
      return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`;
    case 'year':
      return `${today.getUTCFullYear()}-01-01`;
    case 'lifetime':
      return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const period = (new URL(request.url).searchParams.get('period') ?? 'week') as Period;
  const periodStart = getPeriodStart(period);
  const periodStartUtc = periodStart ? localDateToUtcStartISO(periodStart) : null;
  const cacheKey = `period:${period}`;
  const cached = statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  const admin = createAdminClient();
  const db = admin as any;

  const { data: orgs } = await db.from('organizations').select('id').eq('is_mock', false).eq('is_active', true);
  const orgIds: string[] = (orgs ?? []).map((o: any) => o.id);
  const total_orgs = orgIds.length;

  if (total_orgs === 0) {
    const payload = {
      total_orgs: 0, total_students: 0,
      active_period: 0, questions_period: 0, simulados_period: 0, essays_period: 0,
      prev_active_period: 0, prev_questions_period: 0, prev_simulados_period: 0, prev_essays_period: 0,
      per_org: [] as any[], period, period_start: periodStart,
    };
    statsCache.set(cacheKey, { expiresAt: Date.now() + STATS_CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  }

  const { data: b2bProfiles } = await db
    .from('profiles')
    .select('id, organization_id, last_activity_date')
    .in('organization_id', orgIds)
    .eq('role', 'student')
    .neq('plan_tier', 'b2b_test');

  const profiles: any[] = b2bProfiles ?? [];
  const total_students = profiles.length;
  const profileIds = profiles.map((p: any) => p.id);
  const profileOrgById = new Map<string, string>();
  const perOrgActiveMap = new Map<string, number>();
  const perOrgQuestionsMap = new Map<string, number>();
  const perOrgSimuladosMap = new Map<string, number>();
  const perOrgEssaysMap = new Map<string, number>();

  for (const orgId of orgIds) {
    perOrgActiveMap.set(orgId, 0);
    perOrgQuestionsMap.set(orgId, 0);
    perOrgSimuladosMap.set(orgId, 0);
    perOrgEssaysMap.set(orgId, 0);
  }

  let active_period = 0;
  for (const profile of profiles) {
    const profileId = profile.id as string;
    const orgId = profile.organization_id as string;
    profileOrgById.set(profileId, orgId);
    const isActive = periodStart
      ? Boolean(profile.last_activity_date && profile.last_activity_date >= periodStart)
      : Boolean(profile.last_activity_date);
    if (!isActive) continue;
    active_period += 1;
    perOrgActiveMap.set(orgId, (perOrgActiveMap.get(orgId) ?? 0) + 1);
  }

  let questions_period = 0;
  let simulados_period = 0;

  const PAGE = 1000;

  const paginateRows = async (
    table: string,
    selectFields: string,
    filters: (q: any) => any,
    safetyLimit: number,
  ): Promise<any[]> => {
    const rows: any[] = [];
    let offset = 0;
    while (rows.length < safetyLimit) {
      const { data: batchData } = await filters(
        db.from(table).select(selectFields).range(offset, offset + PAGE - 1)
      );
      const batch = batchData ?? [];
      rows.push(...batch);
      if (batch.length < PAGE) break;
      offset += PAGE;
    }
    return rows;
  };

  if (profileIds.length > 0) {
    // COUNT queries for exact KPI totals (no row transfer — very fast)
    let answersCountQ = db
      .from('user_answers')
      .select('*', { count: 'exact', head: true })
      .in('user_id', profileIds);
    if (periodStartUtc) answersCountQ = answersCountQ.gte('created_at', periodStartUtc);

    let simsCountQ = db
      .from('simulado_sessions')
      .select('*', { count: 'exact', head: true })
      .in('user_id', profileIds)
      .eq('status', 'completed');
    if (periodStartUtc) simsCountQ = simsCountQ.gte('completed_at', periodStartUtc);

    // Paginated row fetch for per-org breakdown
    const answersRowsP = paginateRows(
      'user_answers', 'user_id',
      (q) => { let r = q.in('user_id', profileIds); if (periodStartUtc) r = r.gte('created_at', periodStartUtc); return r; },
      100_000,
    );
    const simsRowsP = paginateRows(
      'simulado_sessions', 'user_id',
      (q) => { let r = q.in('user_id', profileIds).eq('status', 'completed'); if (periodStartUtc) r = r.gte('completed_at', periodStartUtc); return r; },
      50_000,
    );

    const [{ count: answersCount }, { count: simsCount }, answersRows, simsRows] = await Promise.all([
      answersCountQ,
      simsCountQ,
      answersRowsP,
      simsRowsP,
    ]);

    questions_period = answersCount ?? 0;
    for (const row of answersRows) {
      const orgId = profileOrgById.get(row.user_id as string);
      if (!orgId) continue;
      perOrgQuestionsMap.set(orgId, (perOrgQuestionsMap.get(orgId) ?? 0) + 1);
    }

    simulados_period = simsCount ?? 0;
    for (const row of simsRows) {
      const orgId = profileOrgById.get(row.user_id as string);
      if (!orgId) continue;
      perOrgSimuladosMap.set(orgId, (perOrgSimuladosMap.get(orgId) ?? 0) + 1);
    }
  }

  // COUNT for essays total + paginated rows for per-org breakdown
  let essaysCountQ = db
    .from('essays')
    .select('*', { count: 'exact', head: true })
    .in('org_id', orgIds);
  if (periodStartUtc) essaysCountQ = essaysCountQ.gte('submitted_at', periodStartUtc);

  const essaysRowsP = paginateRows(
    'essays', 'org_id',
    (q) => { let r = q.in('org_id', orgIds); if (periodStartUtc) r = r.gte('submitted_at', periodStartUtc); return r; },
    20_000,
  );

  const [{ count: essaysCount }, essaysRows] = await Promise.all([essaysCountQ, essaysRowsP]);
  const essays_period = essaysCount ?? 0;

  for (const row of essaysRows) {
    const orgId = row.org_id as string | null;
    if (!orgId) continue;
    perOrgEssaysMap.set(orgId, (perOrgEssaysMap.get(orgId) ?? 0) + 1);
  }

  const prevBounds = getPrevPeriodBounds(period);

  // Ativos período anterior (global + per-org — grátis, profiles já carregados)
  const perOrgPrevActiveMap = new Map<string, number>(orgIds.map((id: string) => [id, 0]));
  const prev_active_period = prevBounds
    ? (() => {
        let count = 0;
        for (const p of profiles) {
          if (
            p.last_activity_date &&
            p.last_activity_date >= prevBounds.startDate &&
            p.last_activity_date < prevBounds.endDate
          ) {
            count++;
            const orgId = p.organization_id as string;
            perOrgPrevActiveMap.set(orgId, (perOrgPrevActiveMap.get(orgId) ?? 0) + 1);
          }
        }
        return count;
      })()
    : 0;

  // Questões e simulados período anterior (global count + per-org rows)
  let prev_questions_period = 0;
  let prev_simulados_period = 0;
  const perOrgPrevQuestionsMap = new Map<string, number>(orgIds.map((id: string) => [id, 0]));
  const perOrgPrevSimuladosMap = new Map<string, number>(orgIds.map((id: string) => [id, 0]));

  if (profileIds.length > 0 && prevBounds) {
    const prevAnswersRowsP = paginateRows(
      'user_answers', 'user_id',
      (q) => q.in('user_id', profileIds).gte('created_at', prevBounds.startUtc).lt('created_at', prevBounds.endUtc),
      100_000,
    );
    const prevSimsRowsP = paginateRows(
      'simulado_sessions', 'user_id',
      (q) => q.in('user_id', profileIds).eq('status', 'completed').gte('completed_at', prevBounds.startUtc).lt('completed_at', prevBounds.endUtc),
      50_000,
    );

    const [{ count: prevAnswersCount }, { count: prevSimsCount }, prevAnswersRows, prevSimsRows] = await Promise.all([
      db.from('user_answers').select('id', { count: 'exact', head: true }).in('user_id', profileIds).gte('created_at', prevBounds.startUtc).lt('created_at', prevBounds.endUtc),
      db.from('simulado_sessions').select('id', { count: 'exact', head: true }).in('user_id', profileIds).eq('status', 'completed').gte('completed_at', prevBounds.startUtc).lt('completed_at', prevBounds.endUtc),
      prevAnswersRowsP,
      prevSimsRowsP,
    ]);

    prev_questions_period = prevAnswersCount ?? 0;
    for (const row of prevAnswersRows) {
      const orgId = profileOrgById.get(row.user_id as string);
      if (!orgId) continue;
      perOrgPrevQuestionsMap.set(orgId, (perOrgPrevQuestionsMap.get(orgId) ?? 0) + 1);
    }

    prev_simulados_period = prevSimsCount ?? 0;
    for (const row of prevSimsRows) {
      const orgId = profileOrgById.get(row.user_id as string);
      if (!orgId) continue;
      perOrgPrevSimuladosMap.set(orgId, (perOrgPrevSimuladosMap.get(orgId) ?? 0) + 1);
    }
  }

  // Redações período anterior (global count + per-org rows)
  let prev_essays_period = 0;
  const perOrgPrevEssaysMap = new Map<string, number>(orgIds.map((id: string) => [id, 0]));
  if (prevBounds) {
    const prevEssaysRowsP = paginateRows(
      'essays', 'org_id',
      (q) => q.in('org_id', orgIds).gte('submitted_at', prevBounds.startUtc).lt('submitted_at', prevBounds.endUtc),
      20_000,
    );
    const [{ count: prevEssaysCount }, prevEssaysRows] = await Promise.all([
      db.from('essays').select('id', { count: 'exact', head: true }).in('org_id', orgIds).gte('submitted_at', prevBounds.startUtc).lt('submitted_at', prevBounds.endUtc),
      prevEssaysRowsP,
    ]);
    prev_essays_period = prevEssaysCount ?? 0;
    for (const row of prevEssaysRows) {
      const orgId = row.org_id as string | null;
      if (!orgId) continue;
      perOrgPrevEssaysMap.set(orgId, (perOrgPrevEssaysMap.get(orgId) ?? 0) + 1);
    }
  }

  const per_org = orgIds.map((org_id: string) => ({
    org_id,
    active_period: perOrgActiveMap.get(org_id) ?? 0,
    questions_period: perOrgQuestionsMap.get(org_id) ?? 0,
    simulados_period: perOrgSimuladosMap.get(org_id) ?? 0,
    essays_period: perOrgEssaysMap.get(org_id) ?? 0,
    prev_active_period: perOrgPrevActiveMap.get(org_id) ?? 0,
    prev_questions_period: perOrgPrevQuestionsMap.get(org_id) ?? 0,
    prev_simulados_period: perOrgPrevSimuladosMap.get(org_id) ?? 0,
    prev_essays_period: perOrgPrevEssaysMap.get(org_id) ?? 0,
  }));

  const payload = {
    total_orgs,
    total_students,
    active_period,
    questions_period,
    simulados_period,
    essays_period,
    prev_active_period,
    prev_questions_period,
    prev_simulados_period,
    prev_essays_period,
    per_org,
    period,
    period_start: periodStart,
  };

  statsCache.set(cacheKey, { expiresAt: Date.now() + STATS_CACHE_TTL_MS, payload });

  return NextResponse.json(payload);
}
