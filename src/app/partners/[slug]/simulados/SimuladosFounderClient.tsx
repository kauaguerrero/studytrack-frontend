'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus, ChevronDown, Trophy, Users, BarChart2,
  CalendarDays, Pencil, Trash2, Play, Timer, BookOpen, X, SlidersHorizontal,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface SimuladoConfig {
  format: string;
  bank: string;
  subject: string | null;
  difficulty: string;
  qty: number;
  time_limit_secs: number | null;
  weights?: Record<string, number> | null;
  allow_retry?: boolean;
  ueg_weight_group?: 'I' | 'II' | 'III' | null;
  instructions?: string | null;
}

interface ScheduledSimulado {
  id: string;
  title: string;
  config: SimuladoConfig;
  starts_at: string;
  ends_at: string | null;
  status: 'scheduled' | 'active' | 'ended';
  created_at: string;
  metrics: {
    total_sessions: number;
    completed_sessions: number;
    unique_students: number;
    avg_score_pct: number | null;
    best_score_pct: number | null;
    worst_score_pct: number | null;
  };
}

interface RankingEntry {
  position: number;
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  total_questions: number;
  score_pct: number;
  estimated_note?: number | null;
  weighted_applied?: boolean;
  weighted_mode?: string | null;
  time_taken_secs: number | null;
  tri_score: number | null;
}

interface QuestionDistributionItem {
  question_id: string;
  position: number;
  subject: string | null;
  discipline: string | null;
  difficulty?: string | null;
  context: string | null;
  statement: string | null;
  alternatives: Array<{ letter?: string; label?: string; text?: string; image?: string | null; file?: string | null }>;
  images: Array<string | { url?: string; src?: string; file?: string }>;
  correct_option: string | null;
  attempts: number;
  correct_count: number;
  omitted_count: number;
  omission_pct: number;
  avg_time_secs?: number | null;
  accuracy_pct: number;
  option_distribution: Record<string, number>;
}

interface StudentAnalyticsItem {
  position: number;
  student_id: string;
  full_name: string | null;
  avatar_url: string | null;
  score: number;
  total_questions: number;
  score_pct: number;
  raw_score_pct?: number;
  weighted_score_pct?: number | null;
  time_taken_secs: number | null;
  completed_at: string | null;
}

