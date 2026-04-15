'use client';

import { useRef, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Search, SlidersHorizontal, X, Check, AlertTriangle } from 'lucide-react';
import { useAdminProfiles } from './hooks/useTasks';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface Filters {
  status: string[];
  priority: string[];
  assignee_ids: string[];
  created_by: string;
  date_range: string;   // 'today' | 'week' | 'month' | 'year' | ''
  overdue: boolean;
  search: string;
}

export const DEFAULT_FILTERS: Filters = {
  status: [],
  priority: [],
  assignee_ids: [],
  created_by: '',
  date_range: '',
  overdue: false,
  search: '',
};

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  sprintOnly?: boolean;
  onToggleSprintOnly?: (value: boolean) => void;
}

// ─── Option lists ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'backlog',     label: 'Backlog',       color: '#6366f1' },
  { value: 'in_progress', label: 'Em Andamento',  color: '#3b82f6' },
  { value: 'review',      label: 'Em Revisão',    color: '#f59e0b' },
  { value: 'done',        label: 'Concluído',     color: '#10b981' },
  { value: 'archived',    label: 'Arquivado',     color: '#71717a' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '🔴 Crítico', color: '#ef4444' },
  { value: 'high',     label: '🟠 Alto',    color: '#f97316' },
  { value: 'medium',   label: '🟡 Médio',   color: '#eab308' },
  { value: 'low',      label: '🟢 Baixo',   color: '#22c55e' },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Criado hoje' },
  { value: 'week',  label: 'Essa semana' },
  { value: 'month', label: 'Esse mês' },
  { value: 'year',  label: 'Esse ano' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function countActiveFilters(f: Filters): number {
  return (
    f.status.length +
    f.priority.length +
    f.assignee_ids.length +
    (f.created_by ? 1 : 0) +
    (f.date_range ? 1 : 0) +
    (f.overdue ? 1 : 0)
  );
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FilterSection({
  label,
  children,
  isDark,
}: {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: isDark ? '#52525b' : '#a1a1aa' }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  label,
  color,
  onRemove,
}: {
  label: string;
  color?: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={
        color
          ? { background: `${color}20`, color }
          : { background: 'rgba(99,102,241,0.12)', color: '#818cf8' }
      }
    >
      {label}
      <button onClick={onRemove} className="hover:opacity-60 transition-opacity ml-0.5">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function TaskFilters({ filters, onChange, sprintOnly, onToggleSprintOnly }: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted && resolvedTheme !== 'light';
  const { profiles } = useAdminProfiles();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const clearAll = () =>
    onChange({
      ...filters,
      status: [],
      priority: [],
      assignee_ids: [],
      created_by: '',
      date_range: '',
      overdue: false,
    });

  // Shared pill style helpers
  const activePillStyle = (color: string) => ({
    background: `${color}22`,
    color,
    borderColor: `${color}45`,
  });
  const inactivePillStyle = {
    background: 'transparent',
    color: isDark ? '#52525b' : '#a1a1aa',
    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)',
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="Buscar tasks..."
          className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-8 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 w-48 transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Filter button ──────────────────────────────────────────────── */}
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => setOpen(v => !v)}
          className="relative flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer"
          style={
            open || activeCount > 0
              ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8', borderColor: 'rgba(99,102,241,0.35)' }
              : { background: 'transparent', color: isDark ? '#71717a' : '#71717a', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }
          }
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <span
              className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
              style={{ background: '#6366f1', color: '#fff' }}
            >
              {activeCount}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ─────────────────────────────────────────────── */}
        {open && (
          <div
            ref={panelRef}
            className="absolute top-[calc(100%+8px)] left-0 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden"
            style={{
              background: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
            >
              <span
                className="text-[13px] font-semibold"
                style={{ color: isDark ? '#e4e4e7' : '#18181b' }}
              >
                Filtros
              </span>
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] font-medium text-zinc-500 hover:text-red-400 transition-colors"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {/* Sections */}
            <div className="p-4 flex flex-col gap-5 max-h-[500px] overflow-y-auto">
              {/* Status */}
              <FilterSection label="Status" isDark={isDark}>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(opt => {
                    const active = filters.status.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onChange({ ...filters, status: toggle(filters.status, opt.value) })
                        }
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all cursor-pointer"
                        style={active ? activePillStyle(opt.color) : inactivePillStyle}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Priority */}
              <FilterSection label="Prioridade" isDark={isDark}>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map(opt => {
                    const active = filters.priority.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onChange({ ...filters, priority: toggle(filters.priority, opt.value) })
                        }
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all cursor-pointer"
                        style={active ? activePillStyle(opt.color) : inactivePillStyle}
                      >
                        {active && <Check className="w-3 h-3" />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Assignee */}
              {profiles.length > 0 && (
                <FilterSection label="Responsável" isDark={isDark}>
                  <div className="flex flex-col gap-0.5">
                    {profiles.map(p => {
                      const active = filters.assignee_ids.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() =>
                            onChange({
                              ...filters,
                              assignee_ids: toggle(filters.assignee_ids, p.id),
                            })
                          }
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer"
                          style={
                            active
                              ? { background: 'rgba(99,102,241,0.1)', color: '#818cf8' }
                              : { color: isDark ? '#71717a' : '#71717a' }
                          }
                        >
                          <div
                            className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center border transition-all"
                            style={
                              active
                                ? { background: '#6366f1', borderColor: '#6366f1' }
                                : {
                                    background: 'transparent',
                                    borderColor: isDark ? '#3f3f46' : '#d4d4d8',
                                  }
                            }
                          >
                            {active && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {p.full_name}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}

              {/* Created by */}
              {profiles.length > 0 && (
                <FilterSection label="Criado por" isDark={isDark}>
                  <div className="flex flex-col gap-0.5">
                    {profiles.map(p => {
                      const active = filters.created_by === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() =>
                            onChange({ ...filters, created_by: active ? '' : p.id })
                          }
                          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer"
                          style={
                            active
                              ? { background: 'rgba(99,102,241,0.1)', color: '#818cf8' }
                              : { color: isDark ? '#71717a' : '#71717a' }
                          }
                        >
                          {/* Radio dot */}
                          <div
                            className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center border transition-all"
                            style={
                              active
                                ? { background: '#6366f1', borderColor: '#6366f1' }
                                : {
                                    background: 'transparent',
                                    borderColor: isDark ? '#3f3f46' : '#d4d4d8',
                                  }
                            }
                          >
                            {active && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          {p.full_name}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>
              )}

              {/* Date range */}
              <FilterSection label="Criado em" isDark={isDark}>
                <div className="flex flex-wrap gap-1.5">
                  {DATE_OPTIONS.map(opt => {
                    const active = filters.date_range === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() =>
                          onChange({ ...filters, date_range: active ? '' : opt.value })
                        }
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all cursor-pointer"
                        style={
                          active
                            ? {
                                background: 'rgba(99,102,241,0.12)',
                                color: '#818cf8',
                                borderColor: 'rgba(99,102,241,0.35)',
                              }
                            : inactivePillStyle
                        }
                      >
                        {active && <Check className="w-3 h-3" />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              {/* Overdue */}
              <FilterSection label="Prazo" isDark={isDark}>
                <button
                  onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
                  className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all w-fit cursor-pointer"
                  style={
                    filters.overdue
                      ? {
                          background: 'rgba(239,68,68,0.12)',
                          color: '#f87171',
                          borderColor: 'rgba(239,68,68,0.3)',
                        }
                      : inactivePillStyle
                  }
                >
                  <AlertTriangle className="w-3 h-3" />
                  {filters.overdue && <Check className="w-3 h-3" />}
                  Apenas vencidas
                </button>
              </FilterSection>
            </div>
          </div>
        )}
      </div>

      {/* ── Sprint-only chip (quando ativo via strip) ─────────────────── */}
      {sprintOnly && onToggleSprintOnly && (
        <span
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
          style={{
            background:  'rgba(20,184,166,0.12)',
            color:       isDark ? '#2dd4bf' : '#0f766e',
            borderColor: isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.30)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
          Sprint ativa
          <button
            onClick={() => onToggleSprintOnly(false)}
            className="hover:opacity-60 transition-opacity ml-0.5"
            aria-label="Remover filtro de sprint"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      )}

      {/* ── Active filter chips ────────────────────────────────────────── */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.status.map(s => {
            const opt = STATUS_OPTIONS.find(o => o.value === s);
            if (!opt) return null;
            return (
              <Chip
                key={s}
                label={opt.label}
                color={opt.color}
                onRemove={() =>
                  onChange({ ...filters, status: filters.status.filter(v => v !== s) })
                }
              />
            );
          })}

          {filters.priority.map(p => {
            const opt = PRIORITY_OPTIONS.find(o => o.value === p);
            if (!opt) return null;
            return (
              <Chip
                key={p}
                label={opt.label}
                color={opt.color}
                onRemove={() =>
                  onChange({ ...filters, priority: filters.priority.filter(v => v !== p) })
                }
              />
            );
          })}

          {filters.assignee_ids.map(id => {
            const profile = profiles.find(p => p.id === id);
            if (!profile) return null;
            return (
              <Chip
                key={id}
                label={profile.full_name.split(' ')[0]}
                onRemove={() =>
                  onChange({
                    ...filters,
                    assignee_ids: filters.assignee_ids.filter(v => v !== id),
                  })
                }
              />
            );
          })}

          {filters.created_by && (() => {
            const profile = profiles.find(p => p.id === filters.created_by);
            return profile ? (
              <Chip
                key="cb"
                label={`Por ${profile.full_name.split(' ')[0]}`}
                onRemove={() => onChange({ ...filters, created_by: '' })}
              />
            ) : null;
          })()}

          {filters.date_range && (
            <Chip
              label={DATE_OPTIONS.find(o => o.value === filters.date_range)?.label ?? ''}
              onRemove={() => onChange({ ...filters, date_range: '' })}
            />
          )}

          {filters.overdue && (
            <Chip
              label="Vencidas"
              color="#ef4444"
              onRemove={() => onChange({ ...filters, overdue: false })}
            />
          )}
        </div>
      )}
    </div>
  );
}
