'use client';

/**
 * Evolução dos simulados em % de acertos: externos (registrados pelo aluno) e
 * os feitos na plataforma na mesma linha do tempo. No modo "Por área" mostra
 * as 4 áreas, só dos externos (os da plataforma não guardam nota por área).
 */

import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElevatedCard, CHART_TOOLTIP_STYLE_DARK } from '@/components/partners/founder-ui';
import { readableBrandText } from '@/lib/brand-color';
import {
  EXTERNAL_AREAS, areaResult, formatDayBR, totalResult, type ExternalSimulado,
} from '@/lib/external-simulados';

export interface PlatformSimuladoPoint {
  id: string;
  date: string; // YYYY-MM-DD (BRT)
  label: string;
  percentage: number;
}

interface Props {
  external: ExternalSimulado[];
  platform: PlatformSimuladoPoint[];
  brandPrimary: string;
}

interface ChartPoint {
  key: string;
  date: string;
  title: string;
  source: 'externo' | 'plataforma';
  externo?: number;
  plataforma?: number;
  linguagens?: number;
  humanas?: number;
  natureza?: number;
  matematica?: number;
}

const PLATFORM_COLOR = '#f59e0b';
const AREA_COLORS: Record<string, string> = {
  linguagens: '#6366f1',
  humanas: '#f59e0b',
  natureza: '#10b981',
  matematica: '#ef4444',
};

export function SimuladoEvolutionChart({ external, platform, brandPrimary }: Props) {
  const [mode, setMode] = useState<'geral' | 'areas'>('geral');
  const titleColor = readableBrandText(brandPrimary, 'var(--brand-primary)');

  const points = useMemo<ChartPoint[]>(() => {
    const ext: ChartPoint[] = external.flatMap((sim) => {
      const total = totalResult(sim);
      if (!total) return [];
      const point: ChartPoint = {
        key: `e-${sim.id}`,
        date: sim.day2_date ?? sim.day1_date,
        title: sim.title,
        source: 'externo',
        externo: total.pct,
      };
      for (const { key } of EXTERNAL_AREAS) {
        const r = areaResult(sim, key);
        if (r) point[key] = r.pct;
      }
      return [point];
    });
    const plat: ChartPoint[] = platform.map((p) => ({
      key: `p-${p.id}`,
      date: p.date,
      title: p.label,
      source: 'plataforma',
      plataforma: p.percentage,
    }));
    const all = mode === 'areas' ? ext : [...ext, ...plat];
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }, [external, platform, mode]);

  const series = mode === 'geral'
    ? [
        { key: 'externo', label: 'Externos', color: brandPrimary },
        { key: 'plataforma', label: 'Na plataforma', color: PLATFORM_COLOR },
      ]
    : EXTERNAL_AREAS.map(({ key, label }) => ({ key, label, color: AREA_COLORS[key] }));

  return (
    <ElevatedCard accentColor={brandPrimary} className="bg-white dark:bg-slate-900">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: titleColor }}>
              Simulados
            </p>
            <h2 className="font-display flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-white">
              <TrendingUp size={18} style={{ color: titleColor }} />
              Sua evolução
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-white/50">
              % de acertos em cada simulado
            </p>
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
            {([['geral', 'Geral'], ['areas', 'Por área']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-150',
                  mode === value
                    ? 'bg-white shadow-sm dark:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80',
                )}
                style={mode === value ? { color: titleColor } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {series.map(({ key, label, color }) => (
            <span
              key={key}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
            >
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 h-[280px] w-full">
          {points.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="key"
                  tickFormatter={(key: string) => formatDayBR(points.find((p) => p.key === key)?.date ?? null)}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={12}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as ChartPoint;
                    return (
                      <div style={CHART_TOOLTIP_STYLE_DARK} className="space-y-1.5 rounded-xl px-4 py-3 text-xs">
                        <p className="font-bold text-slate-200">{p.title}</p>
                        <p className="mb-2 text-slate-400">
                          {formatDayBR(p.date, true)} · {p.source === 'externo' ? 'Externo' : 'Na plataforma'}
                        </p>
                        {payload.map((item) => (
                          <div key={String(item.dataKey)} className="flex justify-between gap-6">
                            <span style={{ color: item.color }}>
                              {series.find((s) => s.key === item.dataKey)?.label}:
                            </span>
                            <span className="font-mono font-bold">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                {series.map(({ key, color }) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3.5, strokeWidth: 0, fill: color }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400 dark:text-white/30">
              <TrendingUp className="h-10 w-10 text-slate-300 dark:text-white/20" />
              <p className="max-w-xs text-center text-sm">
                {mode === 'areas'
                  ? 'Adicione um simulado externo com acertos por área para ver a evolução.'
                  : 'Faça ou registre um simulado para ver sua evolução.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </ElevatedCard>
  );
}
