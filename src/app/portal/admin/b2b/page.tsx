'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, School, Plus, Copy, Check, Edit2, Trash2,
  ExternalLink, UserPlus, X, Eye, EyeOff, Search,
  DollarSign, Calendar, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Founder {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

type StatsPeriod = 'today' | 'week' | 'month' | 'year' | 'lifetime';

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  year: 'Ano',
  lifetime: 'Total',
};

interface B2BStats {
  total_orgs: number;
  total_students: number;
  active_period: number;
  questions_period: number;
  simulados_period: number;
  essays_period: number;
  prev_active_week: number;
  prev_questions_week: number;
  prev_simulados_week: number;
  prev_essays_week: number;
  per_org: Array<{
    org_id: string;
    active_period: number;
    questions_period: number;
    simulados_period: number;
    essays_period: number;
  }>;
  period: StatsPeriod;
  period_start: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  max_students: number;
  contact_email: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  invite_code?: string;
  logo_url?: string;
  permissions: Record<string, unknown>;
  created_at: string;
  founder: Founder | null;
  student_count: number;
  monthly_value: number | null;
  last_paid_at: string | null;
  plan_renewal_date: string | null;
}

interface OrgFormData {
  name: string;
  slug: string;
  plan_tier: string;
  max_students: number;
  contact_email: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
}

const DEFAULT_FORM: OrgFormData = {
  name: '',
  slug: '',
  plan_tier: 'b2b_basic',
  max_students: 200,
  contact_email: '',
  brand_primary: '#6366f1',
  brand_secondary: '#8b5cf6',
  brand_accent: '#f59e0b',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function planBadgeClass(tier: string) {
  if (tier === 'b2b_pro')
    return 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30';
  if (tier === 'b2b_enterprise')
    return 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30';
  return 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600';
}

function planLabel(tier: string) {
  if (tier === 'b2b_pro') return 'Pro';
  if (tier === 'b2b_enterprise') return 'Enterprise';
  return 'Basic';
}

function generatePassword(len = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden animate-pulse">
      <div className="h-1 bg-slate-200 dark:bg-zinc-700" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-zinc-700" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-zinc-700 rounded w-2/3" />
            <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded w-1/3" />
          </div>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-zinc-800 rounded w-full" />
        <div className="h-1 bg-slate-100 dark:bg-zinc-800 rounded w-full" />
        <div className="h-8 bg-slate-100 dark:bg-zinc-800 rounded w-full" />
      </div>
    </div>
  );
}

type BillingStatus = 'active' | 'overdue' | 'pending' | 'none';

function getBillingStatus(org: Organization): BillingStatus {
  if (!org.monthly_value) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (org.plan_renewal_date) {
    return new Date(org.plan_renewal_date) >= today ? 'active' : 'overdue';
  }
  if (!org.last_paid_at) return 'pending';
  const paid = new Date(org.last_paid_at);
  if (paid.getFullYear() === today.getFullYear() && paid.getMonth() === today.getMonth()) {
    return 'active';
  }
  return 'pending';
}

