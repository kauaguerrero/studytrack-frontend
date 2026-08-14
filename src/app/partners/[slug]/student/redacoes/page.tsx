'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { isDemoOrg, MOCK_STUDENT_ESSAYS_FOR_REDACOES, MOCK_STUDENT_ESSAY_COMPETENCY_SCORES } from '../../../../../../studytrack-tutorial-mock';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';
import { cn } from '@/lib/utils';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';
import { useOrg } from '@/contexts/OrgContext';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Eye, FileText, Minus, Plus, TrendingUp, BarChart3, CheckCircle2, Clock, Target } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, KpiCard,
} from '@/components/partners/founder-ui';
import { readableBrandText, readableBrandTextOnDark, resolveAccentColor, onBrandText } from '@/lib/brand-color';

/** CSS vars pra `.brand-text-adaptive` escolher claro/escuro sozinho via `.dark`. */
function adaptiveTextStyle(hex: string | undefined | null, cssVar: string) {
  return {
    ['--bta-light' as string]: readableBrandText(hex, cssVar),
    ['--bta-dark' as string]: readableBrandTextOnDark(hex, cssVar),
  };
}

interface Essay {
  id: string;
  status: 'pending' | 'awaiting_second' | 'corrected' | 'second_corrected' | 'seen';
  essay_type: EssayType;
  submitted_at: string;
  corrected_at: string | null;
  seen_at?: string | null;
  total_score: number | null;
  average_score?: number | null;
  text_preview: string;
  theme: string | null;
  is_historical?: boolean;
}

type Filter = 'all' | 'pending' | 'corrected' | 'seen';
type SortBy = 'date' | 'score';
type SortOption = 'date' | 'score_best' | 'score_worst';

interface RawEssay {
  id: string;
  status: Essay['status'];
  essay_type?: string | null;
  submitted_at: string;
  corrected_at: string | null;
  seen_at?: string | null;
  total_score: number | null;
  average_score?: number | null;
  text?: string;
  text_preview?: string;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
  is_historical?: boolean;
}

