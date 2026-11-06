'use client';

// Quadro da semana: 7 colunas (uma por dia) com cards de estudo arrastáveis.
// - Arrastar um card para outro dia → onMove (o backend fixa o item e replaneja o resto).
// - Revisões do dia são agrupadas por área num card só (não poluem o quadro).
// - Faixa no topo do dia: carga (verde/amarelo/vermelho) = minutos / capacidade do dia.
// - Em modo prévia (sugestão do agente), o quadro é só leitura e destaca o que muda.

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Pin, RotateCcw, MoreHorizontal, Ban } from 'lucide-react';
import {
  AREA_STYLE, LOAD_STYLE, WEEKDAY_SHORT, formatDayMonth, weekdayIndex,
  type DayInfo, type PlanItem,
} from '@/lib/cronograma';

// Máximo de cards visíveis por dia antes da rolagem interna.
const VISIBLE_CARDS = 3;

export interface ReviewGroup {
  key: string;
  date: string;
  area: PlanItem['area'];
  area_label: string;
  items: PlanItem[];
  minutes: number;
}

function groupReviews(items: PlanItem[]): ReviewGroup[] {
  const map = new Map<string, ReviewGroup>();
  for (const i of items) {
    if (i.kind !== 'review') continue;
    const key = `${i.date}:${i.area}`;
    const g = map.get(key) ?? { key, date: i.date, area: i.area, area_label: i.area_label, items: [], minutes: 0 };
    g.items.push(i);
    g.minutes += i.minutes;
    map.set(key, g);
  }
  return [...map.values()];
}

