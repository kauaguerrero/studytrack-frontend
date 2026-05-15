"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface PeakHoursData {
  hours: HourData[];
  peak_hour: number | null;
  total_events: number;
}

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
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [data, setData] = useState<PeakHoursData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async (period: number) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
      const res = await fetch(`${apiUrl}/api/admin/stats/peak-hours?days=${period}`, {
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

  useEffect(() => { fetchData(days); }, [days, fetchData]);

  const hours = data?.hours ?? [];
  const peakHour = data?.peak_hour ?? null;
  const totalEvents = data?.total_events ?? 0;

  const sharedAxisProps = {
    tick: { fontSize: 10, fill: "#94a3b8" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-indigo-500" /> Horários de Pico
            </CardTitle>
            <CardDescription>
              Quando os alunos estão mais ativos (BRT) — {totalEvents.toLocaleString()} eventos
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Seletor de período */}
            <div className="flex gap-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    days === d
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {/* Switch de tipo de gráfico */}
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
              <button
                onClick={() => setChartType("bar")}
                title="Gráfico de barras"
                className={`p-1.5 rounded transition-colors ${
                  chartType === "bar"
                    ? "bg-white shadow-sm text-indigo-600"
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
                    ? "bg-white shadow-sm text-indigo-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {peakHour !== null && (
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold">
              Pico: {formatHour(peakHour)}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
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
      </CardContent>
    </Card>
  );
}
