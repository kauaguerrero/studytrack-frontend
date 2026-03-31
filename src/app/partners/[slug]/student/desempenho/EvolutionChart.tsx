'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

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

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">

          {/* Título */}
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp size={18} style={{ color: brandPrimary }} />
              Evolução do Aluno
            </CardTitle>
            <CardDescription>
              Questões, simulados e acertos por dia
            </CardDescription>
          </div>

          {/* Filtros de período */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  period === p.days
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
                style={period === p.days ? { color: brandPrimary } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda interativa */}
        <div className="flex flex-wrap gap-3 mt-3">
          {series.map(({ key, label, color }) => {
            const hidden = hiddenLines.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
                  'text-xs font-semibold border transition-all',
                  hidden
                    ? 'opacity-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500'
                    : 'border-transparent'
                )}
                style={!hidden ? {
                  backgroundColor: color + '18',
                  borderColor: color + '40',
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
      </CardHeader>

      <CardContent className="pl-0">
        <div className="h-[320px] w-full pr-4">
          {filtered.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filtered}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
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
                      <div className="bg-slate-900 text-white text-xs rounded-xl py-3 px-4 shadow-xl border border-slate-700 space-y-1.5">
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
                  <Line
                    type="monotone"
                    dataKey="questions"
                    stroke={brandPrimary}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}

                {!hiddenLines.has('simulados') && (
                  <Line
                    type="monotone"
                    dataKey="simulados"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                )}

                {!hiddenLines.has('correct') && (
                  <Line
                    type="monotone"
                    dataKey="correct"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <TrendingUp className="w-10 h-10 text-slate-300" />
              <p className="text-sm">Sem dados no período selecionado.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
