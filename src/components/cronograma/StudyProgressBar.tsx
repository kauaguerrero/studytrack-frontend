'use client';

// Barra do Cronograma dentro do banco de questões (?plan_item=<id>): mostra
// "3/10 questões" do conteúdo do card. Ela fica no topo da página, sem cobrir as
// questões; ao rolar, vira um círculo com "3/10" na lateral esquerda. Ao bater a
// meta, abre o resumo (acertos e tempo médio) e o aluno decide quando voltar.
// Quem conta e conclui é o backend (GET /items/<id>/progress).

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck2, CheckCircle2, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';
import {
  clearStudySession, cronogramaFetch, formatAnswerTime, studySessionStart, type StudyProgress,
} from '@/lib/cronograma';

const RING_SIZE = 52;
const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ answered, goal, pct, topic }: { answered: number; goal: number; pct: number; topic: string }) {
  return (
    <motion.div role="progressbar" aria-label={`Progresso em ${topic}`} title={topic}
      aria-valuemin={0} aria-valuemax={goal} aria-valuenow={answered}
      initial={{ opacity: 0, scale: 0.7, x: 24 }} animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.7, x: 24 }} transition={{ duration: 0.18 }}
      className="relative rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.4)] dark:bg-slate-900"
      style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={4}
          className="stroke-slate-200 dark:stroke-white/15" />
        <motion.circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" strokeWidth={4}
          strokeLinecap="round" stroke="var(--brand-ink)" strokeDasharray={RING_LENGTH}
          initial={false} animate={{ strokeDashoffset: RING_LENGTH * (1 - pct / 100) }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12.5px] font-bold tabular-nums text-slate-900 dark:text-white">
        {answered}/{goal}
      </span>
    </motion.div>
  );
}

function resultMessage(rate: number): string {
  if (rate >= 80) return 'Mandou bem! Esse conteúdo está firme.';
  if (rate >= 50) return 'Bom caminho. As revisões vão reforçar o que faltou.';
  return 'Esse pediu mais esforço. As revisões vão trazer ele de volta para fixar.';
}

