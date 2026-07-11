'use client';

import { useState } from 'react';
import {
  Area, AreaChart, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElevatedCard, CHART_TOOLTIP_STYLE_DARK } from '@/components/partners/founder-ui';
import { readableBrandText } from '@/lib/brand-color';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayData {
  date: string;      // "DD/MM"
  fullDate: string;  // "segunda-feira, 1 de março"
  questions: number;
  simulados: number;
  correct: number;
}

interface EvolutionChartProps {
  data: DayData[];
  brandPrimary: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7d',  days: 7  },
  { label: '15d', days: 15 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const SERIES = [
  { key: 'questions', label: 'Questões',  color: '' },   // color preenchido com brandPrimary
  { key: 'simulados', label: 'Simulados', color: '#f59e0b' },
  { key: 'correct',   label: 'Acertos',   color: '#10b981' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EvolutionChart({ data, brandPrimary }: EvolutionChartProps) {
  const [period, setPeriod] = useState(30);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  const filtered = data.slice(-period);

  function toggleLine(key: string) {
    setHiddenLines(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const series = SERIES.map(s => ({
    ...s,
    color: s.key === 'questions' ? brandPrimary : s.color,
  }));

  const titleColor = readableBrandText(brandPrimary, 'var(--brand-primary)');

  return (
    <ElevatedCard accentColor={brandPrimary} className="bg-white dark:bg-slate-900">
      <div className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Título */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: titleColor }}>
              Desempenho
            </p>
            <h2 className="font-display flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-white">
              <TrendingUp size={18} style={{ color: titleColor }} />
              Evolução do Aluno
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-white/50">
              Questões, simulados e acertos por dia
            </p>
          </div>

          {/* Filtros de período */}
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-150',
                  period === p.days
                    ? 'bg-white shadow-sm dark:bg-slate-900'
                    : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80',
                )}
                style={period === p.days ? { color: titleColor } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda interativa */}
        <div className="flex flex-wrap gap-2 mt-4">
          {series.map(({ key, label, color }) => {
            const hidden = hiddenLines.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                  'text-xs font-semibold transition-all',
                  hidden
                    ? 'opacity-40 bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/40'
                    : '',
                )}
                style={!hidden ? {
                  backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                  color,
                } : undefined}
              >
                <div
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: hidden ? '#cbd5e1' : color }}
                />
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 h-[300px] w-full">
          {filtered.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filtered}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="evoQuestionsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brandPrimary} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={brandPrimary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="evoSimuladosFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="evoCorrectFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(148,163,184,0.25)"
                />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={period <= 15 ? 0 : 20}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as DayData;
                    return (
                      <div style={CHART_TOOLTIP_STYLE_DARK} className="rounded-xl py-3 px-4 text-xs space-y-1.5">
                        <p className="font-bold text-slate-300 mb-2">{d?.fullDate}</p>
                        {payload.map(p => (
                          <div key={String(p.dataKey)} className="flex justify-between gap-6">
                            <span style={{ color: p.color }}>
                              {p.dataKey === 'questions' ? 'Questões'
                                : p.dataKey === 'simulados' ? 'Simulados'
                                : 'Acertos'}:
                            </span>
                            <span className="font-mono font-bold">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />

                {!hiddenLines.has('questions') && (
                  <Area
                    type="monotone"
                    dataKey="questions"
                    stroke={brandPrimary}
                    strokeWidth={2.5}
                    fill="url(#evoQuestionsFill)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}

                {!hiddenLines.has('simulados') && (
                  <Area
                    type="monotone"
                    dataKey="simulados"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#evoSimuladosFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                )}

                {!hiddenLines.has('correct') && (
                  <Area
                    type="monotone"
                    dataKey="correct"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#evoCorrectFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-white/30 gap-2">
              <TrendingUp className="w-10 h-10 text-slate-300 dark:text-white/20" />
              <p className="text-sm">Sem dados no período selecionado.</p>
            </div>
          )}
        </div>
      </div>
    </ElevatedCard>
  );
}