interface EssaysApiResponse {
  items?: RawEssay[];
  credits?: {
    plan_name?: string | null;
    limit?: number | null;
    period?: 'week' | 'month' | null;
    used?: number | null;
    remaining?: number | null;
  } | null;
}

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getScoreColorClass(score: number | null, totalMax: number): string {
  if (score === null) return 'text-slate-400';
  const ratio = totalMax > 0 ? score / totalMax : 0;
  if (ratio >= 0.7) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function pickEssayTheme(row: RawEssay): string | null {
  const candidates = [row.theme, row.essay_theme, row.tema, row.topic, row.title];
  const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return found ? found.trim() : null;
}

function isEssayPending(status: Essay['status']): boolean {
  return status === 'pending' || status === 'awaiting_second';
}

function isEssayCorrected(status: Essay['status']): boolean {
  return status === 'corrected' || status === 'second_corrected' || status === 'seen';
}

function effectiveEssayScore(essay: Essay): number | null {
  if (!isEssayCorrected(essay.status)) return null;
  const score = essay.status === 'second_corrected' && typeof essay.average_score === 'number'
    ? essay.average_score
    : essay.total_score;
  return typeof score === 'number' ? score : null;
}

export default function StudentRedacoesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { org } = useOrg();

  const [essays, setEssays] = useState<Essay[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulsingIds, setPulsingIds] = useState<string[]>([]);
  const [credits, setCredits] = useState<EssaysApiResponse['credits']>(null);
  const [competencyScores, setCompetencyScores] = useState<{ essay_id: string; competency: number; score: number; correction_round?: number | null }[]>([]);
  const [competencyOpen, setCompetencyOpen] = useState(true);
  const [page, setPage] = useState(0);
  const [essayTypeFilter, setEssayTypeFilter] = useState<EssayType>('enem');
  const competencySectionRef = useRef<HTMLElement>(null);
  const essaysListRef = useRef<HTMLDivElement>(null);
  const activeConfig = ESSAY_TYPE_CONFIGS[essayTypeFilter];

  function scrollToCompetency() {
    setCompetencyOpen(true);
    setTimeout(() => {
      competencySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  useEffect(() => {
    let mounted = true;

    async function loadEssays() {
      if (isDemoOrg(slug)) {
        setEssays(MOCK_STUDENT_ESSAYS_FOR_REDACOES as unknown as Essay[]);
        setCompetencyScores(MOCK_STUDENT_ESSAY_COMPETENCY_SCORES);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (mounted) {
            setError('Sessão expirada. Faça login novamente.');
            setLoading(false);
          }
          return;
        }

        const apiUrl = getApiBaseUrl();
        const res = await fetch(
          `${apiUrl}/api/partners/${slug}/essays?status=all&page=1&limit=200`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          },
        );

        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status}`);
        }

        const payload: RawEssay[] | EssaysApiResponse = await res.json();
        const items = Array.isArray(payload) ? payload : (payload.items || []);
        const creditsPayload = Array.isArray(payload) ? null : (payload.credits || null);

        const mapped: Essay[] = items.map((row) => {
          const rawText = String(row.text || row.text_preview || '');
          const preview = rawText.length > 120 ? `${rawText.slice(0, 120)}...` : rawText;
          const rawType = String(row.essay_type || '').toLowerCase();
          const essayType: EssayType = (['ufu', 'ueg', 'fuvest', 'vunesp', 'geral'] as const).includes(rawType as 'ufu' | 'ueg' | 'fuvest' | 'vunesp' | 'geral')
            ? (rawType as EssayType)
            : 'enem';
          return {
            id: String(row.id),
            status: row.status,
            essay_type: essayType,
            submitted_at: String(row.submitted_at),
            corrected_at: row.corrected_at ? String(row.corrected_at) : null,
            seen_at: row.seen_at ? String(row.seen_at) : null,
            total_score: typeof row.total_score === 'number' ? row.total_score : null,
            average_score: typeof row.average_score === 'number' ? row.average_score : null,
            text_preview: preview,
            theme: pickEssayTheme(row),
            is_historical: Boolean(row.is_historical),
          };
        });

        if (!mounted) return;

        setEssays(mapped);
        setCredits(creditsPayload);

        if (mapped.length > 0) {
          const essayIds = mapped.map((e) => e.id);
          const { data: compData } = await supabase
            .from('essay_competency_scores')
            .select('essay_id, competency, score, correction_round')
            .in('essay_id', essayIds);
          if (mounted && compData) setCompetencyScores(compData);
        }

        const correctedIds = mapped.filter((e) => isEssayCorrected(e.status)).map((e) => e.id);
        setPulsingIds(correctedIds);

        if (correctedIds.length > 0) {
          setTimeout(() => {
            if (mounted) setPulsingIds([]);
          }, 3000);
        }
      } catch {
        if (mounted) {
          setError('Não foi possível carregar suas redações.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEssays();

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (sortOption === 'date') {
      setSortBy('date');
      return;
    }
    setSortBy('score');
  }, [sortOption]);

  useEffect(() => { setPage(0); }, [filter, sortOption]);

  const essaysByType = useMemo(
    () => essays.filter((e) => e.essay_type === essayTypeFilter),
    [essays, essayTypeFilter],
  );

  const metrics = useMemo(() => {
    const corrected = essaysByType
      .map((essay) => ({ essay, score: effectiveEssayScore(essay) }))
      .filter((item): item is { essay: Essay; score: number } => item.score !== null);
    const scores = corrected.map((item) => item.score);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const best = scores.length ? Math.max(...scores) : null;
    const pending = essaysByType.filter((e) => isEssayPending(e.status)).length;

    const chartData = corrected
      .sort((a, b) => new Date(a.essay.submitted_at).getTime() - new Date(b.essay.submitted_at).getTime())
      .slice(-10)
      .map(({ essay, score }, i) => ({
        label: `#${i + 1}`,
        score,
        date: new Date(essay.submitted_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
      }));

    const sorted = corrected
      .slice()
      .sort((a, b) => new Date(a.essay.submitted_at).getTime() - new Date(b.essay.submitted_at).getTime());

    let trend: 'up' | 'down' | 'neutral' | null = null;
    let trendDelta: number | null = null;

    if (sorted.length >= 4) {
      const recent = sorted.slice(-3).map((item) => item.score);
      const previous = sorted.slice(-6, -3).map((item) => item.score);
      if (previous.length >= 1) {
        const avgRecent = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
        const avgPrev = Math.round(previous.reduce((a, b) => a + b, 0) / previous.length);
        trendDelta = avgRecent - avgPrev;
        const trendThreshold = Math.max(1, Math.round(activeConfig.total_max * 0.07));
        trend = trendDelta > trendThreshold ? 'up' : trendDelta < -trendThreshold ? 'down' : 'neutral';
      }
    }

    const withCorrectionTime = essaysByType.filter(
      (e) => isEssayCorrected(e.status) && e.corrected_at !== null && e.submitted_at
    );
    const avgCorrectionDays = withCorrectionTime.length
      ? Math.round(
          withCorrectionTime.reduce((acc, e) => {
            const diff =
              new Date(e.corrected_at as string).getTime() -
              new Date(e.submitted_at).getTime();
            return acc + diff / (1000 * 60 * 60 * 24);
          }, 0) / withCorrectionTime.length
        )
      : null;

    const lastCorrected = sorted.length > 0 ? sorted[sorted.length - 1] : null;
    const isRecord = best !== null
      && lastCorrected !== null
      && lastCorrected.score === best
      && corrected.length > 1;

    return { total: essaysByType.length, correctedCount: corrected.length, avg, best, pending, chartData, trend, trendDelta, avgCorrectionDays, isRecord };
  }, [essaysByType, activeConfig]);

  const filteredCompetencyScores = useMemo(() => {
    const correctedEssayIds = new Set(
      essaysByType
        .filter((e) => isEssayCorrected(e.status))
        .map((e) => e.id),
    );
    return competencyScores.filter((row) => correctedEssayIds.has(row.essay_id));
  }, [competencyScores, essaysByType]);

  const { competencyMetrics, weakestCompetency } = useMemo(() => {
    const maxCompetencies = activeConfig.competencies.length;
    const scoreByEssayCompetency = new Map<string, { competency: number; scores: number[] }>();
    filteredCompetencyScores.forEach((score) => {
      const key = `${score.essay_id}:${score.competency}`;
      const current = scoreByEssayCompetency.get(key) || { competency: score.competency, scores: [] };
      current.scores.push(Number(score.score || 0));
      scoreByEssayCompetency.set(key, current);
    });
    const effectiveCompetencyScores = Array.from(scoreByEssayCompetency.values()).map((item) => ({
      competency: item.competency,
      score: item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length,
    }));
    const items = Array.from({ length: maxCompetencies }, (_, idx) => idx + 1).map((c) => {
      const scores = effectiveCompetencyScores.filter((s) => s.competency === c).map((s) => s.score);
      const avg = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      const options = activeConfig.score_options[c - 1] || [];
      const maxScore = options.length ? Math.max(...options) : 200;
      const ratio = avg !== null && maxScore > 0 ? avg / maxScore : null;
      return { competency: c, name: activeConfig.competencies[c - 1], avg, count: scores.length, maxScore, ratio };
    });

    const withScores = items.filter((i) => i.avg !== null && i.ratio !== null);
    const weakest = withScores.length >= 2
      ? withScores.reduce((min, cur) => (cur.ratio as number) < (min.ratio as number) ? cur : min)
      : null;

    return { competencyMetrics: items, weakestCompetency: weakest };
  }, [filteredCompetencyScores, activeConfig]);

  const filteredAndSorted = useMemo(() => {
    let data = [...essaysByType];

    if (filter === 'pending') {
      data = data.filter((e) => isEssayPending(e.status));
    } else if (filter === 'corrected') {
      data = data.filter((e) => isEssayCorrected(e.status));
    } else if (filter === 'seen') {
      data = data.filter((e) => e.status === 'seen' || Boolean(e.seen_at));
    }

    if (sortBy === 'date') {
      data.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      return data;
    }

    if (sortOption === 'score_worst') {
      data.sort((a, b) => (effectiveEssayScore(a) ?? 10_000) - (effectiveEssayScore(b) ?? 10_000));
      return data;
    }

    data.sort((a, b) => (effectiveEssayScore(b) ?? -1) - (effectiveEssayScore(a) ?? -1));
    return data;
  }, [essaysByType, filter, sortBy, sortOption]);

  const primaryAccent = resolveAccentColor(org, 'brand_primary');
  const accentAccent = resolveAccentColor(org, 'brand_accent');

  return (
    <ModuleGuard permKey="redacoes_enabled">
    <div className="relative min-h-screen -m-4 md:-m-8 px-4 py-5 md:px-8 md:py-8 bg-slate-50 dark:bg-[#080808]">
      <RevealGroup className="relative mx-auto max-w-6xl space-y-5 pb-8">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <RevealItem className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="brand-text-adaptive text-[11px] font-bold uppercase tracking-[0.16em]"
              style={adaptiveTextStyle(primaryAccent.hex, primaryAccent.cssVar)}
            >
              Produção textual
            </p>
            <h1 className="font-display text-[28px] font-black leading-tight text-slate-900 dark:text-white sm:text-[32px]">
              Minhas Redações
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-white/40">
              Acompanhe envios, correções e notas em um só lugar.
            </p>
          </div>

          <Link
            href={`/partners/${slug}/student/redacoes/nova`}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-extrabold transition-transform hover:scale-[1.02] active:scale-[0.97]"
            style={{
              background: org.brand_primary || 'var(--brand-primary)',
              color: onBrandText(org.brand_primary),
              boxShadow: `0 6px 16px -6px ${org.brand_primary || 'var(--brand-primary)'}`,
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Redação
          </Link>
        </RevealItem>

        {!loading && essays.length > 0 && (
          <>
            {/* ── KPIs ────────────────────────────────────────────────────── */}
            <RevealItem className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <KpiCard
                title="Enviadas"
                value={metrics.total}
                subtitle="Total acumulado"
                icon={FileText}
                accentColor="#64748b"
              />
              <KpiCard
                title="Corrigidas"
                value={metrics.correctedCount}
                subtitle={metrics.avgCorrectionDays !== null
                  ? metrics.avgCorrectionDays === 0
                    ? 'Correção em menos de 1 dia'
                    : metrics.avgCorrectionDays === 1
                      ? 'Média: 1 dia para corrigir'
                      : `Média: ${metrics.avgCorrectionDays} dias para corrigir`
                  : 'Total acumulado'}
                icon={CheckCircle2}
                accentColor="#10b981"
              />
              <KpiCard
                title="Nota média"
                value={metrics.avg !== null ? metrics.avg : '—'}
                subtitle={`Sobre ${activeConfig.total_max} pts`}
                icon={TrendingUp}
                accentColor="var(--brand-primary)"
                accentHex={org.brand_primary}
                delta={metrics.trendDelta}
                deltaLabel="vs 3 anteriores"
              />
              <KpiCard
                title="Melhor nota"
                value={metrics.best !== null ? metrics.best : '—'}
                subtitle={metrics.isRecord ? 'Recorde pessoal ✓' : `Sobre ${activeConfig.total_max} pts`}
                icon={BarChart3}
                accentColor="var(--brand-accent)"
                accentHex={org.brand_accent}
              />
            </RevealItem>

            {/* ── Evolução ───────────────────────────────────────────────── */}
            {metrics.chartData.length >= 2 && (
              <RevealItem>
                <ElevatedCard accentColor="var(--brand-primary)">
                  <div className="p-5">
                    <SectionTitle kicker="Progresso" title="Evolução das notas" hex={org.brand_primary} />
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={metrics.chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, activeConfig.total_max]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: 'var(--background)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 12, fontSize: 12 }}
                          formatter={(v) => [`${v} pts`, 'Nota']}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={org.brand_primary || 'var(--brand-primary)'}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: org.brand_primary || 'var(--brand-primary)', strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ElevatedCard>
              </RevealItem>
            )}

            {metrics.trend !== null && (
              <RevealItem className={`flex items-center gap-4 rounded-[20px] border p-4 ${
                metrics.trend === 'up'
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                  : metrics.trend === 'down'
                    ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                    : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]'
              }`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  metrics.trend === 'up'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20'
                    : metrics.trend === 'down'
                      ? 'bg-red-100 dark:bg-red-500/20'
                      : 'bg-slate-100 dark:bg-white/10'
                }`}>
                  {metrics.trend === 'up' && <ArrowUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                  {metrics.trend === 'down' && <ArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
                  {metrics.trend === 'neutral' && <Minus className="h-5 w-5 text-slate-500 dark:text-white/40" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    metrics.trend === 'up'
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : metrics.trend === 'down'
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-slate-700 dark:text-white/70'
                  }`}>
                    {metrics.trend === 'up' && <>Você está evoluindo — <span className="font-bold">+{metrics.trendDelta} pts</span> nas últimas 3 redações</>}
                    {metrics.trend === 'down' && <>Queda recente — <span className="font-bold">{Math.abs(metrics.trendDelta as number)} pts a menos</span> nas últimas 3 redações</>}
                    {metrics.trend === 'neutral' && 'Desempenho estável nas últimas redações'}
                  </p>
                  <p className={`mt-0.5 text-xs ${
                    metrics.trend === 'up'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : metrics.trend === 'down'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-slate-500 dark:text-white/40'
                  }`}>
                    {metrics.trend === 'up' && 'Continue assim — consistência é o que aprova.'}
                    {metrics.trend === 'down' && 'Reveja os comentários das últimas correções para identificar o padrão.'}
                    {metrics.trend === 'neutral' && 'Pequenas variações são normais. Foque na competência mais fraca.'}
                  </p>
                </div>
              </RevealItem>
            )}

            {metrics.pending > 0 && (
              <RevealItem className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {metrics.pending === 1 ? '1 redação aguardando correção' : `${metrics.pending} redações aguardando correção`}
                </p>
              </RevealItem>
            )}
          </>
        )}

        {weakestCompetency !== null && (
          <RevealItem>
            <button
              onClick={scrollToCompetency}
              className="flex w-full items-center gap-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-left transition-colors hover:bg-amber-100/70 active:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
                <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Foco aqui: C{weakestCompetency.competency} — {weakestCompetency.name}
                </p>
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                  Sua média nesta competência é{' '}
                  <span className="font-bold">{weakestCompetency.avg} / {weakestCompetency.maxScore}</span>
                  {' '}— a mais baixa do seu histórico. Peça feedback específico ao professor na próxima redação.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-xl font-black text-amber-700 dark:text-amber-300">{weakestCompetency.avg}</p>
                <p className="text-[10px] font-medium text-amber-500 dark:text-amber-400">/ {weakestCompetency.maxScore}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-amber-500 dark:text-amber-400" />
            </button>
          </RevealItem>
        )}

        {/* ── Filtro e ordenação ─────────────────────────────────────────── */}
        <RevealItem>
          <ElevatedCard>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">Tipo de redação</span>
                <select
                  value={essayTypeFilter}
                  onChange={(e) => setEssayTypeFilter(e.target.value as EssayType)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                >
                  {(Object.entries(ESSAY_TYPE_CONFIGS) as [EssayType, typeof ESSAY_TYPE_CONFIGS[EssayType]][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label} / {cfg.total_max}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">Filtro</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                >
                  <option value="all">Todas</option>
                  <option value="pending">Pendente</option>
                  <option value="corrected">Corrigida</option>
                  <option value="seen">Vista</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/40">Ordenação</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                >
                  <option value="date">Mais recente</option>
                  <option value="score_best">Melhor nota</option>
                  <option value="score_worst">Pior nota</option>
                </select>
              </label>
            </div>
          </ElevatedCard>
        </RevealItem>

        {credits && (
          <RevealItem>
            <ElevatedCard accentColor={accentAccent.cssVar}>
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Plano ativo</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                    {credits.plan_name || 'Customizado'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 dark:bg-white/10 dark:text-white/80">
                    {credits.remaining ?? '∞'} / {credits.limit ?? '∞'} créditos
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-white/10 dark:text-white/60">
                    {credits.period === 'week' ? 'na semana' : 'no mês'}
                  </span>
                </div>
              </div>
            </ElevatedCard>
          </RevealItem>
        )}

        {/* ── Lista de redações ──────────────────────────────────────────── */}
        {loading ? (
          <RevealItem className="grid gap-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-40 animate-pulse rounded-[20px] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]" />
            ))}
          </RevealItem>
        ) : error ? (
          <RevealItem className="rounded-[20px] border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">{error}</RevealItem>
        ) : filteredAndSorted.length === 0 ? (
          <RevealItem>
            <ElevatedCard>
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                  <FileText className="h-6 w-6 text-slate-600 dark:text-white/60" />
                </div>
                <h2 className="font-display text-lg font-black text-slate-900 dark:text-white">Nenhuma redação encontrada</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Envie sua primeira redação para começar a receber correções.</p>
                <Link
                  href={`/partners/${slug}/student/redacoes/nova`}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:bg-white/10"
                >
                  <Plus className="h-4 w-4" />
                  Enviar primeira redação
                </Link>
              </div>
            </ElevatedCard>
          </RevealItem>
        ) : (
          <RevealItem>
          <div ref={essaysListRef} className="grid gap-4">
            {filteredAndSorted.slice(page * 5, page * 5 + 5).map((essay) => {
              const isCorrected = isEssayCorrected(essay.status);
              const isSecondCorrected = essay.status === 'second_corrected';
              const isSeen = essay.status === 'seen';
              const isPending = isEssayPending(essay.status);
              const showScore = isCorrected || isSeen;
              const essayConfig = ESSAY_TYPE_CONFIGS[essay.essay_type];
              const score = effectiveEssayScore(essay);
              const scoreClass = getScoreColorClass(score, essayConfig.total_max);

              return (
                <ElevatedCard
                  key={essay.id}
                  className={cn(
                    isCorrected && (pulsingIds.includes(essay.id)
                      ? 'animate-pulse ring-2 ring-emerald-500/45'
                      : 'ring-2 ring-emerald-500/35'),
                  )}
                >
                  <div className="flex flex-col gap-4 p-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                            isPending && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                            essay.status === 'corrected' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                            isSecondCorrected && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
                            essay.status === 'seen' && 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70',
                          )}
                        >
                          {essay.status === 'pending' && 'Aguardando correção'}
                          {essay.status === 'awaiting_second' && 'Aguardando segunda correção'}
                          {essay.status === 'corrected' && 'Corrigida ✓'}
                          {essay.status === 'second_corrected' && 'Duas correções ✓'}
                          {essay.status === 'seen' && 'Vista'}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-white/60">
                          {essayConfig.label}
                        </span>
                        {essay.is_historical && (
                          <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            IMPORTADA
                          </span>
                        )}
                      </div>

                      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-white/40">
                        <CalendarDays className="h-4 w-4" />
                        Enviada em {formatDateBR(essay.submitted_at)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-white/60">
                        <span className="font-semibold">Tema:</span> {essay.theme || 'Não informado'}
                      </p>

                      {showScore && (
                        <>
                          <p className={cn('font-display text-3xl font-black tracking-tight tabular-nums', scoreClass)}>
                            {score ?? '-'} / {essayConfig.total_max}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-white/40">Corrigida em {formatDateBR(essay.corrected_at)}</p>
                        </>
                      )}
                    </div>

                    <p className="text-sm leading-relaxed text-slate-600 dark:text-white/60">{essay.text_preview}</p>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500 dark:text-white/40">
                        {showScore ? 'Correção disponível para leitura' : 'A redação segue na fila de correção'}
                      </p>
                      <Link
                        href={`/partners/${slug}/student/redacoes/${essay.id}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-primary)] hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/80 dark:hover:text-white sm:w-auto"
                      >
                        <Eye className="h-4 w-4" />
                        {showScore ? 'Ver correção' : 'Ver redação'}
                      </Link>
                    </div>
                  </div>
                </ElevatedCard>
              );
            })}

            {filteredAndSorted.length > 5 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400 dark:text-white/30">
                  {page * 5 + 1}–{Math.min(page * 5 + 5, filteredAndSorted.length)} de {filteredAndSorted.length}
                </p>
                <div className="flex gap-2">
                  {page > 0 && (
                    <button
                      onClick={() => { setPage((p) => p - 1); setTimeout(() => essaysListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70 dark:hover:bg-white/10"
                    >
                      Anterior
                    </button>
                  )}
                  {page * 5 + 5 < filteredAndSorted.length && (
                    <button
                      onClick={() => { setPage((p) => p + 1); setTimeout(() => essaysListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/70 dark:hover:bg-white/10"
                    >
                      Próximo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          </RevealItem>
        )}

        {/* ── Desempenho por competência ─────────────────────────────────── */}
        {filteredCompetencyScores.length > 0 && (
          <RevealItem>
            <ElevatedCard>
              <section ref={competencySectionRef}>
                <button
                  onClick={() => setCompetencyOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">
                      Desempenho por competência
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-white/30">
                      Média acumulada das redações {activeConfig.label} corrigidas
                    </p>
                  </div>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 dark:text-white/30"
                    style={{ transform: competencyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>

                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: competencyOpen ? '700px' : '0px', opacity: competencyOpen ? 1 : 0 }}
                >
                  <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-white/10 dark:border-white/10">
                    {competencyMetrics.map(({ competency, name, avg }) => {
                      const isWeakest = weakestCompetency?.competency === competency;
                      const maxScore = activeConfig.score_options[competency - 1]?.length
                        ? Math.max(...activeConfig.score_options[competency - 1])
                        : 200;
                      const ratio = avg !== null && maxScore > 0 ? avg / maxScore : 0;
                      const pct = ratio * 100;
                      const barColor = avg === null ? '#94a3b8' : ratio >= 0.8 ? '#10b981' : ratio >= 0.6 ? '#f59e0b' : '#ef4444';
                      const scoreClass = avg === null
                        ? 'text-slate-400'
                        : ratio >= 0.8
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : ratio >= 0.6
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400';
                      return (
                        <div
                          key={competency}
                          className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                          style={isWeakest ? { backgroundColor: 'rgba(251,191,36,0.08)' } : undefined}
                        >
                          <span className={`w-6 shrink-0 text-xs font-black ${isWeakest ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-white/30'}`}>
                            C{competency}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <p className={`truncate text-sm font-medium ${isWeakest ? 'text-amber-800 dark:text-amber-200' : 'text-slate-800 dark:text-white/80'}`}>
                                {name}
                              </p>
                              {isWeakest && <Target className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />}
                            </div>
                            <div className={`h-2 overflow-hidden rounded-full ${isWeakest ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-slate-100 dark:bg-white/10'}`}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={`font-display text-sm font-black tabular-nums ${scoreClass}`}>
                              {avg !== null ? avg : '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-white/30">/ {maxScore}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 dark:border-white/10">
                    <p className="text-xs text-slate-400 dark:text-white/30">
                      Média sobre {new Set(filteredCompetencyScores.map((s) => s.essay_id)).size}{' '}
                      {new Set(filteredCompetencyScores.map((s) => s.essay_id)).size === 1 ? 'redação corrigida' : 'redações corrigidas'}
                    </p>
                  </div>
                </div>
              </section>
            </ElevatedCard>
          </RevealItem>
        )}
      </RevealGroup>
    </div>
    </ModuleGuard>
  );
}
