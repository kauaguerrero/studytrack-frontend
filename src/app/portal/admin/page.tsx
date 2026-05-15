"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';
import PeakHoursCard from "@/components/admin/PeakHoursCard";
import StickinessCard from "@/components/admin/StickinessCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Brain, Database, GraduationCap, BarChart3,
  Calculator, ListChecks, Flag, ClipboardList, Plus, X,
  ExternalLink, Target, Activity, Github,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgFounder {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  max_students: number;
  student_count: number;
  founder: OrgFounder | null;
  logo_url: string | null;
  brand_primary: string;
  contact_email: string | null;
  has_video_library: boolean;
  monthly_value: number | null;
  created_at: string;
}

interface B2BStats {
  total_orgs: number;
  total_students: number;
  active_period: number;
  questions_period: number;
  simulados_period: number;
  essays_period: number;
  period: string;
}

interface OrgMetrics {
  questions: number;
  simulados: number;
  active_students: number;
  essays: number;
  total_students: number;
}

type OrgPeriod = 'day' | 'week' | 'month' | 'semester' | 'year' | 'all';
const ORG_PERIODS: { key: OrgPeriod; label: string }[] = [
  { key: 'day',      label: 'Dia'      },
  { key: 'week',     label: 'Semana'   },
  { key: 'month',    label: 'Mês'      },
  { key: 'semester', label: 'Semestre' },
  { key: 'year',     label: 'Ano'      },
  { key: 'all',      label: 'Total'    },
];

