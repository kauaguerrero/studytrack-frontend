'use client';

// Visão do mês: um resumo por dia (contagem por área + carga). Clicar num dia
// abre a semana dele. Depois das 2 semanas fixas, os dias são PROJEÇÃO
// (o planner recalcula conforme o aluno avança) — marcados como "previsto".

import { AREA_STYLE, LOAD_STYLE, WEEKDAY_SHORT, parseISODate, type Area, type DayInfo, type PlanItem, type ProjectedItem } from '@/lib/cronograma';

type DaySummary = { areas: Map<Area, number>; reviews: number; minutes: number };

function summarizeDays(items: PlanItem[], projection: ProjectedItem[]): Map<string, DaySummary> {
  const out = new Map<string, DaySummary>();
  const rows = [
    ...items.filter((i) => i.status !== 'skipped').map((i) => ({ date: i.date, area: i.area, kind: i.kind, minutes: i.minutes })),
    ...projection.map((p) => ({ date: p.date, area: p.area, kind: p.kind, minutes: p.minutes })),
  ];
  for (const r of rows) {
    const v = out.get(r.date) ?? { areas: new Map<Area, number>(), reviews: 0, minutes: 0 };
    if (r.kind === 'review') v.reviews += 1;
    else v.areas.set(r.area, (v.areas.get(r.area) ?? 0) + 1);
    v.minutes += r.minutes;
    out.set(r.date, v);
  }
  return out;
}

export function MonthGrid({
  days, items, projection, today, month, onPickDay,
}: {
  days: DayInfo[];
  items: PlanItem[];
  projection: ProjectedItem[];
  today: string;
  month: number;
  onPickDay: (date: string) => void;
}) {
  const projectedDays = new Set(projection.map((p) => p.date));
  const byDay = summarizeDays(items, projection);

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {WEEKDAY_SHORT.map((w) => (
          <p key={w} className="text-center text-[10px] font-bold tracking-[0.12em] text-slate-500 dark:text-white/45">{w}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const info = byDay.get(d.date);
          const inMonth = parseISODate(d.date).getMonth() === month;
          const isToday = d.date === today;
          const projected = projectedDays.has(d.date) && !items.some((i) => i.date === d.date);
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onPickDay(d.date)}
              className={`flex min-h-[74px] flex-col rounded-xl border p-1.5 text-left transition hover:shadow-md sm:min-h-[92px] ${inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 opacity-60 dark:bg-white/5'} ${isToday ? 'ring-2' : ''} border-slate-200 dark:border-white/10`}
              style={isToday ? { ['--tw-ring-color' as string]: 'var(--brand-primary)' } : undefined}
            >
              <span className="flex items-center justify-between">
                <span className={`text-[12px] font-black ${inMonth ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{parseISODate(d.date).getDate()}</span>
                {d.capacity > 0 && info && !projected && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: LOAD_STYLE[d.level].bar }} aria-label={LOAD_STYLE[d.level].label} />
                )}
              </span>
              {d.blocked ? (
                <span className="mt-auto text-[10px] text-slate-400">livre</span>
              ) : info ? (
                <span className="mt-1 flex flex-wrap gap-1">
                  {[...info.areas.entries()].map(([a, n]) => (
                    <span key={a} className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 dark:text-white/60">
                      <span className="h-2 w-2 rounded-full" style={{ background: AREA_STYLE[a]?.dot ?? '#64748b' }} />{n}
                    </span>
                  ))}
                  {info.reviews > 0 && <span className="text-[10px] font-semibold text-slate-500 dark:text-white/45">↻{info.reviews}</span>}
                </span>
              ) : null}
              {projected && <span className="mt-auto text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">previsto</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-white/50">
        {(['matematica', 'natureza', 'humanas', 'linguagens'] as Area[]).map((a) => (
          <span key={a} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: AREA_STYLE[a].dot }} />{AREA_STYLE[a].label}</span>
        ))}
        <span>↻ revisões</span>
      </div>
    </div>
  );
}