const BILLING_BADGE: Record<BillingStatus, { label: string; className: string; Icon: React.ElementType } | null> = {
  none: null,
  active: { label: 'Em dia', className: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', Icon: CheckCircle2 },
  overdue: { label: 'Vencido', className: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400', Icon: AlertCircle },
  pending: { label: 'Renovação pendente', className: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', Icon: Clock },
};

// ─── OrgModal ─────────────────────────────────────────────────────────────────

function OrgModal({
  org,
  onClose,
  onSaved,
}: {
  org: Organization | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<OrgFormData>(
    org
      ? {
          name: org.name,
          slug: org.slug,
          plan_tier: org.plan_tier,
          max_students: org.max_students,
          contact_email: org.contact_email ?? '',
          brand_primary: org.brand_primary,
          brand_secondary: org.brand_secondary,
          brand_accent: org.brand_accent,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!org;

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, slug: isEdit ? f.slug : toSlug(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = isEdit
        ? `/api/admin/b2b/organizations/${org!.id}`
        : '/api/admin/b2b/organizations';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, max_students: Number(form.max_students) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro desconhecido'); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEdit ? 'Editar Instituição' : 'Nova Instituição'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Nome</label>
              <input required value={form.name} onChange={e => handleNameChange(e.target.value)} className={inputCls} placeholder="Ex: Colégio Modelo" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Slug</label>
              <input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className={`${inputCls} font-mono`} placeholder="colegio-modelo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Plan Tier</label>
              <select value={form.plan_tier} onChange={e => setForm(f => ({ ...f, plan_tier: e.target.value }))} className={inputCls}>
                <option value="b2b_basic">b2b_basic</option>
                <option value="b2b_pro">b2b_pro</option>
                <option value="b2b_enterprise">b2b_enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Máx. alunos</label>
              <input type="number" min={1} value={form.max_students} onChange={e => setForm(f => ({ ...f, max_students: Number(e.target.value) }))} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">Email de contato</label>
              <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className={inputCls} placeholder="contato@escola.com" />
            </div>
            {(['brand_primary', 'brand_secondary', 'brand_accent'] as const).map((key, i) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  {['Cor primária', 'Cor secundária', 'Cor accent'][i]}
                </label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-10 h-9 rounded cursor-pointer bg-transparent border-0" />
                  <span className="text-xs text-slate-400 dark:text-zinc-400 font-mono">{form[key]}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 transition-all">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── FounderModal ──────────────────────────────────────────────────────────────

function FounderModal({
  org,
  onClose,
  onSaved,
}: {
  org: Organization;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<'create' | 'link'>('create');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [showPw, setShowPw] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState('');

  const inputCls =
    'w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500';

  async function handleSearch() {
    if (!search.trim()) return;
    const res = await fetch(`/api/admin/profiles?search=${encodeURIComponent(search)}`);
    const json = await res.json();
    setSearchResults(Array.isArray(json) ? json : (json.profiles ?? json.data ?? []));
  }

  async function handleCreate() {
    if (!fullName || !email || !password) { setError('Preencha todos os campos.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}/founder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'create', full_name: fullName, email, password }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro'); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleLink() {
    if (!selectedProfile) { setError('Selecione um perfil.'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}/founder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'link', profile_id: selectedProfile.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro'); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true); setError('');
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}/founder`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro'); return; }
      onSaved();
    } finally {
      setUnlinking(false);
    }
  }

  function copyPw() {
    navigator.clipboard.writeText(password);
    setCopiedPw(true);
    setTimeout(() => setCopiedPw(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Gerenciar Founder — {org.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {org.founder && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                {org.founder.avatar_url ? (
                  <img src={org.founder.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {org.founder.full_name?.[0] ?? '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{org.founder.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{org.founder.email}</p>
                </div>
              </div>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-500/30 px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {unlinking ? 'Desvinculando...' : 'Desvincular'}
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 rounded-xl p-1">
            {(['create', 'link'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  tab === t
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                }`}
              >
                {t === 'create' ? 'Criar conta' : 'Vincular existente'}
              </button>
            ))}
          </div>

          {tab === 'create' && (
            <div className="space-y-3">
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome completo" className={inputCls} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
              <div className="relative">
                <input
                  readOnly
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  className={`${inputCls} pr-20 font-mono`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" onClick={() => setShowPw(s => !s)} className="p-1 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={copyPw} className="p-1 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white">
                    {copiedPw ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button onClick={() => setPassword(generatePassword())} className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline">
                Gerar nova senha
              </button>
              <button onClick={handleCreate} disabled={saving} className="w-full py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 transition-all">
                {saving ? 'Criando...' : 'Criar e vincular'}
              </button>
            </div>
          )}

          {tab === 'link' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Buscar por email..."
                  className={inputCls}
                />
                <button onClick={handleSearch} className="px-3 py-2 bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 rounded-lg text-slate-600 dark:text-zinc-300 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfile(p)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        selectedProfile?.id === p.id
                          ? 'bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40'
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-600 flex items-center justify-center text-xs text-slate-700 dark:text-white font-bold shrink-0">
                        {p.full_name?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm text-slate-900 dark:text-white font-medium">{p.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{p.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProfile && (
                <button onClick={handleLink} disabled={saving} className="w-full py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 transition-all">
                  {saving ? 'Vinculando...' : `Vincular ${selectedProfile.full_name}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── OrgCard ──────────────────────────────────────────────────────────────────

function OrgCard({
  org,
  orgStats,
  period,
  onEdit,
  onFounder,
  onDelete,
}: {
  org: Organization;
  orgStats?: { active_period: number; questions_period: number; simulados_period: number; essays_period: number } | null;
  period: StatsPeriod;
  onEdit: () => void;
  onFounder: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [unlinkingSchool, setUnlinkingSchool] = useState(false);

  // Billing state
  const [billingEdit, setBillingEdit] = useState(false);
  const [billingValue, setBillingValue] = useState(org.monthly_value?.toString() ?? '');
  const [billingRenewal, setBillingRenewal] = useState(org.plan_renewal_date ?? '');
  const [savingBilling, setSavingBilling] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [billingError, setBillingError] = useState('');
  const billingStatus = getBillingStatus(org);
  const billingBadge = BILLING_BADGE[billingStatus];

  const pct = org.max_students > 0
    ? Math.min((org.student_count / org.max_students) * 100, 100)
    : 0;

  function copyInvite() {
    if (!org.invite_code) return;
    navigator.clipboard.writeText(org.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { setDeleteError(json.error ?? 'Erro'); return; }
      onDelete();
    } finally {
      setDeleting(false);
    }
  }

  async function handleUnlinkSchool() {
    setUnlinkingSchool(true); setDeleteError('');
    try {
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}/school`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) { setDeleteError(json.error ?? 'Erro ao desvincular escola'); return; }
      // Tenta excluir novamente após desvincular
      await handleDelete();
    } finally {
      setUnlinkingSchool(false);
    }
  }

  const hasSchoolError = deleteError.includes('escola');

  async function handleMarkPaid() {
    setMarkingPaid(true); setBillingError('');
    try {
      const now = new Date().toISOString();
      let body: Record<string, unknown> = { last_paid_at: now };
      // Advance renewal date by 1 month if it was overdue
      if (org.plan_renewal_date) {
        const renewal = new Date(org.plan_renewal_date);
        if (renewal < new Date()) {
          renewal.setMonth(renewal.getMonth() + 1);
          body.plan_renewal_date = renewal.toISOString().split('T')[0];
        }
      }
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setBillingError(json.error ?? 'Erro'); return; }
      onDelete(); // refresh list
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleSaveBilling() {
    setSavingBilling(true); setBillingError('');
    try {
      const body: Record<string, unknown> = {
        monthly_value: billingValue ? parseFloat(billingValue) : null,
        plan_renewal_date: billingRenewal || null,
      };
      const res = await fetch(`/api/admin/b2b/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { setBillingError(json.error ?? 'Erro'); return; }
      setBillingEdit(false);
      onDelete(); // refresh list
    } finally {
      setSavingBilling(false);
    }
  }

  return (
    <div
      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.06] rounded-xl overflow-hidden flex flex-col"
      style={{ borderTop: `3px solid ${org.brand_primary}` }}
    >
      <div className="p-5 flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: org.brand_primary }}
              >
                {org.name[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900 dark:text-white leading-tight">{org.name}</p>
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">{org.slug}</span>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${planBadgeClass(org.plan_tier)}`}>
            {planLabel(org.plan_tier)}
          </span>
        </div>

        {/* Founder */}
        <div className="flex items-center justify-between">
          {org.founder ? (
            <div className="flex items-center gap-2">
              {org.founder.avatar_url ? (
                <img src={org.founder.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {org.founder.full_name?.[0] ?? '?'}
                </div>
              )}
              <span className="text-sm text-slate-700 dark:text-zinc-300 truncate max-w-[140px]">{org.founder.full_name}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 dark:text-zinc-500 italic">Sem founder</span>
          )}
          <button
            onClick={onFounder}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {org.founder ? 'Gerenciar' : 'Vincular'}
          </button>
        </div>

        {/* Alunos */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 dark:text-zinc-400 mb-1">
            <span>Alunos</span>
            <span>{org.student_count} / {org.max_students}</span>
          </div>
          <div className="h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: org.brand_primary }}
            />
          </div>
        </div>

        {/* Métricas do período */}
        {orgStats && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Ativos', value: orgStats.active_period, color: '#10b981' },
              { label: 'Questões', value: orgStats.questions_period, color: '#f59e0b' },
              { label: 'Simulados', value: orgStats.simulados_period, color: '#3b82f6' },
              { label: 'Redações', value: orgStats.essays_period, color: '#ec4899' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-base font-black tabular-nums" style={{ color }}>{value}</span>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-none mt-0.5">
                  {label} / {PERIOD_LABELS[period].toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Faturamento */}
        <div className="border border-slate-100 dark:border-white/[0.06] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Faturamento</span>
            </div>
            <div className="flex items-center gap-1.5">
              {billingBadge && (
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${billingBadge.className}`}>
                  <billingBadge.Icon className="w-3 h-3" />
                  {billingBadge.label}
                </span>
              )}
              <button
                onClick={() => { setBillingEdit(e => !e); setBillingError(''); }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {billingEdit ? 'Cancelar' : 'Editar'}
              </button>
            </div>
          </div>

          {billingEdit ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 dark:text-zinc-500 w-16 shrink-0">Valor/mês</label>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={billingValue}
                    onChange={e => setBillingValue(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-400 dark:text-zinc-500 w-16 shrink-0">Renova em</label>
                <input
                  type="date"
                  value={billingRenewal}
                  onChange={e => setBillingRenewal(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-2 py-1 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {billingError && <p className="text-[10px] text-red-500">{billingError}</p>}
              <button
                onClick={handleSaveBilling}
                disabled={savingBilling}
                className="w-full text-xs font-semibold py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                {savingBilling ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-zinc-500">Valor mensal</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {org.monthly_value
                    ? org.monthly_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : <span className="text-slate-300 dark:text-zinc-600 font-normal text-xs">—</span>}
                </span>
              </div>
              {org.last_paid_at && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">Último pagamento</span>
                  <span className="text-[10px] text-slate-600 dark:text-zinc-400">
                    {new Date(org.last_paid_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {org.plan_renewal_date && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Renovação
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-zinc-400">
                    {new Date(org.plan_renewal_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {!org.plan_renewal_date && !org.last_paid_at && org.monthly_value && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  Sem prazo definido — renovação solicitada toda virada de mês.
                </p>
              )}
              {org.monthly_value && (
                <button
                  onClick={handleMarkPaid}
                  disabled={markingPaid}
                  className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {markingPaid ? 'Registrando...' : 'Marcar como pago'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Invite code */}
        {org.invite_code && (
          <button
            onClick={copyInvite}
            className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors group"
          >
            <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">
              {org.invite_code}
            </span>
            {copied
              ? <Check className="w-3.5 h-3.5 text-green-500" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-100 dark:border-white/[0.06] px-4 py-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={onFounder}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Founder
        </button>
        <Link
          href={`/partners/${org.slug}/dashboard`}
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Portal
        </Link>
        <div className="flex-1" />
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {deleteError && (
              <span className="text-xs text-red-500 dark:text-red-400">{deleteError}</span>
            )}
            {hasSchoolError ? (
              <button
                onClick={handleUnlinkSchool}
                disabled={unlinkingSchool}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                {unlinkingSchool ? '...' : 'Desvincular escola e excluir'}
              </button>
            ) : (
              <>
                <span className="text-xs text-slate-500 dark:text-zinc-400">Tem certeza?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-500/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                >
                  {deleting ? '...' : 'Excluir'}
                </button>
              </>
            )}
            <button
              onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
              className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminB2BPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<B2BStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [error, setError] = useState('');
  const [orgModal, setOrgModal] = useState<{ open: boolean; org: Organization | null }>({
    open: false,
    org: null,
  });
  const [founderModal, setFounderModal] = useState<Organization | null>(null);

  const fetchStats = useCallback(async (p: StatsPeriod) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/b2b/stats?period=${p}`);
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchOrgs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/b2b/organizations');
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro ao carregar'); return; }
      setOrgs(json.organizations ?? []);
    } catch {
      setError('Falha na requisição');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
    fetchStats('week');
  }, [fetchOrgs, fetchStats]);

  function handlePeriodChange(p: StatsPeriod) {
    setPeriod(p);
    fetchStats(p);
  }

  function closeOrgModal() { setOrgModal({ open: false, org: null }); }
  function closeFounderModal() { setFounderModal(null); }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/portal/admin"
            className="flex items-center gap-1 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
              <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Parceiros B2B</h1>
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                {loading ? '...' : `${orgs.length} instituição${orgs.length !== 1 ? 'ões' : ''}`}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setOrgModal({ open: true, org: null })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Nova Instituição
        </button>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 space-y-3">
        {/* Period filter */}
        <div className="flex gap-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.06] rounded-xl p-1 w-fit">
          {(Object.keys(PERIOD_LABELS) as StatsPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Instituições', value: stats?.total_orgs, color: '#6366f1', prev: null },
            { label: 'Alunos B2B', value: stats?.total_students, color: '#8b5cf6', prev: null },
            { label: `Ativos (${PERIOD_LABELS[period].toLowerCase()})`, value: stats?.active_period, color: '#10b981', prev: stats?.prev_active_week ?? null },
            { label: `Questões (${PERIOD_LABELS[period].toLowerCase()})`, value: stats?.questions_period, color: '#f59e0b', prev: stats?.prev_questions_week ?? null },
            { label: `Simulados (${PERIOD_LABELS[period].toLowerCase()})`, value: stats?.simulados_period, color: '#3b82f6', prev: stats?.prev_simulados_week ?? null },
            { label: `Redações (${PERIOD_LABELS[period].toLowerCase()})`, value: stats?.essays_period, color: '#ec4899', prev: stats?.prev_essays_week ?? null },
          ].map(({ label, value, color, prev }) => {
            const delta = (value !== undefined && prev !== null && prev !== undefined)
              ? value - prev
              : null;
            return (
            <div
              key={label}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 flex flex-col gap-1"
              style={{ borderTop: `2px solid ${color}` }}
            >
              {statsLoading || value === undefined ? (
                <div className="h-7 w-14 bg-slate-100 dark:bg-zinc-800 rounded animate-pulse" />
              ) : (
                <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {value.toLocaleString('pt-BR')}
                </span>
              )}
              {delta !== null && (
                <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                  delta > 0
                    ? 'text-emerald-500'
                    : delta < 0
                      ? 'text-red-400'
                      : 'text-zinc-500'
                }`}>
                  {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
                  {delta > 0 ? '+' : ''}{delta} vs sem. ant.
                </span>
              )}
              <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 leading-tight">
                {label}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-3 mb-6">
          {error}
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : orgs.map(org => (
              <OrgCard
                key={org.id}
                org={org}
                orgStats={stats?.per_org?.find(p => p.org_id === org.id) ?? null}
                period={period}
                onEdit={() => setOrgModal({ open: true, org })}
                onFounder={() => setFounderModal(org)}
                onDelete={fetchOrgs}
              />
            ))}
        {!loading && orgs.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400 dark:text-zinc-500">
            <School className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma instituição cadastrada.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {orgModal.open && (
        <OrgModal
          org={orgModal.org}
          onClose={closeOrgModal}
          onSaved={() => { closeOrgModal(); fetchOrgs(); }}
        />
      )}
      {founderModal && (
        <FounderModal
          org={founderModal}
          onClose={closeFounderModal}
          onSaved={() => { closeFounderModal(); fetchOrgs(); }}
        />
      )}
    </div>
  );
}
