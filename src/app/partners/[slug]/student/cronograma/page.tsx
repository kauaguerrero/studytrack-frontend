'use client';

// Cronograma Inteligente (ENEM).
// Layout do esboço: cabeçalho (semana/mês + navegação) → quadro de dias →
// chat com o agente + chips | painel de insights.
// Regras de agenda/SRS vivem no backend; esta página só exibe e envia ações.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ElevatedCard, RevealGroup, RevealItem, Segmented, SectionTitle } from '@/components/partners/founder-ui';
import { useOrg } from '@/contexts/OrgContext';
import { onBrandText } from '@/lib/brand-color';
import { WeekBoard, type ReviewGroup } from '@/components/cronograma/WeekBoard';
import { MonthGrid } from '@/components/cronograma/MonthGrid';
import { InsightsPanel } from '@/components/cronograma/InsightsPanel';
import { AgentChat } from '@/components/cronograma/AgentChat';
import { NextStep } from '@/components/cronograma/NextStep';
import { PeriodWheel, type WheelEntry } from '@/components/cronograma/PeriodWheel';
import { SetupWizard } from '@/components/cronograma/SetupWizard';
import { StartStudyModal, type StartTarget } from '@/components/cronograma/StartStudyModal';
import { ReviewQuizModal } from '@/components/cronograma/ReviewQuizModal';
import { ReviewListModal } from '@/components/cronograma/ReviewListModal';
import {
  CronogramaApiError, MONTHS, addDays, cronogramaFetch, formatDayMonth, formatMinutes, parseISODate, toISODate, weekStart,
  type CronogramaStatus, type CronogramaView, type Insights, type PlanItem, type Proposal,
} from '@/lib/cronograma';

type Mode = 'semana' | 'mes';

function monthGridStart(anchor: string): string {
  const d = parseISODate(anchor);
  return weekStart(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)));
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

  // Navegar rápido dispara várias cargas; só a mais recente pode ir para a tela
  // (senão uma resposta lenta da semana anterior sobrescreve a atual).
  const viewSeq = useRef(0);
  const loadView = useCallback(async () => {
    if (!range) return;
    const seq = ++viewSeq.current;
    setLoadingView(true);
    try {
      const v = await cronogramaFetch<CronogramaView>(`/?start=${range.start}&days=${range.days}`);
      if (seq === viewSeq.current) setView(v);
    } catch (e) {
      if (seq === viewSeq.current) toast.error((e as Error).message);
    } finally {
      if (seq === viewSeq.current) setLoadingView(false);
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

  // Aluno muda o tempo da prévia direto (sem IA, não gasta cota).
  const adjust = async (index: number, minutes: number) => {
    if (!proposal) return;
    setAgentBusy(true);
    try {
      const p = await cronogramaFetch<Proposal>(`/agent/${proposal.request_id}/adjust`, {
        method: 'POST', body: JSON.stringify({ index, minutes }),
      });
      setProposal(p);
    } catch (e) {
      toast.error((e as Error).message);
      if ((e as CronogramaApiError).status === 409) setProposal(null);
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
    // Semanas além do horizonte gravado (14 dias): mostra a projeção do planner,
    // só leitura e marcada como "previsto" (o mês já mostrava; a semana ficava vazia).
    const projected: PlanItem[] = (view.projection ?? []).map((p, k) => ({
      ...p, id: `proj-${p.date}-${p.node_id}-${k}`, status: 'pending', pinned: false, source: 'planner',
      projected: true, position: k, review_due_on: null, depends_on_late: [],
    }));
    return [...view.items, ...projected];
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
  const monthShort = `${MONTHS[anchorDate.getMonth()].slice(0, 3)} ${anchorDate.getFullYear()}`;
  const wheel = buildWheel(mode, anchor ?? weekStart(today), today, minStart, mode === 'semana' ? view : null);

  const examYear = parseISODate(status.plan!.exam_date).getFullYear();
  const subtitle = insights
    ? `ENEM ${examYear} · faltam ${insights.weeks_to_exam} semanas · ${insights.coverage_pct}% do conteúdo estudado`
    : `${org.name} · ENEM ${examYear}`;

  return (
    // Mesmo esqueleto da página de Simulados: fundo cinza, coluna de 6xl, hero com voltar.
    <div className="relative min-h-screen -m-4 bg-slate-50 px-4 py-5 dark:bg-[#080808] md:-m-8 md:px-8 md:py-8">
    <RevealGroup className="relative space-y-5 pb-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Topo: à esquerda título + controles com a roda de semanas embaixo; à direita o "Próximo passo". */}
      <RevealItem className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center lg:gap-6">
        <div className="min-w-0 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-8">
        <div className="min-w-0">
          <Link href={`/partners/${slug}/student/dashboard`}
            className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70">
            <ChevronLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-display text-[28px] font-black leading-tight text-slate-900 dark:text-white sm:text-[32px]">Cronograma</h1>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-white/40">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:flex-wrap sm:gap-2">
          <Segmented<Mode>
            options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]}
            value={mode}
            onChange={(m) => { setMode(m); if (m === 'semana' && anchor) setAnchor(weekStart(anchor < today && mode === 'mes' ? today : anchor)); }}
            hex={org.brand_primary}
          />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-0.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.05] sm:flex-none">
            <button type="button" aria-label={mode === 'semana' ? 'Semana anterior' : 'Mês anterior'}
              disabled={!range || range.start <= minStart}
              onClick={() => (mode === 'semana' ? goWeeks(-1) : goMonths(-1))}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-white/70 dark:hover:bg-white/10">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 truncate text-center text-[12.5px] font-bold capitalize sm:min-w-[112px] sm:text-[13px] text-slate-800 dark:text-white"><span className="sm:hidden">{monthShort}</span><span className="hidden sm:inline">{monthLabel}</span></span>
            <button type="button" aria-label={mode === 'semana' ? 'Próxima semana' : 'Próximo mês'}
              onClick={() => (mode === 'semana' ? goWeeks(1) : goMonths(1))}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button type="button" onClick={() => { setMode('semana'); setAnchor(weekStart(today)); }}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-bold sm:px-3.5 transition-transform hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: org.brand_primary || 'var(--brand-primary)', color: onBrandText(org.brand_primary), boxShadow: `0 6px 16px -6px ${org.brand_primary || 'var(--brand-primary)'}` }}>
            <CalendarDays className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Hoje</span>
          </button>
        </div>
        </div>
        {anchor && (
          <PeriodWheel
            ariaLabel={mode === 'semana' ? 'Seletor de semana' : 'Seletor de mês'}
            prev={wheel.prev} current={wheel.current} next={wheel.next} detail={wheel.detail}
            onPrev={() => (mode === 'semana' ? goWeeks(-1) : goMonths(-1))}
            onNext={() => (mode === 'semana' ? goWeeks(1) : goMonths(1))}
            className="w-full sm:max-w-[420px]"
          />
        )}
        </div>
        {view && <NextStep items={view.items} today={today} onOpen={(i) => setStartTarget(i)} />}
      </RevealItem>

      {/* ── Quadro ────────────────────────────────────────────────────────── */}
      <RevealItem>
        <div className="relative">
          {loadingView && !view && <div className="h-[340px] animate-pulse rounded-[20px] bg-slate-200/60 dark:bg-white/5" />}
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

      {/* ── Assistente (balão flutuante, sem card) + Sua semana ─────────────────────── */}
      <RevealItem className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="relative">
          <div className="relative">
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
              onAdjust={adjust}
            />
          </div>
        </div>
        <ElevatedCard accentColor="var(--brand-primary)">
          <div className="p-4 lg:p-5">
            <SectionTitle kicker="Sua semana" title="Como você está indo" hex={org.brand_primary} />
            <InsightsPanel data={insights} />
          </div>
        </ElevatedCard>
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
    </div>
  );
}

