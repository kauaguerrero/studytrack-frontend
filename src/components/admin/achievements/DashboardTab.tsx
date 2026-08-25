"use client";

import { useCallback, useEffect, useState, type ElementType, type ReactNode } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { Trophy, Users, Percent, Sparkles, Star, Crown, Gem } from "lucide-react";
import { fetchAdminJSON, buildOrgQuery } from "./api";
import type { DashboardData } from "./types";

const PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Tudo", days: 365 },
] as const;

// Um único hue (azul, o "sequential default" do sistema) pra todo gráfico de
// magnitude aqui — nenhum deles compara séries entre si, é sempre "contagem
// por categoria", então uma paleta categórica de várias cores seria ruído,
// não informação (ver skill de dataviz: "compare magnitude -> sequential/1 hue").
const ACCENT = "#3987e5";
const GRID = "#94a3b8";

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-bold text-slate-800 dark:text-white">{payload[0].value}{unit ?? ""}</p>
      <p className="text-slate-400 dark:text-white/40">{label}</p>
    </div>
  );
}

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function KpiTile({ icon: Icon, value, label, tint }: { icon: ElementType; value: string | number; label: string; tint: string }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ background: `color-mix(in srgb, ${tint} 8%, transparent)` }}>
      <p className="flex items-center justify-center gap-1 text-lg font-black tabular-nums" style={{ color: tint }}>
        <Icon className="h-4 w-4" /> {value}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">{label}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, height = 200, children }: { title: string; subtitle?: string; height?: number; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
      <p className="text-[12px] font-bold text-slate-700 dark:text-white/80">{title}</p>
      {subtitle && <p className="text-[10.5px] text-slate-400 dark:text-white/35">{subtitle}</p>}
      <div style={{ width: "100%", height }} className="mt-2">
        {children}
      </div>
    </div>
  );
}

interface Props {
  apiUrl: string;
  orgId: string | null;
}

export default function DashboardTab({ apiUrl, orgId }: Props) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const path = `/api/admin/achievements/dashboard?days=${days}${buildOrgQuery(orgId)}`;
    const res = await fetchAdminJSON<DashboardData>(apiUrl, path);
    if (res) setData(res);
    setLoading(false);
  }, [apiUrl, days, orgId]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Carregando...</div>
      </div>
    );
  }
  if (!data || data.students_count === 0) {
    return <p className="text-sm italic text-slate-400 dark:text-white/30">Sem alunos B2B nesse escopo.</p>;
  }

  const catLabels: Record<string, string> = {
    account_level: "Nível de conta", questions: "Questões", simulados: "Simulados",
    streak: "Sequência", essay: "Redação", subjects: "Matérias", night_owl: "Coruja de plantão",
    early_bird: "Madrugador(a)", perfect_simulado: "Gabarito perfeito", marathon_day: "Dia de maratona",
    shield_used: "Escudo em ação", podium: "Pódio do mês", champion: "Campeão do mês",
    streak_100: "Sequência inquebrável", completionist: "Perfeccionista total",
  };
  const byCategory = data.by_category.map((c) => ({ ...c, label: catLabels[c.category] ?? c.category }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Período</p>
        <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setDays(p.days)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                days === p.days
                  ? "bg-white text-amber-600 shadow-sm dark:bg-slate-900"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <KpiTile icon={Trophy} value={data.total_unlocked} label="Desbloqueadas" tint="#059669" />
        <KpiTile icon={Users} value={data.unique_achievers} label="Alunos c/ conquista" tint="#4f46e5" />
        <KpiTile icon={Sparkles} value={data.avg_per_student} label="Média/aluno" tint="#0ea5e9" />
        <KpiTile icon={Percent} value={`${data.completion_rate_pct}%`} label="Conclusão total" tint="#f59e0b" />
        <KpiTile icon={Crown} value={data.completionist_count} label="Perfeccionistas" tint="#e11d48" />
      </div>

      {/* Destaques do período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 p-3 dark:border-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <Star className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mais popular no período</p>
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white/85">
              {data.most_popular ? `${data.most_popular.title} (${data.most_popular.count}x)` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-100 p-3 dark:border-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Gem className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mais rara desbloqueada</p>
            <p className="truncate text-xs font-semibold text-slate-800 dark:text-white/85">
              {data.rarest_unlocked ? `${data.rarest_unlocked.title} (${data.rarest_unlocked.count}x)` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Desbloqueios por dia */}
      <ChartCard title="Desbloqueios por dia" subtitle="No período selecionado">
        <ResponsiveContainer>
          <AreaChart data={data.unlocks_by_day} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} strokeOpacity={0.15} />
            <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} fill={ACCENT} fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top conquistas */}
      <ChartCard title="Conquistas mais desbloqueadas" height={Math.max(140, data.top_achievements.length * 28)}>
        <ResponsiveContainer>
          <BarChart data={data.top_achievements} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="title" width={140} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Por raridade */}
      <ChartCard title="Desbloqueios por raridade" height={220}>
        <ResponsiveContainer>
          <BarChart data={data.by_difficulty} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Por categoria */}
      <ChartCard title="Desbloqueios por categoria" height={Math.max(140, byCategory.length * 26)}>
        <ResponsiveContainer>
          <BarChart data={byCategory} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Por organização — só na visão Geral */}
      {orgId === null && data.by_org.length > 0 && (
        <ChartCard title="Desbloqueios por organização" height={Math.max(140, data.by_org.length * 28)}>
          <ResponsiveContainer>
            <BarChart data={data.by_org} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="org_name" width={140} tick={{ fontSize: 10, fill: GRID }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" fill={ACCENT} radius={[0, 4, 4, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
