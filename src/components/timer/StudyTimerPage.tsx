'use client';

// Tela do timer do aluno: começar (matéria + disciplina), pausar/retomar,
// encerrar (vai para o diário) e o tempo por matéria/dia.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pause, Play, Square, Timer as TimerIcon, Trash2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { CUSTOM_SUBJECTS } from '@/lib/simuladoSubjects';
import { formatClock, formatDuration, timerFetch, useStudyTimer, type TimerReport } from '@/lib/timer';
import { HeroStat, StudentPage, pageCard, primaryBtn } from '@/components/partners/PageShell';

export const TIMER_SUBJECTS = [...CUSTOM_SUBJECTS.filter((s) => s.value !== 'Todas').map((s) => s.value), 'Redação', 'Outra'];

const FOCUS_CYCLE = 25 * 60;
const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const inputCls =
  'w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function StudyTimerPage() {
  const { org } = useOrg();
  const slug = org.slug;
  const t = useStudyTimer(slug);
  const [subject, setSubject] = useState(TIMER_SUBJECTS[0]);
  const [discipline, setDiscipline] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(7);
  const [report, setReport] = useState<TimerReport | null>(null);

  const loadReport = useCallback(async () => {
    try { setReport(await timerFetch<TimerReport>(slug, `/timer/report?days=${days}`)); } catch { setReport(null); }
  }, [slug, days]);
  useEffect(() => { void loadReport(); }, [loadReport]);

  const run = async (fn: () => Promise<{ logged_minutes?: number }>, ok?: (r: { logged_minutes?: number }) => string) => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok) toast.success(ok(r));
      void loadReport();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro no timer.'); } finally { setBusy(false); }
  };

  const timer = t.timer;
  const running = timer?.status === 'running';
  const maxDay = Math.max(1, ...(report?.by_day ?? []).map((d) => d.seconds));
  const maxSubj = Math.max(1, ...(report?.by_subject ?? []).map((s) => s.seconds));
  const todayTotal = t.todaySeconds + (timer ? t.seconds : 0);
  // anel: um ciclo de foco de 25 min enquanto roda; parado, fica cheio e apagado
  const cycle = timer ? (t.seconds % FOCUS_CYCLE) / FOCUS_CYCLE : 0;
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <StudentPage
      kicker="Meu dia"
      icon={TimerIcon}
      title="Timer de estudo"
      description="Escolha a matéria e comece. Ao encerrar, o tempo entra no seu diário e no cronograma."
      aside={todayTotal > 0 ? <HeroStat label="Hoje" value={formatDuration(todayTotal)} hint="estudados" /> : undefined}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className={`${pageCard} p-5 sm:p-7`}>
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)' }} />
          <div className="relative flex flex-col items-center">
            {/* relógio */}
            <div className="relative h-[220px] w-[220px]">
              <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-white/10" />
                {timer && (
                  <circle cx="100" cy="100" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
                    stroke="var(--brand-ink, var(--brand-primary))" strokeDasharray={`${cycle * C} ${C}`}
                    className="transition-[stroke-dasharray] duration-1000 ease-linear" style={{ opacity: running ? 1 : 0.4 }} />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {timer ? (
                  <>
                    <p className="max-w-[150px] truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{timer.subject}</p>
                    <p className="font-display mt-1 text-[44px] font-black leading-none tabular-nums text-slate-900 dark:text-white" data-testid="clock">{formatClock(t.seconds)}</p>
                    <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${running ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${running ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />
                      {running ? 'Estudando' : 'Pausado'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Hoje</p>
                    <p className="font-display mt-1 text-[40px] font-black leading-none text-slate-900 dark:text-white">{formatDuration(todayTotal)}</p>
                    <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">pronto para começar</p>
                  </>
                )}
              </div>
            </div>

            {timer ? (
              <div className="mt-6 w-full max-w-md">
                {timer.discipline && <p className="text-center text-sm font-semibold text-slate-600 dark:text-white/70">{timer.discipline}</p>}
                {timer.auto_paused && (
                  <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Pausamos sozinhos depois de 4h sem mexer. Retome se ainda estiver estudando.</p>
                )}
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button type="button" disabled={busy} onClick={() => void run(running ? t.pause : t.resume)}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/85">
                    {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> Retomar</>}
                  </button>
                  <button type="button" disabled={busy}
                    onClick={() => void run(() => t.stop(note), (r) => (r.logged_minutes ? `${r.logged_minutes} min no diário.` : 'Menos de 1 min: não foi para o diário.'))}
                    className={`${primaryBtn} h-12 px-6`}>
                    <Square className="h-4 w-4" fill="currentColor" /> Encerrar
                  </button>
                </div>
                <input aria-label="Anotação" className={`${inputCls} mt-5`} placeholder="O que você estudou? (vai para o diário, opcional)" maxLength={500}
                  value={note} onChange={(e) => setNote(e.target.value)} />
                <button type="button" disabled={busy}
                  onClick={() => { if (window.confirm('Descartar este tempo? Ele não vai para o diário.')) void run(t.discard, () => 'Timer descartado.'); }}
                  className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" /> Descartar este tempo
                </button>
              </div>
            ) : (
              <div className="mt-6 w-full">
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">O que você vai estudar?</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Matéria">
                  {TIMER_SUBJECTS.map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={subject === s} onClick={() => setSubject(s)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${subject === s ? 'text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/10'}`}
                      style={subject === s ? { background: 'var(--brand-primary)' } : undefined}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mx-auto mt-4 flex max-w-md flex-col gap-3 sm:flex-row">
                  <input aria-label="Assunto" className={inputCls} placeholder="Assunto (opcional): ex. Funções" maxLength={120}
                    value={discipline} onChange={(e) => setDiscipline(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void run(() => t.start(subject, discipline.trim() || null)); }} />
                  <button type="button" disabled={busy} onClick={() => void run(() => t.start(subject, discipline.trim() || null))} className={`${primaryBtn} shrink-0 px-6`}>
                    <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} /> Começar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={`${pageCard} flex flex-col p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Seu tempo</p>
              <p className="font-display text-[28px] font-black leading-tight text-slate-900 dark:text-white" data-testid="report-total">
                {report ? formatDuration(report.total_seconds) : '…'}
              </p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">{report ? `${report.sessions} ${report.sessions === 1 ? 'sessão' : 'sessões'} em ${days} dias` : ' '}</p>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 dark:bg-white/[0.07]" role="group" aria-label="Período">
              {[7, 30].map((n) => (
                <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${days === n ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                  {n} dias
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex h-32 items-end gap-1.5" aria-label="Tempo por dia">
            {(report?.by_day ?? Array.from({ length: days }, (_, i) => ({ date: String(i), seconds: 0 }))).map((d) => (
              <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <div title={d.date.length > 5 ? `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}: ${formatDuration(d.seconds)}` : undefined}
                  className="w-full rounded-md transition-all"
                  style={{ height: `${Math.max(4, (d.seconds / maxDay) * 100)}%`, background: d.seconds ? 'var(--brand-primary)' : 'rgba(148,163,184,0.22)' }} />
                {days <= 7 && d.date.length > 5 && (
                  <span className="text-[10px] font-bold uppercase text-slate-400">{WEEKDAY[new Date(`${d.date}T12:00:00`).getDay()]}</span>
                )}
              </div>
            ))}
          </div>

          {!report || !report.total_seconds ? (
            <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
              Suas barras aparecem aqui quando você encerrar o primeiro timer.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {report.by_subject.map((s) => (
                <li key={s.subject}>
                  <div className="flex justify-between text-[13px]"><span className="font-bold text-slate-700 dark:text-white/85">{s.subject}</span>
                    <span className="tabular-nums text-slate-500 dark:text-white/55">{formatDuration(s.seconds)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-2 rounded-full" style={{ width: `${(s.seconds / maxSubj) * 100}%`, background: 'var(--brand-primary)' }} />
                  </div>
                  {s.disciplines.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/50">
                      {s.disciplines.slice(0, 3).map((d) => `${d.discipline} ${formatDuration(d.seconds)}`).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StudentPage>
  );
}
