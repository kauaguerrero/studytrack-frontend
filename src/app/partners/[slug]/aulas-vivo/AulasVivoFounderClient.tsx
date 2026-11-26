'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { cn } from '@/lib/utils';
import { readableBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandButton,
} from '@/components/partners/founder-ui';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { Radio, Plus, X, LogOut, Loader2 } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type LiveClassStatus =
  | 'scheduled'
  | 'provisioning'
  | 'live'
  | 'ended'
  | 'failed'
  | 'cancelled';

export interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  max_participants: number | null;
  status: LiveClassStatus;
  created_at: string;
}

export interface LiveClassesPayload {
  live_classes: LiveClass[];
}

interface JoinReadyResponse {
  ready: true;
  join_url: string;
}

interface JoinNotReadyResponse {
  ready: false;
  status: 'scheduled' | 'provisioning';
  retry_after_seconds: number;
}

interface JoinErrorResponse {
  ready: false;
  status?: 'failed' | 'ended' | 'cancelled';
  error: string;
}

type JoinResponse = JoinReadyResponse | JoinNotReadyResponse | JoinErrorResponse;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<LiveClassStatus, string> = {
  scheduled: 'Agendada',
  provisioning: 'Preparando sala...',
  live: 'Ao vivo',
  ended: 'Encerrada',
  failed: 'Falha ao iniciar',
  cancelled: 'Cancelada',
};

