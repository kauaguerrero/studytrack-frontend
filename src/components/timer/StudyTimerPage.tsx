'use client';

// Tela do timer do aluno: começar (matéria + disciplina), pausar/retomar,
// encerrar (vai para o diário) e o tempo por matéria/dia.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pause, Play, Square, Timer as TimerIcon, Trash2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { CUSTOM_SUBJECTS } from '@/lib/simuladoSubjects';
import { formatClock, formatDuration, timerFetch, useStudyTimer, type TimerReport } from '@/lib/timer';

export const TIMER_SUBJECTS = [...CUSTOM_SUBJECTS.filter((s) => s.value !== 'Todas').map((s) => s.value), 'Redação', 'Outra'];

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><TimerIcon className="h-6 w-6" /> Timer de estudo</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
        Hoje: {formatDuration(t.todaySeconds + (timer ? t.seconds : 0))} estudados. Ao encerrar, o tempo entra no seu diário.
      </p>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        {timer ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-600 dark:text-white/70">
              {timer.subject}{timer.discipline ? ` · ${timer.discipline}` : ''}
            </p>
            <p className="mt-2 font-mono text-5xl font-black tabular-nums text-slate-900 dark:text-white" data-testid="clock">{formatClock(t.seconds)}</p>
            {timer.auto_paused && (
              <p className="mt-2 text-xs font-semibold text-amber-600">Pausamos sozinhos depois de 4h sem mexer. Retome se ainda estiver estudando.</p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" disabled={busy} onClick={() => void run(running ? t.pause : t.resume)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:text-white/80">
                {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> Retomar</>}
              </button>
              <button type="button" disabled={busy}
                onClick={() => void run(() => t.stop(note), (r) => (r.logged_minutes ? `${r.logged_minutes} min no diário.` : 'Menos de 1 min: não foi para o diário.'))}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
                <Square className="h-4 w-4" /> Encerrar
              </button>
              <button type="button" disabled={busy}
                onClick={() => { if (window.confirm('Descartar este tempo? Ele não vai para o diário.')) void run(t.discard, () => 'Timer descartado.'); }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-red-500 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Descartar
              </button>
            </div>
            <input aria-label="Anotação" className={`${inputCls} mt-4`} placeholder="Anotação para o diário (opcional)" maxLength={500}
              value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-xs font-semibold text-slate-600 dark:text-white/70">Matéria
              <select aria-label="Matéria" className={`${inputCls} mt-1`} value={subject} onChange={(e) => setSubject(e.target.value)}>
                {TIMER_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-white/70">Assunto (opcional)
              <input aria-label="Assunto" className={`${inputCls} mt-1`} placeholder="Ex.: Funções" maxLength={120}
                value={discipline} onChange={(e) => setDiscipline(e.target.value)} />
            </label>
            <button type="button" disabled={busy} onClick={() => void run(() => t.start(subject, discipline.trim() || null))}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
              <Play className="h-4 w-4" /> Começar
            </button>
          </div>
        )}
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">Seu tempo</h2>
          <select aria-label="Período" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white"
            value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 dias</option><option value={30}>30 dias</option>
          </select>
        </div>
        {!report || !report.total_seconds ? (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum tempo registrado no período.</p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-500 dark:text-white/50">Total</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white" data-testid="report-total">{formatDuration(report.total_seconds)}</p>
              <div className="mt-3 flex h-20 items-end gap-1" aria-label="Tempo por dia">
                {report.by_day.map((d) => (
                  <div key={d.date} title={`${d.date.slice(8, 10)}/${d.date.slice(5, 7)}: ${formatDuration(d.seconds)}`}
                    className="flex-1 rounded-t" style={{ height: `${Math.max(3, (d.seconds / maxDay) * 100)}%`, background: d.seconds ? 'var(--brand-primary)' : 'rgba(148,163,184,0.25)' }} />
                ))}
              </div>
            </div>
            <ul className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              {report.by_subject.map((s) => (
                <li key={s.subject}>
                  <div className="flex justify-between text-xs"><span className="font-semibold text-slate-700 dark:text-white/80">{s.subject}</span>
                    <span className="tabular-nums text-slate-500 dark:text-white/55">{formatDuration(s.seconds)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                    <div className="h-1.5 rounded-full" style={{ width: `${(s.seconds / maxSubj) * 100}%`, background: 'var(--brand-primary)' }} />
                  </div>
                  {s.disciplines.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-white/50">
                      {s.disciplines.slice(0, 3).map((d) => `${d.discipline} ${formatDuration(d.seconds)}`).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
