import {
  Sparkles, Rocket, Zap, Bell, Trophy, BookOpen, Wrench,
  Bug, ShieldCheck, Gift, Star, Megaphone, PartyPopper,
  TrendingUp, Flame, type LucideIcon,
} from 'lucide-react';

/**
 * Conjunto curado de ícones pra anúncios de novidade — precisa bater com
 * VALID_ANNOUNCEMENT_ICONS no backend (app/blueprints/admin.py). Chaves em
 * kebab-case (nome "lucide" convencional).
 */
export const ANNOUNCEMENT_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  sparkles: { icon: Sparkles, label: 'Novidade' },
  rocket: { icon: Rocket, label: 'Lançamento' },
  zap: { icon: Zap, label: 'Melhoria' },
  bell: { icon: Bell, label: 'Aviso' },
  trophy: { icon: Trophy, label: 'Conquista' },
  'book-open': { icon: BookOpen, label: 'Conteúdo' },
  wrench: { icon: Wrench, label: 'Ajuste' },
  bug: { icon: Bug, label: 'Correção' },
  'shield-check': { icon: ShieldCheck, label: 'Segurança' },
  gift: { icon: Gift, label: 'Bônus' },
  star: { icon: Star, label: 'Destaque' },
  megaphone: { icon: Megaphone, label: 'Comunicado' },
  'party-popper': { icon: PartyPopper, label: 'Celebração' },
  'trending-up': { icon: TrendingUp, label: 'Evolução' },
  flame: { icon: Flame, label: 'Em alta' },
};

export const DEFAULT_ANNOUNCEMENT_ICON = 'sparkles';

export function getAnnouncementIcon(key: string | undefined | null): LucideIcon {
  return ANNOUNCEMENT_ICONS[key ?? '']?.icon ?? ANNOUNCEMENT_ICONS[DEFAULT_ANNOUNCEMENT_ICON].icon;
}
