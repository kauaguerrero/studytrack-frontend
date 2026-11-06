'use client';

// Área de insights (o painel colorido do esboço, na cor da org). Tudo calculado no backend, sem IA.

import { Flame, Gauge, Brain, CalendarDays, AlertCircle } from 'lucide-react';
import { AREA_STYLE, type Insights } from '@/lib/cronograma';

const PACE: Record<Insights['pace'], { label: string; cls: string }> = {
  adiantado: { label: 'Adiantado', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/40' },
  no_ritmo:  { label: 'No ritmo', cls: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-white/10 dark:text-white/85 dark:border-white/20' },
  atrasado:  { label: 'Atrasado', cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40' },
};

export function InsightsPanel({ data, loading }: { data: Insights | null; loading?: boolean }) {
  if (loading || !data) {
    return <div className="h-[220px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />;
  }
  const pace = PACE[data.pace];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={CalendarDays} label="Até o ENEM" value={`${data.weeks_to_exam} sem`} sub={`${data.days_to_exam} dias`} />
        <Stat icon={Gauge} label="Ritmo" value={<span className={`rounded-full border px-2 py-0.5 text-[12px] font-bold ${pace.cls}`}>{pace.label}</span>}
          sub={data.pace === 'no_ritmo' ? 'na linha do ideal' : `${Math.abs(data.pace_delta)} conteúdos ${data.pace_delta > 0 ? 'à frente' : 'atrás'}`} />
        <Stat icon={Flame} label="Dias cumpridos" value={String(data.streak_days)} sub="seguidos" />
        <Stat icon={Brain} label="Memória" value={data.retention_pct == null ? '-' : `${data.retention_pct}%`} sub="revisões bem lembradas (30d)" />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[12px] font-bold text-slate-700 dark:text-white/75">Conteúdo estudado</p>
          <p className="text-[12px] font-bold text-slate-900 dark:text-white">{data.studied}/{data.total} · {data.coverage_pct}%</p>
        </div>
        <div className="space-y-2">
          {data.by_area.filter((a) => a.area !== 'geral').map((a) => (
            <div key={a.area}>
              <div className="flex justify-between text-[11.5px] text-slate-600 dark:text-white/60">
                <span>{a.label}</span><span className="font-semibold">{a.pct}%</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: AREA_STYLE[a.area]?.dot ?? '#64748b' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.brake_today && (
        <Note>Hoje só revisão: você tem {data.reviews_due_today} revisões vencidas. Consolidar antes de avançar faz o conteúdo ficar.</Note>
      )}
      {data.left_out > 0 && (
        <Note>
          No ritmo atual ({Math.round(data.weekly_minutes / 60)}h por semana), <b>{data.left_out} conteúdos</b> de menor incidência
          ficam para depois da prova{data.left_out_by_area[0] ? `, a maioria de ${data.left_out_by_area[0].label}` : ''}. Os mais cobrados vêm primeiro.
        </Note>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 dark:bg-slate-900">
      <p className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <div className="mt-0.5 font-display text-[19px] font-black text-slate-900 dark:text-white">{value}</div>
      <p className="text-[10.5px] text-slate-500 dark:text-white/45">{sub}</p>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand-primary)_22%,transparent)] bg-white p-2.5 text-[12px] leading-snug text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white/70">
      {/* cor da org (vars --bta-* vêm do painel) */}
      <AlertCircle className="brand-text-adaptive mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}
