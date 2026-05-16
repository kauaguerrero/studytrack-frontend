'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, Plus, Target, Flame, Wind, Snowflake,
  Phone, MessageCircle, Mail, Video, Users, Building2,
  CheckCircle2, XCircle, Clock, Calendar, ExternalLink,
  Edit2, Trash2, X, ChevronDown, BarChart2, Loader2,
  ArrowRight, TrendingUp, Zap,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Stage = 'abordagem'|'demo_agendada'|'demo_realizada'|
             'proposta_enviada'|'negociando'|'fechado'|'perdido';
type Temperature = 'quente'|'morno'|'frio';
type Channel = 'whatsapp'|'ligacao'|'email'|'reuniao_presencial'|'reuniao_online'|'outro';
type Response = 'positivo'|'negativo'|'neutro'|'sem_resposta'|'agendou';

interface ProspectContact {
  id: string;
  channel: Channel;
  contact_date: string;
  response: Response;
  notes: string | null;
  next_action: string | null;
}

interface Prospect {
  id: string;
  name: string;
  contact_name: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  stage: Stage;
  temperature: Temperature;
  source_channel: string | null;
  next_followup_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  org_id: string | null;
  org: { id: string; name: string; slug: string; brand_primary: string } | null;
  mock_student_ids: string[];
  converted_at: string | null;
  created_at: string;
  prospect_contacts: ProspectContact[];
}

interface PipelineStats {
  total: number;
  ativos: number;
  fechados: number;
  perdidos: number;
  conversion_rate: number;
  by_stage: Record<string, number>;
  by_channel: Record<string, number>;
}

