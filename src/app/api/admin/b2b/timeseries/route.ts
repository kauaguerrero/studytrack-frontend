import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

type Period = 'today' | 'week' | 'month' | 'year' | 'lifetime';

const CACHE_TTL_MS = 5 * 60_000;
const tsCache = new Map<string, { expiresAt: number; payload: unknown }>();

// BRT = UTC-3 (Brazil, no DST since 2019)
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

function utcToBrtDateStr(isoTs: string): string {
  const brtMs = new Date(isoTs).getTime() - BRT_OFFSET_MS;
  return new Date(brtMs).toISOString().slice(0, 10);
}

function utcToBrtHourStr(isoTs: string): string {
  const brtMs = new Date(isoTs).getTime() - BRT_OFFSET_MS;
  const h = new Date(brtMs).getUTCHours();
  return `${String(h).padStart(2, '0')}:00`;
}

function utcToBrtMonthStr(isoTs: string): string {
  return utcToBrtDateStr(isoTs).slice(0, 7);
}

// midnight BRT → UTC ISO string
function brtMidnightToUtc(brtDate: string): string {
  return new Date(new Date(`${brtDate}T00:00:00Z`).getTime() + BRT_OFFSET_MS).toISOString();
}

function todayBRT(): string {
  return utcToBrtDateStr(new Date().toISOString());
}

interface BucketConfig {
  startUtc: string;
  buckets: string[];
  bucketFn: (ts: string) => string | null;
}

