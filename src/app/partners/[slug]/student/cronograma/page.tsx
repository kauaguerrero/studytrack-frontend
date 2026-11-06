'use client';

// Cronograma Inteligente (ENEM).
// Layout do esboço: cabeçalho (semana/mês + navegação) → quadro de dias →
// chat com o agente + chips | painel de insights.
// Regras de agenda/SRS vivem no backend; esta página só exibe e envia ações.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ElevatedCard, RevealGroup, RevealItem, Segmented, SectionTitle } from '@/components/partners/founder-ui';
import { useOrg } from '@/contexts/OrgContext';
import { WeekBoard, type ReviewGroup } from '@/components/cronograma/WeekBoard';
import { MonthGrid } from '@/components/cronograma/MonthGrid';
import { InsightsPanel } from '@/components/cronograma/InsightsPanel';
import { AgentChat } from '@/components/cronograma/AgentChat';
import { SetupWizard } from '@/components/cronograma/SetupWizard';
import { StartStudyModal, type StartTarget } from '@/components/cronograma/StartStudyModal';
import { ReviewQuizModal } from '@/components/cronograma/ReviewQuizModal';
import { ReviewListModal } from '@/components/cronograma/ReviewListModal';
import {
  CronogramaApiError, MONTHS, addDays, cronogramaFetch, parseISODate, toISODate, weekStart,
  type CronogramaStatus, type CronogramaView, type Insights, type PlanItem, type Proposal,
} from '@/lib/cronograma';

type Mode = 'semana' | 'mes';

function monthGridStart(anchor: string): string {
  const d = parseISODate(anchor);
  return weekStart(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)));
}

/** Segundas-feiras das semanas que tocam o mês de `anchor`. */
function weeksOfMonth(anchor: string): string[] {
  const d = parseISODate(anchor);
  const last = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const out: string[] = [];
  for (let w = monthGridStart(anchor); w <= last; w = addDays(w, 7)) out.push(w);
  return out;
}

export default function CronogramaPage() {
  return (
    <ModuleGuard permKey="cronograma_enabled" defaultEnabled={false}>
      <CronogramaInner />
    </ModuleGuard>
  );
}

