'use client';

// Painel "Sua semana". Tudo calculado no backend, sem IA.
// Visual: blocos com ícone colorido (mesma linguagem dos KpiCards do simulado)
// e barra particionada por área (inspirada no Partition Bar, 21st.dev/@8starlabs):
// cada segmento tem a largura do peso da área no plano e preenche conforme o estudado.

import { Flame, Gauge, Brain, CalendarDays, AlertCircle } from 'lucide-react';
import { AREA_STYLE, type Insights } from '@/lib/cronograma';

const PACE: Record<Insights['pace'], { label: string; color: string; cls: string }> = {
  adiantado: { label: 'Adiantado', color: '#16a34a', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200' },
  no_ritmo:  { label: 'No ritmo', color: '#0ea5e9', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200' },
  atrasado:  { label: 'Atrasado', color: '#d97706', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' },
};

export function InsightsPanel({ data, loading }: { data: Insights | null; loading?: boolean }) {
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">{[0, 1, 2, 3].map((k) => <div key={k} className="h-[84px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />)}</div>
        <div className="h-[92px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }
  const pace = PACE[data.pace];
  const delta = Math.abs(data.pace_delta);
  const areas = data.by_area.filter((a) => a.area !== 'geral' && a.total > 0);
  const totalNodes = areas.reduce((s, a) => s + a.total, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={CalendarDays} color="var(--brand-primary)" label="Até o ENEM" value={`${data.weeks_to_exam} sem`} sub={`${data.days_to_exam} dias`} />
        <Tile icon={Gauge} color={pace.color} label="Ritmo"
          value={<span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold ${pace.cls}`}>{pace.label}</span>}
          sub={data.pace === 'no_ritmo' ? 'na linha do ideal' : `${delta} ${delta === 1 ? 'conteúdo' : 'conteúdos'} ${data.pace_delta > 0 ? 'à frente' : 'atrás'}`} />
        <Tile icon={Flame} color="#f97316" label="Dias cumpridos" value={String(data.streak_days)} sub="seguidos" />
        <Tile icon={Brain} color="#9333ea" label="Memória" value={data.retention_pct == null ? '-' : `${data.retention_pct}%`} sub="revisões bem lembradas (30d)" />
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-white/[0.03]">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">Conteúdo estudado</p>
          <p className="text-[12px] font-bold text-slate-900 dark:text-white">{data.studied}/{data.total} · {data.coverage_pct}%</p>
        </div>
        <div className="flex h-2.5 w-full gap-1" role="img"
          aria-label={areas.map((a) => `${a.label} ${a.pct}%`).join(', ')}>
          {areas.map((a) => {
            const dot = AREA_STYLE[a.area]?.dot ?? '#64748b';
            return (
              <div key={a.area} className="h-full overflow-hidden rounded-full" title={`${a.label}: ${a.studied}/${a.total}`}
                style={{ flex: `${a.total / totalNodes} 1 0`, background: `color-mix(in srgb, ${dot} 18%, transparent)` }}>
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(a.pct, a.studied > 0 ? 4 : 0)}%`, background: dot }} />
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
          {areas.map((a) => (
            <div key={a.area} className="min-w-0">
              <p className="flex items-center gap-1 truncate text-[11px] font-semibold text-slate-600 dark:text-white/60">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: AREA_STYLE[a.area]?.dot ?? '#64748b' }} />
                {a.label}
              </p>
              <p className="pl-2.5 text-[11px] font-bold text-slate-900 dark:text-white">{a.pct}%</p>
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

function Tile({ icon: Icon, color, label, value, sub }: { icon: React.ElementType; color: string; label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-3 dark:border-white/5 dark:bg-white/[0.03]">
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at top right, color-mix(in srgb, ${color} 13%, transparent), transparent 65%)` }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50">{label}</p>
          <div className="mt-1 font-display text-[22px] font-black leading-none text-slate-900 dark:text-white">{value}</div>
          <p className="mt-1 truncate text-[10.5px] text-slate-500 dark:text-white/45">{sub}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand-primary)_5%,white)] p-2.5 text-[12px] leading-snug text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-white/70">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--brand-primary)' }} /> <span>{children}</span>
    </p>
  );
}
