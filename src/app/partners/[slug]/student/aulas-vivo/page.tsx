'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { cn } from '@/lib/utils';
import { readableBrandText } from '@/lib/brand-color';
import { RevealGroup, RevealItem, ElevatedCard, SectionTitle } from '@/components/partners/founder-ui';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { Radio, Clock, Loader2, AlertCircle, LogOut, Calendar } from 'lucide-react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type LiveClassStatus = 'scheduled' | 'provisioning' | 'live' | 'ended' | 'failed' | 'cancelled';

interface LiveClass {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number | null;
  max_participants: number | null;
  status: LiveClassStatus;
  created_at: string;
}

interface JoinPendingResponse {
  ready: false;
  status: 'scheduled' | 'provisioning';
  retry_after_seconds: number;
}

interface JoinErrorResponse {
  ready: false;
  status: 'failed' | 'ended' | 'cancelled';
  error: string;
}

interface JoinSuccessResponse {
  ready: true;
  join_url: string;
}

type JoinResponse = JoinSuccessResponse | JoinPendingResponse | JoinErrorResponse;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatStartsAt(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(
      new Date(isoDate)
    );
  } catch {
    return isoDate;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';
  return { Authorization: `Bearer ${token}` };
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function StudentAulasVivoPage() {
  const { slug } = useParams<{ slug: string }>();
  const { org } = useOrg();
  const liveClassesEnabled = org.permissions?.live_classes_enabled === true;

  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Classe sendo aguardada (sala ainda não pronta) e classe ativa (iframe aberto)
  const [waitingClass, setWaitingClass] = useState<LiveClass | null>(null);
  const [activeJoinUrl, setActiveJoinUrl] = useState<string | null>(null);
  const [activeClassTitle, setActiveClassTitle] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPoll() {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }

  // ── Fetch lista de aulas ──────────────────────────────────────────────────

  async function loadLiveClasses() {
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
      const headers = await getAuthHeader();
      const res = await fetch(`${api}/api/partners/${slug}/live-classes`, {
        headers,
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: LiveClass[] = data.live_classes ?? [];
      list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      setLiveClasses(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!liveClassesEnabled) return;
    loadLiveClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, liveClassesEnabled]);

  // Garante que nenhum polling fique pendente após desmontar o componente
  useEffect(() => {
    return () => clearPoll();
  }, []);

  // ── Entrar na aula ─────────────────────────────────────────────────────────

  async function pollJoin(liveClass: LiveClass) {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000';
      const headers = await getAuthHeader();
      const res = await fetch(`${api}/api/partners/${slug}/live-classes/${liveClass.id}/join`, {
        method: 'POST',
        headers,
      });

      if (res.status === 409) {
        const data = (await res.json()) as JoinErrorResponse;
        setJoinError(data.error ?? 'Não foi possível entrar nesta aula.');
        setWaitingClass(null);
        return;
      }

      if (!res.ok) {
        setJoinError('Erro ao entrar na aula. Tente novamente.');
        setWaitingClass(null);
        return;
      }

      const data = (await res.json()) as JoinResponse;

      if (data.ready) {
        setActiveJoinUrl(data.join_url);
        setActiveClassTitle(liveClass.title);
        setWaitingClass(null);
        setJoinError(null);
        return;
      }

      // Ainda não está pronta: continua aguardando e tenta de novo
      // (já tratamos 409/!res.ok acima, então o único caso restante é "pending")
      const pending = data as JoinPendingResponse;
      setWaitingClass(liveClass);
      const retrySeconds = pending.retry_after_seconds > 0 ? pending.retry_after_seconds : 10;
      clearPoll();
      pollTimeoutRef.current = setTimeout(() => pollJoin(liveClass), retrySeconds * 1000);
    } catch {
      setJoinError('Erro ao entrar na aula. Verifique sua conexão e tente novamente.');
      setWaitingClass(null);
    }
  }

  function handleJoinClick(liveClass: LiveClass) {
    setJoinError(null);
    setWaitingClass(liveClass);
    pollJoin(liveClass);
  }

  function handleCancelWaiting() {
    clearPoll();
    setWaitingClass(null);
  }

  function handleLeaveActiveClass() {
    clearPoll();
    setActiveJoinUrl(null);
    setActiveClassTitle(null);
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <ModuleGuard permKey="live_classes_enabled" defaultEnabled={false}>
      <RevealGroup className="mx-auto max-w-5xl space-y-4 px-4 py-5 md:px-6 md:py-8 md:space-y-5">

        {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
        <RevealItem className="flex items-center gap-3">
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
            <p className="text-[12px] text-slate-500 dark:text-white/45">Participe das aulas ao vivo da sua turma</p>
          </div>
        </RevealItem>

        {/* ── Tela da aula ativa (iframe BBB em tela cheia) ──────────────────── */}
        {activeJoinUrl ? (
          <RevealItem className="space-y-3">
            <ElevatedCard accentColor="#10b981">
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400">
                    Ao vivo agora
                  </p>
                  <h2 className="truncate font-display text-base font-black text-slate-900 dark:text-white">
                    {activeClassTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleLeaveActiveClass}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-[12.5px] font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair da aula
                </button>
              </div>
            </ElevatedCard>
            <div className="relative h-[75vh] w-full overflow-hidden rounded-[20px] bg-black shadow-lg">
              <iframe
                key={activeJoinUrl}
                src={activeJoinUrl}
                className="absolute inset-0 h-full w-full"
                allow="camera; microphone; display-capture; autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </RevealItem>
        ) : waitingClass ? (
          /* ── Tela de espera (aguardando sala ficar pronta) ────────────────── */
          <RevealItem>
            <ElevatedCard accentColor="#f59e0b">
              <div className="flex flex-col items-center justify-center gap-4 p-10 text-center lg:p-16">
                <Loader2 className="h-9 w-9 animate-spin text-amber-500" />
                <div>
                  <p className="font-display text-base font-black text-slate-900 dark:text-white">
                    Preparando a sala, aguarde...
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-white/50">
                    {waitingClass.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelWaiting}
                  className="mt-1 text-[12.5px] font-bold text-slate-500 underline-offset-2 hover:underline dark:text-white/45"
                >
                  Cancelar e voltar para a lista
                </button>
              </div>
            </ElevatedCard>
          </RevealItem>
        ) : (
          <>
            {joinError && (
              <RevealItem>
                <div className="flex items-start gap-2.5 rounded-[16px] bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{joinError}</span>
                </div>
              </RevealItem>
            )}

            {loading ? (
              <RevealItem className="space-y-3">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="h-28 animate-pulse rounded-[20px] bg-slate-200 dark:bg-white/10" />
                ))}
              </RevealItem>
            ) : liveClasses.length === 0 ? (
              <RevealItem>
                <ElevatedCard accentColor="var(--brand-primary)">
                  <div className="p-10 text-center">
                    <Radio className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-white/20" />
                    <p className="text-sm text-slate-500 dark:text-white/45">
                      Nenhuma aula ao vivo agendada no momento.
                    </p>
                  </div>
                </ElevatedCard>
              </RevealItem>
            ) : (
              <RevealItem className="space-y-3">
                <SectionTitle kicker="Sua turma" title="Próximas aulas" hex={org.brand_primary} />
                <div className="space-y-3">
                  {liveClasses.map((lc) => {
                    const isLive = lc.status === 'live';
                    const isProvisioning = lc.status === 'provisioning';
                    return (
                      <ElevatedCard
                        key={lc.id}
                        accentColor={isLive ? '#10b981' : isProvisioning ? '#f59e0b' : 'var(--brand-primary)'}
                        className={cn(isLive && 'ring-1 ring-emerald-400/60')}
                      >
                        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-display text-[15px] font-bold text-slate-900 dark:text-white">
                                {lc.title}
                              </h3>
                              {isLive && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  </span>
                                  AO VIVO AGORA
                                </span>
                              )}
                              {isProvisioning && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  Sala sendo preparada...
                                </span>
                              )}
                            </div>
                            {lc.description && (
                              <p className="mt-1 text-sm text-slate-500 dark:text-white/50">{lc.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-slate-400 dark:text-white/35">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                {lc.status === 'scheduled'
                                  ? `Agendada para ${formatStartsAt(lc.starts_at)}`
                                  : formatStartsAt(lc.starts_at)}
                              </span>
                              {lc.duration_minutes != null && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {lc.duration_minutes} min
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isLive}
                            onClick={() => handleJoinClick(lc)}
                            className={cn(
                              'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-extrabold transition-transform disabled:cursor-not-allowed disabled:opacity-40',
                              isLive && 'hover:scale-[1.02] active:scale-[0.97]',
                            )}
                            style={
                              isLive
                                ? { background: '#10b981', color: '#fff', boxShadow: '0 6px 16px -6px #10b981' }
                                : { background: 'var(--muted, #e2e8f0)', color: '#64748b' }
                            }
                          >
                            Entrar na aula
                          </button>
                        </div>
                      </ElevatedCard>
                    );
                  })}
                </div>
              </RevealItem>
            )}
          </>
        )}
      </RevealGroup>
    </ModuleGuard>
  );
}
