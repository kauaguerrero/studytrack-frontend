'use client';

// Seletor de período em "roda" (estilo Outlook): o período exibido fica no meio,
// destacado; o anterior aparece em cima e o seguinte embaixo, apagados. Clicar
// neles, rolar o mouse em cima da roda ou usar ↑/↓ troca o período.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

const SLIDE = {
  enter: (d: number) => ({ y: d * 14, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (d: number) => ({ y: d * -14, opacity: 0 }),
};

export interface WheelEntry {
  key: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function PeriodWheel({
  prev, current, next, detail, onPrev, onNext, ariaLabel, className = '',
}: {
  prev: WheelEntry;
  current: WheelEntry;
  next: WheelEntry;
  /** Resumo à direita do período atual (ex.: "6h10 planejadas · 1/4 feitos"). */
  detail?: string;
  onPrev: () => void;
  onNext: () => void;
  ariaLabel: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Direção da animação: as chaves são datas ISO, então comparar já diz se avançou ou voltou.
  const [seen, setSeen] = useState({ key: current.key, dir: 0 });
  if (seen.key !== current.key) setSeen({ key: current.key, dir: current.key > seen.key ? 1 : -1 });
  const dir = seen.key !== current.key ? (current.key > seen.key ? 1 : -1) : seen.dir;
  const last = useRef(0);
  const cb = useRef({ onPrev, onNext, prevOff: !!prev.disabled, nextOff: !!next.disabled });
  useEffect(() => { cb.current = { onPrev, onNext, prevOff: !!prev.disabled, nextOff: !!next.disabled }; });

  // Rolar o mouse em cima da roda troca o período (listener nativo: o do React é passivo).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      const now = Date.now();
      if (now - last.current < 280) return;
      last.current = now;
      const c = cb.current;
      if (e.deltaY < 0 && !c.prevOff) c.onPrev();
      if (e.deltaY > 0 && !c.nextOff) c.onNext();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const goPrev = () => { if (!prev.disabled) onPrev(); };
  const goNext = () => { if (!next.disabled) onNext(); };

  return (
    <div ref={ref} role="group" aria-label={ariaLabel} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      }}
      className={`select-none rounded-xl border border-slate-200/80 bg-white/70 p-1 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary)] dark:border-white/10 dark:bg-white/[0.04] ${className}`}>
      <Side entry={prev} onClick={goPrev} icon={<ChevronUp className="h-3 w-3" />} where="anterior" />
      <div className="relative my-0.5 h-9 overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_14px_-10px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-white/10">
        <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--brand-primary)' }} />
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.div key={current.key} aria-current="true"
            custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute inset-0 flex items-center justify-between gap-2 pl-3 pr-2.5">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="truncate text-[13px] font-bold capitalize tabular-nums text-slate-900 dark:text-white">{current.label}</span>
              {current.hint && (
                <span className="hidden shrink-0 rounded-full px-1.5 py-px text-[10.5px] font-bold sm:inline"
                  style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)' }}>
                  {current.hint}
                </span>
              )}
            </span>
            {detail && <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-white/55">{detail}</span>}
          </motion.div>
        </AnimatePresence>
      </div>
      <Side entry={next} onClick={goNext} icon={<ChevronDown className="h-3 w-3" />} where="seguinte" />
    </div>
  );
}

function Side({ entry, onClick, icon, where }: { entry: WheelEntry; onClick: () => void; icon: React.ReactNode; where: string }) {
  return (
    <button type="button" onClick={onClick} disabled={entry.disabled}
      aria-label={`Ir para o período ${where}: ${entry.label}`}
      className="flex h-6 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-slate-600 opacity-45 transition hover:bg-slate-100/80 hover:opacity-80 disabled:pointer-events-none disabled:opacity-15 dark:text-white/70 dark:hover:bg-white/5">
      <span className="flex min-w-0 items-center gap-1.5 pl-5">
        <span className="truncate text-[11.5px] font-semibold capitalize tabular-nums">{entry.label}</span>
        {entry.hint && <span className="hidden shrink-0 text-[10.5px] sm:inline">· {entry.hint}</span>}
      </span>
      {icon}
    </button>
  );
}
