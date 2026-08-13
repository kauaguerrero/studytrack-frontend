'use client';

import useSWR from 'swr';
import { RefreshCw } from 'lucide-react';
import { apiFetcher } from '@/lib/api-fetcher';
import type { TokenBadgeColor } from '@/app/api/admin/prospeccao/automacao/google-calendar/status/route';

const STATUS_URL = '/api/admin/prospeccao/automacao/google-calendar/status';
const AUTH_URL = '/api/admin/prospeccao/automacao/google-calendar/auth';

interface TokenStatus {
  status: 'never_configured' | 'deploying' | 'active' | 'error';
  days_left: number | null;
  color: TokenBadgeColor;
  label: string;
  error_message: string | null;
}

const COLOR_CLS: Record<TokenBadgeColor, string> = {
  gray: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 animate-pulse',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
};

const DOT_CLS: Record<TokenBadgeColor, string> = {
  gray: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export function GoogleCalendarTokenBadge() {
  const { data } = useSWR<TokenStatus>(STATUS_URL, apiFetcher, {
    refreshInterval: (latest) => (latest?.status === 'deploying' ? 10_000 : 5 * 60_000),
    revalidateOnFocus: false,
  });

  const color = data?.color ?? 'gray';
  const label = data?.label ?? 'Carregando...';

  return (
    <div className="flex items-center gap-1.5">
      <span
        title={data?.error_message ?? undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${COLOR_CLS[color]}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[color]}`} />
        Token Google: {label}
      </span>
      <a
        href={AUTH_URL}
        target="_blank"
        rel="noreferrer"
        title="Reautoriza o Google e atualiza o token automaticamente"
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-zinc-700 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Atualizar Token
      </a>
    </div>
  );
}