const STATUS_CLASSNAME: Record<LiveClassStatus, string> = {
  scheduled: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60',
  provisioning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  live: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  ended: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/45',
  failed: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/45',
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toDatetimeLocalValue(iso: string): string {
  // Converte um ISO com timezone pro formato aceito por <input type="datetime-local">
  // (sem timezone, no fuso local do navegador).
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

interface FormState {
  title: string;
  description: string;
  startsAtLocal: string;
  durationMinutes: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  startsAtLocal: '',
  durationMinutes: '90',
};

// ── Componente ────────────────────────────────────────────────────────────────

function AulasVivoFounderContent({ slug, initialData }: { slug: string; initialData: LiveClassesPayload | null }) {
  const { org } = useOrg();

  const [liveClasses, setLiveClasses] = useState<LiveClass[]>(initialData?.live_classes ?? []);
  const [loading, setLoading] = useState(initialData === null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [activeJoinUrl, setActiveJoinUrl] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPoll, [clearPoll]);

  async function getAuthHeader(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    return { Authorization: `Bearer ${token}` };
  }

  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';

  const loadLiveClasses = useCallback(async () => {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${api}/api/partners/${slug}/live-classes`, {
        headers: authHeader,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data: LiveClassesPayload = await res.json();
      setLiveClasses(data.live_classes ?? []);
    } finally {
      setLoading(false);
    }
  }, [api, slug]);

  useEffect(() => {
    if (initialData === null) {
      loadLiveClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedLiveClasses = [...liveClasses].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(liveClass: LiveClass) {
    setEditingId(liveClass.id);
    setForm({
      title: liveClass.title,
      description: liveClass.description ?? '',
      startsAtLocal: toDatetimeLocalValue(liveClass.starts_at),
      durationMinutes: String(liveClass.duration_minutes ?? 90),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const title = form.title.trim();
    if (!title) {
      setFormError('Informe um título para a aula.');
      return;
    }
    if (!form.startsAtLocal) {
      setFormError('Informe a data e hora de início.');
      return;
    }

    const startsAt = new Date(form.startsAtLocal);
    if (Number.isNaN(startsAt.getTime())) {
      setFormError('Data e hora inválidas.');
      return;
    }

    const durationMinutes = parseInt(form.durationMinutes, 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setFormError('Duração inválida.');
      return;
    }

    const body = {
      title,
      description: form.description.trim() || null,
      starts_at: startsAt.toISOString(),
      duration_minutes: durationMinutes,
    };

    setSubmitting(true);
    try {
      const authHeader = await getAuthHeader();
      const isEditing = Boolean(editingId);
      const url = isEditing
        ? `${api}/api/partners/${slug}/live-classes/${editingId}`
        : `${api}/api/partners/${slug}/live-classes`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(data?.error ?? 'Não foi possível salvar a aula.');
        return;
      }

      closeForm();
      await loadLiveClasses();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(liveClass: LiveClass) {
    if (!window.confirm(`Cancelar a aula "${liveClass.title}"?`)) return;
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${api}/api/partners/${slug}/live-classes/${liveClass.id}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setJoinError(data?.error ?? 'Não foi possível cancelar a aula.');
        return;
      }
      await loadLiveClasses();
    } catch {
      setJoinError('Não foi possível cancelar a aula.');
    }
  }

  async function handleJoin(liveClass: LiveClass) {
    clearPoll();
    setJoinError(null);
    setJoiningId(liveClass.id);
    setJoinMessage(null);
    await pollJoin(liveClass.id);
  }

  async function pollJoin(liveClassId: string) {
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch(`${api}/api/partners/${slug}/live-classes/${liveClassId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({}),
      });
      const data: JoinResponse = await res.json();

      if (res.ok && data.ready) {
        setJoiningId(null);
        setJoinMessage(null);
        setActiveJoinUrl(data.join_url);
        return;
      }

      if (!res.ok || !data.ready) {
        const notReady = data as JoinNotReadyResponse | JoinErrorResponse;
        if ('error' in notReady) {
          setJoiningId(null);
          setJoinMessage(null);
          setJoinError(notReady.error);
          return;
        }
        setJoinMessage('Preparando a sala, aguarde...');
        const retryAfter = (notReady as JoinNotReadyResponse).retry_after_seconds ?? 10;
        pollTimeoutRef.current = setTimeout(() => {
          pollJoin(liveClassId);
        }, retryAfter * 1000);
      }
    } catch {
      setJoiningId(null);
      setJoinMessage(null);
      setJoinError('Não foi possível conectar à sala. Tente novamente.');
    }
  }

  function handleLeave() {
    setActiveJoinUrl(null);
    setJoiningId(null);
    setJoinMessage(null);
    clearPoll();
  }

  // ── Tela cheia de videochamada ────────────────────────────────────────────

  if (activeJoinUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white/80">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold">Aula ao vivo</span>
          </div>
          <BrandButton onClick={handleLeave} color="#ef4444">
            <LogOut className="h-4 w-4" />
            Sair
          </BrandButton>
        </div>
        <div className="relative flex-1 px-2 pb-2">
          <iframe
            src={activeJoinUrl}
            className="absolute inset-0 h-full w-full rounded-xl"
            allow="camera; microphone; display-capture; autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // ── JSX principal ─────────────────────────────────────────────────────────

  return (
    <RevealGroup className="mx-auto max-w-5xl space-y-4 px-4 py-5 md:px-6 md:py-8 md:space-y-5">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <RevealItem className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--brand-primary) 16%, white)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px color-mix(in srgb, var(--brand-primary) 22%, transparent)',
            }}
          >
            <Radio className="h-5 w-5" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)', 46) }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Aulas ao Vivo</h1>
            <p className="text-[12px] text-slate-500 dark:text-white/45">Agende e conduza aulas em videochamada</p>
          </div>
        </div>
        <BrandButton onClick={formOpen ? closeForm : openNewForm} color="var(--brand-primary)" hex={org.brand_primary}>
          {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {formOpen ? 'Fechar' : 'Nova aula'}
        </BrandButton>
      </RevealItem>

      {/* ── Erro de ação (join/cancelamento) ─────────────────────────────── */}
      {joinError && (
        <RevealItem>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <span>{joinError}</span>
            <button type="button" onClick={() => setJoinError(null)} className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </RevealItem>
      )}

      {/* ── Formulário inline ─────────────────────────────────────────────── */}
      {formOpen && (
        <RevealItem>
          <ElevatedCard accentColor="var(--brand-primary)">
            <form onSubmit={handleSubmit} className="space-y-3 p-4 lg:p-5">
              <SectionTitle
                kicker={editingId ? 'Editar' : 'Nova aula'}
                title={editingId ? 'Editar aula ao vivo' : 'Agendar aula ao vivo'}
                hex={org.brand_primary}
              />

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-white/50">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Revisão de Redação — Semana 3"
                  className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[color:var(--brand-primary)] dark:bg-slate-900 dark:text-white/80 dark:ring-white/10"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-white/50">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional"
                  className="min-h-20 w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[color:var(--brand-primary)] dark:bg-slate-900 dark:text-white/80 dark:ring-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-white/50">Data e hora de início *</label>
                  <input
                    type="datetime-local"
                    value={form.startsAtLocal}
                    onChange={(e) => setForm((f) => ({ ...f, startsAtLocal: e.target.value }))}
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[color:var(--brand-primary)] dark:bg-slate-900 dark:text-white/80 dark:ring-white/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-white/50">Duração (minutos)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[color:var(--brand-primary)] dark:bg-slate-900 dark:text-white/80 dark:ring-white/10"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full px-4 py-2 text-[13px] font-extrabold text-slate-500 transition hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80"
                >
                  Cancelar
                </button>
                <BrandButton type="submit" disabled={submitting} color="var(--brand-primary)" hex={org.brand_primary}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Salvar alterações' : 'Agendar'}
                </BrandButton>
              </div>
            </form>
          </ElevatedCard>
        </RevealItem>
      )}

      {/* ── Lista de aulas ───────────────────────────────────────────────── */}
      {loading ? (
        <RevealItem className="space-y-3">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-24 animate-pulse rounded-[20px] bg-slate-200 dark:bg-white/10" />
          ))}
        </RevealItem>
      ) : sortedLiveClasses.length === 0 ? (
        <RevealItem>
          <ElevatedCard accentColor="var(--brand-primary)">
            <div className="p-10 text-center">
              <Radio className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-white/20" />
              <p className="text-sm text-slate-500 dark:text-white/45">
                Nenhuma aula ao vivo agendada ainda.
              </p>
            </div>
          </ElevatedCard>
        </RevealItem>
      ) : (
        <RevealItem className="space-y-3">
          {sortedLiveClasses.map((liveClass) => {
            const isScheduled = liveClass.status === 'scheduled';
            const isLive = liveClass.status === 'live';
            const isJoiningThis = joiningId === liveClass.id;
            return (
              <ElevatedCard key={liveClass.id} accentColor="var(--brand-secondary)">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 lg:p-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display truncate text-[15px] font-bold text-slate-900 dark:text-white">
                        {liveClass.title}
                      </h3>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold',
                          STATUS_CLASSNAME[liveClass.status],
                        )}
                      >
                        {STATUS_LABEL[liveClass.status]}
                      </span>
                    </div>
                    {liveClass.description && (
                      <p className="mt-1 truncate text-[12.5px] text-slate-500 dark:text-white/45">
                        {liveClass.description}
                      </p>
                    )}
                    <p className="mt-1 text-[12px] text-slate-400 dark:text-white/35">
                      {formatDateTime(liveClass.starts_at)} · {liveClass.duration_minutes} min
                    </p>
                    {isJoiningThis && joinMessage && (
                      <p className="mt-1 text-[12px] font-semibold text-amber-600 dark:text-amber-400">
                        {joinMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isScheduled && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditForm(liveClass)}
                          className="rounded-full px-3 py-1.5 text-[12px] font-bold text-slate-500 transition hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(liveClass)}
                          className="rounded-full px-3 py-1.5 text-[12px] font-bold text-red-500 transition hover:text-red-600 dark:text-red-400"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                    <BrandButton
                      onClick={() => handleJoin(liveClass)}
                      disabled={!isLive || isJoiningThis}
                      color="var(--brand-primary)"
                      hex={org.brand_primary}
                      className="!px-3.5 !py-1.5 !text-xs"
                    >
                      {isJoiningThis && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Entrar
                    </BrandButton>
                  </div>
                </div>
              </ElevatedCard>
            );
          })}
        </RevealItem>
      )}
    </RevealGroup>
  );
}

export default function AulasVivoFounderClient({ slug, initialData }: { slug: string; initialData: LiveClassesPayload | null }) {
  return (
    <ModuleGuard permKey="live_classes_enabled" defaultEnabled={false}>
      <AulasVivoFounderContent slug={slug} initialData={initialData} />
    </ModuleGuard>
  );
}
