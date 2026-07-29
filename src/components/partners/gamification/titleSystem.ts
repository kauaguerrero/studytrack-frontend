'use client';

import {
  Award,
  BadgeCheck,
  Brain,
  Compass,
  Crown,
  Flame,
  Focus,
  GraduationCap,
  Hammer,
  KeyRound,
  LibraryBig,
  Map,
  Mic,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Workflow,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  CanonicalGamificationTitle,
  LegacyGamificationTitle,
  ProgressTier,
} from '@/types/gamification';

export interface GamificationTitleMeta {
  title: string;
  Icon: LucideIcon;
  shortDesc: string;
  longDesc: string;
  color: string;
  glow: string;
}

export const GAMIFICATION_TITLE_ORDER: CanonicalGamificationTitle[] = [
  'Aspirante',
  'Explorador',
  'Estrategista',
  'Veterano',
  'Elite',
  'Lendário',
];

export const LEGACY_TITLE_ALIASES: Record<LegacyGamificationTitle, CanonicalGamificationTitle> = {
  Iniciante: 'Aspirante',
  Veterano: 'Veterano',
  Expert: 'Lendário',
};

export const GAMIFICATION_TITLE_META: Record<CanonicalGamificationTitle, GamificationTitleMeta> = {
  Aspirante: {
    title: 'Aspirante',
    Icon: Target,
    shortDesc: 'Começa a construir base',
    longDesc: 'Deu o primeiro passo e entrou no jogo com foco em evoluir.',
    color: '#64748B',
    glow: 'rgba(100,116,139,0.22)',
  },
  Explorador: {
    title: 'Explorador',
    Icon: Compass,
    shortDesc: 'Já enxerga o terreno',
    longDesc: 'Começa a reconhecer padrões e ganha leitura de prova.',
    color: '#0891B2',
    glow: 'rgba(8,145,178,0.22)',
  },
  Estrategista: {
    title: 'Estrategista',
    Icon: Shield,
    shortDesc: 'Toma decisões com método',
    longDesc: 'Mostra consistência e começa a transformar leitura em vantagem.',
    color: '#4F46E5',
    glow: 'rgba(79,70,229,0.22)',
  },
  Veterano: {
    title: 'Veterano',
    Icon: Zap,
    shortDesc: 'Mantém ritmo competitivo',
    longDesc: 'Já tem repertório de prova e entra em disputa com consistência.',
    color: '#8B5CF6',
    glow: 'rgba(139,92,246,0.22)',
  },
  Elite: {
    title: 'Elite',
    Icon: Crown,
    shortDesc: 'Joga em nível alto',
    longDesc: 'Mostra domínio acima da média e presença natural nas primeiras posições.',
    color: '#DB2777',
    glow: 'rgba(219,39,119,0.22)',
  },
  Lendário: {
    title: 'Lendário',
    Icon: Trophy,
    shortDesc: 'Abre a jornada no topo',
    longDesc: 'Chega ao auge do mês com pontuação de referência e presença marcante.',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.26)',
  },
};

const IDENTITY_ICON_MAP: Record<string, LucideIcon> = {
  crown: Crown,
  target: Target,
  hammer: Hammer,
  map: Map,
  shield: Shield,
  flag: Award,
  compass: Compass,
  eye: Focus,
  milestone: Award,
  anvil: Hammer,
  'shield-check': ShieldCheck,
  'calendar-check': BadgeCheck,
  focus: Focus,
  'columns-3': Workflow,
  route: Compass,
  wrench: Hammer,
  'bell-ring': Zap,
  drum: Zap,
  workflow: Workflow,
  swords: Swords,
  'scan-search': Brain,
  'drafting-compass': Compass,
  'line-chart': TrendingUp,
  'badge-help': BadgeCheck,
  crosshair: Target,
  'sliders-horizontal': Workflow,
  'key-round': KeyRound,
  'building-2': Award,
  brain: Brain,
  'library-big': LibraryBig,
  'book-lock': LibraryBig,
  'sun-medium': Zap,
  books: LibraryBig,
  'graduation-cap': GraduationCap,
  'rotate-cw': TrendingUp,
  sword: Swords,
  'shield-alert': ShieldAlert,
  mic: Mic,
  flame: Flame,
  'trending-up': TrendingUp,
  'ship-wheel': Compass,
  'badge-check': BadgeCheck,
};

export function normalizeGamificationTitle(
  title?: string | null,
): CanonicalGamificationTitle {
  if (!title) return 'Aspirante';
  return LEGACY_TITLE_ALIASES[title as LegacyGamificationTitle] ?? (title as CanonicalGamificationTitle);
}