function CronogramaInner() {
  const { slug } = useParams<{ slug: string }>();
  const { org } = useOrg();
  const [status, setStatus] = useState<CronogramaStatus | null>(null);
  const [mode, setMode] = useState<Mode>('semana');
  const [anchor, setAnchor] = useState<string | null>(null); // segunda da semana (ou dia do mês)
  const [view, setView] = useState<CronogramaView | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [startTarget, setStartTarget] = useState<StartTarget | null>(null);
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [reviewGroup, setReviewGroup] = useState<ReviewGroup | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await cronogramaFetch<CronogramaStatus>('/status'));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const range = useMemo(() => {
    if (!anchor) return null;
    return mode === 'semana' ? { start: anchor, days: 7 } : { start: monthGridStart(anchor), days: 42 };
  }, [anchor, mode]);

  const loadView = useCallback(async () => {
    if (!range) return;
    setLoadingView(true);
    try {
      const v = await cronogramaFetch<CronogramaView>(`/?start=${range.start}&days=${range.days}`);
      setView(v);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingView(false);
    }
  }, [range]);

  const loadInsights = useCallback(async () => {
    try { setInsights(await cronogramaFetch<Insights>('/insights')); } catch { /* painel é secundário */ }
  }, []);

  // Primeira carga: descobre "hoje" pelo backend (fuso de Brasília) e ancora na semana atual.
  useEffect(() => {
    if (!status?.has_plan || anchor) return;
    cronogramaFetch<CronogramaView>('/?days=1')
      .then((v) => setAnchor(weekStart(v.today)))
      .catch((e) => toast.error((e as Error).message));
  }, [status, anchor]);

  useEffect(() => { loadView(); }, [loadView]);
  useEffect(() => { if (status?.has_plan) loadInsights(); }, [status, loadInsights]);

  const refresh = useCallback(async () => {
    await Promise.all([loadView(), loadInsights()]);
  }, [loadView, loadInsights]);

  const today = view?.today ?? anchor ?? toISODate(new Date());

  // ── Ações ────────────────────────────────────────────────────────────────
  const move = async (itemId: string, toDate: string) => {
    if (!view) return;
    const before = view;
    // Otimista: o card já pula para o novo dia (animação), o backend replaneja o resto.
    setView({ ...view, items: view.items.map((i) => (i.id === itemId ? { ...i, date: toDate, pinned: true } : i)) });
    try {
      const r = await cronogramaFetch<{ warnings: { message: string }[] }>(`/items/${itemId}`, {
        method: 'PATCH', body: JSON.stringify({ to_date: toDate, version: before.plan.version }),
      });
      r.warnings?.forEach((w) => toast.warning(w.message));
      await refresh();
    } catch (e) {
      setView(before);
      toast.error((e as Error).message);
      if ((e as CronogramaApiError).status === 409) refresh();
    }
  };

  const complete = async (id: string) => {
    setActionBusy(true);
    try {
      await cronogramaFetch(`/items/${id}/complete`, { method: 'POST' });
      toast.success('Conteúdo concluído! A primeira revisão fica para amanhã.');
      setStartTarget(null);
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setActionBusy(false); }
  };

  const skip = async (id: string) => {
    setActionBusy(true);
    try {
      await cronogramaFetch(`/items/${id}/skip`, { method: 'POST' });
      toast('Conteúdo remarcado para outro dia.');
      setStartTarget(null);
      await refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setActionBusy(false); }
  };

  const propose = async (body: Record<string, unknown>) => {
    setAgentBusy(true);
    try {
      const p = await cronogramaFetch<Proposal>('/agent', { method: 'POST', body: JSON.stringify(body) });
      setProposal(p);
      if (p.status === 'proposed' && mode !== 'semana') setMode('semana');
    } catch (e) {
      toast.error((e as Error).message, { duration: (e as CronogramaApiError).status === 429 ? 8000 : 4000 });
    } finally { setAgentBusy(false); }
  };

  const confirm = async () => {
    if (!proposal) return;
    setAgentBusy(true);
    try {
      await cronogramaFetch(`/agent/${proposal.request_id}/confirm`, { method: 'POST' });
      setProposal(null);
      setCanUndo(true);
      toast.success('Cronograma atualizado.');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setProposal(null);
      await refresh();
    } finally { setAgentBusy(false); }
  };

  const discard = async () => {
    if (!proposal) return;
    const id = proposal.request_id;
    setProposal(null);
    if (proposal.status === 'proposed') {
      cronogramaFetch(`/agent/${id}/discard`, { method: 'POST' }).catch(() => {});
    }
  };

  const undo = async () => {
    setAgentBusy(true);
    try {
      await cronogramaFetch('/agent/undo', { method: 'POST' });
      setCanUndo(false);
      toast.success('Alteração desfeita.');
      await refresh();
    } catch (e) { toast.error((e as Error).message); setCanUndo(false); } finally { setAgentBusy(false); }
  };

  // ── Prévia: o quadro mostra os itens propostos e destaca o que muda ───────
  const previewIds = useMemo(() => {
    if (!proposal || proposal.status !== 'proposed') return undefined;
    return new Set(proposal.diff.moved.map((m) => m.id!).filter(Boolean));
  }, [proposal]);

  const boardItems: PlanItem[] = useMemo(() => {
    if (!view) return [];
    if (proposal?.status === 'proposed' && mode === 'semana' && range) {
      const end = addDays(range.start, 7);
      const preview = proposal.preview_items.filter((i) => i.date >= range.start && i.date < end);
      const previewKeys = new Set(preview.map((i) => i.id));
      // Fora do horizonte da prévia (dias passados), mantém o que já existe.
      const rest = view.items.filter((i) => i.date < today && !previewKeys.has(i.id));
      return [...rest, ...preview].map((i, k) => ({ ...i, id: i.id ?? `preview-${k}` }));
    }
    return view.items;
  }, [view, proposal, mode, range, today]);

  // ── Navegação ─────────────────────────────────────────────────────────────
  const goWeeks = (n: number) => setAnchor((a) => (a ? addDays(weekStart(a), 7 * n) : a));
  const goMonths = (n: number) => setAnchor((a) => {
    if (!a) return a;
    const d = parseISODate(a);
    return toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
  });
  const minStart = addDays(today, -30);

  if (!status) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }
  if (!status.enabled) {
    return <p className="p-6 text-[14px] text-slate-600">O cronograma não está habilitado para a sua escola.</p>;
  }
  if (!status.has_plan) {
    return (
      <div className="px-4 py-6 lg:px-8">
        <h1 className="font-display mb-1 text-center text-[26px] font-black text-slate-900 dark:text-white">Cronograma Inteligente</h1>
        <p className="mx-auto mb-6 max-w-xl text-center text-[14px] text-slate-600 dark:text-white/65">
          Um plano de estudos até o ENEM que respeita a ordem dos conteúdos, prioriza o que mais cai e agenda revisões no tempo certo para você não esquecer.
        </p>
        <SetupWizard defaults={status.defaults!} onCreated={() => { setAnchor(null); loadStatus(); }} />
      </div>
    );
  }

  const anchorDate = anchor ? parseISODate(mode === 'semana' ? addDays(anchor, 3) : anchor) : new Date();
  const monthLabel = `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  const weeks = anchor ? weeksOfMonth(toISODate(anchorDate)) : [];

  return (
    <RevealGroup className="space-y-4 px-4 py-5 lg:space-y-5 lg:px-8 lg:py-7">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <RevealItem>
        <ElevatedCard accentColor="var(--brand-primary)">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--brand-primary)' }}>
                {org.name} · ENEM {parseISODate(status.plan!.exam_date).getFullYear()}
              </p>
              <h1 className="font-display text-[24px] font-black text-slate-900 dark:text-white">Cronograma Inteligente</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented<Mode>
                options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]}
                value={mode}
                onChange={(m) => { setMode(m); if (m === 'semana' && anchor) setAnchor(weekStart(anchor < today && mode === 'mes' ? today : anchor)); }}
                hex={org.brand_primary}
              />
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/10">
                <button type="button" aria-label={mode === 'semana' ? 'Semana anterior' : 'Mês anterior'}
                  disabled={!range || range.start <= minStart}
                  onClick={() => (mode === 'semana' ? goWeeks(-1) : goMonths(-1))}
                  className="rounded-full p-1.5 text-slate-600 hover:bg-white disabled:opacity-30 dark:text-white/70 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[110px] text-center text-[13px] font-bold capitalize text-slate-800 dark:text-white">{monthLabel}</span>
                <button type="button" aria-label={mode === 'semana' ? 'Próxima semana' : 'Próximo mês'}
                  onClick={() => (mode === 'semana' ? goWeeks(1) : goMonths(1))}
                  className="rounded-full p-1.5 text-slate-600 hover:bg-white dark:text-white/70 dark:hover:bg-slate-800">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button type="button" onClick={() => { setMode('semana'); setAnchor(weekStart(today)); }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
                Hoje
              </button>
            </div>
          </div>
          {mode === 'semana' && weeks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-4 lg:px-5" role="tablist" aria-label="Semanas do mês">
              {weeks.map((w, k) => {
                const active = anchor === w;
                return (
                  <button key={w} type="button" role="tab" aria-selected={active}
                    disabled={w < weekStart(minStart)}
                    onClick={() => setAnchor(w)}
                    className={`rounded-full px-3.5 py-1 text-[12px] font-bold transition disabled:opacity-30 ${active ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-white/65'}`}
                    style={active ? { background: 'var(--brand-primary)' } : undefined}>
                    Semana {k + 1}
                  </button>
                );
              })}
            </div>
          )}
        </ElevatedCard>
      </RevealItem>

      {/* ── Quadro ────────────────────────────────────────────────────────── */}
      <RevealItem>
        <div className="relative">
          {loadingView && !view && <div className="h-[340px] animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />}
          {view && mode === 'semana' && (
            <WeekBoard
              days={view.days}
              items={boardItems}
              today={today}
              readOnly={!!proposal}
              highlightIds={previewIds}
              onMove={move}
              onOpenItem={(i) => setStartTarget(i)}
              onOpenReviews={(g) => setReviewGroup(g)}
            />
          )}
          {view && mode === 'mes' && anchor && (
            <ElevatedCard><div className="p-3 lg:p-4">
              <MonthGrid days={view.days} items={view.items} projection={view.projection} today={today}
                month={parseISODate(anchor).getMonth()}
                onPickDay={(d) => { setMode('semana'); setAnchor(weekStart(d < minStart ? today : d)); }} />
            </div></ElevatedCard>
          )}
          {loadingView && view && (
            <div className="pointer-events-none absolute right-3 top-3"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
          )}
          {proposal?.status === 'proposed' && (
            <p className="mt-2 text-center text-[12px] font-semibold text-amber-700 dark:text-amber-300">
              Prévia: os cards destacados mudam se você confirmar.
            </p>
          )}
        </div>
      </RevealItem>

      {/* ── Chat + insights ───────────────────────────────────────────────── */}
      <RevealItem className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <ElevatedCard>
          <div className="p-4 lg:p-5">
            <SectionTitle kicker="Assistente" title="Ajuste seu cronograma" hex={org.brand_primary} />
            <AgentChat
              today={today}
              proposal={proposal}
              busy={agentBusy}
              canUndo={canUndo}
              onSend={(message) => propose({ message })}
              onChip={(b) => propose(b)}
              onConfirm={confirm}
              onDiscard={discard}
              onUndo={undo}
            />
          </div>
        </ElevatedCard>
        <div className="rounded-[20px] bg-sky-50 p-4 dark:bg-sky-500/10 lg:p-5">
          <SectionTitle kicker="Sua semana" title="Como você está indo" hex="#0284c7" colorVar="#0284c7"
            action={<CalendarRange className="h-4 w-4 text-sky-600" />} />
          <InsightsPanel data={insights} />
        </div>
      </RevealItem>

      <StartStudyModal
        slug={slug}
        target={startTarget}
        busy={actionBusy}
        onClose={() => setStartTarget(null)}
        onComplete={complete}
        onSkip={skip}
        onStartReview={(t) => { setStartTarget(null); setReviewItemId(t.id); }}
      />
      <ReviewListModal
        group={reviewGroup}
        onClose={() => setReviewGroup(null)}
        onStart={(i) => { setReviewGroup(null); setReviewItemId(i.id); }}
      />
      <ReviewQuizModal
        itemId={reviewItemId}
        onClose={() => setReviewItemId(null)}
        onDone={() => { refresh(); }}
      />
    </RevealGroup>
  );
}
