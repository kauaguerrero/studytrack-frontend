'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { Users, TrendingUp, DollarSign } from 'lucide-react';
import type { KPITotals } from '../types';

function useCountUp(target: number | null, duration = 600): number | null {
  const [display, setDisplay] = useState<number | null>(target);
  const prevRef = useRef<number | null>(target);

  useEffect(() => {
    if (target === null) { prevRef.current = null; return; }
    const from = prevRef.current ?? 0;
    prevRef.current = target;
    const controls = animate(from, target, {
      duration: duration / 1000,
      ease: 'easeOut',
      onUpdate: v => setDisplay(Math.round(v * 10) / 10),
    });
    return controls.stop;
  }, [target, duration]);

  return target === null ? null : display;
}

function KPICard({
  icon: Icon,
  label,
  value,
  format,
  color,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  format: (v: number) => string;
  color: string;
  loading: boolean;
}) {
  const animated = useCountUp(value);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 flex items-center gap-3 min-w-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{label}</p>
        {loading || animated === null ? (
          <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-700 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {format(animated)}
          </p>
        )}
      </div>
    </div>
  );
}

export function KPIStrip({ totals, loading, regionName }: {
  totals: KPITotals | undefined;
  loading: boolean;
  regionName: string;
}) {
  const fmt = (v: number) => v.toLocaleString('pt-BR');
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const fmtBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wide px-0.5">
        {regionName}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPICard
          icon={Users}
          label="Leads na região"
          value={totals?.total_leads ?? null}
          format={fmt}
          color="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
          loading={loading}
        />
        <KPICard
          icon={TrendingUp}
          label="Taxa de conversão"
          value={totals?.taxa_conversao ?? null}
          format={fmtPct}
          color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
          loading={loading}
        />
        <KPICard
          icon={DollarSign}
          label="Ticket médio potencial"
          value={totals?.ticket_medio ?? null}
          format={fmtBRL}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          loading={loading}
        />
      </div>
    </div>
  );
}
