'use client';

import { useState } from 'react';
import { CalendarClock, CalendarDays, ClipboardList, Loader2, PenLine, Plus, Repeat, RotateCcw, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';
import { addDays, formatDayMonth, parseISODate, type BlockKind, type ScheduleRules } from '@/lib/cronograma';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DAY_SHORT = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const OPTIONS = [0, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360];
const BLOCK_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 270, 300];
const BLOCK_LABEL: Record<BlockKind, string> = { simulado: 'Simulado', redacao: 'Redação' };
const BLOCK_DEFAULT: Record<BlockKind, number> = { simulado: 270, redacao: 60 };

export interface RoutineValue {
  capacity: Record<number, number>;
  reviewWeekdays: number[];
  /** Escala, mudanças com data e blocos de simulado/redação. */
  rules?: ScheduleRules;
  /** AAAA-MM-DD. Ao salvar, só vem quando o aluno mudou a data. */
  examDate?: string;
}

type Block = NonNullable<ScheduleRules['blocks']>[number];
type Period = NonNullable<ScheduleRules['periods']>[number];

export function fmtMinutes(m: number) {
  if (m <= 0) return 'Folga';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h && r ? `${h}h${String(r).padStart(2, '0')}` : h ? `${h}h` : `${r}min`;
}

function withValue(opts: number[], v: number) {
  return opts.includes(v) ? opts : [...opts, v].sort((a, b) => a - b);
}

/**
 * "Minha rotina": tempo por dia da semana (ou escala que repete a cada N dias), dias só
 * de revisão, simulado/redação toda semana e mudanças com data ("a partir de dezembro").
 * Rotina muda muito de aluno para aluno, então isso fica a um clique, sem passar pela IA
 * (nem gastar cota). Quem salva é a página (PATCH /settings).
 */
