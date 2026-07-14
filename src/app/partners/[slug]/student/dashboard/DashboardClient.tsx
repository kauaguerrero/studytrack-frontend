'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, FileText, Flame, Trophy, ArrowRight, GraduationCap, Shield, User, Zap, Play, Crown, Target } from 'lucide-react';
import { ActivityHistoryModal } from '@/components/partners/ActivityHistoryModal';
import { AnnouncementBell } from '@/components/announcements/AnnouncementBell';
import { Typewriter } from '@/components/ui/typewriter';
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation';
import { createClient } from '@/lib/supabase/client';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { getProgressTierMeta } from '@/components/partners/gamification/titleSystem';
import { summarizePodiumStreaks } from '@/lib/podium-streak';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, readableBrandTextOnDark, resolveAccentColor } from '@/lib/brand-color';
import { normalizeOrgTypewriterTagline } from '@/lib/org-typewriter-tagline';
import { normalizeOrgApprovedPhotos, type OrgApprovedPhoto } from '@/lib/org-approved-photos';
import {
  RevealGroup, RevealItem, ElevatedCard, KpiCard, SectionTitle,
  BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';
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

// ─── Types & helpers ─────────────────────────────────────────────────────────

interface FeedItem {
  type: 'question' | 'simulado' | 'essay';
  student_id?: string | null;
  student_name?: string | null;
  student_avatar_url?: string | null;
  subject?: string | null;
  is_correct?: boolean | null;
  total_questions?: number | null;
  status?: string | null;
  score?: number | null;
  essay_type?: string | null;
  timestamp?: string | null;
}

/** CSS vars pra `.brand-text-adaptive` escolher claro/escuro sozinho via `.dark`. */
function adaptiveTextStyle(hex: string | undefined | null, cssVar: string) {
  return {
    ['--bta-light' as string]: readableBrandText(hex, cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(hex, cssVar),
  };
}

/** Badge de conquista/liderança pro canto superior direito dos KpiCards — só
 * texto colorido (sem chip/fundo, mais legível), na mesma fonte cursiva do
 * typewriter do hero (.font-script). Largura capada pra não competir com o
 * valor do KPI em telas pequenas. */
function KpiTopBadge({
  icon: Icon,
  label,
  colorLight,
  colorDark,
}: {
  icon: React.ElementType;
  label: string;
  colorLight: string;
  colorDark: string;
}) {
  return (
    <span
      className="brand-text-adaptive inline-flex min-w-0 max-w-[76px] items-center gap-1 sm:max-w-[150px]"
      style={{ ['--bta-light' as string]: colorLight, ['--bta-dark' as string]: colorDark }}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden min-w-0 truncate font-script text-[14.5px] leading-none sm:inline">{label}</span>
    </span>
  );
}

function ApprovedPhotosHeroStrip({
  photos,
  activeIndex,
}: {
  photos: OrgApprovedPhoto[];
  activeIndex: number;
}) {
  if (photos.length === 0) return null;

  const activePhoto = photos[activeIndex % photos.length];

  return (
    <div className="pointer-events-none absolute inset-y-0 left-[58%] right-[205px] z-[1] hidden lg:flex lg:items-stretch lg:justify-center xl:left-[60%] xl:right-[235px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={activePhoto.path}
        src={activePhoto.url}
        alt=""
        aria-hidden
        className="h-full w-auto max-w-none object-contain object-bottom drop-shadow-[0_24px_24px_rgba(0,0,0,0.42)]"
      />
    </div>
  );
}

function timeAgo(ts?: string | null): string {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

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
  const { org, userProfile } = useOrg();
  const typewriterTagline = normalizeOrgTypewriterTagline(org.typewriter_tagline);
  const approvedPhotos = normalizeOrgApprovedPhotos(org.approved_student_photos);
  const [activeApprovedPhotoIndex, setActiveApprovedPhotoIndex] = useState(0);
  // Se brand_secondary for preto/branco/cinza (sem identidade cromática pra
  // usar como acento), busca outra cor da marca que já é "perfeita" (ex: o
  // amarelo do accent/primary) em vez de inventar um tom que não existe na paleta.
  const secondaryAccent = resolveAccentColor(org, 'brand_secondary');
  const shouldReduce = useReducedMotion();
  const [effectiveCurrentStreak, setEffectiveCurrentStreak] = useState(currentStreak);
  const [activityFeed, setActivityFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<{ type: 'question' | 'simulado' | 'essay' | null; subject: string | null }>({ type: null, subject: null });
  const [feedInfoOpen, setFeedInfoOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  // Painel de dev (só aparece pra conta de teste) — liga/desliga cada badge individualmente.
  const [devBadgeOverrides, setDevBadgeOverrides] = useState({
    streak: true,
    questions: true,
    accuracy: true,
    leader: true,
  });

  useEffect(() => {
    if (approvedPhotos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveApprovedPhotoIndex((prev) => (prev + 1) % approvedPhotos.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [approvedPhotos.length]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setFeedLoading(false); return; }
      const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');
      fetch(`${api}/api/student/analytics/activity-feed?limit=15`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.ok ? r.json() : [])
        .then((data) => { if (Array.isArray(data)) setActivityFeed(data); })
        .catch(() => {})
        .finally(() => setFeedLoading(false));

      fetch(`${api}/api/student/analytics/last-activity`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setLastActivity({ type: data.type ?? null, subject: data.subject ?? null }); })
        .catch(() => {});
    });
  }, []);

  const resumeHref = lastActivity.type === 'simulado'
    ? `/partners/${slug}/student/simulado`
    : lastActivity.type === 'essay'
      ? `/partners/${slug}/student/redacoes`
      : lastActivity.type === 'question' && lastActivity.subject
        ? `/partners/${slug}/student/banco-de-questoes?subject=${encodeURIComponent(lastActivity.subject)}`
        : `/partners/${slug}/student/banco-de-questoes`;

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

  // Dados de ranking (badges de liderança/pódio) — só busca se ainda não veio
  // carregado por outro fluxo (ex: popups de urgência/motivação).
  useEffect(() => {
    if (!ranking) void refreshRanking(5);
  }, [ranking, refreshRanking]);

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

    enqueuePopup({
      kind: 'onboarding',
      routeScope: 'dashboard',
      firstName,
      organizationName: orgName,
      dedupeKey: 'dashboard-onboarding',
    });
  }, [enqueuePopup, firstName, orgName, searchParams]);

  // Caminho sem escudo: aplica decay e enfileira StreakPointsLostPopup
  const handleStreakBrokenDismiss = useCallback(async (): Promise<void> => {
    setIsResolvingStreakBroken(true);
    try {
      const result = await applyStreakDecay();
      setEffectiveCurrentStreak(0);

      if (result) {
        dismissCurrentPopup();
        await refreshSummary();
        window.setTimeout(() => {
          enqueuePopup({
            kind: 'streak_points_lost',
            routeScope: 'dashboard',
            result,
            dedupeKey: `streak-points-lost:${result.points_deducted}:${result.current_rank}`,
          });
        }, 0);
        return;
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
      const preservedStreak = result.streak_preserved ?? currentStreak;
      setEffectiveCurrentStreak(preservedStreak);
      dismissCurrentPopup();
      await refreshSummary();
      window.setTimeout(() => {
        enqueuePopup({
          kind: 'shield_popup',
          routeScope: 'dashboard',
          streakPreserved: preservedStreak,
          slug,
          dedupeKey: `shield-popup:${preservedStreak}`,
        });
      }, 0);
      return;
    }
    dismissCurrentPopup();
  }, [activateShield, currentStreak, dismissCurrentPopup, enqueuePopup, refreshSummary, slug]);

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
  const monthlyGoal = summary?.monthly_goal ?? 1000;
  const goalReached = summary?.goal_reached ?? false;
  const monthLabel = summary?.month_label ?? '';
  const shieldCount = summary?.shield_count ?? 0;
  const hasShield = shieldCount > 0;
  const nextTier = summary?.next_tier ?? null;
  const nextTierMeta = nextTier ? getProgressTierMeta(nextTier) : null;
  const pointsToNextTier = summary?.points_to_next_tier ?? 0;
  // Meta e progresso da "Corrida" respondem ao próximo nível, não a um valor fixo —
  // cada nível pede uma quantidade diferente de pontos.
  const tierTargetPts = nextTierMeta ? monthlyPts + pointsToNextTier : monthlyPts;
  const tierProgressPct = nextTierMeta
    ? Math.min(100, (monthlyPts / Math.max(tierTargetPts, 1)) * 100)
    : 100;

  // ── Badges de liderança/pódio (KPIs) ────────────────────────────────────────
  // Contas de teste (plan_tier "b2b_test", já sinalizadas em userProfile.isTestAccount
  // em todo o app) podem forçar cada badge individualmente via o painel de dev no
  // fim da página — é o jeito de QA/design conferir o visual sem precisar montar
  // dados reais de liderança.
  const isTestAccount = Boolean(userProfile.isTestAccount);
  const selfRankingEntry = ranking?.user_context?.self ?? null;
  const isLeader = (isTestAccount && devBadgeOverrides.leader) || (summary?.rank_position ?? selfRankingEntry?.rank) === 1;
  const leaderMonths = isTestAccount && devBadgeOverrides.leader
    ? 3
    : selfRankingEntry
      ? (summarizePodiumStreaks(selfRankingEntry.podium_history ?? []).find((s) => s.position === 1)?.count ?? (isLeader ? 1 : 0))
      : (isLeader ? 1 : 0);
  const hasStreakLeaderBadge = (isTestAccount && devBadgeOverrides.streak) || Boolean(selfRankingEntry?.has_streak_leader_badge);
  const hasQuestionsLeaderBadge = (isTestAccount && devBadgeOverrides.questions) || Boolean(selfRankingEntry?.has_questions_leader_badge);
  const hasAccuracyLeaderBadge = (isTestAccount && devBadgeOverrides.accuracy) || Boolean(selfRankingEntry?.has_accuracy_leader_badge);

  // ── CTA de retomada (hero) ─────────────────────────────────────────────────
  const resumeSubtitle = effectiveCurrentStreak > 0
    ? `Sequência de ${effectiveCurrentStreak} ${effectiveCurrentStreak === 1 ? 'dia' : 'dias'} — continue estudando hoje.`
    : questionsCount > 0
      ? `Você já respondeu ${questionsCount.toLocaleString('pt-BR')} questões. Vamos continuar?`
      : 'Comece sua primeira questão agora.';

  return (
    <>
      {/* ── Container raiz — fundo adaptado ao tema ────────────────────────── */}
      <div className="-mx-4 -mt-4 md:-mx-8 md:-mt-8 px-4 pt-4 md:px-8 md:pt-8 pb-8 min-h-screen bg-slate-50 dark:bg-[#080808] transition-colors duration-200">
        <RevealGroup className="flex flex-col gap-4 lg:gap-5">

          {/* ── 1. Hero Banner ─────────────────────────────────────────────── */}
          <RevealItem>
            <BrandHero
              className="p-3.5 lg:p-5"
              smokeColorHex={org.brand_primary ?? undefined}
              halftone={false}
              lighten
              overlay={<ApprovedPhotosHeroStrip photos={approvedPhotos} activeIndex={activeApprovedPhotoIndex} />}
            >
              <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="flex min-w-0 flex-col gap-1 lg:flex-1">
                {/* Org label — no mobile também abriga as fotos discretas de aprovados ao lado do sino. */}
                <div className="flex items-center gap-2">
                  {orgLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={orgLogoUrl}
                      alt={orgName}
                      className="hidden h-6 w-6 rounded object-contain p-0.5 lg:block"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    />
                  ) : (
                    <GraduationCap className="hidden h-[22px] w-[22px] text-white/40 lg:block" />
                  )}
                  <span className="min-w-0 truncate text-[10.3px] font-bold uppercase tracking-[1.1px] text-white/50 lg:max-w-none">
                    {orgName}
                  </span>
                  <AnnouncementBell
                    className="h-7 w-7 shrink-0 lg:inline-flex"
                    iconClassName="h-4 w-4"
                    style={{ background: 'color-mix(in srgb, var(--brand-primary) 22%, transparent)' }}
                    iconStyle={{ color: 'color-mix(in srgb, var(--brand-primary) 70%, white)' }}
                  />
                </div>

                {/* Greeting */}
                <h1 className="font-display mt-[10px] text-[27px] font-black leading-none text-white lg:text-[34px]">
                  Olá, {firstName}!
                </h1>

                {/* Tagline em script — parte do título, sem caixa/pill ao redor.
                    Div (não <p>) porque o Typewriter renderiza uma <div> internamente,
                    e <div> dentro de <p> é HTML inválido (quebra a hidratação). */}
                <div
                  className="font-script mt-1 text-[24px] leading-tight text-white lg:text-[28px]"
                  style={{ ['--hero-accent' as string]: HERO_ACCENT_COLOR }}
                >
                  {typewriterTagline.staticText}{' '}
                  <Typewriter
                    text={typewriterTagline.animatedTexts}
                    speed={95}
                    deleteSpeed={52}
                    waitTime={2600}
                    className="text-[var(--hero-accent)]"
                    cursorClassName="text-[var(--hero-accent)]"
                  />
                </div>
              </div>

              {/* CTA de retomada — botão "pressionável" estilo app gamificado: camada
                  de baixo mais escura simula profundidade 3D e "afunda" no clique/toque. */}
              <div className="flex shrink-0 flex-col items-center gap-2 lg:gap-3">
                <p className="text-center text-[11.5px] font-semibold leading-snug text-white/55">
                  {resumeSubtitle}
                </p>
                <Link
                  href={resumeHref}
                  className="cta-glow-pulse group relative inline-block select-none rounded-2xl"
                  style={{ ['--cta-glow-color' as string]: 'color-mix(in srgb, var(--brand-accent) 55%, transparent)' }}
                >
                  {/* borda 3D — fica visível como "degrau" abaixo da face do botão */}
                  <span
                    className="absolute inset-0 rounded-2xl transition-transform duration-100 ease-out"
                    style={{ background: 'color-mix(in srgb, var(--brand-accent) 65%, black)', transform: 'translateY(5px)' }}
                  />
                  {/* face do botão — sobe em repouso, "afunda" ao pressionar */}
                  <span
                    className="relative flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-[14.5px] font-black tracking-tight transition-transform duration-100 ease-out group-hover:-translate-y-0.5 group-active:translate-y-[4px] lg:py-3.5"
                    style={{
                      background: 'var(--brand-accent)',
                      color: '#ffffff',
                      textShadow: '0 1px 1px rgba(0,0,0,0.3), 0 2px 5px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
                    Continue de onde parou
                  </span>
                </Link>
              </div>
              </div>
            </BrandHero>
          </RevealItem>

          {/* ── KPIs pessoais ─────────────────────────────────────────────── */}
          <RevealItem className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KpiCard
              title="Sequência"
              value={effectiveCurrentStreak}
              subtitle={effectiveCurrentStreak === 1 ? '1 dia seguido' : `${effectiveCurrentStreak} dias seguidos`}
              icon={Flame}
              accentColor="var(--brand-primary)"
              accentHex={org.brand_primary}
              topRightBadge={hasStreakLeaderBadge ? (
                <KpiTopBadge icon={Flame} label="Maior sequência" colorLight="#DC2626" colorDark="#F87171" />
              ) : undefined}
              iconAdornment={hasShield ? (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/15"
                  title={`${shieldCount} escudo${shieldCount !== 1 ? 's' : ''}`}
                >
                  <Shield className="h-3 w-3" strokeWidth={2.4} style={{ color: '#3b82f6' }} />
                </span>
              ) : undefined}
            />
            <KpiCard
              title="Questões"
              value={questionsCount}
              subtitle="Respondidas por você"
              icon={BookOpen}
              href={`/partners/${slug}/student/banco-de-questoes`}
              accentColor={secondaryAccent.cssVar}
              accentHex={secondaryAccent.hex ?? undefined}
              topRightBadge={(hasQuestionsLeaderBadge || hasAccuracyLeaderBadge) ? (
                <div className="flex flex-col items-end gap-1">
                  {hasQuestionsLeaderBadge && (
                    <KpiTopBadge icon={BookOpen} label="Mais questões" colorLight="#B45309" colorDark="#FBBF24" />
                  )}
                  {hasAccuracyLeaderBadge && (
                    <KpiTopBadge icon={Target} label="Maior acerto" colorLight="#15803D" colorDark="#4ADE80" />
                  )}
                </div>
              ) : undefined}
            />
            <KpiCard
              title="Simulados"
              value={simuladosCount}
              subtitle="Realizados por você"
              icon={FileText}
              href={`/partners/${slug}/student/simulado`}
              accentColor="var(--brand-accent)"
              accentHex={org.brand_accent}
            />
            <KpiCard
              title={`Pontos · ${monthLabel || 'Mês'}`}
              value={monthlyPts.toLocaleString('pt-BR')}
              subtitle="Na corrida deste mês"
              icon={Zap}
              href={`/partners/${slug}/student/ranking`}
              loading={summary === null}
              accentColor="#8b5cf6"
              accentHex="#8b5cf6"
              topRightBadge={isLeader ? (
                <KpiTopBadge
                  icon={Crown}
                  label={leaderMonths >= 2 ? `${leaderMonths} meses na liderança!` : 'Líder do mês!'}
                  colorLight="#B45309"
                  colorDark="#FBBF24"
                />
              ) : undefined}
            />
          </RevealItem>

          {/* ── 2. Corrida para aprovação ──────────────────────────────────── */}
          <RevealItem>
            <Link href={`/partners/${slug}/student/ranking`} className="block cursor-pointer">
            <ElevatedCard accentColor="var(--brand-primary)">
              <div className="p-5">
                <SectionTitle
                  kicker="Gamificação"
                  title="Corrida para aprovação"
                  hex={org.brand_primary}
                  action={
                    <span
                      className="brand-text-adaptive text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                        ...adaptiveTextStyle(org.brand_primary, 'var(--brand-primary)'),
                      }}
                    >
                      {monthLabel || 'Este mês'}
                    </span>
                  }
                />

                {/* Pontos em destaque */}
                <div className="mb-4 flex items-end gap-2">
                  <span
                    className="brand-text-adaptive font-display text-[34px] font-black leading-none tabular-nums"
                    style={adaptiveTextStyle(org.brand_primary, 'var(--brand-primary)')}
                  >
                    {monthlyPts.toLocaleString('pt-BR')}
                  </span>
                  <span className="pb-1 text-sm font-semibold text-slate-400 dark:text-white/30">
                    {nextTierMeta
                      ? `/ ${tierTargetPts.toLocaleString('pt-BR')} pts`
                      : 'nível máximo'}
                  </span>
                </div>

                {/* Barra de progresso premium */}
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/6">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: goalReached || !nextTierMeta
                        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        : `linear-gradient(90deg, color-mix(in srgb, ${nextTierMeta.color} 65%, white), ${nextTierMeta.color})`,
                      boxShadow: `0 0 12px color-mix(in srgb, ${nextTierMeta?.color ?? 'var(--brand-primary)'} 40%, transparent)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${tierProgressPct}%` }}
                    transition={
                      shouldReduce
                        ? { duration: 0 }
                        : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }
                    }
                  />
                </div>

                {/* Status — próximo nível (mesmo sistema do ranking) */}
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-white/30">
                  {!summary ? (
                    'Carregando…'
                  ) : goalReached ? (
                    <><Trophy className="h-3 w-3 shrink-0 text-amber-400" /> Você está entre os líderes do mês!</>
                  ) : nextTierMeta ? (
                    <>
                      <nextTierMeta.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: nextTierMeta.color }} />
                      <span>
                        Faltam <span className="font-bold tabular-nums" style={{ color: nextTierMeta.color }}>{pointsToNextTier.toLocaleString('pt-BR')} pts</span> para atingir o nível{' '}
                        <span className="font-bold" style={{ color: nextTierMeta.color }}>{nextTierMeta.title}</span>
                      </span>
                    </>
                  ) : (
                    `Faltam ${(monthlyGoal - monthlyPts).toLocaleString('pt-BR')} pts para entrar na disputa`
                  )}
                </p>
              </div>
            </ElevatedCard>
            </Link>
          </RevealItem>

          {/* ── 3. Feed de atividades ────────────────────────────────────────── */}
          <RevealItem>
            <ElevatedCard accentColor={secondaryAccent.cssVar}>
              <div className="p-5">
                <SectionTitle
                  kicker="Comunidade"
                  title="Feed de atividades"
                  hex={secondaryAccent.hex ?? undefined}
                  colorVar={secondaryAccent.cssVar}
                  action={
                    <div className="relative">
                      <button
                        onClick={() => setFeedInfoOpen(v => !v)}
                        className="brand-text-adaptive flex h-5 w-5 items-center justify-center rounded-full border transition-colors select-none leading-none"
                        style={{
                          borderColor: `color-mix(in srgb, ${secondaryAccent.cssVar} 40%, transparent)`,
                          fontSize: '10px',
                          fontWeight: 700,
                          ...adaptiveTextStyle(secondaryAccent.hex, secondaryAccent.cssVar),
                        }}
                        aria-label="Saiba mais sobre o feed"
                      >
                        i
                      </button>
                      {feedInfoOpen && (
                        <div className="absolute right-0 top-7 z-20 w-60 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1c1c1c] p-3 shadow-xl">
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-white/45">
                            Faça questões, simulados ou entregue redações para aparecer aqui e acompanhe o que seus amigos estão fazendo.
                          </p>
                        </div>
                      )}
                    </div>
                  }
                />

                {/* Activity rows */}
                {feedLoading ? (
                  <div className="flex flex-col gap-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-[46px] rounded-[16px] bg-slate-100 dark:bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : activityFeed.length === 0 ? (
                  <p className="py-3 text-[12px] text-slate-400 dark:text-white/30">
                    Nenhuma atividade ainda. Responda sua primeira questão!
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {activityFeed.slice(0, 3).map((item, i) => {
                      const isQuestion = item.type === 'question';
                      const isSimulado = item.type === 'simulado';
                      const peerFirstName = (item.student_name || 'Aluno').split(' ')[0];
                      const verb = isQuestion
                        ? 'fez uma questão de'
                        : isSimulado ? 'realizou um'
                        : 'enviou uma';
                      const actionLabel = isQuestion
                        ? (item.subject || 'Questão')
                        : isSimulado ? 'Simulado'
                        : 'Redação';

                      return (
                        <div
                          key={i}
                          className="relative flex items-center h-[46px] rounded-[16px] bg-slate-50 dark:bg-white/[0.05] overflow-hidden"
                        >
                          {/* Avatar */}
                          <div className="absolute left-[13px] h-[22px] w-[22px] rounded-full overflow-hidden shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                            {item.student_avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.student_avatar_url}
                                alt={item.student_name || ''}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ background: `color-mix(in srgb, ${secondaryAccent.cssVar} 18%, white)` }}
                              >
                                <User
                                  className="h-3.5 w-3.5"
                                  style={{ color: readableBrandText(secondaryAccent.hex, secondaryAccent.cssVar) }}
                                />
                              </div>
                            )}
                          </div>
                          {/* Name + action — vertically centred */}
                          <div className="absolute left-[43px] right-3 top-1/2 -translate-y-1/2 flex items-baseline gap-1 leading-none">
                            <span className="text-[11px] text-slate-700 dark:text-white/85 whitespace-nowrap">
                              {peerFirstName} {verb}
                            </span>
                            <span
                              className="brand-text-adaptive text-[12px] font-bold tracking-[-0.35px] truncate"
                              style={adaptiveTextStyle(secondaryAccent.hex, secondaryAccent.cssVar)}
                            >
                              {actionLabel}
                            </span>
                          </div>
                          {/* Timestamp — bottom-right corner */}
                          <p className="absolute bottom-[7px] right-[12px] text-[7px] font-bold text-slate-400 dark:text-white/50 leading-none">
                            {timeAgo(item.timestamp)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer link */}
                <button
                  onClick={() => setActivityModalOpen(true)}
                  className="brand-text-adaptive mt-3 flex items-center gap-1 text-[11px] font-bold transition-opacity hover:opacity-70"
                  style={adaptiveTextStyle(secondaryAccent.hex, secondaryAccent.cssVar)}
                >
                  Ver atividade completa
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </ElevatedCard>
          </RevealItem>

          {/* ── 4. Action Cards ─────────────────────────────────────────────── */}
          <RevealItem className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Simulados */}
            <Link href={`/partners/${slug}/student/simulado`} className="block group cursor-pointer h-full">
              <div
                className="partner-elevated-card partner-elevated-card-hover relative overflow-hidden rounded-[20px] p-5 h-full text-white transition-transform duration-200 active:scale-[0.98]"
                style={{
                  background: 'radial-gradient(120% 140% at 15% 0%, color-mix(in srgb, var(--brand-primary) 45%, #101E45) 0%, color-mix(in srgb, var(--brand-primary) 16%, #060E27) 62%)',
                  boxShadow: '0 20px 48px -20px color-mix(in srgb, var(--brand-primary) 35%, rgba(6,14,39,0.6))',
                  textShadow: '0 1px 1px rgba(0,0,0,0.3), 0 2px 5px rgba(0,0,0,0.3)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen">
                  <SmokeBackground smokeColor={org.brand_primary ?? '#ffffff'} />
                </div>
                <div className="pointer-events-none absolute -right-4 -bottom-4 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: 'color-mix(in srgb, white 20%, transparent)' }}
                    >
                      <FileText className="h-5 w-5" style={{ color: 'currentColor' }} />
                    </div>
                    <p
                      className="mb-1 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'color-mix(in srgb, currentColor 70%, transparent)' }}
                    >
                      Destaque
                    </p>
                    <h2 className="text-[18px] font-extrabold leading-tight">Simulados</h2>
                    <p className="mt-1 text-xs" style={{ color: 'color-mix(in srgb, currentColor 80%, transparent)' }}>
                      Monte simulados de diversos vestibulares com métricas por banca
                    </p>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold">
                    Começar agora
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Banco de Questões */}
            <Link href={`/partners/${slug}/student/banco-de-questoes`} className="block group cursor-pointer h-full">
              <ElevatedCard className="h-full">
                <div className="relative z-10 flex h-full flex-col justify-between p-5">
                  <div>
                    <div
                      className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `color-mix(in srgb, ${secondaryAccent.cssVar} 14%, transparent)` }}
                    >
                      <BookOpen className="brand-text-adaptive h-5 w-5" style={adaptiveTextStyle(secondaryAccent.hex, secondaryAccent.cssVar)} />
                    </div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/30">
                      Praticar
                    </p>
                    <h2 className="text-[18px] font-extrabold leading-tight text-slate-800 dark:text-white">
                      Banco de Questões
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                      Pratique com milhares de questões ENEM, UFU e UEG
                    </p>
                  </div>
                  <div
                    className="brand-text-adaptive mt-4 inline-flex items-center gap-1 text-xs font-bold"
                    style={adaptiveTextStyle(secondaryAccent.hex, secondaryAccent.cssVar)}
                  >
                    Explorar questões
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </ElevatedCard>
            </Link>
          </RevealItem>

          {/* ── Painel de dev — só conta de teste, liga/desliga cada badge ───── */}
          {isTestAccount && (
            <RevealItem className="flex justify-center pt-2">
              <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/25">
                  Dev · badges
                </span>
                {([
                  ['streak', 'Sequência'],
                  ['questions', 'Questões'],
                  ['accuracy', 'Acerto'],
                  ['leader', 'Líder'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDevBadgeOverrides((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      devBadgeOverrides[key]
                        ? 'bg-slate-800 text-white dark:bg-white/20'
                        : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </RevealItem>
          )}

        </RevealGroup>
      </div>

      {/* ── Modal histórico de atividades ──────────────────────────────── */}
      {activityModalOpen && (
        <ActivityHistoryModal onClose={() => setActivityModalOpen(false)} />
      )}

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
            onDismiss={dismissCurrentPopup}
          />
        )}
      </AnimatePresence>
    </>
  );
}
