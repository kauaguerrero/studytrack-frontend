'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, FileText, Flame, Trophy, ArrowRight, GraduationCap } from 'lucide-react';
import { Typewriter } from '@/components/ui/typewriter';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { useOrg } from '@/contexts/OrgContext';
import { OnboardingDiagnosticModal } from '@/components/partners/gamification/OnboardingDiagnosticModal';
import { RankingPopup } from '@/components/partners/gamification/RankingPopup';
import { StreakPopup } from '@/components/partners/gamification/StreakPopup';
import { ShieldPopup } from '@/components/partners/gamification/ShieldPopup';
import { ContextualPopup } from '@/components/partners/gamification/ContextualPopup';
import { Top3Popup } from '@/components/partners/gamification/Top3Popup';
import { StreakBrokenPopup } from '@/components/partners/gamification/StreakBrokenPopup';
import { StreakPointsLostPopup } from '@/components/partners/gamification/StreakPointsLostPopup';
import { MonthEndScreen } from '@/components/partners/gamification/MonthEndScreen';
import { usePopupQueue } from '@/components/partners/gamification/PopupQueueContext';
import type { MonthlyCheckInResult } from '@/types/gamification';

// ─── Animation config ───────────────────────────────────────────────────────

const CONTAINER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

const ITEM_REDUCED = { hidden: {}, show: {} };

// ─── Streak progress helper (kept intact) ───────────────────────────────────

const STREAK_MILESTONES = [1, 3, 7, 14, 30, 60, 90];

function getStreakProgress(streak: number): { next: number; pct: number } {
  const next = STREAK_MILESTONES.find((m) => m > streak) ?? 100;
  const prev = [...STREAK_MILESTONES].reverse().find((m) => m <= streak) ?? 0;
  const pct = prev === next ? 100 : Math.round(((streak - prev) / (next - prev)) * 100);
  return { next, pct: Math.min(pct, 100) };
}