// ─── Roda de período (estilo Outlook) ────────────────────────────────────────

function relWeeks(n: number): string {
  if (n === 0) return 'Esta semana';
  if (n === -1) return 'Semana passada';
  if (n === 1) return 'Próxima semana';
  return n > 1 ? `Daqui a ${n} semanas` : `Há ${-n} semanas`;
}

function relMonths(n: number): string {
  if (n === 0) return 'Este mês';
  if (n === -1) return 'Mês passado';
  if (n === 1) return 'Próximo mês';
  return n > 1 ? `Daqui a ${n} meses` : `Há ${-n} meses`;
}

function buildWheel(mode: Mode, anchor: string, today: string, minStart: string, view: CronogramaView | null) {
  if (mode === 'semana') {
    const cur = weekStart(anchor);
    const base = weekStart(today);
    const entry = (monday: string): WheelEntry => {
      const n = Math.round((parseISODate(monday).getTime() - parseISODate(base).getTime()) / (7 * 864e5));
      return {
        key: monday, label: `${formatDayMonth(monday)} – ${formatDayMonth(addDays(monday, 6))}`, hint: relWeeks(n),
        disabled: monday < weekStart(minStart),
      };
    };
    let detail: string | undefined;
    if (view && view.range.start === cur) {
      const planned = view.days.reduce((t, d) => t + d.minutes, 0);
      const countable = view.items.filter((i) => i.status !== 'skipped');
      const done = countable.filter((i) => i.status === 'done').length;
      detail = planned > 0
        ? `${formatMinutes(planned)} planejadas${countable.length ? ` · ${done}/${countable.length} feitos` : ''}`
        : 'Semana livre';
    }
    return { prev: entry(addDays(cur, -7)), current: entry(cur), next: entry(addDays(cur, 7)), detail };
  }
  const a = parseISODate(anchor);
  const t = parseISODate(today);
  const entry = (k: number): WheelEntry => {
    const d = new Date(a.getFullYear(), a.getMonth() + k, 1);
    const last = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const n = (d.getFullYear() - t.getFullYear()) * 12 + d.getMonth() - t.getMonth();
    return { key: toISODate(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, hint: relMonths(n), disabled: last < minStart };
  };
  return { prev: entry(-1), current: entry(0), next: entry(1), detail: undefined };
}
