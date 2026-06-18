'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { LeadFilters, LeadStatusCRM, LeadTemperature, LeadsStats } from '../types';

const TIPO_OPTIONS = [
  { value: '',          label: 'Tipo' },
  { value: 'empresa',   label: 'Empresa' },
  { value: 'pf',        label: 'Empresário Individual' },
] as const;

const MAX_ANOS_OPTIONS = [
  { value: '',    label: 'Abertura' },
  { value: '5',   label: 'Últimos 5 anos' },
  { value: '10',  label: 'Últimos 10 anos' },
  { value: '15',  label: 'Últimos 15 anos' },
  { value: '20',  label: 'Últimos 20 anos' },
] as const;

const STATUS_OPTIONS: { value: LeadStatusCRM; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'demo_agendada', label: 'Demo agendada' },
  { value: 'proposta_enviada', label: 'Proposta enviada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

const TEMP_OPTIONS: { value: LeadTemperature; label: string }[] = [
  { value: 'quente', label: 'Quente' },
  { value: 'morno', label: 'Morno' },
  { value: 'frio', label: 'Frio' },
];

const selectCls =
  'h-8 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 cursor-pointer transition-colors';

interface FilterBarProps {
  filters: LeadFilters;
  onChange: (filters: LeadFilters) => void;
  totalLeads: number;
  filteredCount: number;
  stats: LeadsStats | null;
}

export function FilterBar({
  filters,
  onChange,
  totalLeads,
  filteredCount,
  stats,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Sync external reset (e.g., "limpar filtros")
  useEffect(() => {
    if (filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const ufOptions = stats?.by_uf ? Object.keys(stats.by_uf).sort() : [];

  const activeFilterCount = [
    filters.uf,
    filters.status,
    filters.has_email,
    filters.has_phone,
    filters.search,
    filters.temperature,
    filters.tipo,
    filters.max_anos,
  ].filter(Boolean).length;

  function clearAll() {
    setSearchInput('');
    onChange({
      uf: '',
      status: '',
      has_email: false,
      has_phone: false,
      search: '',
      temperature: '',
      tipo: '',
      max_anos: '',
    });
  }

  function toggleTemp(t: LeadTemperature) {
    onChange({ ...filters, temperature: filters.temperature === t ? '' : t });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* UF */}
        <select
          value={filters.uf}
          onChange={(e) => onChange({ ...filters, uf: e.target.value })}
          className={selectCls}
        >
          <option value="">UF</option>
          {ufOptions.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>

        {/* Status CRM */}
        <select
          value={filters.status}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value as LeadStatusCRM | '' })
          }
          className={selectCls}
        >
          <option value="">Status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Temperatura */}
        {TEMP_OPTIONS.map((t) => (
          <button
            key={t.value}
            onClick={() => toggleTemp(t.value)}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
              filters.temperature === t.value
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-orange-300 dark:hover:border-orange-500/40'
            )}
          >
            {t.label}
          </button>
        ))}

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        {/* Toggle email */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <Switch
            checked={filters.has_email}
            onCheckedChange={(v) => onChange({ ...filters, has_email: v })}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
            Com email
          </span>
        </label>

        {/* Toggle telefone */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <Switch
            checked={filters.has_phone}
            onCheckedChange={(v) => onChange({ ...filters, has_phone: v })}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
            Com telefone
          </span>
        </label>

        <div className="h-5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

        {/* Tipo de empresa */}
        <select
          value={filters.tipo}
          onChange={(e) =>
            onChange({ ...filters, tipo: e.target.value as 'empresa' | 'pf' | '' })
          }
          className={selectCls}
        >
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Máximo de anos desde abertura */}
        <select
          value={filters.max_anos}
          onChange={(e) => onChange({ ...filters, max_anos: e.target.value })}
          className={selectCls}
        >
          {MAX_ANOS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Busca por nome */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome..."
            className="h-8 w-52 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-zinc-500">
        Exibindo{' '}
        <span className="font-semibold text-slate-600 dark:text-zinc-300">
          {filteredCount}
        </span>{' '}
        de{' '}
        <span className="font-semibold text-slate-600 dark:text-zinc-300">
          {totalLeads}
        </span>{' '}
        leads
      </p>
    </div>
  );
}
