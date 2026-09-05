'use client';

// Ordenação da lista de "Redações já corrigidas".
//
// A lista é paginada no servidor, então a ordenação vai para a API — ordenar no
// cliente reordenaria apenas a página carregada. Os campos abaixo foram
// conferidos contra o PostgREST; `student` ordena o registro pai por coluna de
// tabela embutida (`order=student(full_name)`), o que exige o embed no select.

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterDropdownButton } from './EssayFiltersDropdown';

export type CorrectedSortField =
  | 'submitted_at'
  | 'corrected_at'
  | 'score'
  | 'student'
  | 'essay_type';

export interface CorrectedSortValue {
  field: CorrectedSortField;
  dir: 'asc' | 'desc';
}

export const DEFAULT_CORRECTED_SORT: CorrectedSortValue = {
  field: 'submitted_at',
  dir: 'desc',
};

const SORT_FIELD_OPTIONS: { value: CorrectedSortField; label: string }[] = [
  { value: 'submitted_at', label: 'Data de envio' },
  { value: 'corrected_at', label: 'Data de correção' },
  { value: 'score', label: 'Nota' },
  { value: 'student', label: 'Nome do aluno' },
  { value: 'essay_type', label: 'Tipo de redação' },
];

const SORT_DIR_LABELS: Record<CorrectedSortField, { desc: string; asc: string }> = {
  submitted_at: { desc: 'Mais recentes', asc: 'Mais antigas' },
  corrected_at: { desc: 'Mais recentes', asc: 'Mais antigas' },
  score: { desc: 'Maior nota', asc: 'Menor nota' },
  student: { desc: 'Z a A', asc: 'A a Z' },
  essay_type: { desc: 'Z a A', asc: 'A a Z' },
};

/** Rótulo curto do estado atual, exibido na pílula quando há ordenação custom. */
export function correctedSortLabel(value: CorrectedSortValue): string {
  const field = SORT_FIELD_OPTIONS.find((o) => o.value === value.field);
  return `${field?.label ?? 'Ordenação'}: ${SORT_DIR_LABELS[value.field][value.dir]}`;
}

const PILL = 'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-150';

export function CorrectedSortControl({
  value,
  onChange,
  hex,
  scoreMixesScales,
}: {
  value: CorrectedSortValue;
  onChange: (v: CorrectedSortValue) => void;
  hex?: string;
  /** Tipo em "Todas": ordenar por nota mistura escalas (ENEM 1000 x VUNESP 14). */
  scoreMixesScales?: boolean;
}) {
  // Rascunho local: só aplica quando o founder confirma, igual ao painel de
  // filtros ao lado. Ressincroniza no render quando muda por fora.
  const [draft, setDraft] = useState<CorrectedSortValue>(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setDraft(value);
  }

  const isQuick = value.field === 'submitted_at';
  const custom = !isQuick;

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
      {(['desc', 'asc'] as const).map((dir) => {
        const active = isQuick && value.dir === dir;
        return (
          <button
            key={dir}
            type="button"
            onClick={() => onChange({ field: 'submitted_at', dir })}
            className={cn(
              PILL,
              active
                ? 'bg-white shadow-sm dark:bg-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80',
            )}
            style={active ? { color: hex || 'var(--brand-primary)' } : undefined}
          >
            {dir === 'desc' ? 'Mais recentes' : 'Mais antigas'}
          </button>
        );
      })}

      <FilterDropdownButton
        activeCount={custom ? 1 : 0}
        trigger={({ open, toggle, ref }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            title="Ordenação personalizada"
            className={cn(
              PILL,
              'inline-flex items-center gap-1.5',
              custom || open
                ? 'bg-white shadow-sm dark:bg-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80',
            )}
            style={custom || open ? { color: hex || 'var(--brand-primary)' } : undefined}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {custom ? correctedSortLabel(value) : 'Personalizado'}
          </button>
        )}
        footer={(close) => (
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              close();
            }}
            className="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            Aplicar
          </button>
        )}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ordenar por
            </p>
            <div className="space-y-1">
              {SORT_FIELD_OPTIONS.map((opt) => {
                const active = draft.field === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, field: opt.value }))}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition',
                      active
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        active
                          ? 'border-[var(--brand-primary)]'
                          : 'border-slate-300 dark:border-slate-600',
                      )}
                    >
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                      )}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {draft.field === 'score' && scoreMixesScales && (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                As bancas usam escalas diferentes (ENEM vai até 1000, VUNESP até 14).
                Escolha uma banca no filtro de tipo para a ordem por nota fazer sentido.
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Direção
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['desc', 'asc'] as const).map((dir) => {
                const active = draft.dir === dir;
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, dir }))}
                    className={cn(
                      'rounded-lg border px-2.5 py-2 text-xs font-semibold transition',
                      active
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
                    )}
                  >
                    {SORT_DIR_LABELS[draft.field][dir]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FilterDropdownButton>
    </div>
  );
}
