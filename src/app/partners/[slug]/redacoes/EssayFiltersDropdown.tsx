'use client';

// Botão "Ajustar Filtros" em cascata, reaproveitado no topo da página de
// Redações (tipo + período) e na seção "Redações já corrigidas" (status).

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ESSAY_TYPE_CONFIGS, type EssayType, type EssayTypeConfig } from '@/lib/essay-types';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterValue {
  preset: DatePreset | null;
  from: string | null; // YYYY-MM-DD, só para preset 'custom'
  to: string | null;
}

export const DEFAULT_DATE_FILTER: DateFilterValue = { preset: null, from: null, to: null };

export type EssayStatusFilter = 'all' | 'pending' | 'corrected' | 'seen';

const QUICK_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Essa semana' },
  { value: 'month', label: 'Esse mês' },
];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Hoje',
  yesterday: 'Ontem',
  week: 'Essa semana',
  month: 'Esse mês',
  custom: 'Personalizado',
};

// Sem opção "Pendentes": este dropdown filtra a lista de redações já
// corrigidas, que nunca contém itens pendentes.
const STATUS_OPTIONS: { value: Exclude<EssayStatusFilter, 'pending'>; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'corrected', label: 'Corrigidas' },
  { value: 'seen', label: 'Arquivadas' },
];

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

// ─── Shell genérico do dropdown ────────────────────────────────────────────

const PANEL_WIDTH = 320;
const PANEL_MARGIN = 8;
const PANEL_MIN_SPACE = 280;

type PanelPos = { left: number; maxHeight: number; top?: number; bottom?: number };

