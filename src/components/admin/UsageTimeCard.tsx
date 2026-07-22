"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';
import { Timer, Users2, BarChart2, ListOrdered, TrendingUp, Layers } from "lucide-react";
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
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "real" | "estimated" | "mixed";

interface CollectiveStats {
  total_seconds: number;
  real_seconds: number;
  estimated_seconds: number;
  active_users: number;
  avg_seconds_per_user: number;
}

interface OrgUsage {
  org_id: string;
  org_name: string;
  total_seconds: number;
  active_users: number;
  avg_seconds_per_user: number;
  mode: Mode;
}

interface IndividualUsage {
  user_id: string;
  name: string;
  org_id: string | null;
  org_name: string;
  total_seconds: number;
  mode: Mode;
}

interface DailyUsage {
  date: string;
  total_seconds: number;
  real_seconds: number;
  estimated_seconds: number;
  mode: Mode;
}

interface UsageTimeData {
  accurate_since: string | null;
  mode: Mode;
  collective: CollectiveStats;
  by_org: OrgUsage[];
  individual: IndividualUsage[];
  daily: DailyUsage[];
}

interface UsageTimeCardProps {
  orgs: { id: string; name: string }[];
}

const MODE_BADGE: Record<Mode, { label: string; cls: string }> = {
  real:      { label: "Dado real",     cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  estimated: { label: "Estimado",      cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
  mixed:     { label: "Misto",         cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" },
};

const MODE_TITLE: Record<Mode, string> = {
  real: "Medido por heartbeats reais enviados pelo app enquanto o aluno está ativo na aba.",
  estimated: "Sem heartbeats no período — tempo estimado a partir de respostas de questões e redações (gaps de até 30min = mesma sessão) somado à duração real de simulados concluídos.",
  mixed: "Combina heartbeats reais (após o início da coleta) com estimativa por atividade para o período anterior.",
};

const MODE_BAR_COLOR: Record<Mode, string> = {
  real: "#0D9488",
  estimated: "#f59e0b",
  mixed: "#0EA5E9",
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: OrgUsage }[];
}

function OrgTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{d.org_name}</p>
      <p className="text-slate-600">Total: <span className="font-semibold text-slate-900">{formatDuration(d.total_seconds)}</span></p>
      <p className="text-slate-500">Alunos ativos: {d.active_users}</p>
      <p className="text-slate-500">Média: {formatDuration(d.avg_seconds_per_user)}</p>
      <p className={`text-[11px] font-bold mt-1 ${MODE_BADGE[d.mode].cls} inline-block rounded-full px-2 py-0.5`}>{MODE_BADGE[d.mode].label}</p>
    </div>
  );
}

function formatDateLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

interface DailyTooltipProps {
  active?: boolean;
  payload?: { payload: DailyUsage }[];
}

function DailyTooltip({ active, payload }: DailyTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800 mb-1">{formatDateLabel(d.date)}</p>
      <p className="text-slate-600">Total: <span className="font-semibold text-slate-900">{formatDuration(d.total_seconds)}</span></p>
      {d.real_seconds > 0 && <p className="text-slate-500">Real: {formatDuration(d.real_seconds)}</p>}
      {d.estimated_seconds > 0 && <p className="text-slate-500">Estimado: {formatDuration(d.estimated_seconds)}</p>}
      <p className={`text-[11px] font-bold mt-1 ${MODE_BADGE[d.mode].cls} inline-block rounded-full px-2 py-0.5`}>{MODE_BADGE[d.mode].label}</p>
    </div>
  );
}

type Scope = "collective" | "individual";
type ChartType = "bar" | "line";