export function WeekBoard({
  days,
  items,
  today,
  readOnly,
  highlightIds,
  onMove,
  onOpenItem,
  onOpenReviews,
}: {
  days: DayInfo[];
  items: PlanItem[];
  today: string;
  readOnly?: boolean;
  highlightIds?: Set<string>;
  onMove: (itemId: string, toDate: string) => void;
  onOpenItem: (item: PlanItem) => void;
  onOpenReviews: (group: ReviewGroup) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [dragging, setDragging] = useState<PlanItem | null>(null);

  // No celular a faixa de dias abre já em "hoje" (sem mexer na rolagem vertical da página).
  const stripRef = useRef<HTMLDivElement>(null);
  const firstDay = days[0]?.date;
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const target = el.querySelector<HTMLElement>(`[data-date="${today}"]`) ?? el.querySelector<HTMLElement>('[data-date]');
    if (target) el.scrollLeft = target.offsetLeft - el.offsetLeft - (parseFloat(getComputedStyle(el).paddingLeft) || 0);
  }, [firstDay, today]);

  const byDay = useMemo(() => {
    const m = new Map<string, { studies: PlanItem[]; reviews: ReviewGroup[] }>();
    for (const d of days) m.set(d.date, { studies: [], reviews: [] });
    for (const i of items) {
      if (i.kind === 'study' && i.status !== 'skipped') m.get(i.date)?.studies.push(i);
    }
    for (const g of groupReviews(items)) m.get(g.date)?.reviews.push(g);
    for (const v of m.values()) v.studies.sort((a, b) => a.position - b.position);
    return m;
  }, [days, items]);

  const onDragStart = (e: DragStartEvent) => {
    setDragging(items.find((i) => i.id === e.active.id) ?? null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const to = e.over?.id as string | undefined;
    const item = items.find((i) => i.id === e.active.id);
    if (!to || !item || item.date === to) return;
    onMove(item.id, to);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {/* Celular/tablet: a semana rola de lado (com encaixe), começando em hoje.
          Desktop: 7 colunas num cartão só. */}
      <div ref={stripRef}
        className="cronograma-week -mx-4 -my-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 py-2 md:-mx-8 md:scroll-px-8 md:px-8 lg:m-0 lg:py-0 lg:grid lg:snap-none lg:grid-cols-7 lg:gap-0 lg:divide-x lg:divide-slate-100 lg:overflow-visible [scrollbar-width:none] lg:rounded-[20px] lg:bg-white lg:px-0 lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:lg:shadow-[0_1px_2px_rgba(0,0,0,0.24),0_8px_24px_-12px_rgba(0,0,0,0.55)] dark:lg:divide-white/10 dark:lg:bg-slate-900">
        {days.map((d) => (
          <DayColumn
            key={d.date}
            day={d}
            isToday={d.date === today}
            isPast={d.date < today}
            studies={byDay.get(d.date)?.studies ?? []}
            reviews={byDay.get(d.date)?.reviews ?? []}
            weekDates={days.filter((x) => x.date >= today && !x.blocked).map((x) => x.date)}
            readOnly={readOnly}
            highlightIds={highlightIds}
            onMove={onMove}
            onOpenItem={onOpenItem}
            onOpenReviews={onOpenReviews}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? <StudyCardBody item={dragging} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DayColumn({
  day, isToday, isPast, studies, reviews, weekDates, readOnly, highlightIds, onMove, onOpenItem, onOpenReviews,
}: {
  day: DayInfo;
  isToday: boolean;
  isPast: boolean;
  studies: PlanItem[];
  reviews: ReviewGroup[];
  weekDates: string[];
  readOnly?: boolean;
  highlightIds?: Set<string>;
  onMove: (itemId: string, toDate: string) => void;
  onOpenItem: (item: PlanItem) => void;
  onOpenReviews: (group: ReviewGroup) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date, disabled: readOnly || isPast || day.blocked });
  const load = LOAD_STYLE[day.level];
  const pct = Math.min(100, Math.round(day.ratio * 100));
  const empty = studies.length === 0 && reviews.length === 0;

  // Contador do dia: estudos + tópicos de revisão (não conta revisões só previstas).
  const countable = [...studies, ...reviews.flatMap((g) => g.items)].filter((i) => !i.projected);
  const doneCount = countable.filter((i) => i.status === 'done').length;

  // Mostra no máximo 3 cards; o resto fica numa rolagem interna do dia
  // (a coluna não estica a tela). A altura é medida porque os cards variam.
  const listRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<number | undefined>(undefined);
  const cardCount = studies.length + reviews.length;
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      // Usa a contagem real (não só o DOM): cards saindo na animação ainda estão no DOM.
      if (cardCount <= VISIBLE_CARDS || kids.length <= VISIBLE_CARDS) { setMaxH(undefined); return; }
      const fourth = kids[VISIBLE_CARDS];
      // Mostra uma "pontinha" do 4º card para indicar que há mais.
      setMaxH(fourth.offsetTop - el.offsetTop + 18);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cardCount]);

  return (
    <section
      ref={setNodeRef}
      data-date={day.date}
      aria-label={`${WEEKDAY_SHORT[weekdayIndex(day.date)]} ${formatDayMonth(day.date)}`}
      className={[
        'relative flex min-h-[210px] w-[80%] shrink-0 snap-start flex-col rounded-[20px] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.24),0_8px_24px_-12px_rgba(0,0,0,0.55)] transition-colors dark:bg-slate-900 sm:w-[44%] md:w-[31%] lg:w-auto lg:min-h-[340px] lg:shrink lg:rounded-none lg:p-2.5 lg:shadow-none',
        isToday ? 'lg:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]' : 'lg:bg-transparent lg:dark:bg-transparent',
        isOver ? 'bg-slate-50 dark:bg-white/5' : '',
        isPast ? 'opacity-60' : '',
        'first:lg:rounded-l-[20px] last:lg:rounded-r-[20px]',
      ].join(' ')}
      style={isOver ? { outline: '2px dashed color-mix(in srgb, var(--brand-primary) 55%, transparent)', outlineOffset: -4 } : undefined}
    >
      <header className={`${countable.length > 0 ? "mb-1" : "mb-2"} flex items-start justify-between gap-1`}>
        <div>
          <p className={`text-[10.5px] font-bold tracking-[0.12em] ${isToday ? '' : 'text-slate-500 dark:text-white/50'}`}
            style={isToday ? { color: 'var(--brand-primary)' } : undefined}>
            {WEEKDAY_SHORT[weekdayIndex(day.date)]}{isToday ? ' · HOJE' : ''}
          </p>
          <p className="font-display text-[17px] font-black text-slate-900 dark:text-white">{formatDayMonth(day.date)}</p>
          {countable.length > 0 && (
            <p className={`inline-flex items-center gap-1 text-[10.5px] font-bold ${doneCount === countable.length ? 'text-emerald-600' : 'text-slate-500 dark:text-white/50'}`}
              aria-label={`${doneCount} de ${countable.length} concluídos`}>
              <CheckCircle2 className="h-3 w-3" /> {doneCount}/{countable.length}
            </p>
          )}
        </div>
        {day.blocked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-white/60">
            <Ban className="h-3 w-3" /> Livre
          </span>
        ) : day.capacity > 0 ? (
          // Carga do dia (minutos planejados / capacidade): a cor diz se está tranquilo, cheio ou pesado.
          <span role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Carga do dia: ${load.label}`}
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${load.text}`}
            style={{ background: `color-mix(in srgb, ${load.bar} 13%, transparent)` }}
            title={`${load.label}: ${day.minutes} de ${day.capacity} min planejados`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: load.bar }} />
            {day.minutes}/{day.capacity}min
          </span>
        ) : day.minutes > 0 ? (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-white/60"
            title="Dia de folga na sua rotina — estes itens foram colocados por você">
            {day.minutes}min
          </span>
        ) : null}
      </header>
      {/* Barra = progresso do dia (concluídos / total), alinhada ao contador "1/1". */}
      {countable.length > 0 && (
        <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar"
          aria-valuemin={0} aria-valuemax={countable.length} aria-valuenow={doneCount} aria-label="Progresso do dia">
          <motion.div className="h-full rounded-full" initial={false}
            style={{ background: doneCount === countable.length ? '#10b981' : 'var(--brand-primary)' }}
            animate={{ width: `${Math.round((doneCount / countable.length) * 100)}%` }} />
        </div>
      )}

      <div ref={listRef}
        className={`cronograma-day-scroll -mr-1 flex flex-col gap-1.5 overflow-y-auto overscroll-contain pr-1 ${empty ? "flex-1" : ""}`}
        style={maxH ? { maxHeight: maxH } : undefined}
        tabIndex={maxH ? 0 : undefined}
        aria-label={maxH ? `${cardCount} itens, role para ver todos` : undefined}>
        <AnimatePresence initial={false}>
          {studies.map((s) => (
            <DraggableStudy key={s.id} item={s} readOnly={readOnly || isPast || s.status !== 'pending' || s.projected}
              highlighted={highlightIds?.has(s.id)} weekDates={weekDates} onMove={onMove} onOpen={() => onOpenItem(s)} />
          ))}
          {reviews.map((g) => (
            <motion.button
              key={g.key}
              layout
              type="button"
              onClick={() => onOpenReviews(g)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`w-full rounded-xl border border-dashed p-2 text-left transition hover:shadow-sm ${g.items.some((i) => highlightIds?.has(i.id)) ? 'ring-2 ring-amber-400' : ''} border-slate-300 bg-slate-50 dark:border-white/15 dark:bg-white/5`}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-white/60">
                <RotateCcw className="h-3 w-3" /> Revisão · {g.area_label}
              </span>
              <span className="mt-0.5 block text-[12px] font-semibold text-slate-800 dark:text-white/80">
                {g.items.length} {g.items.length === 1 ? 'tópico' : 'tópicos'} · {g.minutes} min
              </span>
              {g.items.every((i) => i.status === 'done') && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> feita</span>
              )}
              {g.items.every((i) => i.projected) && (
                <span className="mt-0.5 block text-[10.5px] text-slate-500 dark:text-white/45">prevista</span>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
        {empty && (
          <p className="m-auto text-center text-[11.5px] text-slate-400 dark:text-white/35">
            {day.blocked ? 'Dia livre' : day.capacity === 0 ? 'Folga' : isPast ? '' : 'Arraste um conteúdo para cá'}
          </p>
        )}
      </div>
      {maxH !== undefined && cardCount > VISIBLE_CARDS && (
        <p className="mt-1 text-center text-[10.5px] font-semibold text-slate-400 dark:text-white/40">
          +{cardCount - VISIBLE_CARDS} · role para ver
        </p>
      )}
    </section>
  );
}

function DraggableStudy({
  item, readOnly, highlighted, weekDates, onMove, onOpen,
}: {
  item: PlanItem;
  readOnly?: boolean;
  highlighted?: boolean;
  weekDates: string[];
  onMove: (itemId: string, toDate: string) => void;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: readOnly });
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(false);

  return (
    <motion.div
      layout={!reduce}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="relative"
    >
      <div ref={setNodeRef} {...attributes} {...listeners} onClick={onOpen}
        className={`${readOnly ? '' : 'cursor-grab active:cursor-grabbing'} touch-manipulation rounded-xl ${highlighted ? 'ring-2 ring-amber-400' : ''}`}>
        <StudyCardBody item={item} />
      </div>
      {!readOnly && weekDates.length > 1 && (
        <div className="absolute right-1 top-1 lg:hidden">
          <button type="button" aria-label="Mover para…" aria-expanded={menu}
            onClick={(e) => { e.stopPropagation(); setMenu((m) => !m); }}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      )}
      {menu && !readOnly && (
        // No fluxo (não absoluto): a rolagem interna do dia não corta o menu.
        <div className="mt-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900 lg:hidden">
          <p className="px-2 py-1 text-[10.5px] font-bold uppercase text-slate-400">Mover para</p>
          <div className="grid grid-cols-2 gap-0.5">
            {weekDates.filter((d) => d !== item.date).map((d) => (
              <button key={d} type="button" onClick={(e) => { e.stopPropagation(); setMenu(false); onMove(item.id, d); }}
                className="rounded-lg px-2 py-1.5 text-left text-[12.5px] text-slate-700 hover:bg-slate-100 dark:text-white/80 dark:hover:bg-white/10">
                {WEEKDAY_SHORT[weekdayIndex(d)]} {formatDayMonth(d)}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function StudyCardBody({ item, dragging }: { item: PlanItem; dragging?: boolean }) {
  const area = AREA_STYLE[item.area] ?? AREA_STYLE.geral;
  const done = item.status === 'done';
  return (
    <div
      className={`rounded-xl border bg-white p-2 pl-2.5 transition dark:bg-slate-800/60 ${dragging ? 'rotate-1 shadow-xl' : 'hover:shadow-md'} ${done ? 'opacity-70' : ''}`}
      style={{ borderColor: `color-mix(in srgb, ${area.dot} 30%, #e2e8f0)`, borderLeft: `3px solid ${area.dot}` }}
    >
      <p className="flex items-center gap-1 pr-5 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: area.dot }}>
        {item.q_subject || item.area_label}
        {item.pinned && <Pin className="h-2.5 w-2.5 text-slate-400" aria-label="Fixado por você" />}
      </p>
      <p className={`mt-0.5 line-clamp-3 text-[12.5px] font-semibold leading-snug text-slate-900 dark:text-white ${done ? 'line-through' : ''}`}>
        {item.topic}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-white/50">
        <span>{item.minutes} min</span>
        {item.projected && <span className="font-semibold uppercase tracking-wide text-slate-400">previsto</span>}
        {done && <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600"><CheckCircle2 className="h-3 w-3" /> feito</span>}
        {item.depends_on_late.length > 0 && (
          <span className="inline-flex items-center gap-0.5 font-bold text-amber-600" title={`Depende de: ${item.depends_on_late.join(', ')}`}>
            <AlertTriangle className="h-3 w-3" /> pré-requisito
          </span>
        )}
      </div>
    </div>
  );
}