interface SimuladoAnalytics {
  weighted_applied?: boolean;
  kpis: {
    participants: number;
    sessions_total: number;
    completion_rate_pct: number;
    avg_score_pct: number;
    median_score_pct: number;
    best_score_pct: number;
    worst_score_pct: number;
  };
  question_distribution: QuestionDistributionItem[];
  students: StudentAnalyticsItem[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const BANK_LABELS: Record<string, string> = {
  ENEM: 'ENEM', UFU: 'UFU', UEG: 'UEG', Todas: 'Todas as bancas',
};
const DIFFICULTY_LABELS: Record<string, string> = {
  facil: 'Fácil', medio: 'Médio', dificil: 'Difícil', misto: 'Misto',
};
const FORMAT_LABELS: Record<string, string> = {
  custom: 'Personalizado', linguagens: 'Linguagens', humanas: 'Humanas',
  natureza: 'Ciências da Natureza', matematica: 'Matemática',
  dia1: 'Dia 1 ENEM', dia2: 'Dia 2 ENEM', completo: 'Completo',
};

// Formatos disponíveis por banca
const FORMATS_BY_BANK: Record<string, string[]> = {
  ENEM:  ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'dia1', 'dia2', 'completo'],
  UFU:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  UEG:   ['custom', 'linguagens', 'humanas', 'natureza', 'matematica', 'completo'],
  Todas: ['custom'],
};

// Quantidade fixa de questões por banca/formato (espelha o backend)
const BLOCK_QTY: Record<string, Record<string, number>> = {
  ENEM: { linguagens: 45, humanas: 45, natureza: 45, matematica: 45, dia1: 90, dia2: 90, completo: 180 },
  UFU:  { linguagens: 20, humanas: 20, natureza: 15, matematica: 10, completo: 65 },
  UEG:  { linguagens: 13, humanas: 13, natureza: 13, matematica: 13, completo: 52 },
};

const COMPLETE_DISTRIBUTION_HINTS: Record<string, string[]> = {
  UFU: [
    'Português 10, Literatura 5, Língua Estrangeira 5',
    'Matemática 10',
    'Biologia 5, Física 5, Química 5',
    'Geografia 5, História 5, Filosofia 5, Sociologia 5',
    'Total 65 questões objetivas',
  ],
  UEG: [
    'Linguagens 13 (Português, Literatura, Língua Estrangeira, Artes, Ed. Física e TIC)',
    'Matemática 13',
    'Natureza 13 (Biologia, Física e Química)',
    'Humanas 13 (História, Geografia, Filosofia e Sociologia)',
    'Total 52 questões objetivas',
  ],
};

function resolveQty(bank: string, format: string): number | null {
  return BLOCK_QTY[bank]?.[format] ?? null; // null = custom, qty editável
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function pctToPoints(pct: number): number {
  return Number((pct * 10).toFixed(1));
}

function pctToUegPoints(pct: number): number {
  return Number(((pct / 100) * 130).toFixed(1));
}

function StatusBadge({ status }: { status: ScheduledSimulado['status'] }) {
  const map = {
    scheduled: { label: 'Agendado', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
    active:    { label: 'Ativo',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
    ended:     { label: 'Encerrado', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  };
  const { label, cls } = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

// ── Formulário de criação/edição ─────────────────────────────────────────────
const EMPTY_FORM = {
  title: '',
  bank: 'ENEM',
  format: 'custom',
  subject: '',
  difficulty: 'misto',
  qty: 10,
  time_limit_secs: '',
  starts_at: '',
  ends_at: '',
  weights: {} as Record<string, number>,
  allow_retry: true,
  ueg_weight_group: null as 'I' | 'II' | 'III' | null,
  instructions: '',
};

const UEG_GROUP_PRESETS: Record<'I' | 'II' | 'III', Record<string, number>> = {
  I: { Linguagens: 2.5, Matemática: 4, Natureza: 2.5, Humanas: 1 },
  II: { Linguagens: 3, Matemática: 3, Natureza: 3, Humanas: 1 },
  III: { Linguagens: 4, Matemática: 2, Natureza: 1, Humanas: 3 },
};

const UEG_GROUP_COURSES: Record<'I' | 'II' | 'III', string> = {
  I: 'Engenharia Agrícola, Engenharia Civil, Química Industrial',
  II: 'Agronomia, Biomedicina, Ciências Biológicas, Educação Física, Farmácia, Fisioterapia, Medicina Veterinária, Zootecnia',
  III: 'Arquitetura e Urbanismo e demais cursos do grupo III no edital',
};

const WEIGHT_KEYS_BY_BANK: Record<string, string[]> = {
  ENEM: ['Linguagens', 'Humanas', 'Natureza', 'Matemática'],
  UFU: [
    'Língua Portuguesa', 'Literatura', 'Língua Estrangeira', 'Matemática',
    'Biologia', 'Física', 'Química', 'Geografia', 'História', 'Filosofia', 'Sociologia',
  ],
  UEG: ['Linguagens', 'Matemática', 'Natureza', 'Humanas'],
  Todas: [],
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function SimuladosFounderClient({ slug }: { slug: string }) {
  const { org } = useOrg();
  const [simulados, setSimulados] = useState<ScheduledSimulado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showReviewApproval, setShowReviewApproval] = useState(false);
  const [saveProgressLabel, setSaveProgressLabel] = useState('');
  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Record<string, RankingEntry[]>>({});
  const [loadingRanking, setLoadingRanking] = useState<string | null>(null);
  const [rankingMeta, setRankingMeta] = useState<Record<string, { weighted_ranking?: boolean }>>({});
  const [expandedAnalytics, setExpandedAnalytics] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, SimuladoAnalytics>>({});
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionDistributionItem | null>(null);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return fetch(`${api}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers ?? {}),
      },
    });
  }

  async function loadSimulados() {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados`);
      if (!res.ok) {
        toast.error('Não foi possível carregar os simulados');
        return;
      }
      const data = await res.json();
      setSimulados(data.scheduled_simulados ?? []);
    } catch {
      toast.error('Erro ao buscar simulados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSimulados(); }, [slug]);

  async function loadRanking(simId: string) {
    if (rankings[simId]) {
      const next = expandedRanking === simId ? null : simId;
      setExpandedRanking(next);
      if (next) setExpandedAnalytics(null);
      return;
    }
    setLoadingRanking(simId);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${simId}/ranking`);
      if (!res.ok) return;
      const data = await res.json();
      setRankings((prev) => ({ ...prev, [simId]: data.ranking ?? [] }));
      setRankingMeta((prev) => ({ ...prev, [simId]: { weighted_ranking: Boolean(data.weighted_ranking) } }));
      setExpandedRanking(simId);
      setExpandedAnalytics(null);
    } finally {
      setLoadingRanking(null);
    }
  }

  async function loadAnalytics(simId: string) {
    if (analyticsMap[simId]) {
      const next = expandedAnalytics === simId ? null : simId;
      setExpandedAnalytics(next);
      if (next) setExpandedRanking(null);
      return;
    }
    setLoadingAnalytics(simId);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${simId}/analytics`);
      if (!res.ok) return;
      const data = await res.json();
      setAnalyticsMap((prev) => ({ ...prev, [simId]: data }));
      setExpandedAnalytics(simId);
      setExpandedRanking(null);
    } finally {
      setLoadingAnalytics(null);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.starts_at) {
      toast.error('Título e data de início são obrigatórios');
      return;
    }
    setSaving(true);
    setSaveProgressLabel('Validando configuração...');
    try {
      setSaveProgressLabel('Salvando simulado...');
      const config: SimuladoConfig = {
        format: form.format,
        bank: form.bank,
        subject: form.subject || null,
        difficulty: form.difficulty,
        qty: Number(form.qty),
        time_limit_secs: form.time_limit_secs ? Number(form.time_limit_secs) * 60 : null,
        weights: Object.keys(form.weights || {}).length > 0
          ? Object.fromEntries(
              Object.entries(form.weights).filter(([, v]) => Number(v) > 0)
            )
          : null,
        allow_retry: form.allow_retry,
        ueg_weight_group: form.bank === 'UEG' ? (form.ueg_weight_group ?? null) : null,
        instructions: form.instructions?.trim() ? form.instructions.trim() : null,
      };

      const body = {
        title: form.title,
        config,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };

      const url = editingId
        ? `/api/partners/${slug}/scheduled-simulados/${editingId}`
        : `/api/partners/${slug}/scheduled-simulados`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetchWithAuth(url, { method, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? 'Erro ao salvar'); return; }

      toast.success(editingId ? 'Simulado atualizado' : 'Simulado criado');
      setSaveProgressLabel('Concluído.');
      const createdOrUpdated = json?.scheduled_simulado;
      if (createdOrUpdated) {
        const next: ScheduledSimulado = {
          ...createdOrUpdated,
          metrics: createdOrUpdated.metrics ?? {
            total_sessions: 0,
            completed_sessions: 0,
            unique_students: 0,
            avg_score_pct: null,
            best_score_pct: null,
            worst_score_pct: null,
          },
        };
        setSimulados((prev) => {
          const idx = prev.findIndex((s) => s.id === next.id);
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = { ...clone[idx], ...next };
            return clone;
          }
          return [next, ...prev];
        });
      }
      setShowForm(false);
      setShowReviewApproval(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadSimulados();
    } finally {
      setSaving(false);
      setSaveProgressLabel('');
    }
  }

  async function handleDelete(sim: ScheduledSimulado) {
    setDeleting(true);
    try {
      const force = sim.status === 'ended';
      const res = await fetchWithAuth(
        `/api/partners/${slug}/scheduled-simulados/${sim.id}${force ? '?force=true' : ''}`,
        { method: 'DELETE' }
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(
          json.action === 'ended'
            ? 'Simulado encerrado'
            : json.action === 'deleted_forced'
              ? 'Simulado excluído permanentemente'
              : 'Simulado excluído'
        );
        setConfirmDeleteId(null);
        await loadSimulados();
      } else {
        toast.error(json.error ?? 'Erro ao excluir');
      }
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(sim: ScheduledSimulado) {
    setEditingId(sim.id);
      setForm({
      title: sim.title,
      bank: sim.config.bank,
      format: sim.config.format,
      subject: sim.config.subject ?? '',
      difficulty: sim.config.difficulty,
      qty: sim.config.qty,
        time_limit_secs: sim.config.time_limit_secs ? String(sim.config.time_limit_secs / 60) : '',
        starts_at: sim.starts_at.slice(0, 16),
        ends_at: sim.ends_at ? sim.ends_at.slice(0, 16) : '',
        weights: sim.config.weights ?? {},
        allow_retry: sim.config.allow_retry ?? true,
        ueg_weight_group: (sim.config.ueg_weight_group as 'I' | 'II' | 'III' | null) ?? null,
        instructions: sim.config.instructions ?? '',
      });
      setShowForm(true);
  }

  const inputCls = 'h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';
  const kpiCard = 'rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5';

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="edificar-page-frame space-y-6 p-3 md:p-4">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Simulados da Turma</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Agende e acompanhe simulados para seus alunos.
              </p>
            </div>
            {!showForm && (
              <button
                type="button"
                onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Plus className="h-4 w-4" />
                Novo Simulado
              </button>
            )}
          </div>

          {/* Formulário */}
          {showForm && (
            <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-[2px]">
              <div className="h-full w-full md:flex md:items-center md:justify-center md:p-6">
                <div className="h-full w-full bg-white dark:bg-slate-950 md:h-[92vh] md:max-w-5xl md:rounded-3xl md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-2xl overflow-hidden flex flex-col">
                  <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-5 py-4 md:px-6 md:py-5 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>
                        {editingId ? 'Editar simulado' : 'Novo simulado'}
                      </p>
                      <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Configuração do Simulado</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Defina banca, formato, período e regras da turma.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 space-y-4">

              {/* Título */}
              <div>
                <label className={labelCls}>Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Simulado de Linguagens — Semana 3"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Banca */}
                <div>
                  <label className={labelCls}>Banca</label>
                  <select
                    value={form.bank}
                    onChange={(e) => {
                      const bank = e.target.value;
                      const formats = FORMATS_BY_BANK[bank] ?? ['custom'];
                      const fmt = formats.includes(form.format) ? form.format : 'custom';
                      const fixed = resolveQty(bank, fmt);
                      setForm((f) => ({ ...f, bank, format: fmt, qty: fixed ?? f.qty }));
                    }}
                    className={inputCls}
                  >
                    {Object.entries(BANK_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className={labelCls}>Formato</label>
                  <select
                    value={form.format}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      const fixed = resolveQty(form.bank, fmt);
                      setForm((f) => ({ ...f, format: fmt, qty: fixed ?? f.qty }));
                    }}
                    className={inputCls}
                  >
                    {(FORMATS_BY_BANK[form.bank] ?? ['custom']).map((k) => (
                      <option key={k} value={k}>{FORMAT_LABELS[k]}</option>
                    ))}
                  </select>
                </div>

                {/* Dificuldade */}
                <div>
                  <label className={labelCls}>Dificuldade</label>
                  <select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Quantidade — bloqueada para formatos com qty fixa */}
                <div>
                  <label className={labelCls}>
                    Questões
                    {resolveQty(form.bank, form.format) !== null && (
                      <span className="ml-1 normal-case font-normal text-slate-400">(fixo pela banca)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={5} max={180}
                    value={form.qty}
                    readOnly={resolveQty(form.bank, form.format) !== null}
                    onChange={(e) => {
                      if (resolveQty(form.bank, form.format) !== null) return;
                      setForm((f) => ({ ...f, qty: Number(e.target.value) }));
                    }}
                    className={`${inputCls} ${resolveQty(form.bank, form.format) !== null ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeightsModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Definir Pesos (Opcional)
                </button>
                {Object.keys(form.weights || {}).length > 0 && (
                  <p className="text-xs text-slate-500">
                    {Object.keys(form.weights).length} peso(s) definido(s)
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Permitir refazer simulado</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Quando desativado, o aluno só poderá concluir este simulado uma vez.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(form.allow_retry)}
                    onClick={() => setForm((f) => ({ ...f, allow_retry: !f.allow_retry }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.allow_retry ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.allow_retry ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Instruções do Simulado (Opcional)</label>
                <textarea
                  value={form.instructions ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder="Ex: Foque em gestão de tempo. Pule questões longas e retorne no final."
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Matéria — só para custom */}
                {form.format === 'custom' && (
                  <div>
                    <label className={labelCls}>Matéria (opcional)</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Ex: Matemática"
                      className={inputCls}
                    />
                  </div>
                )}

                {/* Tempo limite */}
                <div>
                  <label className={labelCls}>Tempo limite (min, opcional)</label>
                  <input
                    type="number"
                    min={5}
                    value={form.time_limit_secs}
                    onChange={(e) => setForm((f) => ({ ...f, time_limit_secs: e.target.value }))}
                    placeholder="Ex: 90"
                    className={inputCls}
                  />
                </div>

                {/* Início */}
                <div>
                  <label className={labelCls}>Início</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>

                {/* Fim */}
                <div>
                  <label className={labelCls}>Fim (opcional)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {form.format === 'completo' && COMPLETE_DISTRIBUTION_HINTS[form.bank] && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Distribuição estimada do completo ({form.bank})
                  </p>
                  <div className="mt-2 space-y-1">
                    {COMPLETE_DISTRIBUTION_HINTS[form.bank].map((line) => (
                      <p key={line} className="text-xs text-slate-600 dark:text-slate-300">
                        • {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowReviewApproval(true)}
                  disabled={saving}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {editingId ? 'Revisar e salvar' : 'Revisar e criar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              </div>
              {saving && (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 pt-1">
                  {saveProgressLabel || 'Processando...'}
                </p>
              )}
                  </div>

                  <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 py-3 md:px-6 bg-slate-50/80 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Fluxo com revisão e aprovação antes de publicar.</span>
                      <span>{form.bank} · {FORMAT_LABELS[form.format] ?? form.format}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de simulados */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((k) => (
                <div key={k} className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
          ) : simulados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum simulado agendado ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {simulados.map((sim) => (
                <div
                  key={sim.id}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    sim.status === 'active'
                      ? 'border-emerald-300/60 dark:border-emerald-500/30'
                      : sim.status === 'ended'
                        ? 'border-slate-200 dark:border-slate-800 opacity-70'
                        : 'border-slate-200 dark:border-slate-700'
                  } bg-white dark:bg-slate-900`}
                >
                  <div className="p-5">
                    {/* Header do card */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={sim.status} />
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            {sim.title}
                          </h2>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {BANK_LABELS[sim.config.bank] ?? sim.config.bank} ·{' '}
                            {sim.config.qty}q · {DIFFICULTY_LABELS[sim.config.difficulty] ?? sim.config.difficulty}
                          </span>
                          {sim.config.format !== 'custom' && (
                            <span>{FORMAT_LABELS[sim.config.format] ?? sim.config.format}</span>
                          )}
                          {sim.config.subject && <span>{sim.config.subject}</span>}
                          {sim.config.time_limit_secs && (
                            <span className="flex items-center gap-1">
                              <Timer className="h-3.5 w-3.5" />
                              {formatDuration(sim.config.time_limit_secs)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            Início: {formatDateTime(sim.starts_at)}
                          </span>
                          {sim.ends_at && (
                            <span>Fim: {formatDateTime(sim.ends_at)}</span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {confirmDeleteId === sim.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {sim.metrics.completed_sessions > 0 ? 'Encerrar?' : 'Excluir?'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(sim)}
                              disabled={deleting}
                              className="rounded-lg px-2.5 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {deleting ? '...' : 'Sim'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={deleting}
                              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(sim)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(sim.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'Participantes', value: sim.metrics.unique_students, icon: Users },
                        { label: 'Sessões', value: sim.metrics.total_sessions, icon: Play },
                        { label: 'Média de acerto', value: sim.metrics.avg_score_pct != null ? `${sim.metrics.avg_score_pct}%` : '—', icon: BarChart2 },
                        { label: 'Melhor resultado', value: sim.metrics.best_score_pct != null ? `${sim.metrics.best_score_pct}%` : '—', icon: Trophy },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="h-3.5 w-3.5 text-slate-400" />
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
                          </div>
                          <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Botão de ranking */}
                    {sim.metrics.completed_sessions > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => loadRanking(sim.id)}
                          className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            Ranking da turma
                            {loadingRanking === sim.id && (
                              <span className="text-xs text-slate-400 animate-pulse">Carregando...</span>
                            )}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-200"
                            style={{ transform: expandedRanking === sim.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadAnalytics(sim.id)}
                          className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <BarChart2 className="h-4 w-4" />
                            Análise Detalhada
                            {loadingAnalytics === sim.id && (
                              <span className="text-xs text-slate-400 animate-pulse">Carregando...</span>
                            )}
                          </div>
                          <ChevronDown
                            className="h-4 w-4 transition-transform duration-200"
                            style={{ transform: expandedAnalytics === sim.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ranking expandido */}
                  {expandedRanking === sim.id && rankings[sim.id] && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
                      {rankingMeta[sim.id]?.weighted_ranking && (
                        <div className="px-5 py-2 text-xs font-semibold text-amber-600 dark:text-amber-300 border-b border-slate-100 dark:border-slate-800">
                          Ranking ordenado por nota estimada (pesos aplicados)
                        </div>
                      )}
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rankings[sim.id].map((entry) => (
                          <div key={entry.student_id} className="flex items-center gap-3 px-5 py-3">
                            <span className={`w-6 shrink-0 text-sm font-black tabular-nums ${
                              entry.position === 1 ? 'text-amber-500'
                                : entry.position === 2 ? 'text-slate-400'
                                  : entry.position === 3 ? 'text-amber-700'
                                    : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              #{entry.position}
                            </span>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                              {(entry.full_name ?? 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {entry.full_name ?? 'Aluno'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {entry.score}/{entry.total_questions} questões
                                {entry.time_taken_secs && ` · ${formatDuration(entry.time_taken_secs)}`}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {entry.estimated_note != null && (
                                <p className="text-[11px] font-bold text-[var(--brand-primary)]">
                                  Nota estimada {entry.estimated_note}
                                </p>
                              )}
                              <p
                                className="text-base font-extrabold tabular-nums"
                                style={{
                                  color: entry.score_pct >= 60 ? 'var(--brand-primary)' : '#ef4444',
                                }}
                              >
                                {entry.score_pct}%
                              </p>
                              {sim.config.bank === 'ENEM' && entry.tri_score && (
                                <p className="text-[10px] text-slate-400">TRI {entry.tri_score}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expandedAnalytics === sim.id && analyticsMap[sim.id] && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-5 space-y-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">KPIs da turma</p>
                        {analyticsMap[sim.id].weighted_applied && (
                          <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                            Pesos aplicados na pontuação!
                          </p>
                        )}
                        {(() => {
                          const k = analyticsMap[sim.id].kpis;
                          const weighted = Boolean(analyticsMap[sim.id].weighted_applied);
                          const isUegWeighted = weighted && sim.config.bank === 'UEG';
                          const scoreLabel = weighted ? (isUegWeighted ? 'Nota Objetiva' : 'Nota Estimada') : 'Acerto';
                          const students = analyticsMap[sim.id].students ?? [];
                          const avgTimeSecs = students.length
                            ? Math.round(
                                students
                                  .map((s) => s.time_taken_secs || 0)
                                  .reduce((sum, v) => sum + v, 0) / students.length
                              )
                            : 0;
                          const bySubject = new Map<string, { correct: number; total: number }>();
                          for (const q of analyticsMap[sim.id].question_distribution ?? []) {
                            const key = (q.subject || q.discipline || 'Geral').trim();
                            const prev = bySubject.get(key) || { correct: 0, total: 0 };
                            prev.correct += Number(q.correct_count || 0);
                            prev.total += Number(q.attempts || 0);
                            bySubject.set(key, prev);
                          }
                          const subjectRates = Array.from(bySubject.entries())
                            .map(([name, v]) => ({
                              name,
                              pct: v.total > 0 ? Number(((v.correct / v.total) * 100).toFixed(1)) : 0,
                            }))
                            .sort((a, b) => a.pct - b.pct);
                          const lowest = subjectRates[0] || null;
                          const highest = subjectRates[subjectRates.length - 1] || null;
                          const formatScore = (pct: number) => {
                            if (!weighted) return `${pct}%`;
                            if (isUegWeighted) return `${pctToUegPoints(pct)}/130`;
                            return `${pctToPoints(pct)} pts`;
                          };
                          return (
                        <div className="mt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                          {[
                            { label: 'Participantes', value: analyticsMap[sim.id].kpis.participants },
                            { label: 'Conclusão', value: `${analyticsMap[sim.id].kpis.completion_rate_pct}%` },
                            { label: `Média (${scoreLabel})`, value: formatScore(k.avg_score_pct) },
                            { label: 'Tempo médio da turma', value: avgTimeSecs > 0 ? formatDuration(avgTimeSecs) : '—' },
                            { label: `Melhor (${scoreLabel})`, value: formatScore(k.best_score_pct) },
                          ].map((item) => (
                            <div key={item.label} className={kpiCard}>
                              <p className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                              <p className="text-lg font-extrabold text-slate-900 dark:text-white">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm">
                            <span className="font-semibold text-red-700 dark:text-red-300">Ponto de atenção:</span>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100">{lowest ? `${lowest.name} (${lowest.pct}%)` : '—'}</span>
                          </div>
                          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">Melhor desempenho:</span>{' '}
                            <span className="font-bold text-slate-900 dark:text-slate-100">{highest ? `${highest.name} (${highest.pct}%)` : '—'}</span>
                          </div>
                        </div>
                        </div>
                          );
                        })()}
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Distribuição de acertos por questão</p>
                        <div className="mt-2 space-y-2">
                          {[...analyticsMap[sim.id].question_distribution]
                            .sort((a, b) => {
                              if (b.accuracy_pct !== a.accuracy_pct) return b.accuracy_pct - a.accuracy_pct;
                              return a.position - b.position;
                            })
                            .map((q) => (
                            <button
                              key={q.question_id}
                              type="button"
                              onClick={() => setSelectedQuestion(q)}
                              className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-[var(--brand-primary)] transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  Q{q.position} · {q.subject ?? 'Geral'}
                                </p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{q.accuracy_pct}%</p>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full ${q.accuracy_pct < 30 ? 'bg-red-500' : q.accuracy_pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.max(2, q.accuracy_pct)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Tentativas: {q.attempts} · Tempo médio: {q.avg_time_secs ? formatDuration(q.avg_time_secs) : '—'} · Dificuldade: {q.difficulty ?? '—'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Desempenho detalhado por aluno</p>
                        <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500">
                              <tr>
                                <th className="px-3 py-2 text-left">#</th>
                                <th className="px-3 py-2 text-left">Aluno</th>
                                <th className="px-3 py-2 text-left">
                                  {analyticsMap[sim.id].weighted_applied ? 'Acerto (Ponderado)' : 'Acerto'}
                                </th>
                                {analyticsMap[sim.id].weighted_applied && (
                                  <th className="px-3 py-2 text-left">Pontuação Ponderada (pts)</th>
                                )}
                                <th className="px-3 py-2 text-left">Score</th>
                                <th className="px-3 py-2 text-left">Tempo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analyticsMap[sim.id].students.map((s) => (
                                <tr key={s.student_id} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="px-3 py-2 font-bold text-slate-600">#{s.position}</td>
                                  <td className="px-3 py-2 text-slate-800 dark:text-slate-100">{s.full_name ?? 'Aluno'}</td>
                                  <td className="px-3 py-2 font-semibold">
                                    {s.score_pct}%
                                    {analyticsMap[sim.id].weighted_applied && s.raw_score_pct != null && (
                                      <span className="ml-1 text-xs font-normal text-slate-500">(bruto {pctToPoints(s.raw_score_pct)} pts)</span>
                                    )}
                                  </td>
                                  {analyticsMap[sim.id].weighted_applied && (
                                    <td className="px-3 py-2 font-semibold text-[var(--brand-primary)]">
                                      {pctToPoints(s.weighted_score_pct ?? s.score_pct)} pts
                                    </td>
                                  )}
                                  <td className="px-3 py-2">{s.score}/{s.total_questions}</td>
                                  <td className="px-3 py-2">{s.time_taken_secs ? formatDuration(s.time_taken_secs) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedQuestion && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Questão {selectedQuestion.position}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedQuestion.subject ?? 'Geral'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(88vh-80px)] p-5">
              <div>
                <div className="space-y-2">
                  <QuestionRichText
                    text={selectedQuestion.context || selectedQuestion.statement || 'Enunciado indisponível.'}
                    className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words"
                  />
                  {Array.isArray(selectedQuestion.images) && selectedQuestion.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedQuestion.images.map((img, idx) => {
                        const src = typeof img === 'string'
                          ? img
                          : (img?.url || img?.src || img?.file || '');
                        if (!src) return null;
                        return (
                          <img
                            key={`${src}-${idx}`}
                            src={src}
                            alt={`Imagem da questão ${selectedQuestion.position} #${idx + 1}`}
                            className="w-full max-h-[45vh] rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                          />
                        );
                      })}
                    </div>
                  )}
                  {Array.isArray(selectedQuestion.alternatives) && selectedQuestion.alternatives.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {selectedQuestion.alternatives.map((alt, idx) => {
                        const letter = alt.letter || alt.label || String.fromCharCode(65 + idx);
                        const imageSrc = alt.image || alt.file || null;
                        return (
                          <div key={`${letter}-${idx}`} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
                            <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                              <span className="font-bold mr-1">{letter})</span>
                              <QuestionRichText text={alt.text || '—'} className="inline" />
                            </div>
                            {imageSrc && (
                              <img
                                src={imageSrc}
                                alt={`Alternativa ${letter}`}
                                className="mt-2 w-full max-h-[40vh] rounded-md border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Gabarito: {selectedQuestion.correct_option ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    Acerto: {selectedQuestion.accuracy_pct}% · Tempo médio: {selectedQuestion.avg_time_secs ? formatDuration(selectedQuestion.avg_time_secs) : '—'} · Dificuldade: {selectedQuestion.difficulty ?? '—'}
                  </p>
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {Object.entries(selectedQuestion.option_distribution).map(([opt, count]) => (
                      <div key={opt} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-center">
                        <p className="text-[10px] text-slate-500">{opt}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{count}</p>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {weightsModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
            <div className="shrink-0 p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Configuração opcional</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pesos por área/matéria ({form.bank})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeightsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
            {(WEIGHT_KEYS_BY_BANK[form.bank] ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                Esta banca não possui preset de pesos nesta tela.
              </p>
            ) : (
              <div className="space-y-4">
                {form.bank === 'UEG' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Grupo de Pesos UEG</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(['I', 'II', 'III'] as const).map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setForm((f) => ({
                            ...f,
                            ueg_weight_group: grp,
                            weights: UEG_GROUP_PRESETS[grp],
                          }))}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                            form.ueg_weight_group === grp
                              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <p className="font-bold">Grupo {grp}</p>
                          <p className="mt-1 text-[10px] opacity-80 leading-relaxed">{UEG_GROUP_COURSES[grp]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(WEIGHT_KEYS_BY_BANK[form.bank] ?? []).map((key) => (
                  <label key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 break-words">{key}</p>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={form.weights?.[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          weights: {
                            ...(f.weights || {}),
                            [key]: val === '' ? 0 : Number(val),
                          },
                        }));
                      }}
                      placeholder="Ex: 2.5"
                      className={`${inputCls} mt-1`}
                    />
                  </label>
                ))}
                </div>
              </div>
            )}
            </div>

            <div className="shrink-0 p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, weights: {} }))}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Limpar pesos
              </button>
              <button
                type="button"
                onClick={() => setWeightsModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewApproval && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Etapa final</p>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">Revisar e aprovar simulado</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewApproval(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <p><span className="font-semibold">Título:</span> {form.title || '—'}</p>
              <p><span className="font-semibold">Banca:</span> {BANK_LABELS[form.bank] ?? form.bank}</p>
              <p><span className="font-semibold">Formato:</span> {FORMAT_LABELS[form.format] ?? form.format}</p>
              <p><span className="font-semibold">Questões:</span> {form.qty}</p>
              <p><span className="font-semibold">Dificuldade:</span> {DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty}</p>
              <p><span className="font-semibold">Início:</span> {form.starts_at || '—'}</p>
              <p><span className="font-semibold">Fim:</span> {form.ends_at || '—'}</p>
              <p><span className="font-semibold">Refazer:</span> {form.allow_retry ? 'Permitido' : 'Desativado'}</p>
              {form.bank === 'UEG' && (
                <p><span className="font-semibold">Grupo UEG:</span> {form.ueg_weight_group ?? 'Não definido'}</p>
              )}
              {form.instructions?.trim() && (
                <p><span className="font-semibold">Instruções:</span> {form.instructions.trim()}</p>
              )}
              {Object.keys(form.weights || {}).filter((k) => Number(form.weights?.[k]) > 0).length > 0 && (
                <div className="pt-1">
                  <p className="font-semibold">Pesos aplicados:</p>
                  <div className="mt-1 space-y-1">
                    {Object.entries(form.weights || {})
                      .filter(([, v]) => Number(v) > 0)
                      .map(([k, v]) => (
                        <p key={k} className="text-xs text-slate-600 dark:text-slate-300">• {k}: {v}</p>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReviewApproval(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Voltar para edição
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {saving ? 'Aprovando...' : editingId ? 'Aprovar e salvar' : 'Aprovar e criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}
