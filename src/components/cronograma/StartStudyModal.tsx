'use client';

// Decisão única ("one decision") ao abrir um item do cronograma:
// estudo → Banco de questões filtrado OU Simulado pré-montado (+ marcar concluído);
// revisão → mini-quiz (nota SRS por acerto real) OU autoavaliação.

import Link from 'next/link';
import { BookOpen, ClipboardCheck, CheckCircle2, Brain, SkipForward, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AREA_STYLE, studyLinks, formatDayMonth, type NodeView } from '@/lib/cronograma';

export interface StartTarget extends NodeView {
  id: string;
  kind: 'study' | 'review';
  minutes: number;
  date: string;
  status?: string;
  projected?: boolean;
  depends_on_late?: string[];
}

export function StartStudyModal({
  slug,
  target,
  onClose,
  onComplete,
  onSkip,
  onStartReview,
  busy,
}: {
  slug: string;
  target: StartTarget | null;
  onClose: () => void;
  onComplete?: (id: string) => void;
  onSkip?: (id: string) => void;
  onStartReview?: (t: StartTarget) => void;
  busy?: boolean;
}) {
  const open = !!target;
  const area = target ? AREA_STYLE[target.area] ?? AREA_STYLE.geral : AREA_STYLE.geral;
  const links = target ? studyLinks(slug, target) : null;
  const isReview = target?.kind === 'review';
  const done = target?.status === 'done';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl">
        {target && links && (
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${area.chip}`}>{target.area_label}</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50">
                  {isReview ? 'Revisão' : 'Estudo'} · {target.minutes} min · {formatDayMonth(target.date)}
                </span>
              </div>
              <DialogTitle className="font-display text-[19px] leading-snug text-slate-900 dark:text-white">
                {target.topic}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-slate-500 dark:text-white/60">
                {target.q_discipline ? `${target.q_subject} · ${target.q_discipline}` : target.subject}
              </DialogDescription>
            </DialogHeader>

            {!!target.depends_on_late?.length && (
              <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[12.5px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Este conteúdo depende de <b>{target.depends_on_late.join(', ')}</b>, que ainda não foi estudado.</span>
              </div>
            )}

            {target.projected ? (
              <p className="rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600 dark:bg-white/5 dark:text-white/60">
                Revisão prevista: ela é confirmada quando você concluir o estudo deste conteúdo.
              </p>
            ) : done ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-[13px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> Concluído. Boa!
              </p>
            ) : isReview ? (
              <div className="grid gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onStartReview?.(target)}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:-translate-y-[1px] hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-slate-900"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--brand-primary) 14%, white)' }}>
                    <Brain className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-slate-900 dark:text-white">Fazer a revisão</span>
                    <span className="block text-[12px] text-slate-500 dark:text-white/55">5 questões rápidas. Seu acerto define a próxima revisão.</span>
                  </span>
                </button>
              </div>
            ) : (
              <div className="grid gap-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">Como você quer estudar?</p>
                <Link
                  href={links.bank}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-[1px] hover:shadow-md dark:border-white/10 dark:bg-slate-900"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15">
                    <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-slate-900 dark:text-white">Banco de questões</span>
                    <span className="block text-[12px] text-slate-500 dark:text-white/55">No seu ritmo, com gabarito comentado. Conclui sozinho com 10 questões.</span>
                  </span>
                </Link>
                <Link
                  href={links.simulado}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-[1px] hover:shadow-md dark:border-white/10 dark:bg-slate-900"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15">
                    <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  </span>
                  <span>
                    <span className="block text-[14px] font-bold text-slate-900 dark:text-white">Simulado</span>
                    <span className="block text-[12px] text-slate-500 dark:text-white/55">10 questões cronometradas, como no dia da prova.</span>
                  </span>
                </Link>
                <div className="mt-1 flex items-center justify-between gap-2">
                  {onSkip && (
                    <button type="button" disabled={busy} onClick={() => onSkip(target.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-white/55 dark:hover:bg-white/10">
                      <SkipForward className="h-3.5 w-3.5" /> Pular hoje
                    </button>
                  )}
                  {onComplete && (
                    <button type="button" disabled={busy} onClick={() => onComplete(target.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-[12.5px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Já estudei
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