function getBucketConfig(period: Period): BucketConfig {
  const today = todayBRT();

  if (period === 'today') {
    const buckets = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
    return {
      startUtc: brtMidnightToUtc(today),
      buckets,
      bucketFn: (ts) => utcToBrtHourStr(ts),
    };
  }

  if (period === 'week') {
    const todayDate = new Date(`${today}T12:00:00Z`);
    const day = todayDate.getUTCDay(); // 0=Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(todayDate);
    monday.setUTCDate(todayDate.getUTCDate() + mondayOffset);
    const mondayStr = monday.toISOString().slice(0, 10);

    const buckets: string[] = [];
    const cur = new Date(`${mondayStr}T12:00:00Z`);
    const end = new Date(`${today}T12:00:00Z`);
    while (cur <= end) {
      buckets.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return {
      startUtc: brtMidnightToUtc(mondayStr),
      buckets,
      bucketFn: (ts) => utcToBrtDateStr(ts),
    };
  }

  if (period === 'month') {
    const firstDay = `${today.slice(0, 7)}-01`;
    const buckets: string[] = [];
    const cur = new Date(`${firstDay}T12:00:00Z`);
    const end = new Date(`${today}T12:00:00Z`);
    while (cur <= end) {
      buckets.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return {
      startUtc: brtMidnightToUtc(firstDay),
      buckets,
      bucketFn: (ts) => utcToBrtDateStr(ts),
    };
  }

  if (period === 'year') {
    const year = today.slice(0, 4);
    const currentMonth = today.slice(0, 7);
    const buckets = Array.from({ length: 12 }, (_, m) =>
      `${year}-${String(m + 1).padStart(2, '0')}`
    ).filter((m) => m <= currentMonth);

    return {
      startUtc: brtMidnightToUtc(`${year}-01-01`),
      buckets,
      bucketFn: (ts) => utcToBrtMonthStr(ts),
    };
  }

  // lifetime: last 24 months
  const cur24 = new Date(`${today}T12:00:00Z`);
  cur24.setUTCMonth(cur24.getUTCMonth() - 23);
  cur24.setUTCDate(1);
  const startMonth = cur24.toISOString().slice(0, 7);

  const buckets: string[] = [];
  const curM = new Date(`${startMonth}-01T12:00:00Z`);
  const todayDate = new Date(`${today}T12:00:00Z`);
  while (curM <= todayDate) {
    buckets.push(curM.toISOString().slice(0, 7));
    curM.setUTCMonth(curM.getUTCMonth() + 1);
  }

  return {
    startUtc: brtMidnightToUtc(`${startMonth}-01`),
    buckets,
    bucketFn: (ts) => utcToBrtMonthStr(ts),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const period = (new URL(request.url).searchParams.get('period') ?? 'week') as Period;
  const cacheKey = `ts:${period}`;
  const cached = tsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;

  const { data: orgs } = await db.from('organizations').select('id');
  const orgIds: string[] = (orgs ?? []).map((o: { id: string }) => o.id);

  if (orgIds.length === 0) {
    const payload = { series: [] };
    tsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return NextResponse.json(payload);
  }

  const { data: profiles } = await db
    .from('profiles')
    .select('id')
    .in('organization_id', orgIds)
    .eq('role', 'student')
    .neq('plan_tier', 'b2b_test');

  const profileIds: string[] = (profiles ?? []).map((p: { id: string }) => p.id);

  const { startUtc, buckets, bucketFn } = getBucketConfig(period);

  const bucketMap = new Map(
    buckets.map((b) => [b, { active: new Set<string>(), questions: 0, correct: 0, simulados: 0, essays: 0 }])
  );

  await Promise.all([
    (async () => {
      if (!profileIds.length) return;
      // Paginate answers to avoid hitting PostgREST row limit
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data } = await db
          .from('user_answers')
          .select('user_id, created_at, is_correct')
          .in('user_id', profileIds)
          .gte('created_at', startUtc)
          .order('created_at', { ascending: true })
          .range(offset, offset + PAGE - 1);

        const rows: { user_id: string; created_at: string; is_correct: boolean }[] = data ?? [];
        for (const row of rows) {
          if (!row.created_at) continue;
          const bucket = bucketFn(row.created_at);
          if (!bucket || !bucketMap.has(bucket)) continue;
          const d = bucketMap.get(bucket)!;
          d.questions++;
          if (row.is_correct) d.correct++;
          d.active.add(row.user_id);
        }

        if (rows.length < PAGE) break;
        offset += PAGE;
        // Safety cap: max 100K rows
        if (offset >= 100_000) break;
      }
    })(),

    (async () => {
      if (!profileIds.length) return;
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data } = await db
          .from('simulado_sessions')
          .select('user_id, completed_at')
          .in('user_id', profileIds)
          .eq('status', 'completed')
          .gte('completed_at', startUtc)
          .order('completed_at', { ascending: true })
          .range(offset, offset + PAGE - 1);

        const rows: { user_id: string; completed_at: string }[] = data ?? [];
        for (const row of rows) {
          if (!row.completed_at) continue;
          const bucket = bucketFn(row.completed_at);
          if (!bucket || !bucketMap.has(bucket)) continue;
          bucketMap.get(bucket)!.simulados++;
        }

        if (rows.length < PAGE) break;
        offset += PAGE;
        if (offset >= 50_000) break;
      }
    })(),

    (async () => {
      if (!orgIds.length) return;
      const PAGE = 1000;
      let offset = 0;
      while (true) {
        const { data } = await db
          .from('essays')
          .select('org_id, submitted_at')
          .in('org_id', orgIds)
          .gte('submitted_at', startUtc)
          .order('submitted_at', { ascending: true })
          .range(offset, offset + PAGE - 1);

        const rows: { org_id: string; submitted_at: string }[] = data ?? [];
        for (const row of rows) {
          if (!row.submitted_at) continue;
          const bucket = bucketFn(row.submitted_at);
          if (!bucket || !bucketMap.has(bucket)) continue;
          bucketMap.get(bucket)!.essays++;
        }

        if (rows.length < PAGE) break;
        offset += PAGE;
        if (offset >= 20_000) break;
      }
    })(),
  ]);

  const series = buckets.map((bucket) => {
    const d = bucketMap.get(bucket)!;
    return {
      label: bucket,
      active: d.active.size,
      questions: d.questions,
      accuracy: d.questions >= 5 ? Math.round((d.correct / d.questions) * 1000) / 10 : null,
      simulados: d.simulados,
      essays: d.essays,
    };
  });

  const payload = { series };
  tsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
  return NextResponse.json(payload);
}