export function FilterDropdownButton({
  label = 'Ajustar Filtros',
  activeCount,
  onClear,
  children,
  footer,
  trigger,
}: {
  label?: string;
  activeCount: number;
  onClear?: () => void;
  children: React.ReactNode;
  /** Rodapé fixo no final do painel (ex: botão "Salvar Filtros"). Recebe uma
   * função `close` para fechar o painel após aplicar as mudanças. */
  footer?: (close: () => void) => React.ReactNode;
  /** Substitui o botão padrão — usado pelo controle de ordenação, que precisa
   * de um gatilho em forma de pílula dentro do switch. O painel (posicionado
   * com `fixed`, para escapar do `overflow-hidden` do card) é o mesmo. */
  trigger?: (args: {
    open: boolean;
    toggle: () => void;
    ref: React.RefObject<HTMLButtonElement | null>;
  }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function computePosition() {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const spaceBelow = viewportH - rect.bottom - PANEL_MARGIN;
      const spaceAbove = rect.top - PANEL_MARGIN;
      const openUp = spaceBelow < PANEL_MIN_SPACE && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(480, openUp ? spaceAbove : spaceBelow));
      let left = rect.left;
      if (left + PANEL_WIDTH > viewportW - PANEL_MARGIN) left = Math.max(PANEL_MARGIN, viewportW - PANEL_WIDTH - PANEL_MARGIN);
      setPanelPos(
        openUp
          ? { left, maxHeight, bottom: viewportH - rect.top + PANEL_MARGIN }
          : { left, maxHeight, top: rect.bottom + PANEL_MARGIN },
      );
    }

    computePosition();
    const raf = requestAnimationFrame(() => setMounted(true));
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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    // Fecha ao rolar a página (fora do próprio painel) em vez de tentar
    // reposicionar em tempo real — evita o painel ficar preso fora da
    // viewport quando o botão está perto do rodapé da página. O scroll
    // interno do painel (para ver os filtros de baixo) não deve fechá-lo.
    function handleScroll(e: Event) {
      if (panelRef.current && e.target instanceof Node && panelRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', computePosition);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', computePosition);
      setMounted(false);
      setPanelPos(null);
    };
  }, [open]);

  return (
    <div className="relative">
      {trigger ? (
        trigger({ open, toggle: () => setOpen((v) => !v), ref: btnRef })
      ) : (
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all',
            open || activeCount > 0
              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)]/40',
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {label}
          {activeCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className={cn(
            'fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px] transition-opacity duration-300 dark:bg-black/20',
            mounted ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setOpen(false)}
        />
      )}

      {open && panelPos && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            left: panelPos.left,
            top: panelPos.top,
            bottom: panelPos.bottom,
            maxHeight: panelPos.maxHeight,
            width: PANEL_WIDTH,
          }}
          className="z-50 flex max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Filtros</span>
            {activeCount > 0 && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-500 dark:text-slate-400"
              >
                Limpar tudo
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-slate-100 p-3 dark:border-slate-800">
              {footer(() => setOpen(false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Seção reutilizável: Tipo de Redação (select) ──────────────────────────

function EssayTypeSelectField({
  essayType,
  onEssayTypeChange,
}: {
  essayType: EssayType | 'all';
  onEssayTypeChange: (t: EssayType | 'all') => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Tipo de Redação
      </label>
      <select
        value={essayType}
        onChange={(e) => onEssayTypeChange(e.target.value as EssayType | 'all')}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {/* "Todas" cobre todas as bancas de uma vez. "Geral" fica de fora do
         * seletor — não é uma banca real (config degenerada, sem competências)
         * e já é ignorada pelas APIs de métricas. */}
        <option value="all">Todas as bancas</option>
        {(Object.entries(ESSAY_TYPE_CONFIGS) as [EssayType, EssayTypeConfig][])
          .filter(([key]) => key !== 'geral')
          .map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
      </select>
    </div>
  );
}

// ─── Seção reutilizável: Período (presets rápidos + intervalo custom) ──────

function PeriodoFilterSection({
  dateFilter,
  onDateFilterChange,
}: {
  dateFilter: DateFilterValue;
  onDateFilterChange: (v: DateFilterValue) => void;
}) {
  const [customFrom, setCustomFrom] = useState(dateFilter.preset === 'custom' ? dateFilter.from ?? '' : '');
  const [customTo, setCustomTo] = useState(dateFilter.preset === 'custom' ? dateFilter.to ?? '' : '');

  const periodoValueLabel = dateFilter.preset ? PRESET_LABELS[dateFilter.preset] : undefined;
  const rangeDays = customFrom && customTo ? daysBetween(customFrom, customTo) + 1 : null;
  const rangeValid = rangeDays !== null && rangeDays >= 1 && rangeDays <= 60 && customFrom <= customTo;

  // Aplica o período customizado assim que os dois campos ficam válidos —
  // sem botão local, o commit final acontece no "Salvar Filtros" do painel.
  function handleCustomChange(from: string, to: string) {
    setCustomFrom(from);
    setCustomTo(to);
    const days = from && to ? daysBetween(from, to) + 1 : null;
    if (days !== null && days >= 1 && days <= 60 && from <= to) {
      onDateFilterChange({ preset: 'custom', from, to });
    }
  }

  return (
    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
      <label className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <span>Período</span>
        {periodoValueLabel && (
          <span className="normal-case text-[var(--brand-primary)]">{periodoValueLabel}</span>
        )}
      </label>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_PRESETS.map((opt) => {
          const active = dateFilter.preset === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onDateFilterChange(active ? DEFAULT_DATE_FILTER : { preset: opt.value, from: null, to: null });
                setCustomFrom('');
                setCustomTo('');
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all',
                active
                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-[var(--brand-primary)]/40',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Período personalizado (máx. 60 dias)
        </p>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomChange(e.target.value, customTo)}
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <span className="text-[11px] text-slate-400">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => handleCustomChange(customFrom, e.target.value)}
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        {customFrom && customTo && !rangeValid && (
          <p className="mt-1.5 text-[10px] font-semibold text-red-500">
            {customFrom > customTo
              ? 'A data inicial deve ser antes da final.'
              : 'Selecione um período de até 60 dias.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Filtro do topo: Tipo de Redação (select) + Período ────────────────────

export function EssayTypeAndPeriodFilter({
  essayType,
  onEssayTypeChange,
  dateFilter,
  onDateFilterChange,
  neutralType = 'all',
}: {
  essayType: EssayType | 'all';
  onEssayTypeChange: (t: EssayType | 'all') => void;
  dateFilter: DateFilterValue;
  onDateFilterChange: (v: DateFilterValue) => void;
  /** Valor "sem filtro" do tipo de redação — conta como filtro ativo e alvo do
   * "Limpar tudo". Padrão `'all'` (tela de Associados); a página de Redações
   * passa `'enem'`, que é o estado padrão dela. */
  neutralType?: EssayType | 'all';
}) {
  // Rascunho local: só aplica de fato quando "Salvar Filtros" é clicado.
  // Ressincroniza durante o render (não em efeito) quando o valor aplicado
  // muda por fora (ex: "Limpar tudo", navegação pelo aviso de outras bancas).
  const [draftType, setDraftType] = useState<EssayType | 'all'>(essayType);
  const [draftDate, setDraftDate] = useState(dateFilter);
  const [prevEssayType, setPrevEssayType] = useState<EssayType | 'all'>(essayType);
  const [prevDateFilter, setPrevDateFilter] = useState(dateFilter);
  if (essayType !== prevEssayType) {
    setPrevEssayType(essayType);
    setDraftType(essayType);
  }
  if (dateFilter !== prevDateFilter) {
    setPrevDateFilter(dateFilter);
    setDraftDate(dateFilter);
  }

  const activeCount = (essayType !== neutralType ? 1 : 0) + (dateFilter.preset ? 1 : 0);

  return (
    <FilterDropdownButton
      activeCount={activeCount}
      onClear={
        activeCount > 0
          ? () => {
              onEssayTypeChange(neutralType);
              onDateFilterChange(DEFAULT_DATE_FILTER);
            }
          : undefined
      }
      footer={(close) => (
        <button
          type="button"
          onClick={() => {
            onEssayTypeChange(draftType);
            onDateFilterChange(draftDate);
            close();
          }}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Salvar Filtros
        </button>
      )}
    >
      <div className="flex flex-col gap-3">
        <EssayTypeSelectField essayType={draftType} onEssayTypeChange={setDraftType} />
        <PeriodoFilterSection dateFilter={draftDate} onDateFilterChange={setDraftDate} />
      </div>
    </FilterDropdownButton>
  );
}

// ─── Intervalo de notas ─────────────────────────────────────────────────────

export interface ScoreRangeValue {
  min: number | null;
  max: number | null;
}

export const DEFAULT_SCORE_RANGE: ScoreRangeValue = { min: null, max: null };

function ScoreRangeSection({
  scoreRange,
  onScoreRangeChange,
  maxScore,
}: {
  scoreRange: ScoreRangeValue;
  onScoreRangeChange: (v: ScoreRangeValue) => void;
  maxScore?: number;
}) {
  return (
    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Intervalo de notas{maxScore ? ` (máx. ${maxScore})` : ''}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={maxScore}
          value={scoreRange.min ?? ''}
          onChange={(e) => onScoreRangeChange({ ...scoreRange, min: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="Mín."
          className="h-9 w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <span className="text-[11px] text-slate-400">até</span>
        <input
          type="number"
          min={0}
          max={maxScore}
          value={scoreRange.max ?? ''}
          onChange={(e) => onScoreRangeChange({ ...scoreRange, max: e.target.value === '' ? null : Number(e.target.value) })}
          placeholder="Máx."
          className="h-9 w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>
      {scoreRange.min !== null && scoreRange.max !== null && scoreRange.min > scoreRange.max && (
        <p className="mt-1.5 text-[10px] font-semibold text-red-500">A nota mínima deve ser menor que a máxima.</p>
      )}
    </div>
  );
}

// ─── Filtro da seção "Redações já corrigidas": Status + Banca + Período + Nota

export function CorrectedEssaysFilterDropdown({
  status,
  onStatusChange,
  essayType,
  onEssayTypeChange,
  dateFilter,
  onDateFilterChange,
  scoreRange,
  onScoreRangeChange,
  maxScore,
  neutralType = 'all',
}: {
  status: EssayStatusFilter;
  onStatusChange: (v: EssayStatusFilter) => void;
  essayType: EssayType | 'all';
  onEssayTypeChange: (t: EssayType | 'all') => void;
  dateFilter: DateFilterValue;
  onDateFilterChange: (v: DateFilterValue) => void;
  scoreRange: ScoreRangeValue;
  onScoreRangeChange: (v: ScoreRangeValue) => void;
  maxScore?: number;
  /** Valor "sem filtro" do tipo de redação (ver `EssayTypeAndPeriodFilter`). */
  neutralType?: EssayType | 'all';
}) {
  // Rascunho local: só aplica de fato quando "Salvar Filtros" é clicado.
  // Ressincroniza durante o render (não em efeito) quando o valor aplicado
  // muda por fora (ex: "Limpar tudo").
  const [draftStatus, setDraftStatus] = useState(status);
  const [draftType, setDraftType] = useState<EssayType | 'all'>(essayType);
  const [draftDate, setDraftDate] = useState(dateFilter);
  const [draftScore, setDraftScore] = useState(scoreRange);
  const [prevStatus, setPrevStatus] = useState(status);
  const [prevEssayType, setPrevEssayType] = useState<EssayType | 'all'>(essayType);
  const [prevDateFilter, setPrevDateFilter] = useState(dateFilter);
  const [prevScoreRange, setPrevScoreRange] = useState(scoreRange);
  if (status !== prevStatus) {
    setPrevStatus(status);
    setDraftStatus(status);
  }
  if (essayType !== prevEssayType) {
    setPrevEssayType(essayType);
    setDraftType(essayType);
  }
  if (dateFilter !== prevDateFilter) {
    setPrevDateFilter(dateFilter);
    setDraftDate(dateFilter);
  }
  if (scoreRange !== prevScoreRange) {
    setPrevScoreRange(scoreRange);
    setDraftScore(scoreRange);
  }

  const activeCount =
    (status !== 'all' ? 1 : 0) +
    (essayType !== neutralType ? 1 : 0) +
    (dateFilter.preset ? 1 : 0) +
    (scoreRange.min !== null || scoreRange.max !== null ? 1 : 0);

  return (
    <FilterDropdownButton
      activeCount={activeCount}
      onClear={
        activeCount > 0
          ? () => {
              onStatusChange('all');
              onEssayTypeChange(neutralType);
              onDateFilterChange(DEFAULT_DATE_FILTER);
              onScoreRangeChange(DEFAULT_SCORE_RANGE);
            }
          : undefined
      }
      footer={(close) => (
        <button
          type="button"
          onClick={() => {
            onStatusChange(draftStatus);
            onEssayTypeChange(draftType);
            onDateFilterChange(draftDate);
            onScoreRangeChange(draftScore);
            close();
          }}
          className="w-full rounded-lg bg-[var(--brand-primary)] py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        >
          Salvar Filtros
        </button>
      )}
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Status
          </label>
          <div className="flex flex-col gap-1">
            {STATUS_OPTIONS.map((opt) => {
              const active = draftStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftStatus(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-all',
                    active
                      ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
                      active ? 'border-[var(--brand-primary)]' : 'border-slate-300 dark:border-slate-600',
                    )}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <EssayTypeSelectField essayType={draftType} onEssayTypeChange={setDraftType} />
        </div>

        <PeriodoFilterSection dateFilter={draftDate} onDateFilterChange={setDraftDate} />

        <ScoreRangeSection scoreRange={draftScore} onScoreRangeChange={setDraftScore} maxScore={maxScore} />
      </div>
    </FilterDropdownButton>
  );
}
