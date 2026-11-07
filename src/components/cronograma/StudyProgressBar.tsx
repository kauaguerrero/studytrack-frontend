'use client';

// Barra do Cronograma dentro do banco de questões (?plan_item=<id>): mostra
// "3/10 questões" do conteúdo do card e, ao bater a meta, comemora e volta
// para o cronograma (onde o card aparece concluído, com confete).
// Quem conta e conclui é o backend (GET /items/<id>/progress).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CalendarCheck2, CheckCircle2, PartyPopper } from 'lucide-react';
import {
  clearStudySession, cronogramaFetch, studySessionStart, type StudyProgress,
} from '@/lib/cronograma';

export const RETURN_DELAY_MS = 3000;

export function StudyProgressBar({ slug, itemId, answerTick }: {
  slug: string;
  itemId: string;
  /** Incrementa a cada questão respondida (dispara a recontagem). */
  answerTick: number;
}) {
  const router = useRouter();
  const [since] = useState(() => studySessionStart(itemId));
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [stayed, setStayed] = useState(false);
  const seq = useRef(0);
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

  useEffect(() => {
    if (!celebrating || stayed) return;
    const t = setTimeout(() => router.push(`${back}?concluido=${itemId}`), RETURN_DELAY_MS);
    return () => clearTimeout(t);
  }, [celebrating, stayed, router, back, itemId]);

  if (failed && !progress) return null;
  if (!progress) {
    return <div className="h-[68px] animate-pulse rounded-2xl bg-white/70 dark:bg-white/5" aria-hidden />;
  }

  const done = progress.status === 'done';
  const answered = Math.min(progress.goal, progress.answered + (done ? 0 : Math.max(0, answerTick - countedTick)));
  const pct = Math.round((answered / progress.goal) * 100);

  if (celebrating) {
    return (
      <motion.div role="status" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-400/25 dark:bg-emerald-400/10">
        <span className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-100">
          <PartyPopper className="h-5 w-5 shrink-0" />
          <span className="text-[14px]">
            <b>Meta batida!</b> {progress.goal} questões de {progress.topic ?? 'conteúdo'}.{' '}
            {stayed ? 'Conteúdo concluído no cronograma.' : 'Voltando para o cronograma…'}
          </span>
        </span>
        <span className="flex gap-2">
          {!stayed && (
            <button type="button" onClick={() => setStayed(true)}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-emerald-900 hover:bg-emerald-50 dark:border-emerald-400/30 dark:bg-transparent dark:text-emerald-100">
              Continuar respondendo
            </button>
          )}
          <Link href={`${back}?concluido=${itemId}`}
            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-emerald-700">
            Ir para o cronograma
          </Link>
        </span>
      </motion.div>
    );
  }

  return (
    <div role="group" aria-label="Progresso no cronograma"
      className="rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-[0_2px_4px_-2px_rgba(15,23,42,0.06),0_14px_30px_-20px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {done
            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            : <CalendarCheck2 className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-ink)' }} />}
          <span className="min-w-0 truncate text-[13px] font-semibold text-slate-800 dark:text-white/85">
            {done ? 'Conteúdo já concluído' : 'Cronograma'} · {progress.topic ?? 'conteúdo do dia'}
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">
          {done ? <Link href={back} className="text-[12.5px] font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--brand-ink)' }}>Voltar ao cronograma</Link>
            : <>{answered}/{progress.goal} questões</>}
        </span>
      </div>
      {!done && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar"
          aria-label="Questões do conteúdo" aria-valuemin={0} aria-valuemax={progress.goal} aria-valuenow={answered}>
          <motion.div className="h-full rounded-full" style={{ background: 'var(--brand-ink)' }}
            initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} />
        </div>
      )}
    </div>
  );
}
