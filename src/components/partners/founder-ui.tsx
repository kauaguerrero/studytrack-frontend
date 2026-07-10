'use client';

// Sistema visual compartilhado das páginas de founder/partners — extraído do
// dashboard (FounderDashboardClient) para reuso em alunos, aulas, planos,
// ranking, redações, simulados, configurações e suporte. Cards elevados só
// por sombra (sem borda, sem "liquid glass"), tipografia .font-display,
// animação de entrada em cascata, e cores de marca sempre com contraste seguro
// via readableBrandText/onBrandText (nunca cor pura de marca em texto/preenchimento
// sólido, que pode ficar ilegível para marcas com cor clara).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { readableBrandText, readableBrandTextOnDark, onBrandText } from '@/lib/brand-color';
import { SmokeBackground } from '@/components/ui/spooky-smoke-animation';

/** CSS vars prontas pra `.brand-text-adaptive` decidir claro/escuro via seletor `.dark`. */
function brandTextAdaptiveStyle(hex: string | undefined | null, cssVar: string) {
  return {
    ['--bta-light' as string]: readableBrandText(hex, cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(hex, cssVar),
  };
}

// ─── Reveal (fade + slide-up escalonado ao carregar) ───────────────────────────

const revealContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const revealItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function RevealGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealContainer} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealItem}>
      {children}
    </motion.div>
  );
}

// ─── ElevatedCard (card sem borda, sombra em duas camadas, hover com lift) ─────

export function ElevatedCard({
  children,
  className,
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
}) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden border-0 rounded-[20px] shadow-none',
        'partner-elevated-card partner-elevated-card-hover',
        'bg-white dark:bg-slate-900',
        className,
      )}
    >
      {accentColor && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{ background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 40%, white))` }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </Card>
  );
}

// ─── KpiCard ────────────────────────────────────────────────────────────────

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  loading,
  accentColor,
  accentHex,
  delta,
  deltaLabel,
  topRightBadge,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  href?: string;
  loading?: boolean;
  accentColor: string;
  accentHex?: string;
  delta?: number | null;
  deltaLabel?: string | null;
  /** Substitui o delta/seta padrão no canto superior direito por um conteúdo
   * customizado (ex: badge de conquista/liderança). */
  topRightBadge?: React.ReactNode;
}) {
  const iconBg = `color-mix(in srgb, ${accentColor} 16%, white)`;
  const iconColor = readableBrandText(accentHex, accentColor, 46);
  const glowBg = `radial-gradient(circle at top right, color-mix(in srgb, ${accentColor} 14%, transparent), transparent 70%)`;

  const content = (
    <div
      className={cn(
        'relative overflow-hidden rounded-[20px] p-4 lg:p-5',
        'partner-elevated-card partner-elevated-card-hover',
        'bg-white dark:bg-slate-900',
        'group',
        href && 'cursor-pointer'
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 40%, white))` }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glowBg }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: iconBg,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px color-mix(in srgb, ${accentColor} 22%, transparent)`,
            }}
          >
            <Icon
              className="relative z-10 h-[18px] w-[18px]"
              style={{ color: iconColor }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {topRightBadge ? topRightBadge : delta !== null && delta !== undefined && !loading ? (
              <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                delta > 0
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : delta < 0
                    ? 'bg-red-50 dark:bg-red-500/15 text-red-500 dark:text-red-400'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-white/30'
              }`}>
                {delta > 0 ? <TrendingUpIcon /> : delta < 0 ? <TrendingDownIcon /> : null}
                <span>{delta > 0 ? '+' : ''}{delta}</span>
              </div>
            ) : href ? (
              <ArrowUpRightIcon className="text-slate-400 dark:text-white/20 group-hover:text-slate-700 dark:group-hover:text-white/60 transition-colors" />
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="h-8 w-20 bg-slate-200 dark:bg-white/10 rounded-lg animate-pulse" />
        ) : (
          <div className="font-display text-[26px] font-black text-slate-900 dark:text-white tabular-nums lg:text-[28px]">{value}</div>
        )}

        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-white/50 mt-1">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 dark:text-white/30 mt-0.5">{subtitle}</p>
        )}
        {deltaLabel && delta !== null && delta !== undefined && !loading && (
          <p className="text-[10px] text-slate-400 dark:text-white/25 mt-0.5">{deltaLabel}</p>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// Ícones minúsculos inline para não acoplar founder-ui a lucide-react só por 3 setas.
function TrendingUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function TrendingDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" />
    </svg>
  );
}
function ArrowUpRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={cn('h-3.5 w-3.5', className)} strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

// ─── SectionTitle ────────────────────────────────────────────────────────────

