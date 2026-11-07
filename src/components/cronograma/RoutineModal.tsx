'use client';

import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360];

export interface RoutineValue {
  capacity: Record<number, number>;
  reviewWeekdays: number[];
}

export function fmtMinutes(m: number) {
  if (m <= 0) return 'Folga';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h && r ? `${h}h${String(r).padStart(2, '0')}` : h ? `${h}h` : `${r}min`;
}

/**
 * "Minha rotina": tempo por dia da semana e quais dias são só de revisão.
 * Rotina muda muito de aluno para aluno, então isso fica a um clique, sem passar pela IA
 * (nem gastar cota). Quem salva é a página (PATCH /settings).
 */
export function RoutineModal({
  open, initial, busy, onClose, onSave,
}: {
  open: boolean;
  initial: RoutineValue;
  busy?: boolean;
  onClose: () => void;
  onSave: (v: RoutineValue) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {/* Monta de novo a cada abertura: o formulário sempre começa na rotina salva. */}
        {open && <RoutineForm initial={initial} busy={busy} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function RoutineForm({ initial, busy, onClose, onSave }: {
  initial: RoutineValue; busy?: boolean; onClose: () => void; onSave: (v: RoutineValue) => void;
}) {
  const [cap, setCap] = useState<Record<number, number>>(() => ({ ...initial.capacity }));
  const [review, setReview] = useState<Set<number>>(() => new Set(initial.reviewWeekdays));

  const newMinutes = DAYS.reduce((s, _, wd) => s + (review.has(wd) ? 0 : cap[wd] ?? 0), 0);
  const reviewWithoutTime = [...review].some((wd) => (cap[wd] ?? 0) <= 0);
  const error = reviewWithoutTime
    ? 'Escolha quanto tempo você tem no dia de revisão.'
    : newMinutes < 60
      ? 'Deixe pelo menos 1 hora por semana para conteúdo novo, fora dos dias de revisão.'
      : '';
  const changed = DAYS.some((_, wd) => (cap[wd] ?? 0) !== (initial.capacity[wd] ?? 0))
    || review.size !== initial.reviewWeekdays.length || initial.reviewWeekdays.some((wd) => !review.has(wd));

  const toggleReview = (wd: number) => {
    const next = new Set(review);
    if (next.has(wd)) next.delete(wd);
    else {
      next.add(wd);
      // Dia de folga marcado como revisão: começa com 1h para o aluno só ajustar.
      if ((cap[wd] ?? 0) <= 0) setCap((c) => ({ ...c, [wd]: 60 }));
    }
    setReview(next);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-[18px] text-slate-900 dark:text-white">Minha rotina</DialogTitle>
        <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
          Quanto tempo você tem em cada dia. Num <b>dia de revisão</b> não entra conteúdo novo: primeiro o que venceu, depois as próximas revisões adiantadas.
        </DialogDescription>
      </DialogHeader>
      <ul className="min-w-0 space-y-1.5" aria-label="Dias da semana">
        {DAYS.map((name, wd) => {
          const minutes = cap[wd] ?? 0;
          const isReview = review.has(wd);
          const opts = OPTIONS.includes(minutes) ? OPTIONS : [...OPTIONS, minutes].sort((a, b) => a - b);
          return (
            <li key={wd} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${isReview
              ? 'border-violet-200 bg-violet-50/70 dark:border-violet-400/30 dark:bg-violet-500/10'
              : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'}`}>
              <span className="w-[68px] shrink-0 text-[13px] font-bold text-slate-800 dark:text-white/90">{name}</span>
              <select value={minutes} aria-label={`Tempo de ${name.toLowerCase()}`}
                onChange={(e) => setCap((c) => ({ ...c, [wd]: Number(e.target.value) }))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-white/85">
                {opts.map((m) => <option key={m} value={m}>{fmtMinutes(m)}</option>)}
              </select>
              <button type="button" aria-pressed={isReview} onClick={() => toggleReview(wd)}
                aria-label={`${name}: ${isReview ? 'dia de revisão' : 'dia normal'}`}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-bold transition ${isReview
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-white/65 dark:hover:bg-white/5'}`}>
                <RotateCcw className="h-3.5 w-3.5" /> Só revisão
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="h-10 rounded-xl px-4 text-[13px] font-bold text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/5">
          Cancelar
        </button>
        <button type="button" disabled={!!error || !changed || busy}
          onClick={() => onSave({ capacity: cap, reviewWeekdays: [...review].sort() })}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-ink)' }}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar rotina
        </button>
      </div>
    </>
  );
}
