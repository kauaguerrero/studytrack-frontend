'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { LeadFilters, LeadStatusCRM, LeadTemperature, LeadsStats } from '../types';

const STATUS_OPTIONS: { value: LeadStatusCRM; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'contatado', label: 'Contatado' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'handoff', label: 'Hand-off' },
  { value: 'esperando_contato_gestor', label: 'Esperando Contato do Gestor' },
  { value: 'aguardando_confirmacao_call', label: 'Aguardando Confirmação da Call' },
  { value: 'call_agendado', label: 'Call/Reunião Marcada' },
  { value: 'interesse', label: 'Interesse' },
  { value: 'demo_teste', label: 'Demo / Em Testes' },
  { value: 'enviar_proposta', label: 'Enviar proposta' },
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
  'h-8 w-full md:w-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 cursor-pointer transition-colors';

interface StatusMultiSelectProps {
  selected: LeadStatusCRM[];
  onChange: (statuses: LeadStatusCRM[]) => void;
}

function StatusMultiSelect({ selected, onChange }: StatusMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggle(value: LeadStatusCRM) {
    onChange(
      selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          selectCls,
          'flex items-center gap-1.5',
          selected.length > 0 &&
            'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
        )}
      >
        <span>{selected.length > 0 ? `Fases do CRM (${selected.length})` : 'Fases do CRM'}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-64 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-lg">
          <div className="flex items-center justify-between px-1.5 py-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
              Ocultar outras fases
            </span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          {STATUS_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 150);
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
    filters.status.length > 0,
    filters.has_phone,
    filters.search,
    filters.temperature,
  ].filter(Boolean).length;

  function clearAll() {
    setSearchInput('');
    onChange({
      uf: '',
      status: [],
      has_phone: false,
      search: '',
      temperature: '',
    });
  }

  function toggleTemp(t: LeadTemperature) {
    onChange({ ...filters, temperature: filters.temperature === t ? '' : t });
  }

  function renderFilterControls() {
    return (
      <>
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

        {/* Status CRM — multi-seleção: oculta as fases não marcadas no kanban */}
        <StatusMultiSelect
          selected={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
        />

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

        <div className="hidden md:block h-5 w-px bg-slate-200 dark:bg-zinc-700 mx-0.5" />

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
      </>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 md:hidden">
        {/* Busca por nome */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, telefone, email, cidade, sócio..."
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-8 pr-3 text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
            filtersOpen || activeFilterCount > 0
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
        </button>
      </div>

      {filtersOpen && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
          {renderFilterControls()}
        </div>
      )}

      <div className="hidden md:flex flex-wrap items-center gap-2">
        {renderFilterControls()}

        {/* Busca por nome */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome, telefone, email, cidade, sócio..."
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

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="md:hidden flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Limpar filtros
        </button>
      )}

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
