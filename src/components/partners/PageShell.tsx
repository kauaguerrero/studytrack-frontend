'use client';

// Moldura única das páginas do portal da escola.
// - Gestor: mesmo layout da página Aulas (canvas + cabeçalho com sobretítulo,
//   título grande e ação à direita). A barra lateral NÃO vem daqui: o page.tsx
//   da rota envolve tudo em <PartnerLayout>, para que carregando/editor/erro
//   também fiquem com o menu (página de gestor sem PartnerLayout fica sem menu).
// - Aluno: mesmo layout de Títulos (fundo em largura total + BrandHero). O menu
//   do aluno já vem do layout da área do aluno.

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

/** Número em destaque no lado direito do hero do aluno (cartão de vidro). */
export function HeroStat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-[132px] rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 backdrop-blur-md">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="font-display mt-0.5 truncate text-[22px] font-black leading-tight text-white">{value}</p>
      {hint && <p className="mt-0.5 max-w-[200px] truncate text-[11.5px] text-white/55">{hint}</p>}
    </div>
  );
}

export function StudentPage({ kicker, title, description, icon: Icon, actions, aside, children, className }: Omit<PageShellProps, 'variant'>) {
  const { org } = useOrg();
  return (
    <div className="relative min-h-screen -m-4 overflow-hidden bg-slate-50 px-4 py-5 md:-m-8 md:px-8 md:py-8 dark:bg-[#080808]">
      <RevealGroup className={cn('relative z-10 space-y-6', className)}>
        <RevealItem>
          <BrandHero className="p-5 lg:p-7" smokeColorHex={org.brand_primary ?? undefined} halftone={false} lighten>
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 lg:flex-1">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                  {Icon && <Icon className="h-3.5 w-3.5" style={{ color: HERO_ACCENT_COLOR }} />}
                  {kicker ? `${kicker} · ${org.name}` : org.name}
                </p>
                <h1 className="font-display mt-1.5 text-[30px] font-black leading-[1.05] text-white lg:text-[40px]">{title}</h1>
                {description && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/65 lg:text-[15px]">{description}</p>}
                {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
              {aside ? (
                <div className="flex flex-wrap gap-2.5 lg:justify-end">{aside}</div>
              ) : Icon ? (
                <div aria-hidden className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-white/[0.07] backdrop-blur-md lg:flex">
                  <Icon className="h-11 w-11 text-white/80" />
                </div>
              ) : null}
            </div>
          </BrandHero>
        </RevealItem>
        <RevealItem className="space-y-6">{children}</RevealItem>
      </RevealGroup>
    </div>
  );
}
