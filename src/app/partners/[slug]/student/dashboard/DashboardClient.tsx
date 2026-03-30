'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, FileText, Flame, Trophy, ArrowRight, GraduationCap } from 'lucide-react';

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

// ─── Streak progress helper ──────────────────────────────────────────────────

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

  const { next: nextMilestone, pct: streakPct } = getStreakProgress(currentStreak);

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariant}
      initial="hidden"
      animate="show"
    >
      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white select-none"
          style={{ background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)' }}
        >
          {/* Orange ambient glow */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full blur-3xl opacity-25"
            style={{ background: brandPrimary }}
          />
          <div
            className="pointer-events-none absolute right-10 bottom-0 h-20 w-20 rounded-full blur-2xl opacity-10"
            style={{ background: brandPrimary }}
          />

          <div className="relative z-10">
            {/* Org tag */}
            <div className="mb-4 flex items-center gap-2">
              {orgLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={orgLogoUrl}
                  alt={orgName}
                  className="h-6 w-6 rounded object-contain bg-white/10 p-0.5"
                />
              ) : (
                <GraduationCap className="h-5 w-5 opacity-40" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {orgName}
              </span>
            </div>

            {/* Greeting */}
            <h1 className="text-3xl font-extrabold tracking-tight leading-none">
              Olá, {firstName}!
            </h1>
            <p className="mt-1.5 text-sm text-white/45">
              Cada questão te aproxima da aprovação.
            </p>

            {/* Stats badges */}
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10">
                <Flame className="h-3.5 w-3.5" style={{ color: brandPrimary }} />
                {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'} de sequência
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/10">
                <Trophy className="h-3.5 w-3.5" style={{ color: brandPrimary }} />
                {totalPoints.toLocaleString('pt-BR')} pontos
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Progresso da Sequência ────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Progresso da sequência
            </span>
            <span className="text-[11px] font-bold" style={{ color: brandPrimary }}>
              Meta: {nextMilestone} dias
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${brandPrimary}, ${brandPrimary}bb)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${shouldReduce ? streakPct : streakPct}%` }}
              transition={
                shouldReduce
                  ? { duration: 0 }
                  : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }
              }
            />
          </div>

          <p className="mt-1.5 text-[11px] text-slate-400">
            {currentStreak} de {nextMilestone} dias · {streakPct}% concluído
          </p>
        </div>
      </motion.div>

      {/* ── Action Cards ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariant} className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Primary CTA — Simulados */}
        <Link href={`/partners/${slug}/student/simulado`} className="block group cursor-pointer">
          <div
            className="relative overflow-hidden rounded-xl p-5 text-white transition-transform duration-200 active:scale-[0.98] hover:brightness-105"
            style={{ background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimary}cc 100%)` }}
          >
            <div className="pointer-events-none absolute -right-4 -bottom-4 h-28 w-28 rounded-full bg-black/10" />
            <div className="relative z-10">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <FileText className="h-5 w-5" />
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                Destaque
              </p>
              <h2 className="text-[18px] font-extrabold leading-tight">Simulados</h2>
              <p className="mt-1 text-xs text-white/65">
                Faça simulados completos com TRI
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold">
                Começar agora
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Secondary — Banco de Questões */}
        <Link href={`/partners/${slug}/student/banco-de-questoes`} className="block group cursor-pointer">
          <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-200 hover:shadow-md active:scale-[0.98] h-full">
            <div className="relative z-10">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${brandPrimary}18` }}
              >
                <BookOpen className="h-5 w-5" style={{ color: brandPrimary }} />
              </div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Praticar
              </p>
              <h2 className="text-[18px] font-extrabold text-slate-800 leading-tight">
                Banco de Questões
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Pratique com +2.700 questões do ENEM
              </p>
              <div
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold"
                style={{ color: brandPrimary }}
              >
                Explorar questões
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Portal Link ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariant}>
        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center">
          <p className="text-xs text-slate-400 mb-1.5">
            Pratique com o banco completo de questões
          </p>
          <Link
            href={`/partners/${slug}/student/banco-de-questoes`}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Ver banco de questões
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
