import {
  Footprints, BookOpen, Brain, Crown, FileCheck, ClipboardList,
  Trophy, Flame, FlameKindling, PenLine, Medal, Compass, LibraryBig,
  Moon, Sunrise, Sparkles, Zap, ShieldCheck, ShieldPlus, Award, Gem, Infinity, Star,
  Rocket, Mountain, Orbit, Bug,
  type LucideIcon,
} from 'lucide-react';

/**
 * Ícones das conquistas permanentes — precisa bater com os `icon` retornados
 * por GET /api/partner/gamification/achievements (achievements_service.py).
 */
export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  footprints: Footprints,
  'book-open': BookOpen,
  brain: Brain,
  crown: Crown,
  'file-check': FileCheck,
  'clipboard-list': ClipboardList,
  trophy: Trophy,
  flame: Flame,
  'flame-kindling': FlameKindling,
  'pen-line': PenLine,
  medal: Medal,
  compass: Compass,
  'library-big': LibraryBig,
  moon: Moon,
  sunrise: Sunrise,
  sparkles: Sparkles,
  zap: Zap,
  'shield-check': ShieldCheck,
  'shield-plus': ShieldPlus,
  award: Award,
  gem: Gem,
  infinity: Infinity,
  star: Star,
  rocket: Rocket,
  mountain: Mountain,
  orbit: Orbit,
  bug: Bug,
};

export function getAchievementIcon(key: string | undefined | null): LucideIcon {
  return ACHIEVEMENT_ICONS[key ?? ''] ?? Trophy;
}

/**
 * Estilo por nível de raridade — precisa bater com `difficulty` retornado
 * por GET /api/partner/gamification/achievements (DIFFICULTY_TIERS no
 * achievements_service.py). Classes Tailwind escritas por extenso (não
 * interpoladas) de propósito: o compilador JIT só reconhece classes que
 * aparecem literalmente no código-fonte.
 *
 * Regra de design: a cor do tier só deve ser aplicada quando a conquista
 * está desbloqueada — travada usa sempre o visual neutro (cinza). A cor é a
 * recompensa do desbloqueio, não um spoiler de quão rara ela é.
 */
export interface DifficultyStyle {
  cardBorder: string;
  cardBg: string;
  iconBg: string;
  iconText: string;
  chanceText: string;
  glow?: string;
}

export const DIFFICULTY_STYLES: Record<string, DifficultyStyle> = {
  common: {
    cardBorder: 'border-emerald-200 dark:border-emerald-500/25',
    cardBg: 'bg-emerald-50/60 dark:bg-emerald-500/[0.06]',
    iconBg: 'bg-emerald-400/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    chanceText: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-[0_0_16px_-6px_rgba(16,185,129,0.4)]',
  },
  uncommon: {
    cardBorder: 'border-blue-200 dark:border-blue-500/25',
    cardBg: 'bg-blue-50/60 dark:bg-blue-500/[0.06]',
    iconBg: 'bg-blue-400/20',
    iconText: 'text-blue-600 dark:text-blue-400',
    chanceText: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-[0_0_16px_-6px_rgba(59,130,246,0.4)]',
  },
  rare: {
    cardBorder: 'border-violet-200 dark:border-violet-500/25',
    cardBg: 'bg-violet-50/60 dark:bg-violet-500/[0.06]',
    iconBg: 'bg-violet-400/20',
    iconText: 'text-violet-600 dark:text-violet-400',
    chanceText: 'text-violet-600 dark:text-violet-400',
    glow: 'shadow-[0_0_16px_-6px_rgba(139,92,246,0.4)]',
  },
  epic: {
    cardBorder: 'border-fuchsia-200 dark:border-fuchsia-500/25',
    cardBg: 'bg-fuchsia-50/60 dark:bg-fuchsia-500/[0.06]',
    iconBg: 'bg-fuchsia-400/20',
    iconText: 'text-fuchsia-600 dark:text-fuchsia-400',
    chanceText: 'text-fuchsia-600 dark:text-fuchsia-400',
    glow: 'shadow-[0_0_16px_-6px_rgba(217,70,239,0.4)]',
  },
  legendary: {
    cardBorder: 'border-amber-200 dark:border-amber-500/25',
    cardBg: 'bg-amber-50/60 dark:bg-amber-500/[0.06]',
    iconBg: 'bg-amber-400/20',
    iconText: 'text-amber-600 dark:text-amber-400',
    chanceText: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-[0_0_16px_-6px_rgba(245,158,11,0.4)]',
  },
  ultra_rare: {
    cardBorder: 'border-rose-300 dark:border-rose-500/30',
    cardBg: 'bg-rose-50/70 dark:bg-rose-500/[0.08]',
    iconBg: 'bg-rose-400/25',
    iconText: 'text-rose-600 dark:text-rose-400',
    chanceText: 'text-rose-600 dark:text-rose-400',
    glow: 'shadow-[0_0_24px_-4px_rgba(244,63,94,0.35)]',
  },
};

const DEFAULT_DIFFICULTY_STYLE: DifficultyStyle = DIFFICULTY_STYLES.common;

export function getDifficultyStyle(difficulty: string | undefined | null): DifficultyStyle {
  return DIFFICULTY_STYLES[difficulty ?? ''] ?? DEFAULT_DIFFICULTY_STYLE;
}

/**
 * `null` sinaliza "sem dado válido pra mostrar" — o backend antigo (antes da
 * raridade existir) não manda `chance_pct`, e um deploy do front à frente do
 * back não pode virar "NaN% de chance" na tela.
 */
export function formatChancePct(chancePct: number | undefined | null): string | null {
  if (typeof chancePct !== 'number' || !Number.isFinite(chancePct)) return null;
  return chancePct < 1
    ? `${chancePct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : `${Math.round(chancePct)}%`;
}