const PLAN_LABELS: Record<string, { label: string; cls: string }> = {
  b2b_basic:      { label: 'Basic',      cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
  b2b_pro:        { label: 'Pro',        cls: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' },
  b2b_enterprise: { label: 'Enterprise', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
};

const SUPABASE_FREE_LIMIT = 500 * 1024 * 1024;

// ── Component ─────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [stats, setStats]         = useState<any>(null);
  const [dist, setDist]           = useState<any>(null);
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [b2bStats, setB2bStats]   = useState<B2BStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [orgModal, setOrgModal]   = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [orgForm, setOrgForm]     = useState({
    name: '', slug: '', plan_tier: 'b2b_basic', max_students: 200,
    contact_email: '', brand_primary: '#6366f1', brand_secondary: '#8b5cf6', brand_accent: '#f59e0b',
  });
  const [savingOrg, setSavingOrg]         = useState(false);
  const [orgPeriod, setOrgPeriod]         = useState<OrgPeriod>('month');
  const [orgMetrics, setOrgMetrics]       = useState<Record<string, OrgMetrics>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const supabaseRef = useState(() => createClient())[0];
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

  const fetchOrgMetrics = useCallback(async (period: OrgPeriod) => {
    const { data: { session } } = await supabaseRef.auth.getSession();
    if (!session) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/b2b/org-metrics?period=${period}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setOrgMetrics(await res.json());
    } catch (e) {
      console.error("Erro ao buscar org-metrics:", e);
    } finally {
      setLoadingMetrics(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabaseRef.auth.getSession();
    if (!session) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${session.access_token}` };

    try {
      const [resStats, resDist, resOrgs, resB2B] = await Promise.all([
        fetch(`${apiUrl}/api/admin/stats`, { headers }),
        fetch(`${apiUrl}/api/admin/stats/distribution`, { headers }),
        fetch('/api/admin/b2b/organizations'),
        fetch('/api/admin/b2b/stats?period=month'),
      ]);
      if (resStats.ok) setStats(await resStats.json());
      if (resDist.ok)  setDist(await resDist.json());
      if (resOrgs.ok)  setOrgs((await resOrgs.json()).organizations ?? []);
      if (resB2B.ok)   setB2bStats(await resB2B.json());
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      void reportError("AdminDashboardFetchError", String(error));
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchOrgMetrics(orgPeriod); }, [orgPeriod, fetchOrgMetrics]);

  function openCreate() {
    setOrgForm({ name: '', slug: '', plan_tier: 'b2b_basic', max_students: 200, contact_email: '', brand_primary: '#6366f1', brand_secondary: '#8b5cf6', brand_accent: '#f59e0b' });
    setOrgModal({ open: true, org: null });
  }

  async function handleSaveOrg() {
    if (!orgForm.name.trim() || !orgForm.slug.trim()) return;
    setSavingOrg(true);
    try {
      const res = await fetch('/api/admin/b2b/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm),
      });
      if (res.ok) { setOrgModal({ open: false, org: null }); await fetchData(); }
    } finally {
      setSavingOrg(false);
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="h-12 w-12 bg-indigo-200 rounded-full" />
        <p className="text-indigo-600 font-medium">Carregando Master Control...</p>
      </div>
    </div>
  );

  const { health, financial, infrastructure } = stats || {};
  const dbUsagePercent = infrastructure?.db_size_bytes ? (infrastructure.db_size_bytes / SUPABASE_FREE_LIMIT) * 100 : 0;
  const dbSizeMB = infrastructure?.db_size_bytes ? (infrastructure.db_size_bytes / 1024 / 1024).toFixed(1) : "0";

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 md:pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Master Control</h1>
          <p className="text-slate-500 mt-1">Visão holística B2B — negócio, produto e conteúdo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { href: '/portal/admin/tasks',       icon: ClipboardList, color: 'text-indigo-500',  label: 'Tasks' },
            { href: '/portal/admin/prospeccao',   icon: Target,        color: 'text-violet-500',  label: 'Prospecção' },
            { href: '/portal/admin/reports',      icon: Flag,          color: 'text-amber-500',   label: 'Reports' },
            { href: '/portal/admin/questions',    icon: ListChecks,    color: 'text-emerald-500', label: 'Curadoria' },
            { href: '/portal/admin/github',       icon: Github,        color: 'text-slate-700 dark:text-slate-300', label: 'GitHub' },
          ].map(({ href, icon: Icon, color, label }) => (
            <Link key={href} href={href} prefetch={false}>
              <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Icon className={`w-4 h-4 ${color}`} /> {label}
              </span>
            </Link>
          ))}
          <span className="flex h-3 w-3 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-700">Sistema Operacional</span>
        </div>
      </div>

      {/* ── API Warning ────────────────────────────────────────────────────── */}
      {!stats && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <span className="font-semibold">⚠ Flask offline ou reiniciando</span>
          <span className="text-amber-600 dark:text-amber-400">— dados do painel indisponíveis. Os cards de parceiros e financeiro permanecem funcionais.</span>
        </div>
      )}

      {/* ── KPI Strip B2B ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {([
          { label: 'Alunos B2B',   value: b2bStats?.total_students ?? 0,   icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',      border: 'border-l-blue-500'    },
          { label: 'Parceiros',    value: orgs.length,                      icon: GraduationCap,color: 'text-indigo-600',  bg: 'bg-indigo-50 dark:bg-indigo-950/40',  border: 'border-l-indigo-500'  },
          { label: 'Ativos (30d)', value: b2bStats?.active_period ?? 0,     icon: Activity,     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40',border: 'border-l-emerald-500' },
        ] as const).map(({ label, value, icon: Icon, color, bg, border }) => (
          <Card key={label} className={`border-l-4 ${border}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{label}</p>
                <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Engajamento ────────────────────────────────────────────────────── */}
      {health && (
        <StickinessCard
          health={health}
          apiUrl={(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "")}
        />
      )}

      {/* ── Horários de Pico ───────────────────────────────────────────────── */}
      <PeakHoursCard />

      {/* ── Gestão de Parceiros ────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <GraduationCap className="w-5 h-5 text-indigo-500" /> Parceiros ({orgs.length})
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de período */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5">
              {ORG_PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setOrgPeriod(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    orgPeriod === key
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Instituição
            </button>
          </div>
        </div>

        {/* Totais consolidados */}
        {Object.keys(orgMetrics).length > 0 && (() => {
          const totals = Object.values(orgMetrics).reduce(
            (acc, m) => ({
              questions:      acc.questions      + (m.questions      ?? 0),
              simulados:      acc.simulados      + (m.simulados      ?? 0),
              active_students:acc.active_students+ (m.active_students?? 0),
              essays:         acc.essays         + (m.essays         ?? 0),
            }),
            { questions: 0, simulados: 0, active_students: 0, essays: 0 }
          );
          return (
            <div className={`grid grid-cols-4 gap-3 mb-4 transition-opacity ${loadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
              {([
                { label: 'Questões',  value: totals.questions,       color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950/40',     border: 'border-blue-200 dark:border-blue-800'    },
                { label: 'Simulados', value: totals.simulados,       color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
                { label: 'Ativos',    value: totals.active_students, color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-950/40',border: 'border-emerald-200 dark:border-emerald-800'},
                { label: 'Redações',  value: totals.essays,          color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',   border: 'border-amber-200 dark:border-amber-800'  },
              ] as const).map(({ label, value, color, bg, border }) => (
                <div key={label} className={`rounded-xl border ${border} ${bg} px-4 py-3 text-center`}>
                  <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString('pt-BR')}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => {
            const plan = PLAN_LABELS[org.plan_tier] ?? { label: org.plan_tier, cls: 'bg-slate-100 text-slate-600' };
            const fillPct = Math.round((org.student_count / org.max_students) * 100);
            const m = orgMetrics[org.id];
            return (
              <Card key={org.id} className="hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors">
                <CardContent className="p-4">
                  {/* Cabeçalho */}
                  <div className="flex items-start gap-3 mb-3">
                    {org.logo_url ? (
                      <img src={org.logo_url} alt={org.name} className="w-10 h-10 rounded-lg object-contain border border-slate-100 dark:border-zinc-700 bg-white shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: org.brand_primary }}>
                        {org.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{org.name}</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">/{org.slug}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.cls}`}>{plan.label}</span>
                  </div>

                  {/* Capacidade + Mensalidade */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
                      <p className="text-slate-400 font-medium">Alunos</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{org.student_count} / {org.max_students}</p>
                      <div className="mt-1 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${fillPct > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
                      <p className="text-slate-400 font-medium">Mensalidade</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {org.monthly_value ? `R$ ${Number(org.monthly_value).toFixed(0)}` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Métricas do período */}
                  <div className={`grid grid-cols-4 gap-1.5 mb-3 text-xs transition-opacity ${loadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
                    {[
                      { label: 'Questões',   value: m?.questions,       color: 'text-blue-600 dark:text-blue-400'    },
                      { label: 'Simulados',  value: m?.simulados,       color: 'text-violet-600 dark:text-violet-400'},
                      { label: 'Ativos',     value: m?.active_students, color: 'text-emerald-600 dark:text-emerald-400'},
                      { label: 'Redações',   value: m?.essays,          color: 'text-amber-600 dark:text-amber-400'  },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-1.5 py-1.5 text-center">
                        <p className={`font-bold text-sm ${color}`}>{value ?? '—'}</p>
                        <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {org.founder && (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3 truncate">
                      {org.founder.full_name ?? org.founder.email}
                    </p>
                  )}

                  <Link
                    href={`/partners/${org.slug}/dashboard`}
                    target="_blank"
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ver portal
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Raio-X do Conteúdo ─────────────────────────────────────────────── */}
      {dist && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-slate-600 dark:text-slate-400" /> Raio-X do Conteúdo ({dist.total} questões)
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/portal/admin/reports" prefetch={false}>
                <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-3 md:px-4 text-sm rounded-md transition-all shadow-sm hover:shadow-md active:scale-95">
                  <Flag className="w-4 h-4" /> Reports de Questões
                </button>
              </Link>
              <Link href="/portal/admin/questions" prefetch={false}>
                <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 md:px-4 text-sm rounded-md transition-all shadow-sm hover:shadow-md active:scale-95">
                  <ListChecks className="w-4 h-4" /> Mesa de Curadoria
                </button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 uppercase">Por Matéria</CardTitle>
              </CardHeader>
              <CardContent className="h-48 md:h-64 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  {dist.by_subject.map((s: any) => (
                    <div key={s.name} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{s.name}</span>
                      <Badge variant="secondary">{s.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Dificuldade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {dist.by_difficulty.map((d: any) => (
                      <div key={d.name} className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded text-center border border-slate-100 dark:border-slate-800">
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{d.count}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase mt-1">{d.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Top 5 Anos Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dist.by_year.slice(0, 5).map((y: any) => (
                      <div key={y.name} className="flex items-center gap-3">
                        <span className="text-sm font-bold w-12 text-slate-600 dark:text-slate-400">{y.name}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${(y.count / dist.total) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{y.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── Infra + IA (compacto) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-slate-900 text-slate-50 border-t-4 border-t-cyan-400">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" /> Database
              </h3>
              <span className="text-xs text-cyan-200 bg-cyan-900/50 px-2 py-1 rounded">Free Tier</span>
            </div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-bold text-cyan-400">{dbSizeMB} MB</span>
              <span className="text-sm text-slate-400">/ 500 MB</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div className={`h-full transition-all ${dbUsagePercent > 90 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: `${Math.min(dbUsagePercent, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-500 text-right">{dbUsagePercent.toFixed(1)}% utilizado</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-600">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" /> Consumo de IA (30d)
              </h3>
              <Calculator className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-700 pb-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Tokens</p>
                <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-200">
                  {financial?.ai_total_tokens ? financial.ai_total_tokens.toLocaleString('pt-BR') : 0}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Custo Estimado</p>
              <p className="text-2xl font-bold text-purple-700">R$ {financial?.ai_cost_brl || "0.00"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Modal Nova Instituição ─────────────────────────────────────────── */}
      {orgModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-slate-900 dark:text-white">Nova Instituição</p>
              <button onClick={() => setOrgModal({ open: false, org: null })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Nome *</label>
                <input
                  value={orgForm.name}
                  onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Cursinho Objetivo"
                  autoFocus
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Slug *</label>
                <input
                  value={orgForm.slug}
                  onChange={e => setOrgForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder="cursinho-objetivo"
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Plano</label>
                <select
                  value={orgForm.plan_tier}
                  onChange={e => setOrgForm(f => ({ ...f, plan_tier: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                >
                  <option value="b2b_basic">Basic</option>
                  <option value="b2b_pro">Pro</option>
                  <option value="b2b_enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Máx. Alunos</label>
                <input
                  type="number"
                  value={orgForm.max_students}
                  onChange={e => setOrgForm(f => ({ ...f, max_students: Number(e.target.value) }))}
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Email de contato</label>
                <input
                  value={orgForm.contact_email}
                  onChange={e => setOrgForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="contato@escola.com"
                  className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                {([['brand_primary','Primária'],['brand_secondary','Secundária'],['brand_accent','Acento']] as const).map(([key, label]) => (
                  <div key={key} className="flex-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
                    <input
                      type="color"
                      value={orgForm[key]}
                      onChange={e => setOrgForm(f => ({ ...f, [key]: e.target.value }))}
                      className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOrgModal({ open: false, org: null })}
                className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOrg}
                disabled={savingOrg || !orgForm.name.trim() || !orgForm.slug.trim()}
                className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {savingOrg ? 'Criando...' : 'Criar Instituição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