export default function UsageTimeCard({ orgs }: UsageTimeCardProps) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [orgId, setOrgId] = useState<string>("all");
  const [scope, setScope] = useState<Scope>("collective");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [data, setData] = useState<UsageTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async (period: number, org: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
      const params = new URLSearchParams({ days: String(period) });
      if (org !== "all") params.set("org_id", org);
      const res = await fetch(`${apiUrl}/api/admin/stats/usage-time?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Erro ao buscar tempo de uso:", err);
      void reportError("UsageTimeCardError", String(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(days, orgId); }, [days, orgId, fetchData]);

  const collective = data?.collective ?? null;
  const byOrg = data?.by_org ?? [];
  const individual = data?.individual ?? [];
  const daily = data?.daily ?? [];
  const maxOrgTotal = Math.max(1, ...byOrg.map((o) => o.total_seconds));

  const sharedAxisProps = {
    tick: { fontSize: 10, fill: "#94a3b8" },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-white p-5 dark:bg-slate-900 partner-elevated-card lg:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #0D9488, color-mix(in srgb, #0D9488 40%, white))' }}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'color-mix(in srgb, #0D9488 16%, white)' }}
          >
            <Timer className="h-[18px] w-[18px]" style={{ color: '#0F766E' }} />
          </div>
          <div>
            <h3 className="font-display text-base font-black text-slate-900 dark:text-white">Tempo de Uso da Plataforma</h3>
            <p className="text-[11.5px] text-slate-400 dark:text-white/40">
              Individual e por organização
              {data?.mode && (
                <span
                  title={MODE_TITLE[data.mode]}
                  className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold cursor-help ${MODE_BADGE[data.mode].cls}`}
                >
                  {MODE_BADGE[data.mode].label}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Seletor de organização */}
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger size="sm" className="h-8 text-xs font-semibold">
              <SelectValue placeholder="Organização" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as organizações</SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Seletor de período */}
          <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  days === d
                    ? "bg-white text-teal-600 shadow-sm dark:bg-slate-900"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Escopo: coletivo vs individual */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setScope("collective")}
              title="Visão por organização"
              className={`p-1.5 rounded transition-colors ${
                scope === "collective"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScope("individual")}
              title="Ranking individual"
              className={`p-1.5 rounded transition-colors ${
                scope === "individual"
                  ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tipo de gráfico — só relevante na visão coletiva */}
          {scope === "collective" && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-md p-0.5">
              <button
                onClick={() => setChartType("bar")}
                title="Gráfico de barras"
                className={`p-1.5 rounded transition-colors ${
                  chartType === "bar"
                    ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600"
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
                    ? "bg-white dark:bg-slate-900 shadow-sm text-teal-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resumo coletivo */}
      {collective && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-center">
            <p className="font-bold text-sm text-teal-600 dark:text-teal-400">{formatDuration(collective.total_seconds)}</p>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">Total coletivo</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-center">
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1">
              <Users2 className="w-3 h-3 text-slate-400" /> {collective.active_users}
            </p>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">Alunos ativos</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-center">
            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{formatDuration(collective.avg_seconds_per_user)}</p>
            <p className="text-slate-400 text-[10px] leading-tight mt-0.5">Média por aluno</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
          </div>
        ) : scope === "collective" ? (
          chartType === "bar" ? (
            byOrg.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                Nenhum dado encontrado
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, byOrg.length * 34)}>
                <BarChart data={byOrg} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                  <XAxis type="number" {...sharedAxisProps} tickFormatter={(v) => formatDuration(Number(v))} />
                  <YAxis
                    type="category"
                    dataKey="org_name"
                    width={110}
                    {...sharedAxisProps}
                  />
                  <Tooltip cursor={{ fill: "rgba(13,148,136,0.08)" }} content={<OrgTooltip />} />
                  <Bar dataKey="total_seconds" radius={[0, 3, 3, 0]}>
                    {byOrg.map((entry) => (
                      <Cell key={entry.org_id} fill={MODE_BAR_COLOR[entry.mode]} fillOpacity={entry.total_seconds / maxOrgTotal * 0.6 + 0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          ) : daily.every((d) => d.total_seconds === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Nenhum dado encontrado
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <LineChart data={daily} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateLabel}
                  interval={days > 30 ? Math.ceil(days / 10) : days > 7 ? 3 : 0}
                  {...sharedAxisProps}
                />
                <YAxis {...sharedAxisProps} tickFormatter={(v) => formatDuration(Number(v))} />
                <Tooltip cursor={{ stroke: "rgba(13,148,136,0.2)", strokeWidth: 1 }} content={<DailyTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total_seconds"
                  stroke="#0D9488"
                  strokeWidth={2}
                  dot={daily.length <= 31 ? { r: 3, fill: "#0D9488", strokeWidth: 0 } : false}
                  activeDot={{ r: 4, fill: "#0D9488", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )
        ) : individual.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Nenhum dado encontrado
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
            {individual.map((u, idx) => (
              <div
                key={u.user_id}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                <span className="w-5 shrink-0 text-[11px] font-bold text-slate-300 dark:text-slate-600 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{u.name}</p>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">{u.org_name}</p>
                </div>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${MODE_BADGE[u.mode].cls}`}>
                  {MODE_BADGE[u.mode].label}
                </span>
                <span className="shrink-0 text-xs font-bold text-teal-600 dark:text-teal-400 w-14 text-right">
                  {formatDuration(u.total_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {data?.accurate_since && (
        <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10.5px] text-slate-400 dark:text-slate-500">
          Coleta de dados reais iniciada em {new Date(data.accurate_since).toLocaleDateString("pt-BR")}. Períodos anteriores usam estimativa por atividade.
        </p>
      )}
    </div>
  );
}
