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