export function getGamificationTitleMeta(
  title?: string | null,
): GamificationTitleMeta {
  if (!title) return GAMIFICATION_TITLE_META.Aspirante;
  const canonical = LEGACY_TITLE_ALIASES[title as LegacyGamificationTitle] ?? title;
  if (canonical in GAMIFICATION_TITLE_META) {
    return GAMIFICATION_TITLE_META[canonical as CanonicalGamificationTitle];
  }

  return {
    title,
    Icon: ShieldCheck,
    shortDesc: 'Título de identidade do mês',
    longDesc: 'Representa o perfil que você escolheu construir neste mês.',
    color: '#0F766E',
    glow: 'rgba(15,118,110,0.22)',
  };
}

export function getProgressTierMeta(tier?: ProgressTier | string | null): GamificationTitleMeta {
  const safeTier = tier && tier in GAMIFICATION_TITLE_META ? tier as CanonicalGamificationTitle : 'Explorador';
  return GAMIFICATION_TITLE_META[safeTier];
}

export function getIdentityTitleIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return ShieldCheck;
  return IDENTITY_ICON_MAP[iconName] ?? ShieldCheck;
}

// ─── Progresso de tier no cliente ───────────────────────────────────────────
// Espelha o _PROGRESS_TIER_MAP do backend (gamification_service.py). Usado
// pelos popups de recompensa, que só recebem a pontuação mensal crua.

const PROGRESS_TIER_MIN_POINTS: Array<{ tier: ProgressTier; minPoints: number }> = [
  { tier: 'Explorador', minPoints: 0 },
  { tier: 'Estrategista', minPoints: 200 },
  { tier: 'Veterano', minPoints: 450 },
  { tier: 'Elite', minPoints: 700 },
  { tier: 'Lendário', minPoints: 1000 },
];

export function getTierProgress(monthlyPoints: number): {
  current: ProgressTier;
  next: ProgressTier | null;
  nextMinPoints: number | null;
  pct: number;
} {
  const pts = Math.max(0, monthlyPoints);
  let currentIdx = 0;
  for (let i = PROGRESS_TIER_MIN_POINTS.length - 1; i >= 0; i--) {
    if (pts >= PROGRESS_TIER_MIN_POINTS[i].minPoints) { currentIdx = i; break; }
  }
  const nextEntry = PROGRESS_TIER_MIN_POINTS[currentIdx + 1] ?? null;
  return {
    current: PROGRESS_TIER_MIN_POINTS[currentIdx].tier,
    next: nextEntry?.tier ?? null,
    nextMinPoints: nextEntry?.minPoints ?? null,
    pct: nextEntry ? Math.min(100, Math.round((pts / nextEntry.minPoints) * 100)) : 100,
  };
}

// ─── Nível de conta (XP permanente) ─────────────────────────────────────────
// Derivado de profiles.total_points, que nunca reseta com o mês — é a camada
// de progresso de longo prazo do aluno. O XP espelha os lançamentos positivos
// do gamification_ledger (+2/1º acerto, +25/redação, simulado variável,
// diagnóstico 50–247).
//
// Curva calibrada em 29/07/2026 nos dados reais de produção: o aluno mais
// ativo da base tinha 3.100 XP (1.132 questões, 789 acertos, 127 simulados).
// Com a curva antiga (passo triangular 250×N) isso o deixava só no nível 5 —
// achatado, dado o quanto ele já tinha estudado. Quem responde centenas de
// questões precisa sentir progresso real, não estagnação.
//
// XP acumulado para alcançar o nível N = 50 × (N-1)^1.7 (arredondado).
// Nível 2 custa só 50 XP (~1 semana ativa, vitória rápida), e a curva
// acelera suavemente depois. Nos dados reais: 3.100 XP ≈ nível 12,
// ~1.400 XP ≈ nível 9, ~500 XP ≈ nível 4-5, ~100 XP ≈ nível 2.

const ACCOUNT_LEVEL_XP_BASE = 50;
const ACCOUNT_LEVEL_XP_EXPONENT = 1.7;

function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(ACCOUNT_LEVEL_XP_BASE * Math.pow(level - 1, ACCOUNT_LEVEL_XP_EXPONENT));
}

export function getAccountLevel(totalPoints: number): {
  level: number;
  /** XP já ganho dentro do nível atual. */
  xpIntoLevel: number;
  /** XP total necessário para completar o nível atual. */
  xpForNextLevel: number;
  pct: number;
} {
  const xp = Math.max(0, totalPoints);
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= xp) {
    level += 1;
  }
  const currentThreshold = cumulativeXpForLevel(level);
  const nextThreshold = cumulativeXpForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpForNextLevel = nextThreshold - currentThreshold;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    pct: Math.round((xpIntoLevel / xpForNextLevel) * 100),
  };
}