export function RoutineModal({
  open, initial, today, busy, onClose, onSave,
}: {
  open: boolean;
  initial: RoutineValue;
  /** Hoje (AAAA-MM-DD): início padrão da escala e das mudanças com data. */
  today: string;
  busy?: boolean;
  onClose: () => void;
  onSave: (v: RoutineValue) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {/* Monta de novo a cada abertura: o formulário sempre começa na rotina salva. */}
        {open && <RoutineForm initial={initial} today={today} busy={busy} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

const selectCls = 'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-white/85';
const sectionTitle = 'flex items-center gap-1.5 text-[13px] font-bold text-slate-800 dark:text-white/90';

/** Escala "N dias de trabalho, M de folga" lida a partir do ciclo salvo (se tiver esse formato). */
function cycleParts(minutes: number[] | undefined) {
  if (!minutes?.length) return { work: 1, off: 1, workMin: 0, offMin: 0 };
  const first = minutes[0];
  let work = 0;
  while (work < minutes.length && minutes[work] === first) work++;
  return { work, off: Math.max(1, minutes.length - work), workMin: first, offMin: minutes[minutes.length - 1] };
}

function RoutineForm({ initial, today, busy, onClose, onSave }: {
  initial: RoutineValue; today: string; busy?: boolean; onClose: () => void; onSave: (v: RoutineValue) => void;
}) {
  const rules0 = initial.rules ?? {};
  const [cap, setCap] = useState<Record<number, number>>(() => ({ ...initial.capacity }));
  const [review, setReview] = useState<Set<number>>(() => new Set(initial.reviewWeekdays));
  const [mode, setMode] = useState<'week' | 'cycle'>(rules0.cycle ? 'cycle' : 'week');
  const c0 = cycleParts(rules0.cycle?.minutes);
  const maxWeek = Math.max(0, ...Object.values(initial.capacity));
  const [cyc, setCyc] = useState(() => ({
    start: rules0.cycle?.start ?? today,
    work: c0.work, off: c0.off, workMin: c0.workMin, offMin: rules0.cycle ? c0.offMin : (maxWeek || 180),
  }));
  const [blocks, setBlocks] = useState<Block[]>(() => [...(rules0.blocks ?? [])]);
  const [periods, setPeriods] = useState<Period[]>(() => [...(rules0.periods ?? [])]);
  const [exam, setExam] = useState(initial.examDate ?? '');
  // O backend exige pelo menos uma semana à frente.
  const minExam = addDays(today, 8);
  const examChanged = !!initial.examDate && exam !== initial.examDate;
  const badExam = examChanged && (!exam || exam < minExam);

  const cycleMinutes = [...Array(cyc.work).fill(cyc.workMin), ...Array(cyc.off).fill(cyc.offMin)] as number[];
  const blockOn = (wd: number) => blocks.filter((b) => b.weekday === wd).reduce((s, b) => s + b.minutes, 0);

  // Conteúdo novo por semana (fora dos dias de revisão e dos blocos) — o backend confere de novo.
  const newMinutes = mode === 'week'
    ? DAYS.reduce((s, _, wd) => s + (review.has(wd) ? 0 : Math.max(0, (cap[wd] ?? 0) - blockOn(wd))), 0)
    : Math.round((cycleMinutes.reduce((a, b) => a + b, 0) / cycleMinutes.length) * 7);
  const reviewWithoutTime = mode === 'week' && [...review].some((wd) => (cap[wd] ?? 0) <= 0);
  const badPeriod = periods.some((p) => !p.from || p.from < today || (p.until && p.until < p.from));
  const error = badExam
    ? 'A data da prova precisa estar pelo menos uma semana à frente.'
    : reviewWithoutTime
    ? 'Escolha quanto tempo você tem no dia de revisão.'
    : mode === 'cycle' && cycleMinutes.every((m) => m <= 0)
      ? 'Coloque tempo de estudo na folga ou no dia de trabalho.'
      : newMinutes < 60
        ? 'Deixe pelo menos 1 hora por semana para conteúdo novo, fora dos dias de revisão e dos blocos.'
        : badPeriod
          ? 'Confira as datas das mudanças: o início é a partir de hoje e o fim vem depois do início.'
          : '';

  const rules: ScheduleRules = {
    ...(mode === 'cycle' ? { cycle: { start: cyc.start, minutes: cycleMinutes } } : {}),
    ...(periods.length ? { periods } : {}),
    ...(blocks.length ? { blocks } : {}),
  };
  const changed = examChanged || DAYS.some((_, wd) => (cap[wd] ?? 0) !== (initial.capacity[wd] ?? 0))
    || review.size !== initial.reviewWeekdays.length || initial.reviewWeekdays.some((wd) => !review.has(wd))
    || JSON.stringify(rules) !== JSON.stringify({
      ...(rules0.cycle ? { cycle: rules0.cycle } : {}),
      ...(rules0.periods?.length ? { periods: rules0.periods } : {}),
      ...(rules0.blocks?.length ? { blocks: rules0.blocks } : {}),
    });

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

  const addBlock = (kind: BlockKind) => {
    const taken = new Set(blocks.filter((b) => b.kind === kind).map((b) => b.weekday));
    // Dia com mais tempo (empate: o mais tarde), como o agente faz.
    const wd = [6, 5, 4, 3, 2, 1, 0].filter((w) => !taken.has(w))
      .sort((a, b) => (cap[b] ?? 0) - (cap[a] ?? 0))[0];
    if (wd === undefined) return;
    setBlocks((bs) => [...bs, { kind, weekday: wd, minutes: BLOCK_DEFAULT[kind] }]);
  };

  const addPeriod = () => {
    const from = addDays(today, 7);
    const base = Object.fromEntries(DAYS.map((_, wd) => [String(wd), cap[wd] ?? 0]));
    setPeriods((ps) => [...ps, { from, until: null, capacity: base }]);
  };
  // "Por dia" de uma mudança: vale para os dias em que o aluno já estuda (ou todos, se nenhum).
  const setPeriodMinutes = (k: number, m: number) => setPeriods((ps) => ps.map((p, i) => {
    if (i !== k) return p;
    const studyDays = DAYS.map((_, wd) => wd).filter((wd) => (cap[wd] ?? 0) > 0);
    const days = studyDays.length ? studyDays : DAYS.map((_, wd) => wd);
    return { ...p, capacity: Object.fromEntries(DAYS.map((_, wd) => [String(wd), days.includes(wd) ? m : Number(p.capacity[String(wd)] ?? 0)])) };
  }));
  const periodMinutes = (p: Period) => Math.max(0, ...Object.values(p.capacity).map(Number));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-[18px] text-slate-900 dark:text-white">Minha rotina</DialogTitle>
        <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
          Quanto tempo você tem para estudar. Num <b>dia de revisão</b> não entra conteúdo novo. Na última semana antes da prova, todos os dias já ficam só de revisão. Em dia curto, o conteúdo é dividido em partes.
        </DialogDescription>
      </DialogHeader>

      {initial.examDate && (
        <section className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-white/10">
          <div className="min-w-0">
            <p className={sectionTitle}><CalendarDays className="h-4 w-4" /> Data da prova</p>
            <p className="text-[11.5px] text-slate-500 dark:text-white/55">O cronograma se reorganiza até essa data.</p>
          </div>
          <input type="date" min={minExam} className={selectCls} value={exam} aria-label="Data da prova"
            onChange={(e) => setExam(e.target.value)} />
        </section>
      )}

      <div role="radiogroup" aria-label="Tipo de rotina" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
        {([['week', 'Por dia da semana'], ['cycle', 'Escala (12x36, plantão)']] as const).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
            className={`h-8 rounded-lg text-[12.5px] font-bold transition ${mode === m
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-white/55'}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'week' ? (
        <ul className="min-w-0 space-y-1.5" aria-label="Dias da semana">
          {DAYS.map((name, wd) => {
            const minutes = cap[wd] ?? 0;
            const isReview = review.has(wd);
            return (
              <li key={wd} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 ${isReview
                ? 'border-violet-200 bg-violet-50/70 dark:border-violet-400/30 dark:bg-violet-500/10'
                : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'}`}>
                <span className="w-[68px] shrink-0 text-[13px] font-bold text-slate-800 dark:text-white/90">{name}</span>
                <select value={minutes} aria-label={`Tempo de ${name.toLowerCase()}`}
                  onChange={(e) => setCap((c) => ({ ...c, [wd]: Number(e.target.value) }))}
                  className={`${selectCls} flex-1`}>
                  {withValue(OPTIONS, minutes).map((m) => <option key={m} value={m}>{fmtMinutes(m)}</option>)}
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
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-white/10" aria-label="Escala">
          <p className="text-[12px] text-slate-500 dark:text-white/55">
            A rotina repete a cada {cycleMinutes.length} dias, sem seguir a semana. 12x36 = 1 dia de trabalho e 1 de folga.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11.5px] font-bold text-slate-600 dark:text-white/65">
              Dias de trabalho seguidos
              <select className={`${selectCls} w-full`} value={cyc.work} aria-label="Dias de trabalho seguidos"
                onChange={(e) => setCyc((c) => ({ ...c, work: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11.5px] font-bold text-slate-600 dark:text-white/65">
              Dias de folga seguidos
              <select className={`${selectCls} w-full`} value={cyc.off} aria-label="Dias de folga seguidos"
                onChange={(e) => setCyc((c) => ({ ...c, off: Number(e.target.value) }))}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11.5px] font-bold text-slate-600 dark:text-white/65">
              Estudo no dia de trabalho
              <select className={`${selectCls} w-full`} value={cyc.workMin} aria-label="Estudo no dia de trabalho"
                onChange={(e) => setCyc((c) => ({ ...c, workMin: Number(e.target.value) }))}>
                {withValue(OPTIONS, cyc.workMin).map((m) => <option key={m} value={m}>{m ? fmtMinutes(m) : 'Nada'}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-[11.5px] font-bold text-slate-600 dark:text-white/65">
              Estudo na folga
              <select className={`${selectCls} w-full`} value={cyc.offMin} aria-label="Estudo na folga"
                onChange={(e) => setCyc((c) => ({ ...c, offMin: Number(e.target.value) }))}>
                {withValue(OPTIONS, cyc.offMin).map((m) => <option key={m} value={m}>{m ? fmtMinutes(m) : 'Nada'}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-[11.5px] font-bold text-slate-600 dark:text-white/65">
            Primeiro dia de trabalho
            <input type="date" className={`${selectCls} w-full`} value={cyc.start} aria-label="Primeiro dia de trabalho"
              onChange={(e) => e.target.value && setCyc((c) => ({ ...c, start: e.target.value }))} />
          </label>
          {/* Prévia: os próximos 7 dias como vão ficar. */}
          <ol className="grid grid-cols-7 gap-1" aria-label="Próximos 7 dias">
            {Array.from({ length: 7 }, (_, k) => {
              const d = parseISODate(addDays(today, k));
              const idx = (((Math.round((d.getTime() - parseISODate(cyc.start).getTime()) / 86_400_000)) % cycleMinutes.length) + cycleMinutes.length) % cycleMinutes.length;
              const m = cycleMinutes[idx];
              return (
                <li key={k} className={`rounded-lg px-1 py-1 text-center text-[10.5px] font-bold ${idx < cyc.work
                  ? 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/50'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                  <span className="block uppercase">{DAY_SHORT[(d.getDay() + 6) % 7]}</span>
                  {m ? fmtMinutes(m) : '—'}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <section className="space-y-1.5" aria-label="Simulado e redação toda semana">
        <p className={sectionTitle}><ClipboardList className="h-4 w-4" /> Simulado e redação toda semana</p>
        <p className="text-[11.5px] text-slate-500 dark:text-white/55">O tempo fica reservado no dia e sai do conteúdo. O card do dia leva direto para fazer.</p>
        {blocks.map((b, k) => (
          <div key={`${b.kind}-${k}`} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-white/10">
            <span className="inline-flex w-[84px] shrink-0 items-center gap-1 text-[12.5px] font-bold text-slate-800 dark:text-white/90">
              {b.kind === 'simulado' ? <ClipboardList className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />} {BLOCK_LABEL[b.kind]}
            </span>
            <select className={`${selectCls} flex-1`} value={b.weekday} aria-label={`Dia do bloco de ${BLOCK_LABEL[b.kind].toLowerCase()}`}
              onChange={(e) => setBlocks((bs) => bs.map((x, i) => i === k ? { ...x, weekday: Number(e.target.value) } : x))}>
              {DAYS.map((name, wd) => <option key={wd} value={wd}>{name}</option>)}
            </select>
            <select className={selectCls} value={b.minutes} aria-label={`Tempo do bloco de ${BLOCK_LABEL[b.kind].toLowerCase()}`}
              onChange={(e) => setBlocks((bs) => bs.map((x, i) => i === k ? { ...x, minutes: Number(e.target.value) } : x))}>
              {withValue(BLOCK_OPTIONS, b.minutes).map((m) => <option key={m} value={m}>{fmtMinutes(m)}</option>)}
            </select>
            <button type="button" aria-label={`Remover ${BLOCK_LABEL[b.kind].toLowerCase()}`}
              onClick={() => setBlocks((bs) => bs.filter((_, i) => i !== k))}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          {(['simulado', 'redacao'] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => addBlock(kind)} disabled={blocks.length >= 7}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-white/65 dark:hover:bg-white/5">
              <Plus className="h-3.5 w-3.5" /> {BLOCK_LABEL[kind]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-1.5" aria-label="Mudanças com data">
        <p className={sectionTitle}><CalendarClock className="h-4 w-4" /> Mudanças com data</p>
        <p className="text-[11.5px] text-slate-500 dark:text-white/55">Ex.: a partir de dezembro só 1h por dia, ou férias de julho com 6h. Até a data, nada muda.</p>
        {periods.map((p, k) => (
          <div key={k} className="space-y-1.5 rounded-xl border border-slate-200 p-2 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-2">
              <label className="min-w-0 flex-1 space-y-0.5 text-[11px] font-bold text-slate-500 dark:text-white/55">
                A partir de
                <input type="date" min={today} className={`${selectCls} w-full`} value={p.from} aria-label="Início da mudança"
                  onChange={(e) => setPeriods((ps) => ps.map((x, i) => i === k ? { ...x, from: e.target.value } : x))} />
              </label>
              <label className="min-w-0 flex-1 space-y-0.5 text-[11px] font-bold text-slate-500 dark:text-white/55">
                Até (opcional)
                <input type="date" min={p.from || today} className={`${selectCls} w-full`} value={p.until ?? ''} aria-label="Fim da mudança"
                  onChange={(e) => setPeriods((ps) => ps.map((x, i) => i === k ? { ...x, until: e.target.value || null } : x))} />
              </label>
              <button type="button" aria-label="Remover mudança" onClick={() => setPeriods((ps) => ps.filter((_, i) => i !== k))}
                className="mt-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-white/70">
              <select className={selectCls} value={periodMinutes(p)} aria-label="Tempo por dia na mudança"
                onChange={(e) => setPeriodMinutes(k, Number(e.target.value))}>
                {withValue(OPTIONS, periodMinutes(p)).map((m) => <option key={m} value={m}>{fmtMinutes(m)}</option>)}
              </select>
              <span>por dia{p.from ? `, desde ${formatDayMonth(p.from)}` : ''}{p.until ? ` até ${formatDayMonth(p.until)}` : ''}</span>
            </div>
          </div>
        ))}
        <button type="button" onClick={addPeriod} disabled={periods.length >= 8}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-white/65 dark:hover:bg-white/5">
          <Repeat className="h-3.5 w-3.5" /> Agendar mudança
        </button>
      </section>

      {error && <p role="alert" className="text-[12px] font-semibold text-amber-700 dark:text-amber-300">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="h-10 rounded-xl px-4 text-[13px] font-bold text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/5">
          Cancelar
        </button>
        <button type="button" disabled={!!error || !changed || busy}
          onClick={() => onSave({ capacity: cap, reviewWeekdays: [...review].sort(), rules, ...(examChanged ? { examDate: exam } : {}) })}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--brand-ink)' }}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar rotina
        </button>
      </div>
    </>
  );
}
