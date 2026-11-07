'use client';

// Cronograma Inteligente (ENEM).
// Layout do esboço: cabeçalho (semana/mês + navegação) → quadro de dias →
// chat com o agente + chips | painel de insights.
// Regras de agenda/SRS vivem no backend; esta página só exibe e envia ações.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Loader2, CalendarDays, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ElevatedCard, RevealGroup, RevealItem, Segmented } from '@/components/partners/founder-ui';
import { useOrg } from '@/contexts/OrgContext';
import { onBrandText } from '@/lib/brand-color';
import { WeekBoard, type ReviewGroup } from '@/components/cronograma/WeekBoard';
import { MonthGrid } from '@/components/cronograma/MonthGrid';
import { InsightsPanel } from '@/components/cronograma/InsightsPanel';
import { AgentChat } from '@/components/cronograma/AgentChat';
import { NextStep } from '@/components/cronograma/NextStep';
import { PeriodWheel, type WheelEntry } from '@/components/cronograma/PeriodWheel';
import { CelebrationConfetti } from '@/components/cronograma/CelebrationConfetti';
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

  // Volta do banco de questões com a meta batida (?concluido=<id>): confete + aviso.
  const doneParam = useRef<string | null>(null);
  const [celebrate, setCelebrate] = useState(0);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const id = p.get('concluido');
    if (!id) return;
    doneParam.current = id;
    p.delete('concluido');
    const q = p.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
  }, []);
  useEffect(() => {
    if (!view || !doneParam.current) return;
    const id = doneParam.current;
    doneParam.current = null;
    const it = view.items.find((i) => i.id === id);
    setCelebrate((c) => c + 1);
    toast.success(it ? `Conteúdo concluído: ${it.topic}` : 'Conteúdo concluído!', { description: 'Mandou bem! A revisão já foi agendada.' });
  }, [view]);
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
      if (p.status === 'proposed' && mode !== 'semana') { setMode('semana'); setAnchor(weekStart(today)); }
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
  // No modo semana o rótulo diz qual semana do mês está na tela (a semana pertence ao mês da quinta-feira).
  const weekOfMonth = anchor && mode === 'semana'
    ? Math.round((parseISODate(weekStart(anchor)).getTime() - parseISODate(monthGridStart(toISODate(anchorDate))).getTime()) / (7 * 864e5)) + 1
    : 0;
  const navLabel = weekOfMonth ? `Semana ${weekOfMonth} · ${monthLabel}` : undefined;
  const wheel = buildWheel(mode, anchor ?? weekStart(today), today, minStart, mode === 'semana' ? view : null);

  const examYear = parseISODate(status.plan!.exam_date).getFullYear();
  const subtitle = insights
    ? `ENEM ${examYear} · faltam ${insights.weeks_to_exam} semanas · ${insights.coverage_pct}% do conteúdo estudado`
    : `${org.name} · ENEM ${examYear}`;

  return (
    // Mesmo esqueleto da página de Simulados: fundo cinza, coluna de 6xl, hero com voltar.
    <div className="relative min-h-screen -m-4 bg-slate-50 px-4 py-5 dark:bg-[#080808] md:-m-8 md:px-8 md:py-8">
    {celebrate > 0 && <CelebrationConfetti key={celebrate} />}
    <RevealGroup className="relative space-y-5 pb-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {/* Topo: à esquerda título com os controles embaixo; à direita a roda de semanas + "Próximo passo". */}
      {/* Uma faixa só: título + modo à esquerda; à direita a roda (único navegador de período)
          e o "Próximo passo", lado a lado e com a mesma altura. Alinhados por baixo para não
          brigar com o avatar fixo no canto superior direito. */}
      <RevealItem className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between xl:gap-6 xl:pr-14">
        <div className="min-w-0 space-y-3">
        <div className="min-w-0">
          <Link href={`/partners/${slug}/student/dashboard`}
            className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:text-white/40 dark:hover:text-white/70">
            <ChevronLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-display text-[28px] font-black leading-tight text-slate-900 dark:text-white sm:text-[32px]">Cronograma</h1>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-white/40">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<Mode>
            options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              if (m === 'semana' && anchor) setAnchor(weekStart(anchor < today && mode === 'mes' ? today : anchor));
              // Mês abre no mesmo mês do rótulo da semana (o da quinta-feira).
              if (m === 'mes' && anchor && mode === 'semana') {
                const th = parseISODate(addDays(weekStart(anchor), 3));
                setAnchor(toISODate(new Date(th.getFullYear(), th.getMonth(), 1)));
              }
            }}
            hex={org.brand_primary}
          />
          {/* Secundário de propósito: o único botão forte do topo é o "Começar". */}
          <button type="button" onClick={() => { setMode('semana'); setAnchor(weekStart(today)); }}
            disabled={mode === 'semana' && anchor === weekStart(today)}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/10">
            <CalendarDays className="h-4 w-4" style={{ color: 'var(--brand-ink)' }} />Hoje
          </button>
        </div>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[330px_360px] xl:gap-4">
        {anchor && (
          <PeriodWheel
            ariaLabel={mode === 'semana' ? 'Seletor de semana' : 'Seletor de mês'}
            prev={wheel.prev} current={wheel.current} next={wheel.next} detail={wheel.detail} sub={navLabel}
            onPrev={() => (mode === 'semana' ? goWeeks(-1) : goMonths(-1))}
            onNext={() => (mode === 'semana' ? goWeeks(1) : goMonths(1))}
            className="h-full"
          />
        )}
        {view && <NextStep items={view.items} today={today} onOpen={(i) => setStartTarget(i)} />}
        </div>
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
              readOnly={proposal?.status === 'proposed'}
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
      <RevealItem className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
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
        {/* Mesmo cabeçalho e mesmo cartão branco do assistente: as duas colunas começam alinhadas. */}
        <section aria-label="Sua semana" className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--brand-ink) 12%, transparent)', color: 'var(--brand-ink)' }}>
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-[15px] font-bold leading-tight text-slate-900 dark:text-white">Como você está indo</p>
              <p className="text-[11.5px] text-slate-500 dark:text-white/50">Ritmo, constância e o que já foi estudado.</p>
            </div>
          </div>
          <div className="flex-1 rounded-[22px] p-3.5 shadow-[0_2px_4px_-2px_rgba(15,23,42,0.08),0_22px_40px_-20px_rgba(15,23,42,0.45)] ring-1 ring-black/5 dark:ring-white/10"
            style={{ background: 'var(--brand-primary)', color: onBrandText(org.brand_primary) }}>
            <InsightsPanel data={insights} />
          </div>
        </section>
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
        ? `${formatMinutes(planned)}${countable.length ? ` · ${done}/${countable.length}` : ''}`
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
