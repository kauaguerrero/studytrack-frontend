'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion, useAnimation } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Badge } from '@/components/ui/badge';
import { Typewriter } from '@/components/ui/typewriter';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import { normalizeOrgTypewriterTagline } from '@/lib/org-typewriter-tagline';
import { normalizeOrgApprovedPhotos, type OrgApprovedPhoto } from '@/lib/org-approved-photos';
import {
  RevealGroup, RevealItem, ElevatedCard as TintedCard, KpiCard, SectionTitle,
  BrandPill, Segmented, Medal, MiniBar, BrandHero, HERO_ACCENT_COLOR,
  CHART_TOOLTIP_STYLE as TOOLTIP_STYLE, CHART_TOOLTIP_STYLE_DARK as TOOLTIP_STYLE_DARK,
} from '@/components/partners/founder-ui';
import {
  Users, Activity, BookOpen, FileText, ArrowUpRight,
  Video, Target, Zap, Calendar,
} from 'lucide-react';
import {
  Area, AreaChart, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { isDemoOrg, MOCK_VIDEO_ADOPTION, MOCK_ANALYTICS } from '../../../../../studytrack-tutorial-mock';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgStats {
  total_students: number;
  prev_active_today: number;
  prev_active_week: number;
  prev_active_month: number;
  prev_questions_today: number;
  prev_questions_week: number;
  prev_questions_month: number;
  prev_simulados_today: number;
  prev_simulados_week: number;
  prev_simulados_month: number;
  active_today: number;
  active_week: number;
  active_month: number;
  active_total: number;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  plan_distribution: Record<string, number>;
  associates_count?: number;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  plan_tier: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_price_cents?: number | null;
  plan_duration_days?: number | null;
  plan_last_payment_at?: string | null;
  essay_credits_remaining?: number | null;
  essay_credits_limit?: number | null;
  essay_credits_period?: 'week' | 'month' | null;
  last_activity_date: string | null;
  questions_today: number;
  questions_week: number;
  questions_month: number;
  questions_total: number;
  simulados_today: number;
  simulados_week: number;
  simulados_month: number;
  simulados_total: number;
  accuracy_pct: number | null;
}

function FounderAveBirdAnimation() {
  const reduced = !!useReducedMotion();
  const controls = useAnimation();

  useEffect(() => {
    if (reduced) return;
    void controls.start({
      scaleY: [1,    0.50, 1.12, 1],
      scaleX: [1,    1.30, 0.88, 1],
      y:      [0,    8,    -5,   0],
      transition: {
        duration: 2.2,
        repeat: Infinity,
        ease: ['easeIn', 'easeOut', 'easeInOut'],
        times: [0, 0.28, 0.58, 1],
      },
    });
  }, [controls, reduced]);

  const bird = (className: string) => (
    <motion.img
      src="/marketing/logo_ave-removebg-preview.png"
      alt="" aria-hidden
      animate={controls}
      style={{ transformOrigin: '50% 68%' }}
      className={`absolute w-auto ${className}`}
    />
  );

  return (
    <div className="pointer-events-none absolute inset-y-0 right-8 z-[1] hidden w-[160px] lg:block xl:right-12 xl:w-[180px]">
      {bird('bottom-[2%] left-[5%] h-[54%]')}
      {bird('bottom-[32%] left-[36%] h-[32%] opacity-75')}
      {bird('bottom-[58%] left-[60%] h-[18%] opacity-55')}
    </div>
  );
}

function FounderApprovedPhotoOverlay({
  photos,
  activeIndex,
}: {
  photos: OrgApprovedPhoto[];
  activeIndex: number;
}) {
  if (photos.length === 0) return null;

  const activePhoto = photos[activeIndex % photos.length];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-8 z-[1] hidden w-[160px] lg:flex lg:items-stretch lg:justify-center xl:right-12 xl:w-[180px]">
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

type MetricWindow = 'today' | 'week' | 'month' | 'total';

// ─── Constants ────────────────────────────────────────────────────────────────

function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const PERIOD_SEGMENTS: { value: MetricWindow; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'total', label: 'Total' },
];

function formatDateTick(v: string, w: MetricWindow): string {
  if (w === 'today') return v;
  if (w === 'total') {
    const [y, m] = v.split('-');
    return `${m}/${y?.slice(2)}`;
  }
  const [, m, d] = v.split('-');
  return `${d}/${m}`;
}

function formatDateLabel(label: string, w: MetricWindow): string {
  if (w === 'today') return `Hora: ${label}`;
  if (w === 'total') {
    const [y, m] = label.split('-');
    return `${m}/${y}`;
  }
  const [y, m, d] = label.split('-');
  return `${d}/${m}/${y}`;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FounderDashboardClientProps {
  slug: string;
  initialStats: OrgStats | null;
  initialStudents: Student[];
  initialStudentsTotal: number;
  initialEssaysCounts: {
    today: number;
    week: number;
    month: number;
    total: number;
  } | null;
}

interface VideoAdoptionKpi {
  pct: number;
  num: number;
  den: number;
}

interface AnalyticsData {
  questions_series: { date: string; total: number }[];
  accuracy_series: { date: string; accuracy_pct: number | null }[];
  subjects: { subject: string; total: number; correct: number; accuracy_pct: number }[];
}

function filterOutTestAccounts(list: Student[]): Student[] {
  return (list ?? []).filter((s) => s.plan_tier !== 'b2b_test');
}

function mergeUniqueStudents(base: Student[], incoming: Student[]): Student[] {
  const map = new Map<string, Student>();
  for (const student of base) {
    map.set(student.id, student);
  }
  for (const student of incoming) {
    map.set(student.id, student);
  }
  return Array.from(map.values());
}

const NAME_PARTICLES = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

function parseNameForShortening(fullName?: string | null) {
  const parts = (fullName ?? '').split(' ').filter(Boolean);
  const first = parts[0];
  const surnames = parts.slice(1).filter((p) => !NAME_PARTICLES.has(p.toLowerCase()));
  return { first, surnames };
}

// Nome + inicial do sobrenome (o último sobrenome, não o nome do meio).
// Quando dois alunos da mesma lista colidem (mesmo primeiro nome + mesma
// inicial de sobrenome), inclui também a inicial do penúltimo sobrenome
// para diferenciá-los — ex.: "Marcus F. S." vs "Marcus R. M.".
function formatShortNames(fullNames: (string | null | undefined)[]): string[] {
  const parsed = fullNames.map(parseNameForShortening);

  return parsed.map(({ first, surnames }, i) => {
    if (!first) return '—';
    if (surnames.length === 0) return first;

    const last = surnames[surnames.length - 1];
    const collides = parsed.some((other, j) => {
      if (j === i || !other.first) return false;
      const otherLast = other.surnames[other.surnames.length - 1];
      return other.first === first && otherLast && otherLast[0].toUpperCase() === last[0].toUpperCase();
    });

    if (collides && surnames.length > 1) {
      const second = surnames[surnames.length - 2];
      return `${first} ${second[0].toUpperCase()}. ${last[0].toUpperCase()}.`;
    }
    return `${first} ${last[0].toUpperCase()}.`;
  });
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function FounderDashboardClient({
  slug,
  initialStats,
  initialStudents,
  initialStudentsTotal,
  initialEssaysCounts,
}: FounderDashboardClientProps) {
  const { org, userProfile } = useOrg();
  const isVideoToolEnabled = org.permissions?.video_lessons_enabled === true;

  const [stats, setStats] = useState<OrgStats | null>(initialStats);
  const [students, setStudents] = useState<Student[]>(filterOutTestAccounts(initialStudents));
  const [rankingStudents, setRankingStudents] = useState<Student[]>(filterOutTestAccounts(initialStudents));
  const [essaysCounts, setEssaysCounts] = useState(initialEssaysCounts);
  const [metricWindow, setMetricWindow] = useState<MetricWindow>('total');
  const [associatesCount, setAssociatesCount] = useState<number | null>(null);
  const [videoAdoption, setVideoAdoption] = useState<VideoAdoptionKpi | null>(null);
  const [videoAdoptionLoading, setVideoAdoptionLoading] = useState(isVideoToolEnabled);
  const [loading, setLoading] = useState(initialStats === null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    async function fetchMissing() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (isDemoOrg(slug)) {
        setVideoAdoption(MOCK_VIDEO_ADOPTION);
        setVideoAdoptionLoading(false);
        setAnalyticsData(MOCK_ANALYTICS as unknown as typeof analyticsData);
        setAnalyticsLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

      if (isVideoToolEnabled) {
        try {
          const resVideoKpi = await fetch(`${api}/api/partners/${slug}/videos/kpis?period_days=7`, { headers });
          if (resVideoKpi.ok) {
            const payload = await resVideoKpi.json();
            setVideoAdoption({
              pct: Number(payload?.summary?.adoption_weekly_pct || 0),
              num: Number(payload?.summary?.adoption_weekly_num || 0),
              den: Number(payload?.summary?.adoption_weekly_den || 0),
            });
          }
        } catch {
          // ignore
        } finally {
          setVideoAdoptionLoading(false);
        }
      } else {
        setVideoAdoptionLoading(false);
      }

      if (initialStats === null) {
        try {
          const [resStats, resEssaysCount, resStudents] = await Promise.all([
            fetch(`${api}/api/partners/${slug}/stats`, { headers }),
            fetch(`${api}/api/partners/${slug}/essays/count`, { headers }),
            fetch(`${api}/api/partners/${slug}/students?limit=100&page=1&sort=full_name&order=asc`, { headers }),
          ]);
          if (resStats.ok) setStats(await resStats.json());
          if (resEssaysCount.ok) setEssaysCounts(await resEssaysCount.json());
          if (resStudents.ok) {
            const payload = await resStudents.json();
            const first = filterOutTestAccounts(Array.isArray(payload?.students) ? payload.students : []);
            setStudents((prev) => mergeUniqueStudents(prev, first));
            setRankingStudents((prev) => mergeUniqueStudents(prev, first));
          }
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      }

      if (userProfile.role === 'founder' || userProfile.role === 'admin') {
        fetch(`/api/partners/${slug}/associates`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (!data) return;
            if (typeof data.total === 'number') setAssociatesCount(data.total);
            else if (Array.isArray(data.associates)) setAssociatesCount(data.associates.length);
          })
          .catch(() => {});
      }

      const total = initialStudentsTotal;
      const totalPages = Math.ceil(total / 100);
      if (totalPages > 1) {
        const pageFetches = Array.from({ length: totalPages - 1 }, (_, i) =>
          fetch(`${api}/api/partners/${slug}/students?limit=100&page=${i + 2}&sort=full_name&order=asc`, { headers })
        );
        Promise.all(pageFetches).then(async (responses) => {
          const extra: Student[] = [];
          for (const r of responses) {
            if (!r.ok) continue;
            const p = await r.json();
            if (Array.isArray(p?.students)) extra.push(...filterOutTestAccounts(p.students));
          }
          if (extra.length > 0) {
            setStudents((prev) => mergeUniqueStudents(prev, extra));
            setRankingStudents((prev) => mergeUniqueStudents(prev, extra));
          }
        }).catch(() => {});
      }
    }

    fetchMissing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, userProfile.role, isVideoToolEnabled]);

  useEffect(() => {
    async function fetchAnalytics() {
      setAnalyticsLoading(true);
      if (isDemoOrg(slug)) {
        setAnalyticsData(MOCK_ANALYTICS as unknown as typeof analyticsData);
        setAnalyticsLoading(false);
        return;
      }
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const api = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');
        const res = await fetch(
          `${api}/api/partners/${slug}/analytics?window=${metricWindow}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );
        if (res.ok) setAnalyticsData(await res.json());
      } catch {
        // ignore
      } finally {
        setAnalyticsLoading(false);
      }
    }
    fetchAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, metricWindow]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const metricLabel = {
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês',
    total: 'Total',
  }[metricWindow];

  const getQuestionsByWindow = (s: Student) => (
    metricWindow === 'today' ? s.questions_today
      : metricWindow === 'week' ? s.questions_week
        : metricWindow === 'month' ? s.questions_month
          : s.questions_total
  );
  const getSimuladosByWindow = (s: Student) => (
    metricWindow === 'today' ? s.simulados_today
      : metricWindow === 'week' ? s.simulados_week
        : metricWindow === 'month' ? s.simulados_month
          : s.simulados_total
  );

  const rankingPool = rankingStudents.length > 0 ? rankingStudents : students;
  const sortedByActivity = [...rankingPool].sort((a, b) => (
    getQuestionsByWindow(b) - getQuestionsByWindow(a)
    || getSimuladosByWindow(b) - getSimuladosByWindow(a)
    || (b.last_activity_date || '').localeCompare(a.last_activity_date || '')
  ));
  const topStudents = sortedByActivity.slice(0, 5);
  const rankingBaseCount = rankingPool.length;
  const studentsForTable = sortedByActivity.slice(0, 10);

  const todayBrtKey = toBrtDateKey(new Date());
  const monthStartBrt = `${todayBrtKey.slice(0, 7)}-01`;
  const nowDate = new Date();
  const weekStartDate = new Date(nowDate);
  weekStartDate.setDate(nowDate.getDate() - ((nowDate.getDay() + 6) % 7));
  const weekStartBrt = toBrtDateKey(weekStartDate);

  const activeTodayFromStudents = students.filter((s) => s.last_activity_date === todayBrtKey).length;
  const activeWeekFromStudents = students.filter((s) => (s.last_activity_date || '') >= weekStartBrt).length;
  const activeMonthFromStudents = students.filter((s) => (s.last_activity_date || '') >= monthStartBrt).length;
  const activeTotalFromStudents = students.length;

  const questionsTodayFromStudents = students.reduce((acc, s) => acc + (s.questions_today || 0), 0);
  const questionsWeekFromStudents = students.reduce((acc, s) => acc + (s.questions_week || 0), 0);
  const questionsMonthFromStudents = students.reduce((acc, s) => acc + (s.questions_month || 0), 0);
  const questionsTotalFromStudents = students.reduce((acc, s) => acc + (s.questions_total || 0), 0);

  const simuladosTodayFromStudents = students.reduce((acc, s) => acc + (s.simulados_today || 0), 0);
  const simuladosWeekFromStudents = students.reduce((acc, s) => acc + (s.simulados_week || 0), 0);
  const simuladosMonthFromStudents = students.reduce((acc, s) => acc + (s.simulados_month || 0), 0);
  const simuladosTotalFromStudents = students.reduce((acc, s) => acc + (s.simulados_total || 0), 0);

  const activeValue = metricWindow === 'today'
    ? activeTodayFromStudents
    : metricWindow === 'week'
      ? activeWeekFromStudents
      : metricWindow === 'month'
        ? activeMonthFromStudents
        : activeTotalFromStudents;

  const questionsValue = metricWindow === 'today'
    ? questionsTodayFromStudents
    : metricWindow === 'week'
      ? questionsWeekFromStudents
      : metricWindow === 'month'
        ? questionsMonthFromStudents
        : (stats?.questions_total ?? questionsTotalFromStudents);

  const simuladosValue = metricWindow === 'today'
    ? simuladosTodayFromStudents
    : metricWindow === 'week'
      ? simuladosWeekFromStudents
      : metricWindow === 'month'
        ? simuladosMonthFromStudents
        : (stats?.simulados_total ?? simuladosTotalFromStudents);

  const activeRate = Math.round((activeValue / Math.max(students.length, 1)) * 100);

  const getDelta = (current: number, prevToday: number, prevWeek: number, prevMonth: number): number | null => {
    if (metricWindow === 'total') return null;
    const prev = metricWindow === 'today' ? prevToday : metricWindow === 'week' ? prevWeek : prevMonth;
    return current - prev;
  };

  const deltaLabel = metricWindow === 'today' ? 'vs ontem'
    : metricWindow === 'week' ? 'vs semana passada'
    : metricWindow === 'month' ? 'vs mês passado'
    : null;

  const deliveredEssaysCount = essaysCounts
    ? metricWindow === 'today'
      ? essaysCounts.today
      : metricWindow === 'week'
        ? essaysCounts.week
        : metricWindow === 'month'
          ? essaysCounts.month
          : essaysCounts.total
    : 0;

  // ── Render ───────────────────────────────────────────────────────────────────

  const firstName = (userProfile.fullName || org.name).split(' ')[0];
  const typewriterTagline = normalizeOrgTypewriterTagline(org.typewriter_tagline);
  const approvedPhotos = normalizeOrgApprovedPhotos(org.approved_student_photos);
  const [activeApprovedPhotoIndex, setActiveApprovedPhotoIndex] = useState(0);

  useEffect(() => {
    if (approvedPhotos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveApprovedPhotoIndex((prev) => (prev + 1) % approvedPhotos.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [approvedPhotos.length]);

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame p-3 md:p-4">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <RevealItem className="mb-3 lg:mb-5">
          <BrandHero
            smokeColorHex={org.brand_primary ?? undefined}
            halftone={false}
            overlay={
              org.slug === 'ave-palavra'
                ? <FounderAveBirdAnimation />
                : <FounderApprovedPhotoOverlay photos={approvedPhotos} activeIndex={activeApprovedPhotoIndex} />
            }
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="min-w-0 lg:max-w-[calc(100%-190px)] xl:max-w-[calc(100%-220px)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                  Central de Inteligência · {org.name}
                </p>
                <h1 className="font-display text-[32px] font-black text-white lg:text-[42px]">
                  {getGreeting()}, {firstName}
                </h1>
                <p className="mt-1 text-[13px] text-white/60">Aqui está o resumo da sua turma.</p>

                {/* Tagline em script — mesmo tratamento do hero do dashboard do aluno.
                    Div (não <p>) porque o Typewriter renderiza uma <div> internamente,
                    e <div> dentro de <p> é HTML inválido (quebra a hidratação). */}
                <div
                  className="font-script mt-1 text-[20px] leading-tight text-white lg:text-[24px]"
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
            </div>
          </BrandHero>
        </RevealItem>

        {/* ── Período ───────────────────────────────────────────────────────── */}
        <RevealItem className="mb-4 flex flex-wrap items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-white/40" />
          <span className="text-[12px] font-semibold text-slate-500 dark:text-white/50">Período:</span>
          <Segmented options={PERIOD_SEGMENTS} value={metricWindow} onChange={setMetricWindow} hex={org.brand_primary} />
        </RevealItem>

        {/* ── Bento grid: coluna principal + trilha lateral ─────────────────── */}
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-5">

          {/* Coluna principal */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">

            {/* KPIs */}
            <RevealItem className="order-1 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-4 lg:gap-4">
              <KpiCard
                title="Alunos"
                value={students.length}
                subtitle={`de ${org.max_students} vagas`}
                icon={Users}
                href={`/partners/${org.slug}/alunos`}
                loading={loading}
                accentColor="var(--brand-primary)"
                accentHex={org.brand_primary}
                delta={null}
              />
              <KpiCard
                title={`Ativos · ${metricLabel}`}
                value={activeValue ?? '—'}
                subtitle={`${activeRate}% do total`}
                icon={Activity}
                loading={loading}
                accentColor="var(--brand-secondary)"
                accentHex={org.brand_secondary}
                delta={stats ? getDelta(
                  activeValue,
                  stats.prev_active_today,
                  stats.prev_active_week,
                  stats.prev_active_month,
                ) : null}
                deltaLabel={deltaLabel}
              />
              <KpiCard
                title={`Questões · ${metricLabel}`}
                value={questionsValue ?? '—'}
                subtitle="Respondidas pela turma"
                icon={BookOpen}
                loading={loading}
                accentColor="var(--brand-accent)"
                accentHex={org.brand_accent}
                delta={stats ? getDelta(
                  questionsValue,
                  stats.prev_questions_today,
                  stats.prev_questions_week,
                  stats.prev_questions_month,
                ) : null}
                deltaLabel={deltaLabel}
              />
              <KpiCard
                title={`Simulados · ${metricLabel}`}
                value={simuladosValue ?? '—'}
                subtitle="Realizados pela turma"
                icon={FileText}
                loading={loading}
                accentColor="#8b5cf6"
                accentHex="#8b5cf6"
                delta={stats ? getDelta(
                  simuladosValue,
                  stats.prev_simulados_today,
                  stats.prev_simulados_week,
                  stats.prev_simulados_month,
                ) : null}
                deltaLabel={deltaLabel}
              />
            </RevealItem>

            {/* Evolução da Turma */}
            <RevealItem className="order-5 lg:order-none">
              <TintedCard accentColor="var(--brand-secondary)" className="edificar-major-surface">
                <div className="p-5">
                  <SectionTitle
                    kicker="Desempenho"
                    title="Evolução da Turma"
                    action={<span className="text-[11px] font-semibold text-slate-400 dark:text-white/40">{metricLabel}</span>}
                    hex={org.brand_secondary}
                  />
                  {analyticsLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="h-[160px] w-full animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
                      <div className="flex flex-col gap-3">
                        <div className="h-[72px] animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
                        <div className="h-[72px] animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/50">
                          % de acertos
                        </p>
                        {(analyticsData?.accuracy_series ?? []).every((d) => d.accuracy_pct === null) ? (
                          <p className="py-10 text-center text-xs text-slate-400 dark:text-white/25">Sem dados no período</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={analyticsData?.accuracy_series ?? []} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                              <defs>
                                <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
                                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 9, fill: 'rgb(100 116 139)' }}
                                tickFormatter={(v: string) => formatDateTick(v, metricWindow)}
                                interval="preserveStartEnd"
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: 'rgb(100 116 139)' }}
                                domain={[0, 100]}
                                tickFormatter={(v) => `${v}%`}
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(v: any) => [v != null ? `${v}%` : '—', 'Acertos']}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                labelFormatter={(label: any) => formatDateLabel(String(label ?? ''), metricWindow)}
                              />
                              <Area
                                type="monotone"
                                dataKey="accuracy_pct"
                                stroke="#22c55e"
                                strokeWidth={2.5}
                                fill="url(#gradAcc)"
                                dot={false}
                                activeDot={{ r: 4, fill: '#22c55e' }}
                                connectNulls={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      {(() => {
                        const subjects = analyticsData?.subjects ?? [];
                        const pontoFraco = subjects[0];
                        const pontoForte = subjects[subjects.length - 1];
                        return (
                          <div className="flex flex-col justify-center gap-3">
                            <div className="rounded-xl bg-red-50/80 p-3.5 dark:bg-red-900/15">
                              <div className="mb-1 flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 shrink-0 text-red-500 dark:text-red-400" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-600 dark:text-red-400">Ponto Fraco</p>
                              </div>
                              {pontoFraco && pontoFraco !== pontoForte ? (
                                <>
                                  <p className="line-clamp-2 text-[13px] font-black leading-tight text-red-700 dark:text-red-300">{pontoFraco.subject}</p>
                                  <p className="mt-0.5 text-[10.5px] text-red-500 dark:text-red-400/80">{pontoFraco.accuracy_pct}% de acertos · {pontoFraco.total} questões</p>
                                </>
                              ) : (
                                <p className="mt-1 text-[10.5px] text-red-400 dark:text-red-500/60">Sem dados suficientes</p>
                              )}
                            </div>
                            <div className="rounded-xl bg-green-50/80 p-3.5 dark:bg-green-900/15">
                              <div className="mb-1 flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 shrink-0 text-green-500 dark:text-green-400" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-green-600 dark:text-green-400">Ponto Forte</p>
                              </div>
                              {pontoForte && pontoFraco !== pontoForte ? (
                                <>
                                  <p className="line-clamp-2 text-[13px] font-black leading-tight text-green-700 dark:text-green-300">{pontoForte.subject}</p>
                                  <p className="mt-0.5 text-[10.5px] text-green-500 dark:text-green-400/80">{pontoForte.accuracy_pct}% de acertos · {pontoForte.total} questões</p>
                                </>
                              ) : (
                                <p className="mt-1 text-[10.5px] text-green-400 dark:text-green-500/60">Sem dados suficientes</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </TintedCard>
            </RevealItem>

            {/* Ranking TOP 5 */}
            <RevealItem className="order-6 lg:order-none">
              <TintedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
                <div className="p-5">
                  <SectionTitle
                    kicker="Engajamento"
                    title={`Ranking · ${metricLabel}`}
                    hex={org.brand_primary}
                    action={
                      <BrandPill href={`/partners/${org.slug}/alunos`} hex={org.brand_primary}>
                        Ver todos <ArrowUpRight className="h-3 w-3" />
                      </BrandPill>
                    }
                  />
                  {loading ? (
                    <div className="space-y-2.5">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
                      ))}
                    </div>
                  ) : topStudents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-white/30">Nenhum aluno ativo ainda</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {(() => {
                        const shortNames = formatShortNames(topStudents.map((s) => s.full_name));
                        return topStudents.map((student, idx) => {
                        const max = getQuestionsByWindow(topStudents[0]) || 1;
                        const pct = Math.round((getQuestionsByWindow(student) / max) * 100);
                        const isOnline = student.last_activity_date === todayBrtKey;
                        return (
                          <Link
                            key={student.id}
                            href={`/partners/${org.slug}/alunos/${student.id}`}
                            className="group block"
                          >
                            <div
                              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                              style={idx === 0 ? { background: 'color-mix(in srgb, var(--brand-primary) 6%, transparent)' } : undefined}
                            >
                              <div className="flex w-7 shrink-0 items-center justify-center">
                                {idx < 3 ? (
                                  <Medal place={(idx + 1) as 1 | 2 | 3} />
                                ) : (
                                  <span className="text-xs font-black text-slate-400 dark:text-white/25">#{idx + 1}</span>
                                )}
                              </div>
                              <div className="relative shrink-0">
                                {student.avatar_url ? (
                                  <Image
                                    src={student.avatar_url}
                                    alt={student.full_name}
                                    width={34}
                                    height={34}
                                    className="h-[34px] w-[34px] rounded-full object-cover"
                                    style={idx === 0 ? { boxShadow: '0 0 0 2px var(--brand-accent)' } : undefined}
                                  />
                                ) : (
                                  <div
                                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-black"
                                    style={{
                                      background: 'var(--brand-primary)',
                                      color: onBrandText(org.brand_primary),
                                      boxShadow: idx === 0 ? '0 0 0 2px var(--brand-accent)' : undefined,
                                    }}
                                  >
                                    {(student.full_name || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                {isOnline && (
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex items-center justify-between">
                                  <span className="truncate text-[13px] font-bold text-slate-800 transition-colors group-hover:text-slate-950 dark:text-white/85 dark:group-hover:text-white">
                                    <span className="sm:hidden">{shortNames[idx]}</span>
                                    <span className="hidden sm:inline">{student.full_name || '—'}</span>
                                  </span>
                                  <div className="ml-2 flex shrink-0 items-center gap-2">
                                    <span className="text-[12px] font-black tabular-nums" style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }}>
                                      {getQuestionsByWindow(student)} <span className="font-semibold opacity-70">questões</span>
                                    </span>
                                    <span className="hidden text-[11px] font-bold tabular-nums text-slate-400 dark:text-white/35 sm:inline">
                                      {getSimuladosByWindow(student)} simulados
                                    </span>
                                  </div>
                                </div>
                                <MiniBar pct={pct} color="var(--brand-primary)" glow={idx === 0} height={5} />
                              </div>
                            </div>
                          </Link>
                        );
                        });
                      })()}
                      <p className="mt-2 text-[10.5px] text-slate-400 dark:text-white/30">
                        Baseado em {rankingBaseCount} aluno{rankingBaseCount === 1 ? '' : 's'} · questões e simulados no período
                      </p>
                    </div>
                  )}
                </div>
              </TintedCard>
            </RevealItem>

            {/* Tabela de atividade */}
            <RevealItem className="order-7 lg:order-none">
              <TintedCard accentColor="var(--brand-accent)" className="edificar-major-surface">
                <div className="p-5">
                  <SectionTitle
                    kicker="Atividade"
                    title="Alunos mais ativos"
                    hex={org.brand_accent}
                    action={
                      <Link
                        href={`/partners/${org.slug}/alunos`}
                        className="flex shrink-0 items-center gap-1 text-[11.5px] font-bold transition-opacity hover:opacity-70"
                        style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }}
                      >
                        Ver tabela completa <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    }
                  />
                  {loading ? (
                    <div className="space-y-2.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                      ))}
                    </div>
                  ) : students.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-white/30">
                      Nenhum aluno cadastrado ainda.{' '}
                      <Link
                        href={`/partners/${org.slug}/alunos/convidar`}
                        className="font-bold underline"
                        style={{ color: readableBrandText(org.brand_primary, 'var(--brand-primary)') }}
                      >
                        Importar alunos
                      </Link>
                    </p>
                  ) : (
                    <div className="-mx-1 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:border-white/10 dark:text-white/35">
                            <th className="pb-3 pl-1 font-bold">Aluno</th>
                            <th className="hidden pb-3 text-center font-bold sm:table-cell">Plano</th>
                            <th className="pb-3 text-center font-bold">Questões</th>
                            <th className="hidden pb-3 text-center font-bold sm:table-cell">Simulados</th>
                            <th className="pb-3 text-center font-bold">Acertos</th>
                            <th className="hidden pb-3 text-center font-bold md:table-cell">Última atividade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const shortNames = formatShortNames(studentsForTable.map((s) => s.full_name));
                            return studentsForTable.map((s, idx) => (
                            <tr
                              key={s.id}
                              className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                            >
                              <td className="py-3 pl-1">
                                <Link
                                  href={`/partners/${org.slug}/alunos/${s.id}`}
                                  className="text-[13px] font-bold text-slate-900 hover:underline dark:text-white"
                                >
                                  <span className="sm:hidden">{shortNames[idx]}</span>
                                  <span className="hidden sm:inline">{s.full_name || '—'}</span>
                                </Link>
                                <p className="hidden text-[11px] text-slate-400 dark:text-white/35 xs:block">{s.email}</p>
                              </td>
                              <td className="hidden py-3 text-center sm:table-cell">
                                <Badge className="border-slate-200 bg-slate-100 text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                                  {s.plan_name || 'Sem plano vinculado'}
                                </Badge>
                              </td>
                              <td className="py-3 text-center text-[13px] font-bold tabular-nums text-slate-700 dark:text-white/70">
                                {getQuestionsByWindow(s)}
                              </td>
                              <td className="hidden py-3 text-center text-[13px] tabular-nums text-slate-500 dark:text-white/50 sm:table-cell">
                                {getSimuladosByWindow(s)}
                              </td>
                              <td className="py-3 text-center text-[13px] font-bold tabular-nums">
                                {s.accuracy_pct != null ? (
                                  <span
                                    className={s.accuracy_pct < 60 ? 'text-rose-400' : ''}
                                    style={s.accuracy_pct >= 60 ? { color: readableBrandText(org.brand_primary, 'var(--brand-primary)') } : undefined}
                                  >
                                    {s.accuracy_pct}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-white/30">—</span>
                                )}
                              </td>
                              <td className="hidden py-3 text-center text-xs text-slate-400 dark:text-white/30 md:table-cell">
                                {s.last_activity_date ?? 'Nunca'}
                              </td>
                            </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TintedCard>
            </RevealItem>
          </div>

          {/* Trilha lateral */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">

            {/* Redações entregues */}
            <RevealItem className="order-2 lg:order-none">
              <TintedCard accentColor="var(--brand-secondary)" className="edificar-major-surface">
                <div className="p-5">
                  <SectionTitle
                    kicker="Pedagógico"
                    title="Redações entregues"
                    hex={org.brand_secondary}
                    action={
                      <BrandPill href={`/partners/${org.slug}/redacoes`} color="var(--brand-secondary)" hex={org.brand_secondary}>
                        <FileText className="h-3 w-3" /> Ver redações
                      </BrandPill>
                    }
                  />
                  {loading ? (
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                  ) : (
                    <div className="flex items-end gap-2">
                      <span className="font-display text-[34px] font-black tabular-nums text-slate-900 dark:text-white">
                        {deliveredEssaysCount}
                      </span>
                      <span className="pb-2 text-[11px] text-slate-400 dark:text-white/40">
                        no período · {metricLabel.toLowerCase()}
                      </span>
                    </div>
                  )}
                  {(userProfile.role === 'founder' || userProfile.role === 'admin') && (
                    <div
                      className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ background: 'color-mix(in srgb, var(--brand-secondary) 8%, transparent)' }}
                    >
                      <Users className="h-3.5 w-3.5" style={{ color: readableBrandText(org.brand_secondary, 'var(--brand-secondary)') }} />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-white/60">Associados</span>
                      <span className="ml-auto text-[13px] font-black tabular-nums text-slate-900 dark:text-white">
                        {loading ? '—' : (associatesCount ?? 0)}
                      </span>
                    </div>
                  )}
                </div>
              </TintedCard>
            </RevealItem>

            {/* Videoaulas */}
            {isVideoToolEnabled && (
              <RevealItem className="order-3 lg:order-none">
                <TintedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
                  <div className="p-5">
                    <SectionTitle
                      kicker="Videoaulas"
                      title="Adoção semanal"
                      hex={org.brand_primary}
                      action={
                        <BrandPill href={`/partners/${org.slug}/aulas`} hex={org.brand_primary}>
                          <Video className="h-3 w-3" /> Ver aulas
                        </BrandPill>
                      }
                    />
                    {videoAdoptionLoading ? (
                      <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                    ) : (
                      <>
                        <div className="mb-2 flex items-end gap-2">
                          <span className="font-display text-[34px] font-black tabular-nums text-slate-900 dark:text-white">
                            {videoAdoption?.pct ?? 0}%
                          </span>
                          <span className="pb-2 text-[11px] text-slate-400 dark:text-white/40">
                            {videoAdoption?.num ?? 0}/{videoAdoption?.den ?? 0} alunos · últimos 7 dias
                          </span>
                        </div>
                        <MiniBar pct={videoAdoption?.pct ?? 0} color="var(--brand-primary)" glow height={8} />
                      </>
                    )}
                  </div>
                </TintedCard>
              </RevealItem>
            )}

            {/* Questões — gráfico vivo em card escuro */}
            <RevealItem className="order-4 lg:order-none">
              <BrandHero>
                <div className="mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} />
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: HERO_ACCENT_COLOR }}>
                    Questões — {metricLabel}
                  </p>
                </div>
                {analyticsLoading ? (
                    <div className="h-[150px] w-full animate-pulse rounded-xl bg-white/10" />
                  ) : (analyticsData?.questions_series ?? []).every((d) => d.total === 0) ? (
                    <p className="py-12 text-center text-xs text-white/40">Sem dados no período</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={analyticsData?.questions_series ?? []} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradQuestoes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--brand-accent)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--brand-accent)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }}
                          tickFormatter={(v: string) => formatDateTick(v, metricWindow)}
                          interval="preserveStartEnd"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)' }}
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE_DARK}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(v: any) => [`${v} questões`, 'Volume']}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          labelFormatter={(label: any) => formatDateLabel(String(label ?? ''), metricWindow)}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="var(--brand-accent)"
                          strokeWidth={2.5}
                          fill="url(#gradQuestoes)"
                          dot={false}
                          activeDot={{ r: 4, fill: 'var(--brand-accent)' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                <p className="mt-2 text-[12px] text-white/60">
                  Total do período:{' '}
                  <span className="font-extrabold tabular-nums text-white">{loading ? '—' : questionsValue}</span>
                </p>
              </BrandHero>
            </RevealItem>
          </div>
        </div>

        </RevealGroup>
      </div>
    </PartnerLayout>
  );
}
