'use client';

import { Database, Phone, TrendingUp, CheckCircle2 } from 'lucide-react';
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
    getValue: (s: LeadsStats) => s.total,
  },
  {
    key: 'com_contato',
    label: 'Com contato disponível',
    icon: Phone,
    color: 'text-blue-500',
    getValue: (s: LeadsStats) => s.com_contato,
  },
  {
    key: 'em_andamento',
    label: 'Em andamento',
    icon: TrendingUp,
    color: 'text-amber-500',
    getValue: (s: LeadsStats) => s.em_andamento,
  },
  {
    key: 'conversoes',
    label: 'Conversões',
    icon: CheckCircle2,
    color: 'text-emerald-500',
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
      {CARDS.map(({ key, label, icon: Icon, color, getValue }) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 px-4 py-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${color}`} />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              {label}
            </p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {stats ? getValue(stats) : 0}
          </p>
        </div>
      ))}
    </div>
  );
}
