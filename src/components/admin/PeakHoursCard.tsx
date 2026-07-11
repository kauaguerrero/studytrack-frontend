"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';
import { Clock, BarChart2, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface HourData {
  hour: number;
  total: number;
  questions: number;
  games: number;
  whatsapp: number;
  sessions: number;
}

interface WeekdayTotal {
  weekday: number;
  label: string;
  total: number;
}

interface PeakHoursData {
  hours: HourData[];
  peak_hour: number | null;
  total_events: number;
  weekday_totals: WeekdayTotal[];
  peak_weekday: number | null;
  peak_weekday_label: string | null;
  peak_weekday_hour: number | null;
}

const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const PERIODS = [
  { label: "Madrugada", range: [0, 5],   color: "#1e3a5f" },
  { label: "Manhã",     range: [6, 11],  color: "#d97706" },
  { label: "Tarde",     range: [12, 17], color: "#16a34a" },
  { label: "Noite",     range: [18, 23], color: "#4f46e5" },
];

function getBarColor(hour: number, peakHour: number | null): string {
  if (hour === peakHour) return "#f59e0b";
  const period = PERIODS.find((p) => hour >= p.range[0] && hour <= p.range[1]);
  return period ? period.color : "#64748b";
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: HourData }[];
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800 mb-2">{formatHour(d.hour)}</p>
      <p className="text-slate-600">Total: <span className="font-semibold text-slate-900">{d.total}</span></p>
      {d.questions > 0 && <p className="text-slate-500">Questões: {d.questions}</p>}
      {d.games > 0     && <p className="text-slate-500">Jogos: {d.games}</p>}
      {d.whatsapp > 0  && <p className="text-slate-500">WhatsApp: {d.whatsapp}</p>}
      {d.sessions > 0  && <p className="text-slate-500">Sessões web: {d.sessions}</p>}
    </div>
  );
}

type ChartType = "bar" | "line";

export default function PeakHoursCard() {
  const [days, setDays] = useState<7 | 30>(30);
  const [weekday, setWeekday] = useState<number | "all">("all");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [data, setData] = useState<PeakHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async (period: number, wd: number | "all") => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
      const params = new URLSearchParams({ days: String(period) });
      if (wd !== "all") params.set("weekday", String(wd));
      const res = await fetch(`${apiUrl}/api/admin/stats/peak-hours?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Erro ao buscar horários de pico:", err);
      void reportError("PeakHoursCardError", String(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(days, weekday); }, [days, weekday, fetchData]);

  const hours = data?.hours ?? [];
  const peakHour = data?.peak_hour ?? null;
  const totalEvents = data?.total_events ?? 0;
  const weekdayTotals = data?.weekday_totals ?? [];
  const maxWeekdayTotal = Math.max(1, ...weekdayTotals.map((w) => w.total));

  const sharedAxisProps = {
    tick: { fontSize: 10, fill: "#94a3b8" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white p-5 dark:bg-slate-900 partner-elevated-card lg:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #6366F1, color-mix(in srgb, #6366F1 40%, white))' }}
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, #6366F1 16%, white)' }}
          >
            <Clock className="h-[18px] w-[18px]" style={{ color: '#4338CA' }} />
          </div>
          <div>
            <h3 className="font-display text-base font-black text-slate-900 dark:text-white">Horários de Pico</h3>
            <p className="text-[11.5px] text-slate-400 dark:text-white/40">
              Quando os alunos estão mais ativos (BRT) — {totalEvents.toLocaleString()} eventos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de período */}
            <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    days === d
                      ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {/* Switch de tipo de gráfico */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
              <button
                onClick={() => setChartType("bar")}
                title="Gráfico de barras"
                className={`p-1.5 rounded transition-colors ${
                  chartType === "bar"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setChartType("line")}
                title="Gráfico de linhas"
                className={`p-1.5 rounded transition-colors ${
                  chartType === "line"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-indigo-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Seletor de dia da semana */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setWeekday("all")}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              weekday === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            Todos os dias
          </button>
          {WEEKDAY_SHORT.map((label, wd) => {
            const isPeakDay = data?.peak_weekday === wd;
            return (
              <button
                key={wd}
                onClick={() => setWeekday(wd)}
                className={`relative rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  weekday === wd
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
                title={isPeakDay ? "Dia mais ativo do período" : undefined}
              >
                {label}
                {isPeakDay && (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data?.peak_weekday_label && data.peak_weekday_hour !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              Pico da semana: {data.peak_weekday_label} às {formatHour(data.peak_weekday_hour!)}
            </span>
          )}
          {peakHour !== null && weekday !== "all" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
              Pico em {WEEKDAY_SHORT[weekday]}: {formatHour(peakHour)}
            </span>
          )}
        </div>

        <div className="mt-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
          </div>
        ) : hours.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Nenhum dado encontrado
          </div>
        ) : chartType === "bar" ? (
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={hours} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="hour" tickFormatter={formatHour} interval={2} {...sharedAxisProps} />
              <YAxis {...sharedAxisProps} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {hours.map((entry) => (
                  <Cell key={entry.hour} fill={getBarColor(entry.hour, peakHour)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={192}>
            <LineChart data={hours} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <XAxis dataKey="hour" tickFormatter={formatHour} interval={2} {...sharedAxisProps} />
              <YAxis {...sharedAxisProps} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(99,102,241,0.2)", strokeWidth: 1 }} />
              {peakHour !== null && (
                <ReferenceLine
                  x={peakHour}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: formatHour(peakHour), position: "top", fontSize: 10, fill: "#b45309" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Legenda de períodos — só relevante no gráfico de barras */}
        {chartType === "bar" && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
            {PERIODS.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-xs text-slate-500">{p.label} ({formatHour(p.range[0])}–{formatHour(p.range[1])})</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span className="text-xs text-slate-500">Hora de pico</span>
            </div>
          </div>
        )}

        {/* Legenda simplificada para gráfico de linhas */}
        {chartType === "line" && (
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-indigo-600 rounded" />
              <span className="text-xs text-slate-500">Total de eventos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-amber-400 rounded border-dashed" style={{ borderTop: "2px dashed #f59e0b", height: 0 }} />
              <span className="text-xs text-slate-500">Hora de pico</span>
            </div>
          </div>
        )}

        {/* Distribuição por dia da semana — dá contexto pra escolha do dia no seletor acima */}
        {!loading && weekdayTotals.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Distribuição por dia da semana</p>
            <div className="flex items-end gap-2 h-16">
              {weekdayTotals.map((w) => {
                const isPeak = data?.peak_weekday === w.weekday;
                const heightPct = Math.max(6, Math.round((w.total / maxWeekdayTotal) * 100));
                return (
                  <button
                    key={w.weekday}
                    onClick={() => setWeekday(w.weekday)}
                    className="flex flex-1 flex-col items-center gap-1 group"
                    title={`${w.label}: ${w.total} eventos`}
                  >
                    <div className="flex h-12 w-full items-end rounded-sm overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`w-full rounded-sm transition-colors ${isPeak ? "bg-amber-400" : "bg-indigo-400 group-hover:bg-indigo-500"}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${weekday === w.weekday ? "text-indigo-600" : "text-slate-400"}`}>
                      {WEEKDAY_SHORT[w.weekday]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