export function SectionTitle({ kicker, title, action, hex, colorVar = 'var(--brand-primary)' }: { kicker?: string; title: string; action?: React.ReactNode; hex?: string; colorVar?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {kicker && (
          <p className="brand-text-adaptive text-[10px] font-bold uppercase tracking-[0.14em]" style={brandTextAdaptiveStyle(hex, colorVar)}>
            {kicker}
          </p>
        )}
        <h2 className="font-display truncate text-[17px] font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ─── BrandPill / BrandButton (preenchimento sólido com a cor de marca) ────────

export function BrandPill({ href, children, color = 'var(--brand-primary)', hex, className }: { href: string; children: React.ReactNode; color?: string; hex?: string; className?: string }) {
  const textColor = onBrandText(hex);
  return (
    <Link
      href={href}
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-transform hover:scale-[1.04] active:scale-[0.97]', className)}
      style={{ background: color, color: textColor, boxShadow: `0 6px 16px -6px ${color}` }}
    >
      {children}
    </Link>
  );
}

export function BrandButton({
  children,
  onClick,
  color = 'var(--brand-primary)',
  hex,
  className,
  type = 'button',
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  hex?: string;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const textColor = onBrandText(hex);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      style={{ background: color, color: textColor, boxShadow: `0 6px 16px -6px ${color}` }}
    >
      {children}
    </button>
  );
}

// ─── Segmented (toggle de período/filtro em pills) ────────────────────────────

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  hex,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  hex?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 p-1 dark:bg-white/10">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-150',
              active
                ? 'bg-white shadow-sm dark:bg-slate-900'
                : 'text-slate-500 hover:text-slate-700 dark:text-white/50 dark:hover:text-white/80',
            )}
            style={active ? { color: readableBrandText(hex, 'var(--brand-primary)') } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Medal (ranking top 3) ──────────────────────────────────────────────────

const MEDAL_COLORS = ['#F5B428', '#B9C2CF', '#CD8246'];

export function Medal({ place }: { place: 1 | 2 | 3 }) {
  const c = MEDAL_COLORS[place - 1];
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white"
      style={{ background: c, boxShadow: `0 2px 8px ${c}66` }}
    >
      {place}
    </div>
  );
}

// ─── MiniBar (barra de progresso viva, com preenchimento em gradiente) ────────

export function MiniBar({ pct, color, glow = false, height = 6 }: { pct: number; color: string; glow?: boolean; height?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.max(0, Math.min(100, pct))), 150);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" style={{ height }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${w}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 65%, white), ${color})`,
          transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: glow ? `0 0 10px ${color}` : undefined,
        }}
      />
    </div>
  );
}

// ─── Tooltip styles para recharts (light / dark) ──────────────────────────────

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgb(255 255 255 / 0.98)',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 8px 24px -8px rgba(15, 23, 42, 0.25)',
  color: '#0f172a',
};

export const CHART_TOOLTIP_STYLE_DARK = {
  backgroundColor: 'rgba(10, 15, 30, 0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '12px',
  color: '#fff',
};

// ─── Hero escuro (navy card com halftone, usado em cabeçalhos de página) ──────

export function BrandHero({
  children,
  className,
  smokeColorHex,
  halftone = true,
  lighten = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Ativa a camada de fumaça animada (WebGL) por trás do conteúdo, tingida
   * com essa cor (hex real da marca — o shader não entende CSS vars). Opt-in:
   * sem essa prop o hero se comporta exatamente como antes. */
  smokeColorHex?: string;
  /** Textura de pontinhos decorativa. Padrão true (comportamento original). */
  halftone?: boolean;
  /** Gradiente de base mais claro/aberto em vez do navy escuro padrão. */
  lighten?: boolean;
}) {
  const heroBg = lighten
    ? 'radial-gradient(120% 140% at 15% 0%, color-mix(in srgb, var(--brand-primary) 34%, #333f5c) 0%, color-mix(in srgb, var(--brand-primary) 16%, #232c44) 62%)'
    : 'radial-gradient(120% 140% at 15% 0%, color-mix(in srgb, var(--brand-primary) 45%, #101E45) 0%, color-mix(in srgb, var(--brand-primary) 16%, #060E27) 62%)';
  const heroShadow = '0 20px 48px -20px color-mix(in srgb, var(--brand-primary) 35%, rgba(6,14,39,0.6))';
  return (
    <div className={cn('relative overflow-hidden rounded-[22px] p-5 lg:p-7', className)} style={{ background: heroBg, boxShadow: heroShadow }}>
      {halftone && (
        <div
          className="partner-halftone pointer-events-none absolute inset-0"
          style={{ maskImage: 'radial-gradient(120% 120% at 90% 10%, black, transparent 70%)' }}
        />
      )}
      <div
        className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl opacity-25"
        style={{ background: 'var(--brand-accent)' }}
      />
      {smokeColorHex && (
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen">
          <SmokeBackground smokeColor={smokeColorHex} />
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** Cor de ícone/texto legível sobre o hero escuro (clareia em vez de escurecer). */
export const HERO_ACCENT_COLOR = 'color-mix(in srgb, var(--brand-accent) 55%, white)';
