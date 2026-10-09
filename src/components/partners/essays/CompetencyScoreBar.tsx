'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, MessageSquareText, Pin, PinOff, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Score = { competency: number; score: number; comment: string };

type Props = {
  scores: Score[];
  competencyLabels: string[];
  scoreOptions: number[][];
  onScoreChange: (competency: number, score: number) => void;
  onCommentChange: (competency: number, comment: string) => void;
  totalScore: number;
  totalMax: number;
  totalColorClass: string;
  generalComment: string;
  onGeneralCommentChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitLabel: string;
  /** Barra acompanha a rolagem (sticky) — a página decide o posicionamento. */
  pinned: boolean;
  onTogglePinned: () => void;
  className?: string;
};

type OpenPanel = number | 'general' | null;

const GENERAL_MIN = 20;

/**
 * Versão horizontal do painel "Notas por Competência" para a mesa de correção
 * lado a lado (foto | texto): todas as competências ficam abertas, com as
 * notas clicáveis direto na barra. Só os comentários (por competência e o
 * geral), que são texto longo, abrem num popover.
 */
export function CompetencyScoreBar({
  scores,
  competencyLabels,
  scoreOptions,
  onScoreChange,
  onCommentChange,
  totalScore,
  totalMax,
  totalColorClass,
  generalComment,
  onGeneralCommentChange,
  onSubmit,
  canSubmit,
  submitLabel,
  pinned,
  onTogglePinned,
  className,
}: Props) {
  const [open, setOpen] = useState<OpenPanel>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onPointerDown(e: PointerEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const generalLength = generalComment.trim().length;
  const generalOk = generalLength >= GENERAL_MIN;

  const closeButton = (
    <button
      type="button"
      onClick={() => setOpen(null)}
      aria-label="Fechar"
      className="rounded p-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div
      ref={barRef}
      className={cn(
        'flex items-stretch gap-3 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95',
        className,
      )}
    >
      <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {scores.map((item, idx) => {
          const label = competencyLabels[idx] ?? '';
          const options = scoreOptions[idx] ?? [];
          const commentOpen = open === item.competency;
          const hasComment = item.comment.trim().length > 0;
          return (
            <div
              key={item.competency}
              className="relative min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="shrink-0 text-xs font-extrabold text-slate-900 dark:text-white">C{item.competency}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-500 dark:text-slate-400" title={label}>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(commentOpen ? null : item.competency)}
                  aria-expanded={commentOpen}
                  title={hasComment ? 'Editar comentário da competência' : 'Comentar esta competência (opcional)'}
                  aria-label={`Comentário da competência ${item.competency}`}
                  className={cn(
                    'relative shrink-0 rounded-md p-1 transition',
                    commentOpen || hasComment
                      ? 'text-[var(--brand-primary)] dark:text-white'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                  )}
                >
                  {hasComment ? <MessageSquareText className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex gap-1" role="radiogroup" aria-label={`Nota da competência ${item.competency}`}>
                {options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={item.score === option}
                    onClick={() => onScoreChange(item.competency, option)}
                    className={cn(
                      'h-8 min-w-0 flex-1 rounded-md border text-xs font-bold tabular-nums transition',
                      item.score === option
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white',
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {commentOpen && (
                <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Competência {item.competency} — {label}
                    </p>
                    {closeButton}
                  </div>
                  <textarea
                    autoFocus
                    value={item.comment}
                    onChange={(e) => onCommentChange(item.competency, e.target.value)}
                    placeholder="Comentário da competência (opcional)"
                    className="min-h-[88px] w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-3 border-l border-slate-200 pl-3 dark:border-slate-800">
        <div className="text-center leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</p>
          <p className={cn('text-lg font-extrabold tabular-nums', totalColorClass)}>{totalScore}</p>
          <p className="text-[10px] tabular-nums text-slate-400">de {totalMax}</p>
        </div>

        <div className="relative flex w-52 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(open === 'general' ? null : 'general')}
            aria-expanded={open === 'general'}
            className={cn(
              'inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition',
              open === 'general'
                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-slate-900 dark:text-white'
                : generalOk
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                  : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
            )}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            Comentário geral
            {!generalOk && <span className="tabular-nums">({generalLength}/{GENERAL_MIN})</span>}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            title={!canSubmit && !generalOk ? `Escreva o comentário geral (mín. ${GENERAL_MIN} caracteres) para enviar` : undefined}
            className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--brand-primary)] px-3 text-xs font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitLabel}
          </button>

          {open === 'general' && (
            <div className="absolute right-0 top-full z-40 mt-2 w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Comentário geral</p>
                {closeButton}
              </div>
              <textarea
                autoFocus
                value={generalComment}
                onChange={(e) => onGeneralCommentChange(e.target.value)}
                placeholder={`Escreva um comentário geral da redação (mín. ${GENERAL_MIN} caracteres)`}
                className="min-h-[160px] w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <p className={cn('mt-1 text-[11px]', generalOk ? 'text-slate-400' : 'text-amber-600 dark:text-amber-400')}>
                {generalLength} caracteres{!generalOk && ` — mínimo ${GENERAL_MIN}`}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onTogglePinned}
          aria-pressed={pinned}
          title={pinned ? 'Barra fixa no topo ao rolar (clique para soltar)' : 'Fixar a barra no topo ao rolar'}
          aria-label={pinned ? 'Soltar barra de notas' : 'Fixar barra de notas'}
          className={cn(
            'self-start rounded-md p-1.5 transition',
            pinned
              ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] dark:text-white'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
          )}
        >
          {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
