'use client';

import { useTheme } from 'next-themes';
import { Search, AlertTriangle, X } from 'lucide-react';

const PRIORITY_PILLS: Array<{ value: string; label: string; accent?: string }> = [
  { value: '', label: 'Todos' },
  { value: 'critical', label: '🔴 Crítico', accent: '#ef4444' },
  { value: 'high',     label: '🟠 Alto',    accent: '#f97316' },
  { value: 'medium',   label: '🟡 Médio',   accent: '#eab308' },
  { value: 'low',      label: '🟢 Baixo',   accent: '#22c55e' },
];

interface Filters {
  status: string;
  priority: string;
  search: string;
  overdue: boolean;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

const STATUS_PILLS: Array<{
  value: string;
  label: string;
  accent?: string;
}> = [
  { value: '', label: 'Todos' },
  { value: 'backlog', label: 'Backlog', accent: '#6366f1' },
  { value: 'in_progress', label: 'Andamento', accent: '#3b82f6' },
  { value: 'review', label: 'Revisão', accent: '#f59e0b' },
  { value: 'done', label: 'Pronto', accent: '#10b981' },
];

export default function TaskFilters({ filters, onChange }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Buscar tasks..."
          className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-8 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 w-44 transition-all duration-150"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex items-center gap-1">
        {STATUS_PILLS.map(pill => {
          const active = filters.status === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => onChange({ ...filters, status: pill.value })}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all duration-150 cursor-pointer"
              style={
                active
                  ? pill.accent
                    ? {
                        background: `${pill.accent}22`,
                        color: pill.accent,
                        borderColor: `${pill.accent}45`,
                      }
                    : {
                        background: 'rgba(255,255,255,0.1)',
                        color: '#e4e4e7',
                        borderColor: 'rgba(255,255,255,0.15)',
                      }
                  : {
                      background: 'transparent',
                      color: isDark ? '#52525b' : '#71717a',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
                    }
              }
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Priority pills */}
      <div className="flex items-center gap-1">
        {PRIORITY_PILLS.map(pill => {
          const active = filters.priority === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => onChange({ ...filters, priority: pill.value })}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all duration-150 cursor-pointer"
              style={
                active
                  ? pill.accent
                    ? { background: `${pill.accent}22`, color: pill.accent, borderColor: `${pill.accent}45` }
                    : { background: 'rgba(255,255,255,0.1)', color: '#e4e4e7', borderColor: 'rgba(255,255,255,0.15)' }
                  : { background: 'transparent', color: isDark ? '#52525b' : '#71717a', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }
              }
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Overdue toggle */}
      <button
        onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all duration-150 cursor-pointer"
        style={
          filters.overdue
            ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }
            : { background: 'transparent', color: isDark ? '#52525b' : '#71717a', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)' }
        }
      >
        <AlertTriangle className="w-3 h-3" />
        Vencidas
      </button>
    </div>
  );
}
