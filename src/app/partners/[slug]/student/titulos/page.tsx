'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Medal,
  Sparkles,
  Orbit,
  Trophy,
  History,
  ShieldCheck,
  Stars,
} from 'lucide-react';
import { usePartnerGamification } from '@/hooks/usePartnerGamification';
import { useOrg } from '@/contexts/OrgContext';
import { getIdentityTitleIcon, getProgressTierMeta } from '@/components/partners/gamification/titleSystem';

function formatMonthLabel(monthRef: string): string {
  const date = new Date(`${monthRef}T12:00:00`);
  if (Number.isNaN(date.getTime())) return monthRef;
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const PARTICLE_DATA = Array.from({ length: 10 }, (_, i) => ({
  size: 4 + seededRand(i * 9) * 6,
  left: 8 + seededRand(i * 9 + 1) * 84,
  top: 6 + seededRand(i * 9 + 2) * 88,
  opacity: 0.12 + seededRand(i * 9 + 3) * 0.22,
}));

function formatPointsDelta(value?: number | null): string {
  if (value == null) return 'Primeiro mês fechado';
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR')} pts vs. mês anterior`;
}

function formatTierDelta(value?: number | null): string {
  if (value == null) return 'Sem comparação anterior';
  return `${value >= 0 ? '+' : ''}${value} etapa(s)`;
}

export default function PartnerStudentTitlesPage() {
  const { org } = useOrg();
  const {
    titlesJourney,
    titlesHistory,
    checkInStatus,
    isLoading,
    error,
    refreshTitlesJourney,
    refreshTitlesHistory,
    refreshCheckInStatus,
  } = usePartnerGamification({ fetchPopupStateOnMount: false });

  useEffect(() => {
    if (isLoading) return;
    void Promise.all([
      refreshTitlesJourney(),
      refreshTitlesHistory(),
      refreshCheckInStatus(),
    ]);
  }, [isLoading, refreshCheckInStatus, refreshTitlesHistory, refreshTitlesJourney]);

  const identity = titlesJourney?.identity_profile;
  const IdentityIcon = getIdentityTitleIcon(identity?.identity_title_icon);
  const currentTierMeta = getProgressTierMeta(titlesJourney?.progress_tier);

  if (isLoading && !titlesJourney) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70" />
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    );
  }

  if (error && !titlesJourney) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        {error}
      </div>
    );
  }

  if (titlesJourney && !titlesJourney.enabled) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#0F1115]">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Esta jornada de títulos ainda não está habilitada para {org.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen -m-4 overflow-hidden bg-slate-50 px-4 py-5 md:-m-8 md:px-8 md:py-8 dark:bg-[#080808]">
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{ background: 'radial-gradient(ellipse 78% 56% at 50% -8%, color-mix(in srgb, var(--brand-primary) 15%, transparent) 0%, transparent 72%), radial-gradient(ellipse 52% 38% at 80% 78%, rgba(245,158,11,0.08) 0%, transparent 62%)' }}
      />

      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        {PARTICLE_DATA.map((particle, index) => (
          <div
            key={index}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              opacity: particle.opacity,
              background: index % 2 === 0 ? 'var(--brand-primary)' : '#f59e0b',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-xl dark:border-white/8 dark:bg-[#0B0F19]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 12%, transparent) 0%, transparent 38%, rgba(245,158,11,0.08) 100%)',
            }}
          />
          <div className="pointer-events-none absolute -right-10 top-6 h-44 w-44 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--brand-primary) 22%, transparent)' }} />
          <div className="pointer-events-none absolute left-8 top-10 h-24 w-24 rounded-full blur-2xl" style={{ background: 'rgba(245,158,11,0.16)' }} />

          <div className="relative z-10 grid gap-5 p-5 sm:p-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.03] dark:text-white/62">
                <Stars className="h-3.5 w-3.5" />
                Títulos
              </div>

              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-none tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                Sua identidade do mês agora tem cara de jornada.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-[15px] dark:text-white/72">
                A identidade mostra o perfil que você escolheu carregar. A trilha de evolução continua independente, subindo por pontos até Lendário. Aqui os dois sistemas aparecem juntos, sem misturar as regras.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {checkInStatus?.required ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-700/40 dark:bg-amber-400/10 dark:text-amber-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Check-in deste mês pendente
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-400/10 dark:text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Check-in deste mês concluído
                  </div>
                )}

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/68">
                  <History className="h-3.5 w-3.5" />
                  Histórico comparativo por mês
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-4 backdrop-blur dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/56">
                  Mês ativo
                </p>
                <p className="mt-2 text-base font-black text-slate-950 dark:text-white">
                  {formatMonthLabel(titlesJourney?.month_reference ?? '')}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/80 p-4 backdrop-blur dark:border-white/8 dark:bg-white/[0.03]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/56">
                  Pontos do mês
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {(titlesJourney?.monthly_points ?? 0).toLocaleString('pt-BR')}
                </p>
              </div>

              <div
                className="rounded-[1.6rem] border p-4 backdrop-blur"
                style={{
                  background: `color-mix(in srgb, ${currentTierMeta.color} 10%, white)`,
                  borderColor: `color-mix(in srgb, ${currentTierMeta.color} 22%, rgba(148,163,184,0.22))`,
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-white/60">
                  Status principal
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <currentTierMeta.Icon className="h-4 w-4 shrink-0" style={{ color: currentTierMeta.color }} />
                  <p className="text-base font-black" style={{ color: currentTierMeta.color }}>
                    {titlesJourney?.progress_tier ?? 'Explorador'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg sm:p-6 dark:border-white/8 dark:bg-[#0B0F19]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[color:var(--brand-primary)]/10 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-white/52">
                      Identidade do mês
                    </p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      A camada que dá personalidade ao mês
                    </h2>
                  </div>
                  <Orbit className="h-5 w-5 text-slate-300 dark:text-white/30" />
                </div>

                {identity ? (
                  <>
                    <div className="mt-6 rounded-[1.8rem] border border-slate-200/80 bg-slate-50/90 p-4 sm:p-5 dark:border-white/8 dark:bg-white/[0.03]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div
                          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem]"
                          style={{
                            background: 'linear-gradient(135deg, color-mix(in srgb, var(--brand-primary) 20%, white), color-mix(in srgb, var(--brand-primary) 10%, transparent))',
                            border: '1px solid color-mix(in srgb, var(--brand-primary) 24%, rgba(148,163,184,0.18))',
                            boxShadow: '0 18px 48px color-mix(in srgb, var(--brand-primary) 18%, transparent)',
                          }}
                        >
                          <div className="absolute inset-2 rounded-[1rem] border border-white/50 dark:border-white/10" />
                          <IdentityIcon className="relative z-10 h-9 w-9" style={{ color: 'var(--brand-primary)' }} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/56">
                              Identidade ativa
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/56">
                              {identity.redo_count} {identity.redo_count === 1 ? 'refação' : 'refações'}
                            </span>
                          </div>

                          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                            {identity.identity_title}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-white/72">
                            {identity.identity_title_description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/52">
                          Trilha atual
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <currentTierMeta.Icon className="h-4 w-4" style={{ color: currentTierMeta.color }} />
                          <p className="text-sm font-black" style={{ color: currentTierMeta.color }}>
                            {titlesJourney?.progress_tier}
                          </p>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-white/64">
                          O ranking usa esse tier como status principal.
                        </p>
                      </div>

                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/52">
                          Próximo salto
                        </p>
                        <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">
                          {titlesJourney?.next_tier ?? 'Topo da trilha'}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-white/64">
                          {titlesJourney?.next_tier
                            ? `${titlesJourney.points_to_next_tier.toLocaleString('pt-BR')} pts para avançar`
                            : 'Você já está no nível máximo do mês.'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-white/62">Refazer check-in</p>
                          <p className="mt-1 text-sm text-slate-700 dark:text-white/72">
                            Você pode recalibrar sua identidade sem mexer na pontuação mensal.
                          </p>
                        </div>
                        <Link
                          href={`/partners/${org.slug}/student/dashboard?forceCheckIn=1`}
                          className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-extrabold text-white transition-all hover:brightness-110"
                          style={{
                            background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 74%, #0f172a))',
                            boxShadow: '0 16px 36px color-mix(in srgb, var(--brand-primary) 22%, transparent)',
                          }}
                        >
                          Refazer check-in
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 dark:border-white/12 dark:bg-white/[0.03]">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white/86">
                      Sua identidade deste mês ainda não foi definida.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/68">
                      Assim que você concluir o check-in mensal, esta área passa a mostrar seu título, contexto e opções de refação.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg sm:p-6 dark:border-white/8 dark:bg-[#0B0F19]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-400/10 to-transparent dark:from-amber-300/10" />

            <div className="relative z-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-white/52">
                    Trilha do mês
                  </p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                    Jornada até Lendário
                  </h2>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-right dark:border-white/8 dark:bg-white/[0.03]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-white/52">
                    Próximo passo
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                    {titlesJourney?.next_tier ?? 'Lendário'}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-white/56">Seu status principal agora</p>
                    <div className="mt-2 flex items-center gap-2">
                      <currentTierMeta.Icon className="h-4 w-4" style={{ color: currentTierMeta.color }} />
                      <span className="text-lg font-black" style={{ color: currentTierMeta.color }}>
                        {titlesJourney?.progress_tier}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 dark:text-white/56">Distância até o próximo tier</p>
                    <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                      {(titlesJourney?.points_to_next_tier ?? 0).toLocaleString('pt-BR')} pts
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-0">
                {titlesJourney?.milestones.map((milestone, index) => {
                  const meta = getProgressTierMeta(milestone.tier);
                  const isLast = index === (titlesJourney.milestones.length - 1);
                  const progressWidth = milestone.max_points == null
                    ? 100
                    : titlesJourney.monthly_points >= milestone.max_points
                      ? 100
                      : titlesJourney.monthly_points <= milestone.min_points
                        ? milestone.is_current ? 18 : 0
                        : Math.max(18, Math.min(100, ((titlesJourney.monthly_points - milestone.min_points) / Math.max(1, milestone.max_points - milestone.min_points)) * 100));

                  return (
                    <div key={milestone.tier} className="relative flex gap-4 pb-8 last:pb-0">
                      {!isLast && (
                        <div
                          className="absolute left-[1.15rem] top-12 h-[calc(100%-0.9rem)] w-px"
                          style={{
                            background: milestone.unlocked
                              ? `linear-gradient(180deg, ${meta.glow}, rgba(148,163,184,0.18))`
                              : 'rgba(148,163,184,0.16)',
                          }}
                        />
                      )}

                      <div
                        className="relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: milestone.unlocked
                            ? `color-mix(in srgb, ${meta.color} 18%, transparent)`
                            : 'rgba(148,163,184,0.1)',
                          border: milestone.is_current
                            ? `2px solid ${meta.color}`
                            : `1px solid ${milestone.unlocked ? meta.glow : 'rgba(148,163,184,0.22)'}`,
                          boxShadow: milestone.is_current ? `0 0 0 6px color-mix(in srgb, ${meta.color} 12%, transparent)` : undefined,
                        }}
                      >
                        <meta.Icon className="h-4 w-4" style={{ color: milestone.unlocked ? meta.color : '#94A3B8' }} />
                      </div>

                      <div className="min-w-0 flex-1 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 dark:border-white/8 dark:bg-white/[0.03]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black tracking-tight text-slate-950 dark:text-white">
                              {milestone.tier}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/52">
                              {milestone.max_points === null
                                ? `${milestone.min_points.toLocaleString('pt-BR')}+ pts`
                                : `${milestone.min_points.toLocaleString('pt-BR')} a ${milestone.max_points.toLocaleString('pt-BR')} pts`}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {milestone.is_current && (
                              <span
                                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                                style={{
                                  background: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
                                  color: meta.color,
                                }}
                              >
                                Agora
                              </span>
                            )}
                            {milestone.unlocked && !milestone.is_current && (
                              <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-white/10 dark:text-white/56">
                                Conquistado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressWidth}%`,
                              background: `linear-gradient(90deg, ${meta.color}, color-mix(in srgb, ${meta.color} 65%, white))`,
                            }}
                          />
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-white/70">
                          {meta.longDesc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg sm:p-6 dark:border-white/8 dark:bg-[#0B0F19]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-white/52">
                Histórico comparativo
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                Seus meses anteriores
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/62">
              <Trophy className="h-3.5 w-3.5" />
              A identidade muda, a trilha continua comparável
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {(titlesHistory?.history ?? []).length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 dark:border-white/12 dark:bg-white/[0.03]">
                <p className="text-sm font-semibold text-slate-800 dark:text-white/86">
                  O histórico começa a aparecer quando o primeiro mês for fechado.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-white/68">
                  Quando isso acontecer, você verá a identidade final do mês, a pontuação e a comparação direta com o período anterior.
                </p>
              </div>
            ) : (
              titlesHistory?.history.map((item) => {
                const meta = getProgressTierMeta(item.final_progress_tier);
                const HistoryIcon = getIdentityTitleIcon(item.identity_title_icon);
                return (
                  <div
                    key={item.month_reference}
                    className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-white/8 dark:bg-white/[0.02] sm:p-5"
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-20"
                      style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${meta.color} 10%, transparent), transparent)` }}
                    />

                    <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                          style={{
                            background: `color-mix(in srgb, ${meta.color} 14%, white)`,
                            border: `1px solid color-mix(in srgb, ${meta.color} 22%, rgba(148,163,184,0.18))`,
                          }}
                        >
                          <HistoryIcon className="h-5 w-5" style={{ color: meta.color }} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-black text-slate-950 dark:text-white">
                              {item.identity_title}
                            </p>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/56">
                              {formatMonthLabel(item.month_reference)}
                            </span>
                          </div>

                          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700 dark:text-white/70">
                            {item.identity_title_description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/82">
                          {item.final_monthly_points.toLocaleString('pt-BR')} pts
                        </span>
                        <span
                          className="rounded-full px-3 py-1.5 text-xs font-bold"
                          style={{
                            background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                            color: meta.color,
                          }}
                        >
                          {item.final_progress_tier}
                        </span>
                        {item.final_rank_position ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/68">
                            Ranking #{item.final_rank_position}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="relative z-10 mt-4 grid gap-2 md:grid-cols-2">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/62">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatPointsDelta(item.points_delta_vs_previous)}</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-600 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/62">
                        <Medal className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatTierDelta(item.tier_delta_vs_previous)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
