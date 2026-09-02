import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Custo de infra por provedor no mês corrente, a partir de `infra_cost_snapshots`
 * (populada 1x/dia pelo cron `infra_cost_snapshot` no backend).
 *
 * Todos os provedores têm granularidade diária: `mtd_usd` = soma dos dias,
 * `today_usd`/`prev_day_usd` = valor do dia. `series` traz o ACUMULADO por dia
 * (pro gráfico de linha de crescimento).
 */

type ProviderKey = 'gcp' | 'mathpix';
type Status = 'ok' | 'not_configured' | 'error';

const PROVIDERS: ProviderKey[] = ['gcp', 'mathpix'];

const CACHE_TTL_MS = 60_000;
let cache: { expiresAt: number; payload: unknown } | null = null;

// BRT = UTC-3, sem horário de verão
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

function brtToday(): string {
  return new Date(Date.now() - BRT_OFFSET_MS).toISOString().slice(0, 10);
}

function monthDays(monthStart: string, today: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${monthStart}T12:00:00Z`);
  const end = new Date(`${today}T12:00:00Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

interface Row {
  provider: ProviderKey;
  snapshot_date: string;
  cost_usd: number | string | null;
  status: Status;
  meta: Record<string, unknown> | null;
  updated_at: string | null;
}

interface ProviderSummary {
  provider: ProviderKey;
  status: Status;
  mtd_usd: number | null;
  today_usd: number | null;
  prev_day_usd: number | null;
}

function num(v: number | string | null): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.payload);
  }

  const today = brtToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const days = monthDays(monthStart, today);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any;
  const { data, error } = await db
    .from('infra_cost_snapshots')
    .select('provider, snapshot_date, cost_usd, status, meta, updated_at')
    .gte('snapshot_date', monthStart)
    .lte('snapshot_date', today)
    .order('snapshot_date', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Falha ao ler infra_cost_snapshots.' }, { status: 500 });
  }

  const rows: Row[] = data ?? [];
  const byProvider = new Map<ProviderKey, Row[]>();
  for (const p of PROVIDERS) byProvider.set(p, []);
  for (const r of rows) byProvider.get(r.provider)?.push(r);

  let updatedAt: string | null = null;
  for (const r of rows) {
    if (r.updated_at && (!updatedAt || r.updated_at > updatedAt)) updatedAt = r.updated_at;
  }

  // series[date] = { gcp, mathpix } acumulado
  const cumByDay: Record<string, Record<ProviderKey, number | null>> = {};
  for (const d of days) cumByDay[d] = { gcp: null, mathpix: null };

  const providers: ProviderSummary[] = PROVIDERS.map((provider) => {
    const pRows = (byProvider.get(provider) ?? []).slice().sort((a, b) =>
      a.snapshot_date.localeCompare(b.snapshot_date)
    );

    const latest = pRows[pRows.length - 1] ?? null;
    const status: Status = latest?.status ?? 'not_configured';

    const dayMap = new Map<string, number | null>();
    for (const r of pRows) dayMap.set(r.snapshot_date, r.status === 'ok' ? num(r.cost_usd) : null);

    let running = 0;
    let sawAny = false;
    for (const d of days) {
      const v = dayMap.get(d);
      if (v !== null && v !== undefined) {
        running += v;
        sawAny = true;
      }
      cumByDay[d][provider] = sawAny ? running : null;
    }

    const yesterday = days[days.length - 2] ?? null;
    return {
      provider,
      status,
      mtd_usd: sawAny ? running : null,
      today_usd: dayMap.get(today) ?? null,
      prev_day_usd: yesterday ? dayMap.get(yesterday) ?? null : null,
    };
  });

  const series = days.map((d) => ({
    date: d,
    gcp: cumByDay[d].gcp,
    mathpix: cumByDay[d].mathpix,
  }));

  const payload = {
    month: today.slice(0, 7),
    today,
    updated_at: updatedAt,
    providers,
    series,
  };

  cache = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
  return NextResponse.json(payload);
}
