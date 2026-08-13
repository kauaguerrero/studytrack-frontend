"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';
import { toast } from 'sonner';
import PeakHoursCard from "@/components/admin/PeakHoursCard";
import UsageTimeCard from "@/components/admin/UsageTimeCard";
import StickinessCard, { type HealthData } from "@/components/admin/StickinessCard";
import AIUsageRecentCard from "@/components/admin/AIUsageRecentCard";
import { KpiCard, ElevatedCard } from "@/components/partners/founder-ui";
import { SmokeBackground } from "@/components/ui/spooky-smoke-animation";
import { ExpandingIconButton } from "@/components/ui/expanding-icon-button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Brain, Database, GraduationCap, BarChart3,
  Calculator, ListChecks, Flag, ClipboardList, Plus, X,
  ExternalLink, Target, Activity, Github, TrendingUp, TrendingDown,
  Settings, Puzzle, Trophy, WalletCards, PenLine, ClipboardCheck,
  Video, LifeBuoy, BookOpen, BadgeCheck, ChevronRight, ChevronDown, Trash2, AlertTriangle,
  EyeOff, UserPlus, Eye, Loader2,
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
  brand_secondary: string;
  brand_accent: string;
  contact_email: string | null;
  has_video_library: boolean;
  monthly_value: number | null;
  billing_enabled: boolean;
  is_active: boolean;
  is_mock: boolean;
  created_at: string;
  allow_multiple_pending_essays: boolean;
  permissions?: Record<string, boolean>;
  max_video_lessons?: number | null;
}

interface ModuleDef {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  icon: React.ElementType;
  subConfig?: 'max_video_lessons' | 'allow_multiple_pending_essays';
  affectsStudent: boolean;
  affectsFounder: boolean;
}

const MODULE_DEFS: ModuleDef[] = [
  { key: 'simulados_enabled',      label: 'Simulados',          description: 'Provas e simulados com correção automática.',                icon: ClipboardCheck, defaultEnabled: true,  affectsFounder: true,  affectsStudent: true  },
  { key: 'redacoes_enabled',       label: 'Redações',            description: 'Envio e correção de redações pelos alunos.',                  icon: PenLine,        defaultEnabled: true,  affectsFounder: true,  affectsStudent: true, subConfig: 'allow_multiple_pending_essays'  },
  { key: 'ranking_enabled',        label: 'Ranking',             description: 'Classificação de alunos por desempenho e gamificação.',       icon: Trophy,         defaultEnabled: true,  affectsFounder: true,  affectsStudent: true  },
  { key: 'planos_enabled',         label: 'Planos',              description: 'Gestão de planos e assinaturas dos alunos.',                  icon: WalletCards,    defaultEnabled: true,  affectsFounder: true,  affectsStudent: false },
  { key: 'banco_questoes_enabled', label: 'Banco de Questões',   description: 'Prática livre com questões do banco ENEM.',                   icon: BookOpen,       defaultEnabled: true,  affectsFounder: false, affectsStudent: true  },
  { key: 'desempenho_enabled',     label: 'Meu Desempenho',      description: 'Painel de estatísticas individuais do aluno.',                icon: BarChart3,      defaultEnabled: true,  affectsFounder: false, affectsStudent: true  },
  { key: 'titulos_enabled',        label: 'Títulos',             description: 'Sistema de conquistas e títulos gamificados.',                icon: BadgeCheck,     defaultEnabled: true,  affectsFounder: false, affectsStudent: true  },
  { key: 'suporte_enabled',        label: 'Suporte',             description: 'Canal de suporte e FAQ para alunos e gestores.',              icon: LifeBuoy,       defaultEnabled: true,  affectsFounder: true,  affectsStudent: true  },
  { key: 'video_lessons_enabled',  label: 'Videoaulas',          description: 'Biblioteca de aulas em vídeo hospedada via Bunny CDN.',       icon: Video,          defaultEnabled: false, affectsFounder: true,  affectsStudent: true, subConfig: 'max_video_lessons' },
];

interface PerOrgStats {
  org_id: string;
  active_period: number;
  questions_period: number;
  simulados_period: number;
  essays_period: number;
  prev_active_period: number;
  prev_questions_period: number;
  prev_simulados_period: number;
  prev_essays_period: number;
}

interface B2BStats {
  total_orgs: number;
  total_students: number;
  active_period: number;
  questions_period: number;
  simulados_period: number;
  essays_period: number;
  prev_active_period: number;
  prev_questions_period: number;
  prev_simulados_period: number;
  prev_essays_period: number;
  per_org: PerOrgStats[];
  period: string;
}

// ── /api/admin/stats (Flask) ─────────────────────────────────────────────────
interface AdminStats {
  health: HealthData;
  product: {
    stuck_essays: number;
    plan_adherence: number;
    active_pros: number;
    active_elite: number;
    active_paid: number;
    active_users_in_adherence: number;
  };
  education: {
    hardest_subject: string;
    lowest_accuracy: number;
    total_answers_analyzed: number;
  };
  b2b: { active_schools: number; webhook_errors: number };
  financial: {
    mrr_brl: number;
    ai_cost_brl: number;
    net_profit_brl: number;
    ai_total_tokens: number;
  };
  infrastructure: { db_size_bytes: number; db_limit_bytes: number };
}

