'use client';

// KPI "Tempo de estudo" do Meu Desempenho (fase 8): últimos 7 dias vs. os 7
// anteriores, barras por dia, hoje e a matéria em que o aluno mais estudou.
// Uma única leitura de 14 dias, só com o módulo do timer ligado.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Timer as TimerIcon } from 'lucide-react';
import { formatDuration, timerFetch, type TimerReport } from '@/lib/timer';

const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function splitWeeks(report: TimerReport) {
  const days = report.by_day;
  const cur = days.slice(-7);
  const prev = days.slice(0, Math.max(0, days.length - 7));
  const sum = (xs: { seconds: number }[]) => xs.reduce((a, d) => a + d.seconds, 0);
  const curTotal = sum(cur);
  const prevTotal = sum(prev);
  const delta = prevTotal ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;
  return { cur, curTotal, prevTotal, delta, today: cur.at(-1)?.seconds ?? 0, activeDays: cur.filter((d) => d.seconds > 0).length };
}

export function StudyTimeKpi({ slug, accent }: { slug: string; accent: string }) {
  const [report, setReport] = useState<TimerReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    timerFetch<TimerReport>(slug, '/timer/report?days=14')
      .then((r) => { if (alive) setReport(r); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [slug]);

  if (failed) return null;

  const w = report ? splitWeeks(report) : null;
  const max = Math.max(1, ...(w?.cur ?? []).map((d) => d.seconds));
  const top = report?.by_subject[0];
  const DeltaIcon = w?.delta == null ? ArrowRight : w.delta > 0 ? ArrowUpRight : w.delta < 0 ? ArrowDownRight : ArrowRight;
  const deltaTone = w?.delta == null ? 'text-slate-500 dark:text-slate-400'
    : w.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <section data-testid="study-time-kpi"
      className="partner-elevated-card partner-elevated-card-hover relative overflow-hidden rounded-[24px] bg-white p-5 dark:bg-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 40%, white))` }} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)` }} />

      <div className="relative z-10 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: `color-mix(in srgb, ${accent} 16%, white)`, color: accent }}>
              <TimerIcon className="h-[18px] w-[18px]" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tempo de estudo · 7 dias</p>
          </div>
          {!w ? (
            <div className="mt-4 h-10 w-32 animate-pulse rounded-xl bg-slate-100 dark:bg-white/10" />
          ) : (
            <>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white" data-testid="study-time-total">
                {formatDuration(w.curTotal)}
              </p>
              <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${deltaTone}`} data-testid="study-time-delta">
                <DeltaIcon className="h-4 w-4" />
                {w.delta == null
                  ? (w.curTotal ? 'Primeira semana cronometrada' : 'Ligue o timer para começar')
                  : `${w.delta > 0 ? '+' : ''}${w.delta}% vs. 7 dias anteriores`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                  Hoje {formatDuration(w.today)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                  {w.activeDays} de 7 dias
                </span>
                {top && (
                  <span className="rounded-full px-2.5 py-1 font-semibold"
                    style={{ background: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}>
                    Mais estudada: {top.subject}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="flex h-28 items-end gap-2" aria-label="Tempo por dia">
            {(w?.cur ?? Array.from({ length: 7 }, (_, i) => ({ date: String(i), seconds: 0 }))).map((d, i, arr) => {
              const isToday = i === arr.length - 1;
              const wd = d.date.length === 10 ? WEEKDAY[new Date(`${d.date}T12:00:00`).getDay()] : '';
              return (
                <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  title={d.date.length === 10 ? `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}: ${formatDuration(d.seconds)}` : undefined}>
                  <div className="w-full max-w-[34px] rounded-lg transition-all duration-500"
                    style={{
                      height: `${Math.max(6, (d.seconds / max) * 100)}%`,
                      background: d.seconds
                        ? `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 55%, white))`
                        : 'rgba(148,163,184,0.18)',
                      boxShadow: isToday && d.seconds ? `0 4px 14px color-mix(in srgb, ${accent} 35%, transparent)` : undefined,
                    }} />
                  <span className={`text-[10px] font-semibold ${isToday ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{wd}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-end">
            <Link href={`/partners/${slug}/student/timer`} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: accent }}>
              Abrir o timer <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
