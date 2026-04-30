'use client';

import { useEffect, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus, ChevronDown, Trophy, Users, BarChart2,
  CalendarDays, Pencil, Trash2, Play, Timer, BookOpen,
} from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface SimuladoConfig {
  format: string;
  bank: string;
  subject: string | null;
  difficulty: string;
  qty: number;
  time_limit_secs: number | null;
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
  time_taken_secs: number | null;
  tri_score: number | null;
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
  dia1: 'Dia 1', dia2: 'Dia 2', completo: 'Completo',
};

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
  const [expandedRanking, setExpandedRanking] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Record<string, RankingEntry[]>>({});
  const [loadingRanking, setLoadingRanking] = useState<string | null>(null);

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
      if (!res.ok) return;
      const data = await res.json();
      setSimulados(data.scheduled_simulados ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSimulados(); }, [slug]);

  async function loadRanking(simId: string) {
    if (rankings[simId]) { setExpandedRanking(expandedRanking === simId ? null : simId); return; }
    setLoadingRanking(simId);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${simId}/ranking`);
      if (!res.ok) return;
      const data = await res.json();
      setRankings((prev) => ({ ...prev, [simId]: data.ranking ?? [] }));
      setExpandedRanking(simId);
    } finally {
      setLoadingRanking(null);
    }
  }

  async function handleSave() {
    if (!form.title.trim() || !form.starts_at) {
      toast.error('Título e data de início são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const config: SimuladoConfig = {
        format: form.format,
        bank: form.bank,
        subject: form.subject || null,
        difficulty: form.difficulty,
        qty: Number(form.qty),
        time_limit_secs: form.time_limit_secs ? Number(form.time_limit_secs) * 60 : null,
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
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadSimulados();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sim: ScheduledSimulado) {
    const msg = sim.metrics.total_sessions > 0
      ? `Este simulado tem ${sim.metrics.total_sessions} sessão(ões). Ele será encerrado em vez de excluído. Continuar?`
      : 'Excluir este simulado?';
    if (!confirm(msg)) return;

    const res = await fetchWithAuth(
      `/api/partners/${slug}/scheduled-simulados/${sim.id}`,
      { method: 'DELETE' }
    );
    if (res.ok) {
      toast.success('Simulado removido');
      await loadSimulados();
    } else {
      toast.error('Erro ao remover');
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
    });
    setShowForm(true);
  }

  const inputCls = 'h-10 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[var(--brand-primary)]';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1';

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
            <div className="rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--brand-primary)' }}>
                {editingId ? 'Editar simulado' : 'Novo simulado'}
              </p>

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
                  <select value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} className={inputCls}>
                    {Object.entries(BANK_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className={labelCls}>Formato</label>
                  <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))} className={inputCls}>
                    {Object.entries(FORMAT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
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

                {/* Quantidade */}
                <div>
                  <label className={labelCls}>Questões</label>
                  <input
                    type="number"
                    min={5} max={180}
                    value={form.qty}
                    onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
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

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 transition"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar simulado'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
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
                          onClick={() => handleDelete(sim)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                      <button
                        type="button"
                        onClick={() => loadRanking(sim.id)}
                        className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
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
                    )}
                  </div>

                  {/* Ranking expandido */}
                  {expandedRanking === sim.id && rankings[sim.id] && (
                    <div className="border-t border-slate-100 dark:border-slate-800">
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
                              <p
                                className="text-base font-extrabold tabular-nums"
                                style={{
                                  color: entry.score_pct >= 60 ? 'var(--brand-primary)' : '#ef4444',
                                }}
                              >
                                {entry.score_pct}%
                              </p>
                              {entry.tri_score && (
                                <p className="text-[10px] text-slate-400">TRI {entry.tri_score}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
}