// ── /api/admin/stats/distribution (Flask) ────────────────────────────────────
interface DistItem {
  name: string;
  count: number;
}
interface DistributionStats {
  total: number;
  by_subject: DistItem[];
  by_year: DistItem[];
  by_difficulty: DistItem[];
  by_topic: DistItem[];
  by_bank: DistItem[];
  by_bank_subject: Record<string, DistItem[]>;
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

// Cores da própria marca StudyTrack (não confundir com brand_primary/accent dos parceiros)
const STUDYTRACK_PRIMARY = '#6366F1';
const STUDYTRACK_ACCENT = '#3B82F6';

// Maps the orgPeriod selector to the stats API period param
const STATS_PERIOD_MAP: Partial<Record<OrgPeriod, string>> = {
  day:   'today',
  week:  'week',
  month: 'month',
  year:  'year',
  all:   'lifetime',
  // semester is not supported by stats API — badges hidden
};

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const delta = current - prev;
  if (delta === 0) return null;
  const positive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      positive
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
    }`}>
      {positive
        ? <TrendingUp className="w-2.5 h-2.5" />
        : <TrendingDown className="w-2.5 h-2.5" />}
      {positive ? '+' : ''}{delta.toLocaleString('pt-BR')}
    </span>
  );
}

function OrgCard({ org, perOrgStats, hasPrev, loadingMetrics, onOpenSettings, onCreateUser }: {
  org: Org;
  perOrgStats: PerOrgStats | undefined;
  hasPrev: boolean;
  loadingMetrics: boolean;
  onOpenSettings: (org: Org) => void;
  onCreateUser: (org: Org) => void;
}) {
  const plan = PLAN_LABELS[org.plan_tier] ?? { label: org.plan_tier, cls: 'bg-slate-100 text-slate-600' };
  const fillPct = Math.round((org.student_count / org.max_students) * 100);
  const p = perOrgStats;
  const accentColor = org.is_mock ? '#F59E0B' : (org.is_active === false ? '#94A3B8' : org.brand_primary);
  return (
    <ElevatedCard accentColor={accentColor}>
      <CardContent className="p-4">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3 mb-3">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo_url é uma URL externa arbitrária colada pelo admin, fora dos remotePatterns do next/image
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
          {org.is_mock && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Demo</span>
          )}
          {org.is_active === false && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300">Inativo</span>
          )}
          {org.is_active !== false && !org.billing_enabled && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">Sem faturamento</span>
          )}
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${plan.cls}`}>{plan.label}</span>
          <ExpandingIconButton
            icon={UserPlus}
            label="Criar usuário"
            title="Criar usuário manualmente"
            onClick={() => onCreateUser(org)}
          />
          <button
            onClick={() => onOpenSettings(org)}
            title="Configurações da instituição"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Capacidade + Mensalidade */}
        <div className={`grid gap-2 mb-3 text-xs ${org.billing_enabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
            <p className="text-slate-400 font-medium">Alunos</p>
            <p className="font-bold text-slate-700 dark:text-slate-200">{org.student_count} / {org.max_students}</p>
            <div className="mt-1 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${fillPct > 90 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(fillPct, 100)}%` }} />
            </div>
          </div>
          {org.billing_enabled && (
            <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5">
              <p className="text-slate-400 font-medium">Mensalidade</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">
                {org.monthly_value ? `R$ ${Number(org.monthly_value).toFixed(0)}` : '—'}
              </p>
            </div>
          )}
        </div>

        {/* Métricas do período */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-3 text-xs transition-opacity ${loadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
          {[
            { label: 'Questões',  value: p?.questions_period,  prev: p?.prev_questions_period,  color: 'text-blue-600 dark:text-blue-400'     },
            { label: 'Simulados', value: p?.simulados_period,  prev: p?.prev_simulados_period,  color: 'text-violet-600 dark:text-violet-400' },
            { label: 'Ativos',    value: p?.active_period,     prev: p?.prev_active_period,     color: 'text-emerald-600 dark:text-emerald-400'},
            { label: 'Redações',  value: p?.essays_period,     prev: p?.prev_essays_period,     color: 'text-amber-600 dark:text-amber-400'   },
          ].map(({ label, value, prev, color }) => (
            <div key={label} className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-1.5 py-1.5 text-center">
              <p className={`font-bold text-sm ${color}`}>{value ?? '—'}</p>
              <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{label}</p>
              {hasPrev && value != null && prev != null && (
                <div className="flex justify-center mt-0.5">
                  <DeltaBadge current={value} prev={prev} />
                </div>
              )}
            </div>
          ))}
        </div>

        {org.founder && (
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-3 truncate">
            {org.founder.full_name ?? org.founder.email}
          </p>
        )}

        <Link
          href={`/partners/${encodeURIComponent(org.slug)}/dashboard`}
          target="_blank"
          className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-indigo-200 dark:border-indigo-500/30 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver portal
        </Link>
      </CardContent>
    </ElevatedCard>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [dist, setDist]           = useState<DistributionStats | null>(null);
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [b2bStats, setB2bStats]   = useState<B2BStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [orgModal, setOrgModal]   = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [orgForm, setOrgForm]     = useState({
    name: '', slug: '', plan_tier: 'b2b_basic', max_students: 200,
    contact_email: '', brand_primary: '#6366f1', brand_secondary: '#8b5cf6', brand_accent: '#f59e0b',
  });
  const [savingOrg, setSavingOrg]         = useState(false);
  const [orgSettingsModal, setOrgSettingsModal] = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [settingsForm, setSettingsForm]   = useState({
    name: '', slug: '', plan_tier: 'b2b_basic', max_students: 200,
    contact_email: '', monthly_value: '', logo_url: '',
    brand_primary: '#6366f1', brand_secondary: '#8b5cf6', brand_accent: '#f59e0b',
    allow_multiple_pending_essays: false,
    billing_enabled: true, is_active: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [modulesModal, setModulesModal]   = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [modulesForm, setModulesForm]     = useState({
    simulados_enabled: true, redacoes_enabled: true, ranking_enabled: true,
    planos_enabled: true, banco_questoes_enabled: true, desempenho_enabled: true,
    titulos_enabled: true, suporte_enabled: true, video_lessons_enabled: false,
    allow_multiple_pending_essays: false, max_video_lessons: '',
  });
  const [savingModules, setSavingModules] = useState(false);
  const [deleteOrgModal, setDeleteOrgModal] = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deletingOrg, setDeletingOrg]     = useState(false);
  const [createUserModal, setCreateUserModal] = useState<{ open: boolean; org: Org | null }>({ open: false, org: null });
  const [createUserForm, setCreateUserForm] = useState({
    role: 'student' as 'student' | 'founder', full_name: '', email: '', password: '',
  });
  const [createUserShowPassword, setCreateUserShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [orgPeriod, setOrgPeriod]         = useState<OrgPeriod>('month');
  const [activeOrgsOpen, setActiveOrgsOpen]     = useState(true);
  const [inactiveOrgsOpen, setInactiveOrgsOpen] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [distBankFilter, setDistBankFilter] = useState<string | null>(null);
  const supabaseRef = useState(() => createClient())[0];
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

  const fetchB2bStats = useCallback(async (period: OrgPeriod) => {
    const statsPeriod = STATS_PERIOD_MAP[period] ?? 'month';
    try {
      const res = await fetch(`/api/admin/b2b/stats?period=${statsPeriod}`);
      if (res.ok) setB2bStats(await res.json());
    } catch (e) {
      console.error("Erro ao buscar b2b-stats:", e);
    }
  }, []);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabaseRef.auth.getSession();
    if (!session) { setLoading(false); return; }

    const headers = { Authorization: `Bearer ${session.access_token}` };

    try {
      const [resStats, resDist, resOrgs] = await Promise.all([
        fetch(`${apiUrl}/api/admin/stats`, { headers }),
        fetch(`${apiUrl}/api/admin/stats/distribution`, { headers }),
        fetch('/api/admin/b2b/organizations'),
      ]);
      if (resStats.ok) setStats(await resStats.json());
      if (resDist.ok)  setDist(await resDist.json());
      if (resOrgs.ok)  setOrgs((await resOrgs.json()).organizations ?? []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      void reportError("AdminDashboardFetchError", String(error));
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setLoadingMetrics(true);
    fetchB2bStats(orgPeriod).finally(() => setLoadingMetrics(false));
  }, [orgPeriod, fetchB2bStats]);

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

  function openOrgSettings(org: Org) {
    setSettingsForm({
      name: org.name,
      slug: org.slug,
      plan_tier: org.plan_tier,
      max_students: org.max_students,
      contact_email: org.contact_email ?? '',
      monthly_value: org.monthly_value != null ? String(org.monthly_value) : '',
      logo_url: org.logo_url ?? '',
      brand_primary: org.brand_primary || '#6366f1',
      brand_secondary: org.brand_secondary || '#8b5cf6',
      brand_accent: org.brand_accent || '#f59e0b',
      allow_multiple_pending_essays: org.allow_multiple_pending_essays ?? false,
      billing_enabled: org.billing_enabled ?? true,
      is_active: org.is_active ?? true,
    });
    setOrgSettingsModal({ open: true, org });
  }

  function openCreateUser(org: Org) {
    setCreateUserForm({ role: 'student', full_name: '', email: '', password: '' });
    setCreateUserShowPassword(false);
    setCreateUserModal({ open: true, org });
  }

  async function handleCreateUser() {
    if (!createUserModal.org) return;
    setCreatingUser(true);
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${createUserModal.org.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${createUserForm.role === 'founder' ? 'Gestor' : 'Aluno'} criado em ${createUserModal.org.name}.`);
        setCreateUserModal({ open: false, org: null });
        await fetchData();
      } else {
        toast.error(data.error ?? 'Erro ao criar usuário.');
      }
    } catch {
      toast.error('Erro de conexão ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  }

  function openModules(org: Org) {
    const p = org.permissions ?? {};
    setModulesForm({
      simulados_enabled:      p.simulados_enabled      !== undefined ? Boolean(p.simulados_enabled)      : true,
      redacoes_enabled:       p.redacoes_enabled       !== undefined ? Boolean(p.redacoes_enabled)       : true,
      ranking_enabled:        p.ranking_enabled        !== undefined ? Boolean(p.ranking_enabled)        : true,
      planos_enabled:         p.planos_enabled         !== undefined ? Boolean(p.planos_enabled)         : true,
      banco_questoes_enabled: p.banco_questoes_enabled !== undefined ? Boolean(p.banco_questoes_enabled) : true,
      desempenho_enabled:     p.desempenho_enabled     !== undefined ? Boolean(p.desempenho_enabled)     : true,
      titulos_enabled:        p.titulos_enabled        !== undefined ? Boolean(p.titulos_enabled)        : true,
      suporte_enabled:        p.suporte_enabled        !== undefined ? Boolean(p.suporte_enabled)        : true,
      video_lessons_enabled:  p.video_lessons_enabled  !== undefined ? Boolean(p.video_lessons_enabled)  : false,
      allow_multiple_pending_essays: org.allow_multiple_pending_essays ?? false,
      max_video_lessons: org.max_video_lessons != null ? String(org.max_video_lessons) : '',
    });
    setModulesModal({ open: true, org });
  }

  async function handleSaveModules() {
    if (!modulesModal.org) return;
    setSavingModules(true);
    try {
      const permissions: Record<string, boolean> = {
        simulados_enabled:      modulesForm.simulados_enabled,
        redacoes_enabled:       modulesForm.redacoes_enabled,
        ranking_enabled:        modulesForm.ranking_enabled,
        planos_enabled:         modulesForm.planos_enabled,
        banco_questoes_enabled: modulesForm.banco_questoes_enabled,
        desempenho_enabled:     modulesForm.desempenho_enabled,
        titulos_enabled:        modulesForm.titulos_enabled,
        suporte_enabled:        modulesForm.suporte_enabled,
        video_lessons_enabled:  modulesForm.video_lessons_enabled,
      };
      const res = await fetch(`/api/admin/b2b/organizations/${modulesModal.org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions,
          allow_multiple_pending_essays: modulesForm.allow_multiple_pending_essays,
          max_video_lessons: modulesForm.max_video_lessons ? Number(modulesForm.max_video_lessons) : null,
        }),
      });
      if (res.ok) {
        toast.success(`Módulos de ${modulesModal.org.name} atualizados.`);
        setModulesModal({ open: false, org: null });
        await fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Erro ao salvar módulos.');
      }
    } catch {
      toast.error('Erro de conexão ao salvar módulos.');
    } finally {
      setSavingModules(false);
    }
  }

  async function handleSaveSettings() {
    if (!orgSettingsModal.org) return;
    setSavingSettings(true);
    try {
      const payload: Record<string, unknown> = {
        name: settingsForm.name,
        slug: settingsForm.slug,
        plan_tier: settingsForm.plan_tier,
        max_students: Number(settingsForm.max_students),
        contact_email: settingsForm.contact_email || null,
        monthly_value: settingsForm.monthly_value ? Number(settingsForm.monthly_value) : null,
        logo_url: settingsForm.logo_url || null,
        brand_primary: settingsForm.brand_primary,
        brand_secondary: settingsForm.brand_secondary,
        brand_accent: settingsForm.brand_accent,
        allow_multiple_pending_essays: settingsForm.allow_multiple_pending_essays,
        billing_enabled: settingsForm.billing_enabled,
        is_active: settingsForm.is_active,
      };
      const res = await fetch(`/api/admin/b2b/organizations/${orgSettingsModal.org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Configurações da instituição salvas.');
        setOrgSettingsModal({ open: false, org: null });
        await fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Erro ao salvar configurações.');
      }
    } catch {
      toast.error('Erro de conexão ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  }

  function openDeleteOrg(org: Org) {
    setDeleteConfirmName('');
    setDeleteOrgModal({ open: true, org });
  }

  async function handleDeleteOrg() {
    if (!deleteOrgModal.org) return;
    setDeletingOrg(true);
    try {
      const res = await fetch(
        `/api/admin/b2b/organizations/${deleteOrgModal.org.id}?confirm_name=${encodeURIComponent(deleteConfirmName)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        toast.success(`${deleteOrgModal.org.name} e todos os dados vinculados foram excluídos.`);
        setDeleteOrgModal({ open: false, org: null });
        setOrgSettingsModal({ open: false, org: null });
        await fetchData();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || 'Erro ao excluir organização.');
      }
    } catch {
      toast.error('Erro de conexão ao excluir organização.');
    } finally {
      setDeletingOrg(false);
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
  // "Parceiros" (KPI) e a lista "ativa" só devem contar orgs reais, ativas
  // e com faturamento habilitado — mesmo critério do backend (_get_real_org_ids).
  const activeOrgs = orgs.filter(o => !o.is_mock && o.is_active !== false && o.billing_enabled);
  const inactiveOrgs = orgs.filter(o => o.is_mock || o.is_active === false || !o.billing_enabled);

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 dark:bg-slate-900/50 min-h-screen font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[22px] p-5 md:p-7"
        style={{
          background: `radial-gradient(120% 140% at 15% 0%, color-mix(in srgb, ${STUDYTRACK_PRIMARY} 45%, #101E45) 0%, color-mix(in srgb, ${STUDYTRACK_PRIMARY} 16%, #060E27) 62%)`,
          boxShadow: `0 20px 48px -20px color-mix(in srgb, ${STUDYTRACK_PRIMARY} 35%, rgba(6,14,39,0.6))`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl opacity-25"
          style={{ background: STUDYTRACK_ACCENT }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen">
          <SmokeBackground smokeColor={STUDYTRACK_PRIMARY} />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-white">Master Control</h1>
            <p className="mt-1 text-white/60">Visão holística B2B — negócio, produto e conteúdo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { href: '/portal/admin/tasks',       icon: ClipboardList, color: 'text-indigo-500',  label: 'Tasks' },
              { href: '/portal/admin/prospeccao',  icon: Target,        color: 'text-violet-500',  label: 'Prospecção' },
              { href: '/portal/admin/reports',     icon: Flag,          color: 'text-amber-500',   label: 'Reports' },
              { href: '/portal/admin/questions',   icon: ListChecks,    color: 'text-emerald-500', label: 'Curadoria' },
              { href: '/portal/admin/github',      icon: Github,        color: 'text-slate-700',   label: 'GitHub' },
            ].map(({ href, icon: Icon, color, label }) => (
              <Link key={href} href={href} prefetch={false} className="group relative inline-block select-none rounded-xl">
                <span
                  className="absolute inset-0 rounded-xl bg-slate-300 transition-transform duration-100 ease-out"
                  style={{ transform: 'translateY(3px)' }}
                />
                <span className="relative flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-transform duration-100 ease-out group-hover:-translate-y-0.5 group-active:translate-y-[3px]">
                  <Icon className={`h-4 w-4 ${color}`} /> {label}
                </span>
              </Link>
            ))}
            <span className="relative inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-sm font-bold text-emerald-700 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Sistema Operacional
            </span>
          </div>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
        {([
          { label: 'Alunos B2B', value: b2bStats?.total_students ?? 0, prev: null,                                 icon: Users,         accentColor: '#2563eb' },
          { label: 'Parceiros',  value: activeOrgs.length,               prev: null,                                 icon: GraduationCap, accentColor: '#4f46e5' },
          { label: 'Ativos',     value: b2bStats?.active_period ?? 0,   prev: b2bStats?.prev_active_period ?? null, icon: Activity,      accentColor: '#059669' },
        ] as const).map(({ label, value, prev, icon: Icon, accentColor }) => {
          const hasPrev = prev !== null && !!STATS_PERIOD_MAP[orgPeriod];
          return (
            <KpiCard
              key={label}
              title={label}
              value={value}
              icon={Icon}
              accentColor={accentColor}
              accentHex={accentColor}
              delta={hasPrev ? value - (prev as number) : null}
              loading={loadingMetrics}
            />
          );
        })}
      </div>

      {/* ── Engajamento ────────────────────────────────────────────────────── */}
      {health && (
        <StickinessCard
          health={health}
          apiUrl={(process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000").replace(/\/$/, "")}
        />
      )}

      {/* ── Tempo de Uso da Plataforma ─────────────────────────────────────── */}
      <UsageTimeCard orgs={activeOrgs.map((o) => ({ id: o.id, name: o.name }))} />

      {/* ── Horários de Pico ───────────────────────────────────────────────── */}
      <PeakHoursCard />

      {/* ── Gestão de Parceiros ────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <button
            onClick={() => setActiveOrgsOpen(v => !v)}
            className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 hover:opacity-80 transition-opacity"
          >
            <GraduationCap className="w-5 h-5 text-indigo-500" /> Parceiros ({activeOrgs.length})
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeOrgsOpen ? 'rotate-180' : ''}`} />
          </button>
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
        {b2bStats && (() => {
          const hasPrev = !!STATS_PERIOD_MAP[orgPeriod];
          return (
            <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 transition-opacity ${loadingMetrics ? 'opacity-40' : 'opacity-100'}`}>
              {([
                { label: 'Questões',  value: b2bStats.questions_period,  prev: b2bStats.prev_questions_period,  icon: BookOpen,       accentColor: '#2563eb' },
                { label: 'Simulados', value: b2bStats.simulados_period,  prev: b2bStats.prev_simulados_period,  icon: ClipboardCheck, accentColor: '#7c3aed' },
                { label: 'Ativos',    value: b2bStats.active_period,     prev: b2bStats.prev_active_period,     icon: Activity,       accentColor: '#059669' },
                { label: 'Redações',  value: b2bStats.essays_period,     prev: b2bStats.prev_essays_period,     icon: PenLine,        accentColor: '#d97706' },
              ] as const).map(({ label, value, prev, icon, accentColor }) => (
                <KpiCard
                  key={label}
                  title={label}
                  value={value.toLocaleString('pt-BR')}
                  icon={icon}
                  accentColor={accentColor}
                  accentHex={accentColor}
                  delta={hasPrev ? value - prev : null}
                />
              ))}
            </div>
          );
        })()}

        {activeOrgsOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOrgs.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                perOrgStats={b2bStats?.per_org?.find(x => x.org_id === org.id)}
                hasPrev={!!STATS_PERIOD_MAP[orgPeriod]}
                loadingMetrics={loadingMetrics}
                onOpenSettings={openOrgSettings}
                onCreateUser={openCreateUser}
              />
            ))}
          </div>
        )}

        {inactiveOrgs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-zinc-700">
            <button
              onClick={() => setInactiveOrgsOpen(v => !v)}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-zinc-500 hover:opacity-80 transition-opacity mb-3"
            >
              <EyeOff className="w-4 h-4" /> Não ativos/DEMO ({inactiveOrgs.length})
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${inactiveOrgsOpen ? 'rotate-180' : ''}`} />
            </button>
            {inactiveOrgsOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-90">
              {inactiveOrgs.map((org) => (
                <OrgCard
                  key={org.id}
                  org={org}
                  perOrgStats={b2bStats?.per_org?.find(x => x.org_id === org.id)}
                  hasPrev={!!STATS_PERIOD_MAP[orgPeriod]}
                  loadingMetrics={loadingMetrics}
                  onOpenSettings={openOrgSettings}
                  onCreateUser={openCreateUser}
                />
              ))}
            </div>
            )}
          </div>
        )}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Por Matéria */}
            <ElevatedCard accentColor="#6366F1">
              <CardHeader className="pb-2 space-y-2">
                <CardTitle className="text-sm font-bold text-slate-500 uppercase">Por Matéria</CardTitle>
                <div className="flex flex-wrap gap-1">
                  {[null, ...(dist.by_bank ?? []).map((b) => b.name)].map((bank) => (
                    <button
                      key={bank ?? 'all'}
                      onClick={() => setDistBankFilter(bank)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                        distBankFilter === bank
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {bank ?? 'Todas'}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-60 overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const rows: DistItem[] =
                    distBankFilter && dist.by_bank_subject?.[distBankFilter]
                      ? dist.by_bank_subject[distBankFilter]
                      : dist.by_subject;
                  const rowTotal = rows.reduce((acc, s) => acc + s.count, 0);
                  return (
                    <div className="space-y-1.5">
                      {rows.map((s) => (
                        <div key={s.name} className="flex items-center gap-2 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{s.name}</span>
                              <span className="text-xs text-slate-400 ml-2 shrink-0">{s.count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full" style={{ width: `${rowTotal > 0 ? (s.count / rowTotal) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </ElevatedCard>

            {/* Dificuldade + Anos */}
            <div className="space-y-4">
              <ElevatedCard accentColor="#8B5CF6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Dificuldade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {dist.by_difficulty.map((d) => (
                      <div key={d.name} className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded text-center border border-slate-100 dark:border-slate-800">
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{d.count}</div>
                        <div className="text-xs text-slate-500 font-bold uppercase mt-1">{d.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </ElevatedCard>

              <ElevatedCard accentColor="#3B82F6" className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-500 uppercase">Top 5 Anos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dist.by_year.slice(0, 5).map((y) => (
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
              </ElevatedCard>
            </div>

            {/* Por Banca */}
            <ElevatedCard accentColor="#0EA5E9">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-500 uppercase">Por Banca</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const banks: DistItem[] = dist.by_bank ?? [];
                  const bankTotal = banks.reduce((acc, b) => acc + b.count, 0);
                  const BANK_COLORS: Record<string, string> = {
                    ENEM: 'bg-blue-500',
                    UFU:  'bg-violet-500',
                    UEG:  'bg-emerald-500',
                  };
                  return (
                    <div className="space-y-4">
                      {/* Stacked bar */}
                      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                        {banks.map((b) => (
                          <div
                            key={b.name}
                            className={`${BANK_COLORS[b.name] ?? 'bg-slate-400'} transition-all`}
                            style={{ width: `${(b.count / bankTotal) * 100}%` }}
                            title={`${b.name}: ${b.count}`}
                          />
                        ))}
                      </div>
                      {/* Legenda */}
                      <div className="space-y-4">
                        {banks.map((b) => {
                          const pct = bankTotal > 0 ? (b.count / bankTotal) * 100 : 0;
                          const pctLabel = pct.toFixed(1);
                          return (
                            <div key={b.name} className="space-y-1.5">
                              <div className="flex justify-between items-baseline">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${BANK_COLORS[b.name] ?? 'bg-slate-400'}`} />
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{pctLabel}%</span>
                                  <span className="text-xs text-slate-400 tabular-nums">({b.count.toLocaleString('pt-BR')})</span>
                                </div>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full ${BANK_COLORS[b.name] ?? 'bg-slate-400'} rounded-full transition-all`} style={{ width: `${pctLabel}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        {bankTotal.toLocaleString('pt-BR')} questões com banca definida
                        {dist.total - bankTotal > 0 && ` · ${dist.total - bankTotal} sem banca`}
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </ElevatedCard>
          </div>
        </div>
      )}

      {/* ── Infra + IA (compacto) ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-[20px] bg-slate-900 text-slate-50 partner-elevated-card partner-elevated-card-hover">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #22D3EE, color-mix(in srgb, #22D3EE 40%, white))' }} />
          <div className="p-6">
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
          </div>
        </div>

        <ElevatedCard accentColor="#9333EA">
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
        </ElevatedCard>

        <AIUsageRecentCard />
      </div>

      {/* ── Modal Configurações da Org ────────────────────────────────────── */}
      {orgSettingsModal.open && orgSettingsModal.org && (() => {
        const org = orgSettingsModal.org;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  {settingsForm.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo_url é uma URL externa arbitrária colada pelo admin, fora dos remotePatterns do next/image
                    <img src={settingsForm.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain border border-slate-100 dark:border-zinc-700 bg-white" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: settingsForm.brand_primary }}>
                      {settingsForm.name[0] ?? '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{org.name}</p>
                    <p className="text-xs text-slate-400">Configurações da Instituição</p>
                  </div>
                </div>
                <button onClick={() => setOrgSettingsModal({ open: false, org: null })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Informações Básicas */}
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Informações Básicas</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Nome</label>
                      <input
                        value={settingsForm.name}
                        onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))}
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Slug</label>
                      <input
                        value={settingsForm.slug}
                        onChange={e => setSettingsForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Plano</label>
                      <select
                        value={settingsForm.plan_tier}
                        onChange={e => setSettingsForm(f => ({ ...f, plan_tier: e.target.value }))}
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
                        value={settingsForm.max_students}
                        onChange={e => setSettingsForm(f => ({ ...f, max_students: Number(e.target.value) }))}
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Email de Contato</label>
                      <input
                        value={settingsForm.contact_email}
                        onChange={e => setSettingsForm(f => ({ ...f, contact_email: e.target.value }))}
                        placeholder="contato@escola.com"
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Mensalidade (R$)</label>
                      <input
                        type="number"
                        value={settingsForm.monthly_value}
                        onChange={e => setSettingsForm(f => ({ ...f, monthly_value: e.target.value }))}
                        placeholder="0"
                        disabled={!settingsForm.billing_enabled}
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-zinc-800"
                      />
                    </div>
                    <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 cursor-pointer">
                        <div
                          onClick={() => setSettingsForm(f => ({ ...f, billing_enabled: !f.billing_enabled }))}
                          className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${settingsForm.billing_enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settingsForm.billing_enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Faturar?</p>
                          <p className="text-[11px] text-slate-400">Quando desativado, a mensalidade não é cobrada e some do card desta instituição.</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 cursor-pointer">
                        <div
                          onClick={() => setSettingsForm(f => ({ ...f, is_active: !f.is_active }))}
                          className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${settingsForm.is_active ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settingsForm.is_active ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cliente Ativo?</p>
                          <p className="text-[11px] text-slate-400">Quando desativado, a instituição sai dos KPIs agregados e passa para a seção &quot;Não ativos/DEMO&quot; abaixo.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Founder */}
                {org.founder && (
                  <section>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Founder</p>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 px-4 py-3">
                      {org.founder.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- avatar_url pode vir de fora do Supabase Storage (ex: provider OAuth), fora dos remotePatterns do next/image
                        <img src={org.founder.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-zinc-600" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {(org.founder.full_name ?? org.founder.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{org.founder.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400 truncate">{org.founder.email ?? '—'}</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Marca */}
                <section>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Marca</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">URL do Logo</label>
                      <input
                        value={settingsForm.logo_url}
                        onChange={e => setSettingsForm(f => ({ ...f, logo_url: e.target.value }))}
                        placeholder="https://..."
                        className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Cores da Marca</label>
                      <div className="flex gap-3">
                        {([
                          ['brand_primary',   'Primária'  ] as const,
                          ['brand_secondary', 'Secundária'] as const,
                          ['brand_accent',    'Acento'    ] as const,
                        ]).map(([key, label]) => (
                          <div key={key} className="flex-1">
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">{label}</label>
                            <div className="relative">
                              <input
                                type="color"
                                value={settingsForm[key]}
                                onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.value }))}
                                className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 cursor-pointer"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 text-center font-mono">{settingsForm[key]}</p>
                          </div>
                        ))}
                      </div>
                      {/* Color preview strip */}
                      <div className="mt-2 h-3 rounded-full overflow-hidden flex gap-0.5">
                        <div className="flex-1 rounded-l-full" style={{ backgroundColor: settingsForm.brand_primary }} />
                        <div className="flex-1" style={{ backgroundColor: settingsForm.brand_secondary }} />
                        <div className="flex-1 rounded-r-full" style={{ backgroundColor: settingsForm.brand_accent }} />
                      </div>
                    </div>
                  </div>
                </section>

              </div>

              {/* Configurar Módulos */}
              <div className="px-6 pb-2">
                <button
                  onClick={() => { setOrgSettingsModal({ open: false, org: null }); openModules(org); }}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Puzzle className="w-5 h-5 text-indigo-500 shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Configurar Módulos</p>
                      <p className="text-xs text-indigo-500/70 dark:text-indigo-400/60">Habilitar ou desabilitar funcionalidades para esta instituição</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>

              {/* Zona de perigo */}
              <div className="px-6 pb-2">
                <button
                  onClick={() => openDeleteOrg(org)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-red-700 dark:text-red-300">Excluir organização</p>
                      <p className="text-xs text-red-500/70 dark:text-red-400/60">Remove a instituição e todos os dados vinculados — ação irreversível</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setOrgSettingsModal({ open: false, org: null })}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings || !settingsForm.name.trim() || !settingsForm.slug.trim()}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Criar Usuário Manualmente ─────────────────────────────────── */}
      {createUserModal.open && createUserModal.org && (() => {
        const org = createUserModal.org;
        const isFounder = createUserForm.role === 'founder';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Criar usuário</p>
                    <p className="text-xs text-slate-400">Vinculado a {org.name}</p>
                  </div>
                </div>
                <button onClick={() => setCreateUserModal({ open: false, org: null })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Tipo de conta */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Tipo de conta</label>
                  <select
                    value={createUserForm.role}
                    onChange={e => setCreateUserForm(f => ({ ...f, role: e.target.value as 'student' | 'founder' }))}
                    className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                  >
                    <option value="student">Aluno</option>
                    <option value="founder">Gestor (founder)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Nome completo</label>
                  <input
                    value={createUserForm.full_name}
                    onChange={e => setCreateUserForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder={isFounder ? 'Ex: Gestor da instituição' : 'Ex: Aluno de teste'}
                    className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value.trim() }))}
                    placeholder="usuario@email.com"
                    className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={createUserShowPassword ? 'text' : 'password'}
                      value={createUserForm.password}
                      onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-3 pr-9 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCreateUserShowPassword(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                    >
                      {createUserShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  A conta já sai vinculada a <strong>{org.name}</strong> (
                  {isFounder ? 'papel: gestor/founder' : 'papel: aluno'}), com e-mail confirmado — pronta pra login imediato.
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setCreateUserModal({ open: false, org: null })}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={
                    creatingUser ||
                    !createUserForm.full_name.trim() ||
                    !createUserForm.email.trim() ||
                    createUserForm.password.length < 8
                  }
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  {creatingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {creatingUser ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Excluir Organização ────────────────────────────────────── */}
      {deleteOrgModal.open && deleteOrgModal.org && (() => {
        const dOrg = deleteOrgModal.org;
        const confirmed = deleteConfirmName.trim() === dOrg.name;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-zinc-900">
              <div className="flex items-start gap-3 px-6 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900 dark:text-white">Excluir {dOrg.name}?</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Isso apaga a organização e <strong>todos</strong> os dados vinculados no banco — alunos, respostas, redações,
                    histórico de WhatsApp, gamificação, planos e leads. Não pode ser desfeito.
                  </p>
                </div>
              </div>

              <div className="px-6 pt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Digite <span className="font-mono text-red-600 dark:text-red-400">{dOrg.name}</span> para confirmar
                </label>
                <input
                  autoFocus
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-red-400"
                  placeholder={dOrg.name}
                />
              </div>

              <div className="flex justify-end gap-2 px-6 py-5">
                <button
                  onClick={() => setDeleteOrgModal({ open: false, org: null })}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteOrg}
                  disabled={!confirmed || deletingOrg}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingOrg ? 'Excluindo...' : 'Excluir definitivamente'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal Módulos ────────────────────────────────────────────────── */}
      {modulesModal.open && modulesModal.org && (() => {
        const mOrg = modulesModal.org;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Puzzle className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{mOrg.name}</p>
                    <p className="text-xs text-slate-400">Configuração de Módulos</p>
                  </div>
                </div>
                <button onClick={() => setModulesModal({ open: false, org: null })} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Módulos desativados ficam invisíveis na sidebar e inacessíveis por URL para alunos e gestores desta instituição.
                </p>

                {MODULE_DEFS.map((mod) => {
                  const enabled = modulesForm[mod.key as keyof typeof modulesForm] as boolean;
                  const toggle = () => setModulesForm(f => ({ ...f, [mod.key]: !f[mod.key as keyof typeof f] }));
                  const Icon = mod.icon;
                  const badge = (
                    <span className="flex gap-1">
                      {mod.affectsFounder && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">Gestor</span>}
                      {mod.affectsStudent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400">Aluno</span>}
                    </span>
                  );
                  return (
                    <div key={mod.key} className={`rounded-xl border transition-colors ${enabled ? 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50' : 'border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 opacity-70'}`}>
                      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                        <Icon className={`w-4 h-4 shrink-0 ${enabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{mod.label}</p>
                            {badge}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                        </div>
                        {/* Toggle */}
                        <div
                          onClick={toggle}
                          className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </label>

                      {/* Sub-configs (visíveis apenas quando o módulo está ativo) */}
                      {enabled && mod.subConfig === 'max_video_lessons' && (
                        <div className="px-4 pb-3 border-t border-slate-100 dark:border-zinc-700 pt-3 ml-7">
                          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                            Limite de videoaulas (Bunny) — deixe vazio para ilimitado
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={modulesForm.max_video_lessons}
                            onChange={e => setModulesForm(f => ({ ...f, max_video_lessons: e.target.value }))}
                            placeholder="Ex: 200"
                            className="h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
                          />
                        </div>
                      )}

                      {enabled && mod.subConfig === 'allow_multiple_pending_essays' && (
                        <div className="px-4 pb-3 border-t border-slate-100 dark:border-zinc-700 pt-3 ml-7">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div
                              onClick={() => setModulesForm(f => ({ ...f, allow_multiple_pending_essays: !f.allow_multiple_pending_essays }))}
                              className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer shrink-0 ${modulesForm.allow_multiple_pending_essays ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                            >
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${modulesForm.allow_multiple_pending_essays ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Múltiplas redações pendentes</p>
                              <p className="text-[11px] text-slate-400">Alunos podem enviar novas sem aguardar correção.</p>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  onClick={() => setModulesModal({ open: false, org: null })}
                  className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveModules}
                  disabled={savingModules}
                  className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  {savingModules ? 'Salvando...' : 'Salvar Módulos'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