function getTop3Position(position: number | undefined): 1 | 2 | 3 {
  if (position === 1 || position === 2 || position === 3) return position;
  return 3;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  firstName: string;
  orgName: string;
  orgLogoUrl: string | null;
  slug: string;
  currentStreak: number;
  questionsCount: number;
  simuladosCount: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardClient({
  firstName,
  orgName,
  orgLogoUrl,
  slug,
  currentStreak,
  questionsCount,
  simuladosCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { org } = useOrg();
  const shouldReduce = useReducedMotion();
  const itemVariant = shouldReduce ? ITEM_REDUCED : ITEM;
  const containerVariant = shouldReduce ? { hidden: {}, show: {} } : CONTAINER;
  const [effectiveCurrentStreak, setEffectiveCurrentStreak] = useState(currentStreak);

  // Streak milestone progress (kept intact for hero badge)
  const { next: nextMilestone, pct: streakPct } = getStreakProgress(effectiveCurrentStreak);
  void nextMilestone; void streakPct; // retained for potential future use

  // ── Gamification hook ──────────────────────────────────────────────────────
  const {
    summary,
    popupState,
    ranking,
    submitMonthlyCheckIn,
    refreshRanking,
    dismissPopup,
    useShield: activateShield,
    applyStreakDecay,
    refreshSummary,
  } = usePartnerGamification();
  const { currentPopup, enqueuePopup, dismissCurrentPopup } = usePopupQueue();

  // ── Popup orchestration state ──────────────────────────────────────────────
  const [isResolvingStreakBroken, setIsResolvingStreakBroken] = useState(false);

  useEffect(() => {
    setEffectiveCurrentStreak(currentStreak);
  }, [currentStreak]);

  useEffect(() => {
    if (!popupState || popupState.type === 'none') return;

    if ((popupState.type === 'urgency' || popupState.type === 'motivation' || popupState.type === 'top3_entered') && !ranking) {
      void refreshRanking(10);
      return;
    }

    switch (popupState.type) {
      case 'onboarding':
        enqueuePopup({
          kind: 'onboarding',
          routeScope: 'dashboard',
          firstName,
          organizationName: orgName,
          dedupeKey: 'dashboard-onboarding',
        });
        break;
      case 'streak':
        enqueuePopup({
          kind: 'streak',
          routeScope: 'dashboard',
          streak: popupState.streak ?? effectiveCurrentStreak,
          dedupeKey: `streak:${popupState.streak ?? effectiveCurrentStreak}`,
        });
        break;
      case 'streak_broken':
        enqueuePopup({
          kind: 'streak_broken',
          routeScope: 'dashboard',
          streakLost: popupState.streak_lost ?? 1,
          shieldCount: summary?.shield_count ?? 0,
          dedupeKey: `streak-broken:${popupState.streak_lost ?? 1}`,
        });
        break;
      case 'urgency':
      case 'motivation':
        enqueuePopup({
          kind: 'contextual',
          routeScope: 'dashboard',
          popupState,
          ranking: ranking ?? null,
          slug,
          dedupeKey: `${popupState.type}:${popupState.position ?? 0}:${popupState.points_diff ?? popupState.points_to_top3 ?? 0}`,
        });
        break;
      case 'top3_entered':
        enqueuePopup({
          kind: 'top3_entered',
          routeScope: 'dashboard',
          position: getTop3Position(popupState.position),
          ranking: ranking ?? null,
          slug,
          dedupeKey: `top3:${popupState.position ?? 3}`,
        });
        break;
      case 'month_end':
        enqueuePopup({
          kind: 'month_end',
          routeScope: 'dashboard',
          winners: popupState.winners ?? [],
          organizationName: orgName,
          dedupeKey: `month-end:${popupState.month_reference ?? summary?.month_label ?? 'current'}`,
        });
        break;
      default:
        break;
    }

    dismissPopup();
  }, [
    dismissPopup,
    effectiveCurrentStreak,
    enqueuePopup,
    firstName,
    orgName,
    popupState,
    refreshRanking,
    ranking,
    slug,
    summary?.month_label,
    summary?.shield_count,
  ]);

  useEffect(() => {
    const forceCheckIn = searchParams.get('forceCheckIn') === '1';
    if (!forceCheckIn) return;
    if (!org.permissions?.monthly_identity_titles_v1) return;

    enqueuePopup({
      kind: 'onboarding',
      routeScope: 'dashboard',
      firstName,
      organizationName: orgName,
      dedupeKey: 'dashboard-onboarding',
    });
  }, [enqueuePopup, firstName, org.permissions?.monthly_identity_titles_v1, orgName, searchParams]);

  // Caminho sem escudo: aplica decay e enfileira StreakPointsLostPopup
  const handleStreakBrokenDismiss = useCallback(async (): Promise<void> => {
    setIsResolvingStreakBroken(true);
    try {
      const result = await applyStreakDecay();
      setEffectiveCurrentStreak(0);

      if (result) {
        await refreshSummary();
        if (result.points_deducted > 0) {
          enqueuePopup({
            kind: 'streak_points_lost',
            routeScope: 'dashboard',
            result,
            dedupeKey: `streak-points-lost:${result.points_deducted}:${result.current_rank}`,
          });
        }
      }

      dismissCurrentPopup();
    } finally {
      setIsResolvingStreakBroken(false);
    }
  }, [applyStreakDecay, dismissCurrentPopup, enqueuePopup, refreshSummary]);

  // Caminho com escudo: preserva streak, sem decay
  const handleUseShield = useCallback(async (): Promise<void> => {
    const result = await activateShield();
    if (result?.shield_used) {
      setEffectiveCurrentStreak(result.streak_preserved ?? currentStreak);
      enqueuePopup({
        kind: 'shield_popup',
        routeScope: 'dashboard',
        streakPreserved: result.streak_preserved ?? currentStreak,
        slug,
        dedupeKey: `shield-popup:${result.streak_preserved ?? currentStreak}`,
      });
    }
    dismissCurrentPopup();
  }, [activateShield, currentStreak, dismissCurrentPopup, enqueuePopup, slug]);

  const handleStreakDismiss = useCallback(() => {
    dismissCurrentPopup();
  }, [dismissCurrentPopup]);

  const handleDiagnosticComplete = useCallback(
    async (result: MonthlyCheckInResult) => {
      void result;
      dismissCurrentPopup();
      router.push(`/partners/${slug}/student/titulos`);
    },
    [dismissCurrentPopup, router, slug],
  );

  // ── Monthly ranking progress ───────────────────────────────────────────────
  const monthlyPts = summary?.monthly_points ?? 0;
  const monthlyGoal = summary?.monthly_goal ?? 1500;
  const goalReached = summary?.goal_reached ?? false;
  const goalProgressPct = summary?.goal_progress_pct ?? 0;
  const monthLabel = summary?.month_label ?? '';

  return (
    <>
      {/* ── Container raiz — fundo adaptado ao tema ────────────────────────── */}
      <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 pt-4 md:px-8 md:pt-8 pb-8 min-h-screen bg-slate-50 dark:bg-[#080808] transition-colors duration-200">
        <motion.div
          className="space-y-5"
          variants={containerVariant}
          initial="hidden"
          animate="show"
        >
          {/* ── 1. Hero Banner ─────────────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 shadow-xl bg-white dark:bg-[#0A0A0A] border border-slate-200 dark:border-white/5">
              {/* Glow top-right — só aparece no dark */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl opacity-0 dark:opacity-25"
                style={{ background: 'var(--brand-primary)' }}
              />
              <div
                className="pointer-events-none absolute right-10 bottom-0 h-20 w-20 rounded-full blur-2xl opacity-0 dark:opacity-10"
                style={{ background: 'var(--brand-primary)' }}
              />

              {/* Partículas SVG — só no dark */}
              <div className="dark:block hidden pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <svg aria-hidden="true" className="absolute inset-0 w-full h-full opacity-[0.25]" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <radialGradient id="hpg" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="1" />
                      <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {([
                    [85, 15, 1.5], [92, 45, 1], [75, 70, 2], [60, 25, 1], [95, 80, 1.5],
                    [50, 55, 1], [40, 10, 1.5], [30, 80, 1], [20, 40, 2], [10, 65, 1],
                  ] as [number, number, number][]).map(([cx, cy, r], i) => (
                    <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={r} fill="url(#hpg)">
                      <animate
                        attributeName="opacity"
                        values={i % 3 === 0 ? '0.6;1;0.6' : i % 3 === 1 ? '0.3;0.8;0.3' : '0.8;0.3;0.8'}
                        dur={`${3 + (i % 5)}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </svg>
              </div>

              <div className="relative z-10">
                {/* org tag */}
                <div className="mb-4 flex items-center gap-2">
                  {orgLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={orgLogoUrl}
                      alt={orgName}
                      className="h-6 w-6 rounded object-contain bg-slate-100 dark:bg-white/10 p-0.5"
                    />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-slate-300 dark:opacity-40 dark:text-slate-100" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/50">
                    {orgName}
                  </span>
                </div>

                {/* Título */}
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-white">
                  Olá, {firstName}!
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-white/50">
                  Cada questão te aproxima da aprovação.
                </p>

                {/* Badges */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80">
                    <Flame className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                    {effectiveCurrentStreak} {effectiveCurrentStreak === 1 ? 'Dia' : 'Dias'} de Sequência
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80">
                    <BookOpen className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                    {questionsCount.toLocaleString('pt-BR')} {questionsCount === 1 ? 'Questão' : 'Questões'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80">
                    <FileText className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                    {simuladosCount} {simuladosCount === 1 ? 'Simulado' : 'Simulados'}
                  </span>
                </div>

                <div className="mt-4 md:hidden">
                  <div className="inline-flex w-full items-center rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-white/12 dark:bg-white/5 dark:text-white/85">
                    <span className="mr-[0.25em]">📚 Nós nascemos para</span>
                    <Typewriter
                      text={slug === 'edificar' ? ['Edificar sonhos.', 'Edificar futuros.', 'Edificar aprovações.', 'Edificar histórias.'] : ['Estudar.', 'Evoluir.', 'Conquistar.', 'Aprovar.']}
                      speed={95}
                      deleteSpeed={52}
                      waitTime={2600}
                      className="font-extrabold text-[var(--brand-primary)] max-w-full"
                      cursorClassName="ml-1 text-[var(--brand-primary)]"
                    />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 z-20 hidden md:block">
                <div className="inline-flex items-center rounded-full border border-slate-300 dark:border-white/12 bg-white dark:bg-white/5 px-4 py-2 text-sm sm:text-base text-slate-700 dark:text-white/85">
                  <span className="mr-[0.25em]">📚 Nós nascemos para</span>
                  <Typewriter
                    text={slug === 'edificar' ? ['Edificar sonhos.', 'Edificar futuros.', 'Edificar aprovações.', 'Edificar histórias.'] : ['Estudar.', 'Evoluir.', 'Conquistar.', 'Aprovar.']}
                    speed={95}
                    deleteSpeed={52}
                    waitTime={2600}
                    className="font-extrabold text-[var(--brand-primary)] max-w-full"
                    cursorClassName="ml-1 text-[var(--brand-primary)]"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── 2. Corrida para aprovação ──────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <div className="relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-[#0F0F0F] border border-slate-200 dark:border-white/6 shadow-sm dark:shadow-none">
              {/* Glow atrás da barra — só dark */}
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 opacity-0 dark:opacity-20 blur-xl"
                style={{
                  background: `linear-gradient(to top, color-mix(in srgb, var(--brand-primary) 40%, transparent), transparent)`,
                }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                    >
                      <Trophy className="h-3 w-3" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-white/35">
                      Corrida para aprovação
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    {monthLabel || 'Este mês'}
                  </span>
                </div>

                {/* Pontos em destaque */}
                <div className="mb-4">
                  <span className="text-4xl font-black tabular-nums" style={{ color: 'var(--brand-primary)' }}>
                    {monthlyPts.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-sm font-semibold ml-2 text-slate-400 dark:text-white/30">
                    / {monthlyGoal.toLocaleString('pt-BR')} pts
                  </span>
                </div>

                {/* Barra de progresso premium */}
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/6">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: goalReached
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : `linear-gradient(90deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 70%, white))`,
                      boxShadow: `0 0 12px color-mix(in srgb, var(--brand-primary) 40%, transparent)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${goalProgressPct}%` }}
                    transition={
                      shouldReduce
                        ? { duration: 0 }
                        : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }
                    }
                  />
                </div>

                {/* Status */}
                <p className="mt-3 text-[11px] font-medium text-slate-400 dark:text-white/30 flex items-center gap-1">
                  {summary
                    ? goalReached
                      ? <><Trophy className="h-3 w-3 text-amber-400 shrink-0" /> Você está entre os líderes do mês!</>
                      : `Faltam ${(monthlyGoal - monthlyPts).toLocaleString('pt-BR')} pts para entrar na disputa`
                    : 'Carregando…'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── 3. Action Cards ─────────────────────────────────────────────── */}
          <motion.div variants={itemVariant} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Simulados */}
            <Link href={`/partners/${slug}/student/simulado`} className="block group cursor-pointer h-full">
              <div
                className="relative overflow-hidden rounded-xl p-5 text-white transition-transform duration-200 active:scale-[0.98] hover:brightness-105 h-full shadow-md dark:shadow-none"
                style={{ background: `linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%)` }}
              >
                <div className="pointer-events-none absolute -right-4 -bottom-4 h-28 w-28 rounded-full bg-black/10 dark:bg-black/20" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                      Destaque
                    </p>
                    <h2 className="text-[18px] font-extrabold leading-tight text-white">Simulados</h2>
                    <p className="mt-1 text-xs text-white/80">
                      Faça simulados completos com TRI
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-white">
                    Começar agora
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Banco de Questões */}
            <Link href={`/partners/${slug}/student/banco-de-questoes`} className="block group cursor-pointer h-full">
              <div className="relative overflow-hidden rounded-xl p-5 h-full bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/7 shadow-sm dark:shadow-none transition-all duration-200 hover:border-slate-200 dark:hover:border-white/12 hover:shadow-md dark:hover:bg-white/[0.05] active:scale-[0.98]">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}
                    >
                      <BookOpen className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                    </div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                      Praticar
                    </p>
                    <h2 className="text-[18px] font-extrabold leading-tight text-slate-800 dark:text-white">
                      Banco de Questões
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                      Pratique com +5.000 questões do ENEM
                    </p>
                  </div>
                  <div
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    Explorar questões
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ── 4. StudyTrack CTA ───────────────────────────────────────────── */}
          <motion.div variants={itemVariant}>
            <Link
              href={`/partners/${slug}/student/studytrack`}
              className="group block rounded-xl overflow-hidden active:scale-[0.99] transition-transform duration-150"
            >
              <div className="relative p-4 flex items-center gap-3 bg-slate-900 dark:bg-[#111] border border-slate-800 dark:border-white/5">
                <div
                  className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl opacity-30"
                  style={{ background: 'var(--brand-primary)' }}
                />
                <div
                  className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
                >
                  <Trophy className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
                    Plataforma completa
                  </p>
                  <p className="text-sm font-extrabold text-white leading-tight truncate">
                    Acessar plataforma completa da StudyTrack
                  </p>
                </div>
                <ArrowRight
                  className="relative z-10 h-4 w-4 shrink-0 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Popups (Fila central) ───────────────────────────────────────── */}
      <AnimatePresence>
        {currentPopup?.kind === 'onboarding' && (
          <OnboardingDiagnosticModal
            firstName={firstName}
            organizationName={orgName}
            onComplete={handleDiagnosticComplete}
            submitMonthlyCheckIn={submitMonthlyCheckIn}
          />
        )}

        {currentPopup?.kind === 'ranking_popup' && (
          <RankingPopup
            ranking={currentPopup.ranking}
            onClose={dismissCurrentPopup}
          />
        )}

        {currentPopup?.kind === 'streak' && (
          <StreakPopup
            streak={currentPopup.streak}
            onDismiss={handleStreakDismiss}
          />
        )}

        {currentPopup?.kind === 'shield_popup' && (
          <ShieldPopup
            streakPreserved={currentPopup.streakPreserved}
            slug={currentPopup.slug}
            onDismiss={dismissCurrentPopup}
          />
        )}

        {currentPopup?.kind === 'contextual' && (
          <ContextualPopup
            popupState={currentPopup.popupState}
            ranking={currentPopup.ranking}
            slug={currentPopup.slug}
            onDismiss={dismissCurrentPopup}
          />
        )}

        {currentPopup?.kind === 'top3_entered' && (
          <Top3Popup
            position={currentPopup.position}
            ranking={currentPopup.ranking}
            slug={currentPopup.slug}
            onDismiss={dismissCurrentPopup}
          />
        )}

        {currentPopup?.kind === 'streak_broken' && (
          <StreakBrokenPopup
            streakLost={currentPopup.streakLost}
            shieldCount={currentPopup.shieldCount}
            onDismiss={handleStreakBrokenDismiss}
            onUseShield={handleUseShield}
            isLoading={isResolvingStreakBroken}
          />
        )}

        {currentPopup?.kind === 'streak_points_lost' && (
          <StreakPointsLostPopup
            pointsLost={currentPopup.result.points_deducted}
            rankDropped={currentPopup.result.rank_dropped}
            rivalName={currentPopup.result.rival_name}
            currentRank={currentPopup.result.current_rank}
            onDismiss={dismissCurrentPopup}
          />
        )}

        {currentPopup?.kind === 'month_end' && (
          <MonthEndScreen
            winners={currentPopup.winners}
            organizationName={currentPopup.organizationName}
            onContinue={dismissCurrentPopup}
          />
        )}
      </AnimatePresence>
    </>
  );
}