// ── Config de estágios ────────────────────────────────────────────────────────
const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string }> = {
  abordagem:        { label: 'Abordagem',        color: 'text-slate-600 dark:text-slate-300',    bg: 'bg-slate-100 dark:bg-slate-800' },
  demo_agendada:    { label: 'Demo agendada',    color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-50 dark:bg-blue-500/10' },
  demo_realizada:   { label: 'Demo realizada',   color: 'text-violet-700 dark:text-violet-300',  bg: 'bg-violet-50 dark:bg-violet-500/10' },
  proposta_enviada: { label: 'Proposta enviada', color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-50 dark:bg-amber-500/10' },
  negociando:       { label: 'Negociando',       color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-50 dark:bg-orange-500/10' },
  fechado:          { label: 'Ativo',            color: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  perdido:          { label: 'Desativado',       color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-500/10' },
};

const ACTIVE_STAGES: Stage[] = [
  'abordagem','demo_agendada','demo_realizada','proposta_enviada','negociando'
];

const BOARD_STAGES: Stage[] = [...ACTIVE_STAGES, 'fechado', 'perdido'];

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  whatsapp:          <MessageCircle className="w-3.5 h-3.5" />,
  ligacao:           <Phone className="w-3.5 h-3.5" />,
  email:             <Mail className="w-3.5 h-3.5" />,
  reuniao_presencial:<Users className="w-3.5 h-3.5" />,
  reuniao_online:    <Video className="w-3.5 h-3.5" />,
  outro:             <Zap className="w-3.5 h-3.5" />,
};

const RESPONSE_LABELS: Record<Response, { label: string; cls: string }> = {
  positivo:    { label: 'Positivo',     cls: 'text-emerald-600 dark:text-emerald-400' },
  negativo:    { label: 'Negativo',     cls: 'text-red-500 dark:text-red-400' },
  neutro:      { label: 'Neutro',       cls: 'text-slate-500 dark:text-slate-400' },
  sem_resposta:{ label: 'Sem resposta', cls: 'text-amber-600 dark:text-amber-400' },
  agendou:     { label: 'Agendou',      cls: 'text-blue-600 dark:text-blue-400' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

async function getToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function TemperatureBadge({ t }: { t: Temperature }) {
  if (t === 'quente') return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500">
      <Flame className="w-3 h-3" />Quente
    </span>
  );
  if (t === 'morno') return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
      <Wind className="w-3 h-3" />Morno
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400">
      <Snowflake className="w-3 h-3" />Frio
    </span>
  );
}

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit' });
}

function daysSince(v: string) {
  const diff = Date.now() - new Date(v).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
}

function isOverdue(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProspeccaoPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [creatingMock, setCreatingMock] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [tempFilter, setTempFilter] = useState<Temperature | 'all'>('all');

  const [form, setForm] = useState({
    name:'', contact_name:'', contact_whatsapp:'', contact_email:'',
    stage:'abordagem' as Stage, temperature:'morno' as Temperature,
    source_channel:'whatsapp', next_followup_at:'', notes:'',
  });
  const [savingForm, setSavingForm] = useState(false);

  const [contactForm, setContactForm] = useState({
    channel:'whatsapp' as Channel, response:'sem_resposta' as Response,
    notes:'', next_action:'', temperature:'morno' as Temperature,
  });
  const [savingContact, setSavingContact] = useState(false);

  async function fetchProspects() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/prospects`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setProspects(data.prospects ?? []);
      setStats(data.stats ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProspects(); }, []);

  const filtered = prospects.filter(p => {
    if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
    if (tempFilter !== 'all' && p.temperature !== tempFilter) return false;
    return true;
  });

  const byStage = (stage: Stage) => filtered.filter(p => p.stage === stage);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSavingForm(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          next_followup_at: form.next_followup_at || null,
        }),
      });
      if (!res.ok) return;
      setShowNewForm(false);
      setForm({
        name:'', contact_name:'', contact_whatsapp:'', contact_email:'',
        stage:'abordagem', temperature:'morno', source_channel:'whatsapp',
        next_followup_at:'', notes:'',
      });
      await fetchProspects();
    } finally {
      setSavingForm(false);
    }
  }

  async function handleUpdateStage(id: string, stage: Stage) {
    const token = await getToken();
    await fetch(`${API}/api/admin/prospects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ stage }),
    });
    await fetchProspects();
    if (selectedProspect?.id === id) {
      setSelectedProspect(prev => prev ? { ...prev, stage } : null);
    }
  }

  async function handleCreateMockOrg(prospect: Prospect) {
    if (!confirm(`Criar org mock para "${prospect.name}"? Serão gerados 20 alunos e dados de demonstração.`)) return;
    setCreatingMock(prospect.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/prospects/${prospect.id}/create-mock-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ org_name: prospect.name }),
      });
      const json = await res.json();
      if (res.ok && json.org_url) {
        await fetchProspects();
        window.open(json.org_url, '_blank');
      }
    } finally {
      setCreatingMock(null);
    }
  }

  async function handleConvert(prospect: Prospect) {
    if (!confirm(`Converter "${prospect.name}" para parceiro real?\n\nOs dados mockados serão deletados e a org ficará pronta para uso.`)) return;
    setConverting(prospect.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/admin/prospects/${prospect.id}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        await fetchProspects();
        setDrawerOpen(false);
        window.location.href = '/portal/admin/b2b';
      }
    } finally {
      setConverting(null);
    }
  }

  async function handleDelete(prospect: Prospect) {
    const msg = prospect.org_id
      ? `Excluir "${prospect.name}" e deletar todos os dados mockados?`
      : `Excluir prospect "${prospect.name}"?`;
    if (!confirm(msg)) return;
    const token = await getToken();
    await fetch(`${API}/api/admin/prospects/${prospect.id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    setDrawerOpen(false);
    await fetchProspects();
  }

  async function handleAddContact() {
    if (!selectedProspect) return;
    setSavingContact(true);
    try {
      const token = await getToken();
      await fetch(`${API}/api/admin/prospects/${selectedProspect.id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(contactForm),
      });
      setContactForm({ channel:'whatsapp', response:'sem_resposta', notes:'', next_action:'', temperature:'morno' });
      await fetchProspects();
      // Atualiza o drawer com os dados frescos
      const updated = prospects.find(p => p.id === selectedProspect.id);
      if (updated) setSelectedProspect(updated);
    } finally {
      setSavingContact(false);
    }
  }

  const inputCls = 'h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500';
  const labelCls = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/portal/admin/b2b"
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> B2B
          </Link>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Painel de Prospecção</h1>
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Novo prospect
        </button>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label:'Total de leads',  value: stats.total,                icon: Target,       color:'text-violet-500' },
            { label:'Ativos',          value: stats.ativos,               icon: TrendingUp,   color:'text-blue-500' },
            { label:'Fechados',        value: stats.fechados,             icon: CheckCircle2, color:'text-emerald-500' },
            { label:'Taxa conversão',  value: `${stats.conversion_rate}%`,icon: BarChart2,    color:'text-amber-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500">{label}</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...BOARD_STAGES] as const).map((s) => (
            <button key={s} onClick={() => setStageFilter(s as Stage | 'all')}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition-all ${
                stageFilter === s
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:border-indigo-300'
              }`}>
              {s === 'all' ? 'Todos' : STAGE_CONFIG[s].label}
              {s !== 'all' && stats?.by_stage[s] ? ` (${stats.by_stage[s]})` : ''}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {(['all','quente','morno','frio'] as const).map((t) => (
            <button key={t} onClick={() => setTempFilter(t as Temperature | 'all')}
              className={`rounded-xl border px-3 py-1 text-xs font-semibold transition-all ${
                tempFilter === t
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
              }`}>
              {t === 'all' ? 'Temperatura' : t === 'quente' ? 'Quente' : t === 'morno' ? 'Morno' : 'Frio'}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center gap-3 text-slate-400 dark:text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 pb-8">
          {BOARD_STAGES.map((stage) => {
            const cards = byStage(stage);
            const cfg = STAGE_CONFIG[stage];
            return (
              <div key={stage} className="flex flex-col gap-3">
                {/* Header da coluna */}
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${cfg.bg}`}>
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-xs font-black tabular-nums ${cfg.color}`}>{cards.length}</span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5">
                  {cards.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => { setSelectedProspect(p); setDrawerOpen(true); }}
                      className="cursor-pointer rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-3.5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                          {p.name}
                        </p>
                        {ACTIVE_STAGES.includes(stage) && <TemperatureBadge t={p.temperature} />}
                      </div>

                      {p.contact_name && (
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
                          {p.contact_name}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.org_id && (
                          <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                            Demo ativa
                          </span>
                        )}
                        {p.source_channel && (
                          <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-slate-500 dark:text-zinc-400">
                            {p.source_channel}
                          </span>
                        )}
                      </div>

                      {p.next_followup_at && (
                        <div className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                          isOverdue(p.next_followup_at)
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue(p.next_followup_at) ? 'Vencido — ' : ''}
                          Follow-up {formatDate(p.next_followup_at)}
                        </div>
                      )}

                      {p.prospect_contacts.length > 0 && (
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                          Último contato {daysSince(p.prospect_contacts[p.prospect_contacts.length - 1].contact_date)}
                        </p>
                      )}

                      {/* Setas de stage rápido — apenas no pipeline ativo */}
                      {ACTIVE_STAGES.includes(stage) && (
                        <div
                          className="flex gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ACTIVE_STAGES.indexOf(stage) > 0 && (
                            <button
                              onClick={() => handleUpdateStage(p.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) - 1])}
                              className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            >
                              Voltar
                            </button>
                          )}
                          {ACTIVE_STAGES.indexOf(stage) < ACTIVE_STAGES.length - 1 && (
                            <button
                              onClick={() => handleUpdateStage(p.id, ACTIVE_STAGES[ACTIVE_STAGES.indexOf(stage) + 1])}
                              className="flex-1 rounded-lg border border-indigo-300 dark:border-indigo-500/40 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                            >
                              Avançar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {cards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 p-4 text-center">
                      <p className="text-[11px] text-slate-400 dark:text-zinc-600">Nenhum lead</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal novo prospect ─────────────────────────────────────────────── */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-slate-900 dark:text-white">Novo prospect</p>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nome do cursinho *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Cursinho Objetivo"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelCls}>Responsável</label>
                <input
                  value={form.contact_name}
                  onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Nome do contato"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input
                  value={form.contact_whatsapp}
                  onChange={e => setForm(f => ({ ...f, contact_whatsapp: e.target.value }))}
                  placeholder="(34) 9 9999-9999"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Canal de origem</label>
                <select
                  value={form.source_channel}
                  onChange={e => setForm(f => ({ ...f, source_channel: e.target.value }))}
                  className={inputCls}
                >
                  {[
                    ['whatsapp','WhatsApp'],['indicacao','Indicação'],['instagram','Instagram'],
                    ['linkedin','LinkedIn'],['evento','Evento'],['outro','Outro'],
                  ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Temperatura</label>
                <select
                  value={form.temperature}
                  onChange={e => setForm(f => ({ ...f, temperature: e.target.value as Temperature }))}
                  className={inputCls}
                >
                  <option value="quente">Quente</option>
                  <option value="morno">Morno</option>
                  <option value="frio">Frio</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Estágio inicial</label>
                <select
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                  className={inputCls}
                >
                  {ACTIVE_STAGES.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Próximo follow-up</label>
                <input
                  type="date"
                  value={form.next_followup_at}
                  onChange={e => setForm(f => ({ ...f, next_followup_at: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Contexto inicial, como conheceu, etc."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={savingForm || !form.name.trim()}
                className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {savingForm ? 'Criando...' : 'Criar prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer de detalhes ────────────────────────────────────────────── */}
      {drawerOpen && selectedProspect && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 flex flex-col overflow-hidden">
            {/* Header drawer */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white">{selectedProspect.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STAGE_CONFIG[selectedProspect.stage].bg} ${STAGE_CONFIG[selectedProspect.stage].color}`}>
                    {STAGE_CONFIG[selectedProspect.stage].label}
                  </span>
                  {ACTIVE_STAGES.includes(selectedProspect.stage) && <TemperatureBadge t={selectedProspect.temperature} />}
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Info */}
              <div className="space-y-1.5 text-sm">
                {selectedProspect.contact_name && (
                  <p className="text-slate-600 dark:text-zinc-300">{selectedProspect.contact_name}</p>
                )}
                {selectedProspect.contact_whatsapp && (
                  <a
                    href={`https://wa.me/55${selectedProspect.contact_whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {selectedProspect.contact_whatsapp}
                  </a>
                )}
                {selectedProspect.contact_email && (
                  <p className="text-slate-500 dark:text-zinc-400">{selectedProspect.contact_email}</p>
                )}
                {selectedProspect.notes && (
                  <p className="rounded-xl bg-slate-50 dark:bg-zinc-800 p-3 text-xs text-slate-600 dark:text-zinc-300 mt-2">
                    {selectedProspect.notes}
                  </p>
                )}
              </div>

              {/* Mover estágio */}
              <div>
                <p className={labelCls}>Mover para estágio</p>
                <div className="flex flex-wrap gap-1.5">
                  {BOARD_STAGES.map(s => (
                    <button
                      key={s}
                      disabled={selectedProspect.stage === s}
                      onClick={() => handleUpdateStage(selectedProspect.id, s)}
                      className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                        selectedProspect.stage === s
                          ? `${STAGE_CONFIG[s].bg} ${STAGE_CONFIG[s].color} border-transparent`
                          : 'border-slate-200 dark:border-zinc-700 text-slate-500 hover:border-indigo-300'
                      }`}
                    >
                      {STAGE_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Org mock — só para prospects ainda no pipeline ou com org vinculada */}
              {(ACTIVE_STAGES.includes(selectedProspect.stage) || selectedProspect.org_id) && (
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    Org de demonstração
                  </p>
                  {selectedProspect.org ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                          Demo ativa
                        </span>
                        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">{selectedProspect.org.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={`/partners/${selectedProspect.org.slug}/dashboard`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-violet-300 dark:border-violet-500/40 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Ver demo
                        </a>
                        <button
                          onClick={() => handleConvert(selectedProspect)}
                          disabled={converting === selectedProspect.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {converting === selectedProspect.id ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Convertendo...</>
                          ) : (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Converter para produção</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCreateMockOrg(selectedProspect)}
                      disabled={creatingMock === selectedProspect.id}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {creatingMock === selectedProspect.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Gerando org demo...</>
                      ) : (
                        <><Building2 className="w-4 h-4" /> Criar org mock com dados demo</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Log de contatos */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Histórico de abordagens ({selectedProspect.prospect_contacts.length})
                </p>

                {/* Novo contato */}
                <div className="rounded-xl border border-slate-200 dark:border-zinc-700 p-3 space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">Registrar abordagem</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={contactForm.channel}
                      onChange={e => setContactForm(f => ({ ...f, channel: e.target.value as Channel }))}
                      className={inputCls}
                    >
                      {[
                        ['whatsapp','WhatsApp'],['ligacao','Ligação'],['email','Email'],
                        ['reuniao_presencial','Reunião presencial'],['reuniao_online','Reunião online'],['outro','Outro'],
                      ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <select
                      value={contactForm.response}
                      onChange={e => setContactForm(f => ({ ...f, response: e.target.value as Response }))}
                      className={inputCls}
                    >
                      {[
                        ['positivo','Positivo'],['negativo','Negativo'],['neutro','Neutro'],
                        ['sem_resposta','Sem resposta'],['agendou','Agendou'],
                      ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <textarea
                    value={contactForm.notes}
                    onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Como foi o contato? O que foi dito?"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-400 resize-none"
                  />
                  <input
                    value={contactForm.next_action}
                    onChange={e => setContactForm(f => ({ ...f, next_action: e.target.value }))}
                    placeholder="Próxima ação..."
                    className={`${inputCls} text-xs`}
                  />
                  <button
                    onClick={handleAddContact}
                    disabled={savingContact}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {savingContact ? 'Salvando...' : 'Registrar contato'}
                  </button>
                </div>

                {/* Timeline */}
                {[...selectedProspect.prospect_contacts].reverse().map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                      {CHANNEL_ICONS[c.channel]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${RESPONSE_LABELS[c.response].cls}`}>
                          {RESPONSE_LABELS[c.response].label}
                        </span>
                        <span className="text-[10px] text-slate-400">{daysSince(c.contact_date)}</span>
                      </div>
                      {c.notes && <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">{c.notes}</p>}
                      {c.next_action && (
                        <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                          {c.next_action}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer drawer */}
            <div className="border-t border-slate-100 dark:border-zinc-800 px-5 py-3 flex justify-between items-center">
              <button
                onClick={() => handleDelete(selectedProspect)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir prospect
              </button>
              <p className="text-[10px] text-slate-400">Criado {formatDate(selectedProspect.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
