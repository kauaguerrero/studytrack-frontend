'use client';

import { BarChart2, CheckCircle2, Database, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { LeadsStats } from '../types';

interface KPICardsProps {
  stats: LeadsStats | null;
  isLoading: boolean;
}

const CARDS = [
  {
    key: 'total',
    label: 'Total de leads',
    icon: Database,
    color: 'text-violet-500',
    border: 'border-t-violet-500',
    getValue: (s: LeadsStats) => s.total,
  },
  {
    key: 'conversion_rate',
    label: 'Taxa de conversão',
    icon: BarChart2,
    color: 'text-emerald-500',
    border: 'border-t-blue-500',
    getValue: (s: LeadsStats) => `${s.conversion_rate.toFixed(1)}%`,
  },
  {
    key: 'em_andamento',
    label: 'Em andamento',
    icon: TrendingUp,
    color: 'text-amber-500',
    border: 'border-t-amber-500',
    getValue: (s: LeadsStats) => s.em_andamento,
  },
  {
    key: 'conversoes',
    label: 'Conversões',
    icon: CheckCircle2,
    color: 'text-emerald-500',
    border: 'border-t-emerald-500',
    getValue: (s: LeadsStats) => s.conversoes,
  },
] as const;

export function KPICards({ stats, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARDS.map((c) => (
          <Skeleton key={c.key} className="h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARDS.map(({ key, label, icon: Icon, color, border, getValue }) => (
        <div
          key={key}
          className={`rounded-xl border-t-2 ${border} bg-white dark:bg-zinc-900 px-4 py-3 shadow-sm`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${color}`} />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              {label}
            </p>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats ? getValue(stats) : 0}
          </p>
        </div>
      ))}
    </div>
  );
}
