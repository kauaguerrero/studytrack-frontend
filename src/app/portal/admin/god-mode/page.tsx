'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Crown, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight,
  ArrowLeft, Zap, ZapOff, Loader2, Medal, Building2, Sparkles,
} from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const LIMIT = 20;

interface LeaderboardEntry {
  source: 'real' | 'mock';
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  gamification_title: string | null;
  org_name: string | null;
  org_slug: string | null;
  national_points: number;
  rank: number;
}

interface MockCompetitor {
  id: string;
  full_name: string;
  org_label: string | null;
  avatar_url: string | null;
  national_points: number;
  monthly_questions_count: number;
  accuracy_pct: number;
  is_active: boolean;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  student_count: number;
}

interface OrgRankingEntry {
  id: string;
  full_name: string | null;
  monthly_points: number;
  national_bonus_points: number;
  rank: number;
}

interface Settings {
  season_label: string;
  bonus_active: boolean;
  bonus_multiplier: number;
  bonus_questions_total: number;
  daily_variation_min: number;
  daily_variation_max: number;
}

const inputCls =
  'h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';
const labelCls =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
  }, []);
  return token;
}

async function authedFetch<T>(token: string, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Erro na requisição');
  return data as T;
}

function Pagination({ page, total, limit, onChange }: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-1 pt-3 text-xs text-slate-500 dark:text-zinc-400">
      <span>{total} no total — página {page} de {totalPages}</span>
      <div className="flex gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 disabled:opacity-30"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CompetitorModal({
  open, onClose, onSaved, token, editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string;
  editing: MockCompetitor | null;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', org_label: '', national_points: 0, monthly_questions_count: 0, accuracy_pct: 0,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        full_name: editing.full_name,
        org_label: editing.org_label || '',
        national_points: editing.national_points,
        monthly_questions_count: editing.monthly_questions_count,
        accuracy_pct: editing.accuracy_pct,
      });
    } else {
      setForm({ full_name: '', org_label: '', national_points: 0, monthly_questions_count: 0, accuracy_pct: 0 });
    }
  }, [editing, open]);

  if (!open) return null;

  async function handleSave() {
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await authedFetch(token, `/api/admin/national-ranking/mock-competitors/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Competidor atualizado!');
      } else {
        await authedFetch(token, '/api/admin/national-ranking/mock-competitors', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Competidor mock criado!');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar competidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Plus className="h-4 w-4 text-violet-500" />
            {editing ? 'Editar competidor mock' : 'Novo competidor mock'}
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-6 py-4">
          <div>
            <label className={labelCls}>Nome completo *</label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Ex: Ana Beatriz Souza"
              autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Rótulo da org (opcional)</label>
            <input
              className={inputCls}
              value={form.org_label}
              onChange={(e) => setForm((f) => ({ ...f, org_label: e.target.value }))}
              placeholder="Ex: Cursinho Fictício SP"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Pontos</label>
              <input
                type="number"
                className={inputCls}
                value={form.national_points}
                onChange={(e) => setForm((f) => ({ ...f, national_points: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className={labelCls}>Questões</label>
              <input
                type="number"
                className={inputCls}
                value={form.monthly_questions_count}
                onChange={(e) => setForm((f) => ({ ...f, monthly_questions_count: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className={labelCls}>Acerto %</label>
              <input
                type="number"
                className={inputCls}
                value={form.accuracy_pct}
                onChange={(e) => setForm((f) => ({ ...f, accuracy_pct: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.full_name.trim()}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkCreateModal({
  open, onClose, onCreated, token,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  token: string;
}) {
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState(10);
  const [orgLabel, setOrgLabel] = useState('');
  const [pointsMin, setPointsMin] = useState('');
  const [pointsMax, setPointsMax] = useState('');
  const [questionsMin, setQuestionsMin] = useState('');
  const [questionsMax, setQuestionsMax] = useState('');
  const [accuracyMin, setAccuracyMin] = useState('');
  const [accuracyMax, setAccuracyMax] = useState('');

  if (!open) return null;

  function numOrUndefined(v: string) {
    return v.trim() === '' ? undefined : Number(v);
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const body = {
        count,
        org_label: orgLabel.trim() || undefined,
        points_min: numOrUndefined(pointsMin),
        points_max: numOrUndefined(pointsMax),
        questions_min: numOrUndefined(questionsMin),
        questions_max: numOrUndefined(questionsMax),
        accuracy_min: numOrUndefined(accuracyMin),
        accuracy_max: numOrUndefined(accuracyMax),
      };
      const res = await authedFetch<{ count: number }>(
        token, '/api/admin/national-ranking/mock-competitors/bulk-create',
        { method: 'POST', body: JSON.stringify(body) },
      );
      toast.success(`${res.count} competidores mock criados!`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar competidores em massa');
    } finally {
      setSaving(false);
    }
  }

  const rangeField = (label: string, min: string, setMin: (v: string) => void, max: string, setMax: (v: string) => void, step = '1') => (
    <div>
      <label className={labelCls}>{label} <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
      <div className="flex items-center gap-2">
        <input type="number" step={step} placeholder="mín" className={inputCls} value={min} onChange={(e) => setMin(e.target.value)} />
        <span className="text-slate-400">–</span>
        <input type="number" step={step} placeholder="máx" className={inputCls} value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 px-6 py-4">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Gerar competidores em massa
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-4">
          <div>
            <label className={labelCls}>Quantos competidores?</label>
            <input
              type="number" min={1} max={30}
              className={inputCls} value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value))))}
            />
            <p className="mt-1 text-[11px] text-slate-400">Máximo 30 por vez. Nomes gerados automaticamente.</p>
          </div>
          <div>
            <label className={labelCls}>Rótulo da org (opcional, aplicado a todos)</label>
            <input className={inputCls} value={orgLabel} onChange={(e) => setOrgLabel(e.target.value)} placeholder="Ex: Cursinho Fictício SP" />
          </div>
          {rangeField('Faixa de pontos', pointsMin, setPointsMin, pointsMax, setPointsMax)}
          {rangeField('Faixa de questões', questionsMin, setQuestionsMin, questionsMax, setQuestionsMax)}
          {rangeField('Faixa de % de acerto', accuracyMin, setAccuracyMin, accuracyMax, setAccuracyMax, '0.1')}
          <p className="text-[11px] text-slate-400">Sem faixa informada, o campo fica 0 pra todos (dá pra editar depois, um por um).</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400">Cancelar</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : `Gerar ${count}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function NationalTab({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editing, setEditing] = useState<MockCompetitor | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    authedFetch<{ ranking: LeaderboardEntry[]; total: number }>(
      token, `/api/admin/national-ranking/national?page=${page}&limit=${LIMIT}`
    )
      .then((data) => { setRows(data.ranking); setTotal(data.total); setSelected(new Set()); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar ranking'))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const mockRows = rows.filter((r) => r.source === 'mock');
  const allMockSelected = mockRows.length > 0 && mockRows.every((r) => selected.has(r.id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allMockSelected ? new Set() : new Set(mockRows.map((r) => r.id)));
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar este competidor mock?')) return;
    try {
      await authedFetch(token, `/api/admin/national-ranking/mock-competitors/${id}`, { method: 'DELETE' });
      toast.success('Competidor removido.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao apagar');
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Apagar ${selected.size} competidores mock selecionados?`)) return;
    try {
      await authedFetch(token, '/api/admin/national-ranking/mock-competitors/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      toast.success(`${selected.size} competidores removidos.`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao apagar em massa');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Top-2 ao vivo de cada organização real + competidores mock, ordenados por pontuação nacional.
        </p>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" /> Apagar selecionados ({selected.size})
            </button>
          )}
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Sparkles className="h-4 w-4" /> Gerar em massa
          </button>
          <button
            onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Adicionar competidor mock
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" checked={allMockSelected} onChange={toggleSelectAll} disabled={mockRows.length === 0} />
              </th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Pontos</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Ninguém classificado ainda.</td></tr>
            ) : rows.map((r) => (
              <tr key={`${r.source}-${r.id}`} className="text-slate-800 dark:text-zinc-200">
                <td className="px-4 py-2.5">
                  {r.source === 'mock' && (
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelected(r.id)} />
                  )}
                </td>
                <td className="px-4 py-2.5 font-bold">
                  {r.rank <= 3 ? <Medal className="h-4 w-4 text-amber-500" /> : r.rank}
                </td>
                <td className="px-4 py-2.5 font-medium">{r.full_name}</td>
                <td className="px-4 py-2.5">
                  {r.source === 'mock' ? (
                    <span className="rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-fuchsia-600 dark:text-fuchsia-400">
                      MOCK{r.org_name ? ` · ${r.org_name}` : ''}
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-zinc-400">{r.org_name}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-bold">{r.national_points}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.source === 'mock' && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing({
                            id: r.id, full_name: r.full_name || '', org_label: r.org_name,
                            avatar_url: r.avatar_url, national_points: r.national_points,
                            monthly_questions_count: 0, accuracy_pct: 0, is_active: true,
                          });
                          setModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-indigo-500"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />

      <CompetitorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        token={token}
        editing={editing}
      />
      <BulkCreateModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onCreated={load}
        token={token}
      />
    </div>
  );
}

function OrgsTab({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [orgPage, setOrgPage] = useState(1);
  const [orgRanking, setOrgRanking] = useState<OrgRankingEntry[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    authedFetch<{ organizations: OrgRow[]; total: number }>(
      token, `/api/admin/national-ranking/orgs?page=${page}&limit=${LIMIT}`
    )
      .then((data) => { setOrgs(data.organizations); setTotal(data.total); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar orgs'))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => {
    if (!selectedOrg) return;
    setOrgLoading(true);
    authedFetch<{ ranking: OrgRankingEntry[]; total: number }>(
      token, `/api/admin/national-ranking/orgs/${selectedOrg.id}/ranking?page=${orgPage}&limit=${LIMIT}`
    )
      .then((data) => { setOrgRanking(data.ranking); setOrgTotal(data.total); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar ranking da org'))
      .finally(() => setOrgLoading(false));
  }, [token, selectedOrg, orgPage]);

  if (selectedOrg) {
    return (
      <div>
        <button
          onClick={() => { setSelectedOrg(null); setOrgPage(1); }}
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para orgs
        </button>
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
          Ranking completo — {selectedOrg.name}
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-zinc-800/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Pontos mensais</th>
                <th className="px-4 py-3">Bônus nacional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {orgLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : orgRanking.map((s) => (
                <tr key={s.id} className="text-slate-800 dark:text-zinc-200">
                  <td className="px-4 py-2.5 font-bold">{s.rank}</td>
                  <td className="px-4 py-2.5">{s.full_name}</td>
                  <td className="px-4 py-2.5">{s.monthly_points}</td>
                  <td className="px-4 py-2.5">{s.national_bonus_points || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={orgPage} total={orgTotal} limit={LIMIT} onChange={setOrgPage} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-zinc-800/60 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Organização</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Alunos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : orgs.map((o) => (
              <tr key={o.id} className="text-slate-800 dark:text-zinc-200">
                <td className="flex items-center gap-2 px-4 py-2.5 font-medium">
                  <Building2 className="h-4 w-4 text-slate-400" /> {o.name}
                </td>
                <td className="px-4 py-2.5 text-slate-500 dark:text-zinc-400">{o.plan_tier}</td>
                <td className="px-4 py-2.5">{o.student_count}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => { setSelectedOrg(o); setOrgPage(1); }}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Ver ranking completo
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={LIMIT} onChange={setPage} />
    </div>
  );
}

function ConfigTab({ token }: { token: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [seasonLabel, setSeasonLabel] = useState('');
  const [multiplier, setMultiplier] = useState(2);
  const [questionsTotal, setQuestionsTotal] = useState(10);
  const [variationMin, setVariationMin] = useState(5);
  const [variationMax, setVariationMax] = useState(40);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    authedFetch<Settings>(token, '/api/admin/national-ranking/settings').then((s) => {
      setSettings(s);
      setSeasonLabel(s.season_label || '');
      setMultiplier(s.bonus_multiplier || 2);
      setQuestionsTotal(s.bonus_questions_total || 10);
      setVariationMin(s.daily_variation_min ?? 5);
      setVariationMax(s.daily_variation_max ?? 40);
    });
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setSaving(true);
    try {
      await authedFetch(token, '/api/admin/national-ranking/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          season_label: seasonLabel,
          daily_variation_min: variationMin,
          daily_variation_max: variationMax,
        }),
      });
      toast.success('Configurações salvas.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleBonus() {
    try {
      if (settings?.bonus_active) {
        await authedFetch(token, '/api/admin/national-ranking/bonus/deactivate', { method: 'POST' });
        toast.success('Bônus desativado.');
      } else {
        await authedFetch(token, '/api/admin/national-ranking/bonus/activate', {
          method: 'POST',
          body: JSON.stringify({ multiplier, questions_total: questionsTotal }),
        });
        toast.success('Bônus ativado!');
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar bônus');
    }
  }

  if (!settings) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-5">
        <p className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Temporada</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Rótulo da temporada</label>
            <input className={inputCls} value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Variação diária dos mocks (pts/dia)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} className={inputCls} value={variationMin} onChange={(e) => setVariationMin(Number(e.target.value))} placeholder="mín" />
              <span className="text-slate-400">–</span>
              <input type="number" min={0} className={inputCls} value={variationMax} onChange={(e) => setVariationMax(Number(e.target.value))} placeholder="máx" />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Cada mock ativo ganha um valor aleatório dessa faixa por dia (via cron), pra não parecer ranking parado.</p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          Bônus de pontuação
          {settings.bonus_active && (
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
              Ativo
            </span>
          )}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Multiplicador</label>
              <input
                type="number" step="0.5" min="1.5"
                className={inputCls} value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                disabled={settings.bonus_active}
              />
            </div>
            <div>
              <label className={labelCls}>Nº de questões</label>
              <input
                type="number" min="1"
                className={inputCls} value={questionsTotal}
                onChange={(e) => setQuestionsTotal(Number(e.target.value))}
                disabled={settings.bonus_active}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Vale só pra quem está classificado (top-2 ao vivo da própria org) no momento de responder.
          </p>
          <button
            onClick={toggleBonus}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white ${
              settings.bonus_active ? 'bg-slate-500' : 'bg-gradient-to-r from-amber-500 to-orange-600'
            }`}
          >
            {settings.bonus_active ? <><ZapOff className="h-4 w-4" /> Desativar bônus</> : <><Zap className="h-4 w-4" /> Ativar bônus</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GodModePage() {
  const token = useAuthToken();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">God Mode — Ranking Nacional</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Disputa Nacional entre cursinhos</p>
        </div>
      </div>

      {!token ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <Tabs defaultValue="nacional">
          <TabsList>
            <TabsTrigger value="nacional">Ranking Nacional</TabsTrigger>
            <TabsTrigger value="orgs">Por Organização</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="nacional"><NationalTab token={token} /></TabsContent>
          <TabsContent value="orgs"><OrgsTab token={token} /></TabsContent>
          <TabsContent value="config"><ConfigTab token={token} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
