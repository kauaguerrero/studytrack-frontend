'use client';

// Moldura única das páginas do portal da escola.
// - Gestor: mesmo layout da página Aulas (canvas + cabeçalho com sobretítulo,
//   título grande e ação à direita). A barra lateral NÃO vem daqui: o page.tsx
//   da rota envolve tudo em <PartnerLayout>, para que carregando/editor/erro
//   também fiquem com o menu (página de gestor sem PartnerLayout fica sem menu).
// - Aluno: faixa de marca compacta (BrandHero) + conteúdo; EmptyState para telas
//   sem dados. O menu do aluno já vem do layout da área do aluno.

import type { ReactNode } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { BrandHero, HERO_ACCENT_COLOR, RevealGroup, RevealItem } from '@/components/partners/founder-ui';
import { cn } from '@/lib/utils';

export type PageVariant = 'founder' | 'student';

/** Cartão no mesmo estilo do ElevatedCard (bordas, sombra e modo escuro do portal). */
export const pageCard =
  'partner-elevated-card relative overflow-hidden rounded-[20px] border-0 bg-white dark:bg-slate-900';

interface PageShellProps {
  variant?: PageVariant;
  /** Linha pequena acima do título (ex.: "Comunicação"). */
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: React.ElementType;
  /** Botões à direita do título (gestor) ou abaixo da descrição (aluno). */
  actions?: ReactNode;
  /** Aluno: números à direita do hero (use <HeroStat>). Sem isso, mostra o ícone grande. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({ variant = 'founder', ...props }: PageShellProps) {
  return variant === 'student' ? <StudentPage {...props} /> : <FounderPage {...props} />;
}

export function FounderPage({ kicker, title, description, icon: Icon, actions, children, className }: Omit<PageShellProps, 'variant'>) {
  const { org } = useOrg();
  return (
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className={cn('edificar-page-frame flex flex-col gap-4 p-3 md:gap-5 md:p-4', className)}>
          <RevealItem className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-white/40">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {kicker ? `${kicker} · ${org.name}` : org.name}
              </p>
              <h1 className="font-display text-[26px] font-black text-slate-900 dark:text-white lg:text-[30px]">{title}</h1>
              {description && <p className="mt-1 text-[13px] text-slate-500 dark:text-white/50">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </RevealItem>
          <RevealItem className="flex flex-col gap-4 md:gap-5">{children}</RevealItem>
        </RevealGroup>
      </div>
  );
}

/**
 * Número no cabeçalho do aluno. Só passe quando o valor diz algo ao aluno
 * (nada de "0" ou "—" para quem acabou de chegar).
 */
export function HeroStat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 lg:max-w-[210px]', className)}>
    <div className="min-w-0 rounded-2xl border border-white/25 bg-white/[0.16] px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <p className="truncate text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
      <p className="font-display truncate text-[18px] font-black leading-tight text-white">{value}</p>
      {hint && <p className="max-w-[180px] truncate text-[11px] text-white/75">{hint}</p>}
    </div>
    </div>
  );
}

/**
 * Página do aluno: faixa de marca compacta (ícone + título + uma linha) e o
 * conteúdo logo abaixo. O cabeçalho não deve competir com o conteúdo —
 * no celular ele ocupa ~1/5 da tela, não a metade.
 */
export function StudentPage({ kicker, title, description, icon: Icon, actions, aside, children, className }: Omit<PageShellProps, 'variant'>) {
  const { org } = useOrg();
  return (
    <div className="relative min-h-screen -m-4 overflow-hidden bg-slate-50 px-4 py-4 md:-m-8 md:px-8 md:py-7 dark:bg-[#080808]">
      <RevealGroup className={cn('relative z-10 space-y-5', className)}>
        <RevealItem>
          <BrandHero className="px-4 py-4 sm:px-6 sm:py-5" smokeColorHex={org.brand_primary ?? undefined} halftone={false} lighten
            overlay={Icon && !aside && !actions ? (
              // lado direito vazio no desktop: o ícone da página, grande e apagado
              <Icon aria-hidden className="pointer-events-none absolute -bottom-8 right-12 hidden h-40 w-40 -rotate-12 text-white/[0.07] lg:block" strokeWidth={1.25} />
            ) : undefined}>
            <div className="relative z-10 flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
              <div className="flex min-w-0 items-center gap-3.5 lg:flex-1">
                {Icon && (
                  <div aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-md sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" style={{ color: HERO_ACCENT_COLOR }} />
                  </div>
                )}
                <div className="min-w-0">
                  {kicker && <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/45">{kicker}</p>}
                  <h1 className="font-display mt-0.5 truncate text-[22px] font-black leading-[1.15] text-white sm:text-[26px]">{title}</h1>
                  {description && <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-snug text-white/60 sm:line-clamp-1">{description}</p>}
                </div>
              </div>
              {(aside || actions) && (
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
                  {aside && <div className="grid flex-1 auto-cols-fr grid-flow-col gap-2 lg:flex-none">{aside}</div>}
                  {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
                </div>
              )}
            </div>
          </BrandHero>
        </RevealItem>
        <RevealItem className="space-y-5">{children}</RevealItem>
      </RevealGroup>
    </div>
  );
}

/**
 * Estado vazio do portal do aluno: o que é a tela, como começar e um botão.
 * `preview` é uma prévia apagada de como a tela fica com dados (decorativa).
 */
export function EmptyState({ icon: Icon, title, description, steps, action, secondary, preview, tone = 'brand' }: {
  icon: React.ElementType;
  title: ReactNode;
  description?: ReactNode;
  steps?: ReactNode[];
  action?: ReactNode;
  secondary?: ReactNode;
  preview?: ReactNode;
  tone?: 'brand' | 'emerald' | 'amber' | 'violet';
}) {
  const toneBg = {
    brand: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
    emerald: 'rgba(16,185,129,0.12)',
    amber: 'rgba(245,158,11,0.14)',
    violet: 'rgba(139,92,246,0.13)',
  }[tone];
  const toneFg = { brand: 'var(--brand-primary)', emerald: '#10b981', amber: '#f59e0b', violet: '#8b5cf6' }[tone];
  return (
    <div className={cn(pageCard, 'grid gap-6 p-5 sm:p-7', preview && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-10')}>
      <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: toneBg }} />
      <div className="relative min-w-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-[20px]" style={{ background: toneBg }}>
          <Icon className="h-7 w-7" style={{ color: toneFg }} />
        </div>
        <h2 className="font-display mt-4 text-[22px] font-black leading-tight text-slate-900 sm:text-[24px] dark:text-white">{title}</h2>
        {description && <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>}
        {steps && steps.length > 0 && (
          <ol className="mt-5 space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-[13.5px] text-slate-700 dark:text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black" style={{ background: toneBg, color: toneFg }}>{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        )}
        {(action || secondary) && <div className="mt-6 flex flex-wrap items-center gap-3">{action}{secondary}</div>}
      </div>
      {preview && (
        <div aria-hidden className="relative hidden select-none sm:block">
          <div className="pointer-events-none [mask-image:linear-gradient(180deg,#000_45%,transparent)]">{preview}</div>
        </div>
      )}
    </div>
  );
}

/** Botão principal do portal do aluno (cor da escola). */
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 [background:var(--brand-primary)]';
/** Botão secundário (contorno). */
export const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