export function StudyProgressBar({ slug, itemId, answerTick }: {
  slug: string;
  itemId: string;
  /** Incrementa a cada questão respondida (dispara a recontagem). */
  answerTick: number;
}) {
  const themeRoot = useStudentThemeRoot();
  const [since] = useState(() => studySessionStart(itemId));
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const seq = useRef(0);
  const barRef = useRef<HTMLDivElement | null>(null);
  const back = `/partners/${slug}/student/cronograma`;

  // `countedTick`: até qual resposta o backend já contou. O que veio depois soma
  // +1 otimista na tela até a próxima recontagem chegar.
  const [countedTick, setCountedTick] = useState(0);
  const refresh = useCallback(async (tick: number) => {
    const my = ++seq.current;
    try {
      const p = await cronogramaFetch<StudyProgress>(`/items/${itemId}/progress?since=${encodeURIComponent(since)}`);
      if (my !== seq.current) return;
      setProgress(p);
      setCountedTick(tick);
      setFailed(false);
      if (p.just_completed) {
        clearStudySession(itemId);
        setCelebrating(true);
      }
    } catch {
      if (my === seq.current) setFailed(true);
    }
  }, [itemId, since]);

  // Carga inicial e recontagem a cada resposta (pequeno atraso: a resposta acabou de ser gravada).
  useEffect(() => {
    const t = setTimeout(() => { void refresh(answerTick); }, answerTick === 0 ? 0 : 400);
    return () => clearTimeout(t);
  }, [answerTick, refresh]);

  // A barra saiu da tela (o aluno rolou): mostra o círculo no lugar dela.
  const loaded = !!progress;
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [loaded]);

  if (failed && !progress) return null;
  if (!progress) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div className="h-[68px] animate-pulse rounded-2xl bg-white/70 dark:bg-white/5" aria-hidden />
      </div>
    );
  }

  const done = progress.status === 'done';
  const answered = Math.min(progress.goal, progress.answered + (done ? 0 : Math.max(0, answerTick - countedTick)));
  const pct = Math.round((answered / progress.goal) * 100);
  const topic = progress.topic ?? 'conteúdo do dia';
  const stats = progress.stats ?? null;
  const rate = stats && stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
  const backDone = `${back}?concluido=${itemId}`;
  const avg = stats?.avg_seconds ? formatAnswerTime(stats.avg_seconds) : null;

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 pt-4">
        <div ref={barRef} role="group" aria-label="Progresso no cronograma"
          className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-[0_2px_4px_-2px_rgba(15,23,42,0.06),0_14px_30px_-20px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900">
          <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${done ? '' : 'mb-2'}`}>
            <span className="flex min-w-0 items-center gap-2">
              {done
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                : <CalendarCheck2 className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-ink)' }} />}
              <span className="min-w-0 truncate text-[13px] font-semibold text-slate-800 dark:text-white/85">
                {done ? 'Conteúdo concluído' : 'Cronograma'} · {topic}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">
              {done ? <Link href={back} className="text-[12.5px] font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--brand-ink)' }}>Voltar ao cronograma</Link>
                : <>{answered}/{progress.goal} questões</>}
            </span>
          </div>
          {done && stats && (
            <p className="mt-1 pl-6 text-[12.5px] tabular-nums text-slate-500 dark:text-white/60">
              {stats.correct}/{stats.total} acertos ({rate}%){avg ? ` · ${avg} por questão` : ''}
            </p>
          )}
          {!done && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar"
              aria-label="Questões do conteúdo" aria-valuemin={0} aria-valuemax={progress.goal} aria-valuenow={answered}>
              <motion.div className="h-full rounded-full" style={{ background: 'var(--brand-ink)' }}
                initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
            </div>
          )}
        </div>
      </div>

      {/* Tela larga: o círculo fica na margem à esquerda da coluna de questões, sem cobrir nada.
          Tela menor não tem essa margem: vai para o canto inferior esquerdo. */}
      <AnimatePresence>
        {collapsed && !done && !celebrating && (
          <>
            <div className="sticky top-4 z-30 mx-auto hidden h-0 max-w-4xl px-4 xl:block">
              <div className="absolute right-full top-0 mr-1">
                <ProgressRing answered={answered} goal={progress.goal} pct={pct} topic={topic} />
              </div>
            </div>
            <div className="fixed bottom-[76px] left-2 z-30 md:bottom-4 md:left-[76px] xl:hidden">
              <ProgressRing answered={answered} goal={progress.goal} pct={pct} topic={topic} />
            </div>
          </>
        )}
      </AnimatePresence>

      <Dialog open={celebrating} onOpenChange={(o) => { if (!o) setCelebrating(false); }}>
        <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
          <DialogHeader>
            <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15">
              <PartyPopper className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            </span>
            <DialogTitle className="font-display text-[19px] text-slate-900 dark:text-white">Conteúdo concluído!</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 dark:text-white/60">{topic}</DialogDescription>
          </DialogHeader>
          {stats && rate !== null ? (
            <>
              <dl className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <dt className="text-[12px] text-slate-500 dark:text-white/55">Acertos</dt>
                  <dd className="mt-0.5 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">
                    {stats.correct}/{stats.total} <span className="text-[13px] font-semibold text-slate-500 dark:text-white/55">{rate}%</span>
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <dt className="text-[12px] text-slate-500 dark:text-white/55">Média por questão</dt>
                  <dd className="mt-0.5 text-[20px] font-bold tabular-nums text-slate-900 dark:text-white">{avg ?? '—'}</dd>
                </div>
              </dl>
              <p className="text-[13px] text-slate-600 dark:text-white/70">{resultMessage(rate)}</p>
            </>
          ) : (
            <p className="text-[13px] text-slate-600 dark:text-white/70">Você bateu a meta de {progress.goal} questões.</p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setCelebrating(false)}
              className="whitespace-nowrap rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10">
              Continuar respondendo
            </button>
            <Link href={backDone} className="whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2 text-center text-[13px] font-bold text-white hover:bg-emerald-700">
              Voltar ao cronograma
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
