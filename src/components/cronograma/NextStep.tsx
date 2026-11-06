'use client';

// "Próximo passo": o próximo conteúdo pendente da semana visível, num balão de vidro
// abaixo do assistente (atalho para a mesma decisão única dos cards).

import { ArrowRight, CheckCircle2, RotateCcw, BookOpen } from 'lucide-react';
import { AREA_STYLE, WEEKDAY_SHORT, formatDayMonth, weekdayIndex, type PlanItem } from '@/lib/cronograma';

export function pickNext(items: PlanItem[], today: string): PlanItem | null {
  return items
    .filter((i) => i.status === 'pending' && !i.projected && i.date >= today)
    .sort((a, b) => (a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1))[0] ?? null;
}

export function NextStep({ items, today, onOpen }: { items: PlanItem[]; today: string; onOpen: (i: PlanItem) => void }) {
  const next = pickNext(items, today);
  const todays = items.filter((i) => i.date === today && !i.projected && i.status !== 'skipped');
  const doneToday = todays.filter((i) => i.status === 'done').length;

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/60 p-3.5 shadow-[0_10px_40px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/[0.04] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">Próximo passo</p>
        {todays.length > 0 && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${doneToday === todays.length ? 'text-emerald-600' : 'text-slate-500 dark:text-white/50'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" /> hoje {doneToday}/{todays.length}
          </span>
        )}
      </div>
      {next ? (
        <button type="button" onClick={() => onOpen(next)}
          className="group flex w-full items-center gap-3 rounded-2xl bg-white/70 p-2.5 text-left transition hover:bg-white hover:shadow-md dark:bg-white/5 dark:hover:bg-white/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in srgb, ${(AREA_STYLE[next.area] ?? AREA_STYLE.geral).dot} 14%, transparent)`, color: (AREA_STYLE[next.area] ?? AREA_STYLE.geral).dot }}>
            {next.kind === 'review' ? <RotateCcw className="h-4.5 w-4.5" /> : <BookOpen className="h-4.5 w-4.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold text-slate-900 dark:text-white">{next.topic}</span>
            <span className="block truncate text-[11.5px] text-slate-500 dark:text-white/50">
              {next.date === today ? 'Hoje' : `${WEEKDAY_SHORT[weekdayIndex(next.date)]} ${formatDayMonth(next.date)}`}
              {' · '}{next.kind === 'review' ? 'Revisão' : next.q_subject || next.area_label} · {next.minutes} min
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold text-white transition group-hover:translate-x-0.5"
            style={{ background: 'var(--brand-primary)', boxShadow: '0 6px 16px -6px var(--brand-primary)' }}>
            Começar <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <p className="rounded-2xl bg-white/70 p-3 text-[12.5px] text-slate-600 dark:bg-white/5 dark:text-white/60">
          Nada pendente nesta semana. Avance para a próxima ou peça ao assistente para adiantar conteúdo.
        </p>
      )}
    </div>
  );
}
