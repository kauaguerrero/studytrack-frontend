'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, FileText, Flame, Trophy, ArrowRight, GraduationCap } from 'lucide-react';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { OnboardingDiagnosticModal } from '@/components/partners/gamification/OnboardingDiagnosticModal';
import { RankingPopup } from '@/components/partners/gamification/RankingPopup';
import { StreakPopup } from '@/components/partners/gamification/StreakPopup';
import { ShieldPopup } from '@/components/partners/gamification/ShieldPopup';
import { ContextualPopup } from '@/components/partners/gamification/ContextualPopup';
import { Top3Popup } from '@/components/partners/gamification/Top3Popup';
import { StreakBrokenPopup } from '@/components/partners/gamification/StreakBrokenPopup';
import { MonthEndScreen } from '@/components/partners/gamification/MonthEndScreen';
import type { DiagnosticResult } from '@/types/gamification';

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  firstName: string;
  brandPrimary: string;
  orgName: string;
  orgLogoUrl: string | null;
  slug: string;
  currentStreak: number;
  totalPoints: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardClient({
  firstName,
  brandPrimary,
  orgName,
  orgLogoUrl,
  slug,
  currentStreak,
  totalPoints,
}: Props) {
  const shouldReduce = useReducedMotion();
  const itemVariant = shouldReduce ? ITEM_REDUCED : ITEM;
  const containerVariant = shouldReduce ? { hidden: {}, show: {} } : CONTAINER;

  // Streak milestone progress (kept intact for hero badge)
  const { next: nextMilestone, pct: streakPct } = getStreakProgress(currentStreak);
  void nextMilestone; void streakPct; // retained for potential future use

  // ── Gamification hook ──────────────────────────────────────────────────────
  const {
    summary,
    popupState,
    ranking,
    shieldResult,
    submitDiagnostic,
    refreshRanking,
    dismissPopup,
  } = usePartnerGamification();

  // ── Popup orchestration state ──────────────────────────────────────────────
  const [showRankingPopup, setShowRankingPopup] = useState(false);
  const [shieldPopupDismissed, setShieldPopupDismissed] = useState(false);

  // ── Pending question session points (from banco-de-questoes) ──────────────
  const [pendingQuestionPoints, setPendingQuestionPoints] = useState<number | null>(null);

  useEffect(() => {
    const PENDING_KEY = 'pending_question_points';
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    try {
      const { points, timestamp } = JSON.parse(raw) as { points: number; timestamp: number };
      if (Date.now() - timestamp < 5 * 60 * 1000 && points > 0) {
        setPendingQuestionPoints(points);
      }
    } catch { /* ignore */ } finally {
      localStorage.removeItem(PENDING_KEY);
    }
  }, []);

  // ── Streak popup: show at most once per day ────────────────────────────────
  const STREAK_POPUP_KEY = 'streak_popup_last_shown';
  const todayStr = new Date().toISOString().split('T')[0];
  const shouldShowStreak =
    popupState?.type === 'streak' &&
    localStorage.getItem(STREAK_POPUP_KEY) !== todayStr;

  const handleStreakDismiss = useCallback(() => {
    localStorage.setItem(STREAK_POPUP_KEY, new Date().toISOString().split('T')[0]);
    dismissPopup();
  }, [dismissPopup]);

  const handleDiagnosticComplete = useCallback(
    async (result: DiagnosticResult) => {
      void result;
      dismissPopup();
      // Wait 2s then load ranking and show popup
      setTimeout(async () => {
        await refreshRanking();
        setShowRankingPopup(true);
      }, 2000);
    },
    [dismissPopup, refreshRanking],
  );

  // ── Pre-fetch ranking when month-end popup is about to show ───────────────
  useEffect(() => {
    const isMonthEnd =
      popupState?.type === 'month_end' || popupState?.month_reset_pending;
    if (isMonthEnd && !ranking) {
      refreshRanking(10);
    }
  }, [popupState, ranking, refreshRanking]);

  // ── Monthly prize progress ─────────────────────────────────────────────────
  const monthlyPts = summary?.monthly_points ?? 0;
  const monthlyGoal = summary?.monthly_goal ?? 1500;
  const goalReached = summary?.goal_reached ?? false;
  const goalProgressPct = summary?.goal_progress_pct ?? 0;
  const monthLabel = summary?.month_label ?? '';

  return (
    <>
      {/* ── Container Principal (O vilão do fechamento estava aqui) ── */}
      <motion.div
        className="space-y-5"
        variants={containerVariant}
        initial="hidden"
        animate="show"
      >
        {/* ── 1. Hero Banner ───────────────────────────────────────────────── */}
        <motion.div variants={itemVariant}>
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 p-6 sm:p-8 shadow-xl border border-white/5">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl opacity-25"
              style={{ background: 'var(--brand-primary)' }}
            />
            <div
              className="pointer-events-none absolute right-10 bottom-0 h-20 w-20 rounded-full blur-2xl opacity-10"
              style={{ background: 'var(--brand-primary)' }}
            />

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-2">
                {orgLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={orgLogoUrl}
                    alt={orgName}
                    className="h-6 w-6 rounded object-contain bg-white/10 p-0.5"
                  />
                ) : (
                  <GraduationCap className="h-5 w-5 opacity-40 text-slate-100" />
                )}
                <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                  {orgName}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-white">
                Olá, {firstName}!
              </h1>
              <p className="mt-1.5 text-sm text-white/50">
                Cada questão te aproxima da aprovação.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 text-white">
                  <Flame className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                  {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'} de sequência
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10 text-white">
                  <Trophy className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} />
                  {totalPoints.toLocaleString('pt-BR')} pontos
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 2. Corrida para o prêmio (Substitui o Progresso da Sequência) ── */}
        <motion.div variants={itemVariant}>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Corrida para o prêmio
              </span>
              <span className="text-[11px] font-bold" style={{ color: 'var(--brand-primary)' }}>
                {monthLabel || 'Este mês'}
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: goalReached
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : `linear-gradient(90deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 70%, transparent))`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${goalProgressPct}%` }}
                transition={
                  shouldReduce
                    ? { duration: 0 }
                    : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }
                }
              />
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              {summary
                ? goalReached
                  ? `🏆 Zona do prêmio atingida! ${monthlyPts.toLocaleString('pt-BR')} pts acumulados`
                  : `${monthlyPts.toLocaleString('pt-BR')} / ${monthlyGoal.toLocaleString('pt-BR')} pts para a zona do prêmio`
                : 'Carregando ranking…'}
            </p>
          </div>
        </motion.div>

        {/* ── 3. Action Cards ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariant} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Simulados */}
          <Link href={`/partners/${slug}/student/simulado`} className="block group cursor-pointer h-full">
            <div
              className="relative overflow-hidden rounded-xl p-5 text-white transition-transform duration-200 active:scale-[0.98] hover:brightness-105 h-full"
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
            <div className="relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-all duration-200 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md active:scale-[0.98] h-full">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}
                  >
                    <BookOpen className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Praticar
                  </p>
                  <h2 className="text-[18px] font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                    Banco de Questões
                  </h2>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Pratique com +2.700 questões do ENEM
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
            <div
              className="relative p-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)' }}
            >
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
      </motion.div> {/* <--- AQUI ESTAVA O SEU ERRO PRINCIPAL: FECHAMENTO DA RAIZ DA ANIMAÇÃO */}

      {/* ── Popups (Fora do container principal de staggering) ──────────── */}
      <AnimatePresence>
        {popupState?.type === 'onboarding' && (
          <OnboardingDiagnosticModal
            firstName={firstName}
            organizationName={orgName}
            onComplete={handleDiagnosticComplete}
            submitDiagnostic={submitDiagnostic}
          />
        )}

        {showRankingPopup && ranking && (
          <RankingPopup
            ranking={ranking}
            onClose={() => setShowRankingPopup(false)}
          />
        )}

        {shouldShowStreak && (
          <StreakPopup
            streak={popupState!.streak ?? currentStreak}
            onDismiss={handleStreakDismiss}
          />
        )}

        {shieldResult?.shield_used && !shieldPopupDismissed && (
          <ShieldPopup
            streakPreserved={shieldResult.streak_preserved ?? currentStreak}
            onDismiss={() => setShieldPopupDismissed(true)}
          />
        )}

        {(popupState?.type === 'urgency' || popupState?.type === 'motivation') && (
          <ContextualPopup
            popupState={popupState}
            onDismiss={dismissPopup}
          />
        )}

        {popupState?.type === 'top3_entered' && (
          <Top3Popup
            position={(popupState.position ?? 3) as 1 | 2 | 3}
            onDismiss={dismissPopup}
          />
        )}

        {popupState?.type === 'streak_broken' && (
          <StreakBrokenPopup
            streakLost={popupState.streak_lost ?? 1}
            onDismiss={dismissPopup}
          />
        )}

        {pendingQuestionPoints !== null && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-[7000] w-full max-w-sm -translate-x-1/2 px-4"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 shadow-2xl border border-white/10">
              <button
                onClick={() => setPendingQuestionPoints(null)}
                className="absolute right-3 top-3 p-1.5 text-slate-500 hover:text-white transition-colors text-sm"
                aria-label="Fechar"
              >
                ✕
              </button>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1">
                Sessão encerrada 📚
              </p>
              <p className="text-3xl font-black" style={{ color: 'var(--brand-primary)' }}>
                +{pendingQuestionPoints} pts mensais
              </p>
              <p className="mt-1 text-xs text-slate-400">
                da sua última sessão no banco de questões
              </p>
            </div>
          </motion.div>
        )}

        {(popupState?.type === 'month_end' || popupState?.month_reset_pending) && (
          <MonthEndScreen
            winners={(ranking?.ranking ?? []).slice(0, 3).map((e) => ({
              position: e.rank as 1 | 2 | 3,
              full_name: e.full_name,
              monthly_points: e.monthly_points,
            }))}
            organizationName={orgName}
            onContinue={dismissPopup}
          />
        )}
      </AnimatePresence>
    </>
  );
}