'use client';

import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, MessageSquare, PenLine } from 'lucide-react';
import { useEssayNotification } from '@/contexts/EssayNotificationContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ESSAY_TYPE_CONFIGS, type EssayType } from '@/lib/essay-types';

type EssayStatus = 'pending' | 'corrected' | 'seen' | 'awaiting_second' | 'second_corrected';

interface EssayAnnotation {
  id: string;
  start_offset: number;
  end_offset: number;
  type: 'comment' | 'correction';
  comment_text: string | null;
  original_text: string | null;
  corrected_text: string | null;
  correction_round?: number;
}

interface CompetencyScore {
  competency: number;
  score: number;
  comment: string | null;
  correction_round?: number;
}

interface CorrectionRound {
  round: number;
  total_score: number;
  general_comment: string | null;
  corrected_at: string | null;
}

interface EssayDetail {
  id: string;
  status: EssayStatus;
  essay_type?: string | null;
  theme?: string | null;
  text: string;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  average_score?: number | null;
  general_comment: string | null;
  competency_scores: CompetencyScore[];
  annotations: EssayAnnotation[];
  corrections?: CorrectionRound[];
  corrector_name?: string | null;
  corrector_avatar_url?: string | null;
}

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getStatusLabel(status: EssayStatus): string {
  if (status === 'pending') return 'Aguardando correção pelo professor';
  if (status === 'awaiting_second') return 'Aguardando segunda correção';
  if (status === 'corrected') return 'Corrigida';
  if (status === 'second_corrected') return 'Duas correções recebidas';
  return 'Vista';
}

function progressColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return 'bg-emerald-500';
  if (ratio >= 0.6) return 'bg-amber-500';
  return 'bg-red-500';
}

function pickEssayTheme(raw: Record<string, unknown>): string | null {
  const candidateKeys = ['theme', 'essay_theme', 'tema', 'proposal', 'prompt', 'topic', 'title'];
  for (const key of candidateKeys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

type TextSegment = {
  key: string;
  text: string;
  annotation: EssayAnnotation | null;
};

function prepareAnnotations(text: string, annotations: EssayAnnotation[]): EssayAnnotation[] {
  const usedRanges = new Set<string>();

  return annotations
    .map((annotation) => {
      let start = Number(annotation.start_offset);
      let end = Number(annotation.end_offset);

      const validOffsetRange = Number.isInteger(start)
        && Number.isInteger(end)
        && start >= 0
        && end > start
        && start < text.length;

      if (!validOffsetRange) {
        const needle = (annotation.original_text || '').trim();
        if (needle.length >= 2) {
          const idx = text.indexOf(needle);
          if (idx >= 0) {
            start = idx;
            end = idx + needle.length;
          }
        }
      }

      if (!(start >= 0 && end > start && start < text.length)) return null;
      const safeEnd = Math.min(end, text.length);
      const rangeKey = `${start}:${safeEnd}:${annotation.type}`;
      if (usedRanges.has(rangeKey)) return null;
      usedRanges.add(rangeKey);

      return {
        ...annotation,
        start_offset: start,
        end_offset: safeEnd,
      };
    })
    .filter((a): a is EssayAnnotation => Boolean(a))
    .sort((a, b) => a.start_offset - b.start_offset);
}

function buildSegments(text: string, annotations: EssayAnnotation[]): TextSegment[] {
  if (!text.length) return [];
  const owner: Array<EssayAnnotation | null> = new Array(text.length).fill(null);

  annotations.forEach((ann) => {
    const start = Math.max(0, Math.min(text.length, ann.start_offset));
    const end = Math.max(start, Math.min(text.length, ann.end_offset));
    for (let i = start; i < end; i += 1) owner[i] = ann;
  });

  const segments: TextSegment[] = [];
  let start = 0;
  let current = owner[0];
  for (let i = 1; i < text.length; i += 1) {
    if (owner[i] !== current) {
      segments.push({
        key: `${start}-${i}-${current?.id || 'plain'}`,
        text: text.slice(start, i),
        annotation: current,
      });
      start = i;
      current = owner[i];
    }
  }
  segments.push({
    key: `${start}-${text.length}-${current?.id || 'plain'}`,
    text: text.slice(start),
    annotation: current,
  });
  return segments;
}

function renderAnnotatedText(
  text: string,
  annotations: EssayAnnotation[],
  onCommentClick: (payload: { id: string; comment: string; excerpt: string; round?: number }) => void,
): ReactNode {
  if (!annotations.length) {
    return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-slate-700 dark:text-slate-100">{text}</p>;
  }

  const clean = prepareAnnotations(text, annotations);

  if (!clean.length) {
    return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-slate-700 dark:text-slate-100">{text}</p>;
  }

  const nodes: ReactNode[] = buildSegments(text, clean).map((segment) => {
    if (!segment.annotation) {
      return <Fragment key={segment.key}>{segment.text}</Fragment>;
    }

    const annotation = segment.annotation;
    const coveredText = segment.text;
    const isRound2 = annotation.correction_round === 2;

    if (annotation.type === 'comment') {
      const commentText = annotation.comment_text || 'Comentário do professor';
      return (
        <button
          key={segment.key}
          type="button"
          onClick={() => onCommentClick({ id: annotation.id, comment: commentText, excerpt: coveredText, round: annotation.correction_round })}
          className={cn(
            'inline cursor-pointer rounded-sm border-b-2 border-dashed px-0.5 text-left font-medium underline underline-offset-2 transition-colors active:scale-95',
            isRound2
              ? 'border-indigo-400 bg-indigo-400/15 text-indigo-700 decoration-indigo-500/70 hover:bg-indigo-400/30 hover:border-indigo-500 dark:text-indigo-200 dark:decoration-indigo-400/70 dark:hover:bg-indigo-400/25'
              : 'border-amber-400 bg-amber-400/15 text-amber-700 decoration-amber-500/70 hover:bg-amber-400/30 hover:border-amber-500 dark:text-amber-200 dark:decoration-amber-400/70 dark:hover:bg-amber-400/25',
          )}
        >
          {coveredText}
        </button>
      );
    }

    const original = annotation.original_text || coveredText;
    const corrected = annotation.corrected_text || '';
    return (
      <span
        key={segment.key}
        className="inline-flex flex-wrap items-center gap-1 rounded-md bg-slate-200 px-1 py-0.5 align-baseline dark:bg-slate-800/70"
      >
        <span className="text-red-600 dark:text-red-400 line-through">{original}</span>
        {corrected && <span className="text-emerald-600 dark:text-emerald-400">{corrected}</span>}
      </span>
    );
  });

  return <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-slate-700 dark:text-slate-100">{nodes}</p>;
}

export default function RedacaoDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { refresh } = useEssayNotification();

  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Record<number, boolean>>({});
  const [activeComment, setActiveComment] = useState<{ id: string; comment: string; excerpt: string; round?: number } | null>(null);
  const [dualRoundTab, setDualRoundTab] = useState<1 | 2>(1);
  const activeCommentRef = useRef<HTMLDivElement>(null);
  const essayType = ((essay?.essay_type || 'enem') as EssayType);
  const typeConfig = ESSAY_TYPE_CONFIGS[essayType] ?? ESSAY_TYPE_CONFIGS.enem;

  const handleCommentClick = (payload: { id: string; comment: string; excerpt: string; round?: number }) => {
    setActiveComment(payload);
    setTimeout(() => {
      activeCommentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  useEffect(() => {
    let mounted = true;

    async function loadEssay() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/partners/${slug}/essays/${id}`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status}`);
        }

        const data = await res.json() as EssayDetail & Record<string, unknown>;
        if (!mounted) return;
        setEssay({
          ...data,
          theme: pickEssayTheme(data),
        });

        if (data.status === 'corrected' || data.status === 'second_corrected') {
          void fetch(`/api/partners/${slug}/essays/${id}/seen`, {
            method: 'PATCH',
          }).then(() => {
            if (!mounted) return;
            setEssay((prev) => (prev ? { ...prev, status: 'seen' } : prev));
            void refresh();
          }).catch(() => {});
        }
      } catch {
        if (mounted) {
          setError('Não foi possível carregar esta redação.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEssay();

    return () => {
      mounted = false;
    };
  }, [slug, id, refresh]);

  const isDualCorrection = useMemo(() => {
    const corrections = essay?.corrections;
    return Array.isArray(corrections) && corrections.length >= 2;
  }, [essay?.corrections]);

  const round1 = useMemo(() => essay?.corrections?.find((c) => c.round === 1) ?? null, [essay?.corrections]);
  const round2 = useMemo(() => essay?.corrections?.find((c) => c.round === 2) ?? null, [essay?.corrections]);

  const scores1 = useMemo(() => {
    const incoming = (essay?.competency_scores || []).filter((s) => (s.correction_round ?? 1) === 1);
    return Array.from({ length: typeConfig.competencies.length }, (_, idx) => {
      const comp = idx + 1;
      const found = incoming.find((item) => item.competency === comp);
      return { competency: comp, score: found?.score ?? 0, comment: found?.comment ?? null };
    });
  }, [essay?.competency_scores, typeConfig.competencies.length]);

  const scores2 = useMemo(() => {
    const incoming = (essay?.competency_scores || []).filter((s) => s.correction_round === 2);
    return Array.from({ length: typeConfig.competencies.length }, (_, idx) => {
      const comp = idx + 1;
      const found = incoming.find((item) => item.competency === comp);
      return { competency: comp, score: found?.score ?? 0, comment: found?.comment ?? null };
    });
  }, [essay?.competency_scores, typeConfig.competencies.length]);

  const orderedScores = useMemo(() => {
    if (isDualCorrection) return scores1;
    const incoming = essay?.competency_scores || [];
    return Array.from({ length: typeConfig.competencies.length }, (_, idx) => {
      const comp = idx + 1;
      const found = incoming.find((item) => item.competency === comp);
      return { competency: comp, score: found?.score ?? 0, comment: found?.comment ?? null };
    });
  }, [isDualCorrection, scores1, essay?.competency_scores, typeConfig.competencies.length]);

  const scoreSum = useMemo(
    () => orderedScores.reduce((acc, item) => acc + (item.score || 0), 0),
    [orderedScores],
  );

  const annotations1 = useMemo(
    () => (essay?.annotations || []).filter((a) => (a.correction_round ?? 1) === 1),
    [essay?.annotations],
  );
  const annotations2 = useMemo(
    () => (essay?.annotations || []).filter((a) => a.correction_round === 2),
    [essay?.annotations],
  );
  const activeRoundAnnotations = useMemo(
    () => isDualCorrection ? (dualRoundTab === 2 ? annotations2 : annotations1) : (essay?.annotations || []),
    [isDualCorrection, dualRoundTab, annotations1, annotations2, essay?.annotations],
  );

  if (loading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <div className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/80" />
          <div className="h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
            {error || 'Redação não encontrada.'}
          </div>
        </div>
      </div>
    );
  }

  const isPending = essay.status === 'pending' || essay.status === 'awaiting_second';
  const showCorrectionPanels = essay.status === 'corrected' || essay.status === 'seen' || essay.status === 'second_corrected';
  const displayScore = essay.status === 'second_corrected' && essay.average_score != null
    ? Math.round(essay.average_score)
    : (essay.total_score ?? scoreSum);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-3">
          <Link
            href={`/partners/${slug}/student/redacoes`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para redações
          </Link>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                Redação — {formatDateBR(essay.submitted_at)}
              </h1>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-4 w-4" />
                Enviada em {formatDateBR(essay.submitted_at)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Tema:</span> {essay.theme || 'Não informado'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {typeConfig.label}
              </span>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  (essay.status === 'pending' || essay.status === 'awaiting_second') && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                  essay.status === 'corrected' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                  essay.status === 'second_corrected' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
                  essay.status === 'seen' && 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
                )}
              >
                {getStatusLabel(essay.status)}
              </span>

              {showCorrectionPanels && (
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
                  {isDualCorrection
                    ? <>Média: {displayScore} / {typeConfig.total_max}</>
                    : <>{displayScore} / {typeConfig.total_max}</>}
                </p>
              )}
            </div>
          </div>
        </header>

        {showCorrectionPanels && orderedScores.length > 0 && !isDualCorrection && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notas por competência</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Soma: {scoreSum} / {typeConfig.total_max}</p>
            </div>

            <div className="space-y-4">
              {orderedScores.map((item) => {
                const fullComment = item.comment || '';
                const isLong = fullComment.length > 80;
                const expanded = !!expandedCompetencies[item.competency];
                const visibleComment = isLong && !expanded ? `${fullComment.slice(0, 80)}...` : fullComment;
                const compMax = (typeConfig.score_options[item.competency - 1] || []).length > 0
                  ? Math.max(...typeConfig.score_options[item.competency - 1])
                  : 200;

                return (
                  <div key={item.competency} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Competência {item.competency} — {typeConfig.competencies[item.competency - 1] ?? `Critério ${item.competency}`}
                      </p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.score} / {compMax}</p>
                    </div>

                    <Progress
                      value={compMax > 0 ? (item.score / compMax) * 100 : 0}
                      className="h-2.5 bg-slate-200 dark:bg-slate-800"
                      indicatorClassName={progressColor(item.score, compMax)}
                    />

                    {fullComment && (
                      <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                        {visibleComment}
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCompetencies((prev) => ({
                                ...prev,
                                [item.competency]: !prev[item.competency],
                              }));
                            }}
                            className="ml-1 font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-300 dark:hover:text-emerald-200"
                          >
                            {expanded ? 'ver menos' : 'ver mais'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {showCorrectionPanels && isDualCorrection && (
          <section className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm md:p-5 dark:border-indigo-500/30 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Comparativo de notas — duas correções</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />C1: {round1?.total_score ?? 0}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />C2: {round2?.total_score ?? 0}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-300">Média: {displayScore}</span>
              </div>
            </div>

            <div className="space-y-3">
              {scores1.map((s1, idx) => {
                const s2 = scores2[idx];
                const compMax = (typeConfig.score_options[idx] || []).length > 0
                  ? Math.max(...typeConfig.score_options[idx])
                  : 200;
                const avg = s2 ? Math.round((s1.score + s2.score) / 2) : s1.score;
                return (
                  <div key={s1.competency} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Competência {s1.competency} — {typeConfig.competencies[idx] ?? `Critério ${s1.competency}`}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs sm:gap-2">
                      <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/10">
                        <p className="font-semibold text-amber-700 dark:text-amber-300">
                          <span className="sm:hidden">C1</span>
                          <span className="hidden sm:inline">Correção 1</span>
                        </p>
                        <p className="mt-1 text-base font-black text-amber-800 dark:text-amber-200">{s1.score}<span className="text-xs font-normal">/{compMax}</span></p>
                        <Progress value={compMax > 0 ? (s1.score / compMax) * 100 : 0} className="mt-1 h-1.5 bg-amber-200/60 dark:bg-amber-500/20" indicatorClassName="bg-amber-500" />
                      </div>
                      <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-500/10">
                        <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                          <span className="sm:hidden">C2</span>
                          <span className="hidden sm:inline">Correção 2</span>
                        </p>
                        <p className="mt-1 text-base font-black text-indigo-800 dark:text-indigo-200">{s2?.score ?? 0}<span className="text-xs font-normal">/{compMax}</span></p>
                        <Progress value={compMax > 0 ? ((s2?.score ?? 0) / compMax) * 100 : 0} className="mt-1 h-1.5 bg-indigo-200/60 dark:bg-indigo-500/20" indicatorClassName="bg-indigo-500" />
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">Média</p>
                        <p className="mt-1 text-base font-black text-emerald-800 dark:text-emerald-200">{avg}<span className="text-xs font-normal">/{compMax}</span></p>
                        <Progress value={compMax > 0 ? (avg / compMax) * 100 : 0} className="mt-1 h-1.5 bg-emerald-200/60 dark:bg-emerald-500/20" indicatorClassName={progressColor(avg, compMax)} />
                      </div>
                    </div>
                    {(s1.comment || s2?.comment) && (
                      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {s1.comment && (
                          <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                            <span className="font-semibold">C1:</span> {s1.comment}
                          </p>
                        )}
                        {s2?.comment && (
                          <p className="rounded-md bg-indigo-50 px-2 py-1.5 text-xs text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
                            <span className="font-semibold">C2:</span> {s2.comment}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <PenLine className="h-4 w-4" />
              <span>Texto da redação</span>
            </div>
            {isDualCorrection && (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button
                  type="button"
                  onClick={() => { setDualRoundTab(1); setActiveComment(null); }}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition',
                    dualRoundTab === 1
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  Correção 1
                </button>
                <button
                  type="button"
                  onClick={() => { setDualRoundTab(2); setActiveComment(null); }}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-semibold transition',
                    dualRoundTab === 2
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  Correção 2
                </button>
              </div>
            )}
          </div>

          {isDualCorrection && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-400" />Correção 1
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />Correção 2
              </span>
            </div>
          )}

          {isPending ? (
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                Aguardando correção pelo professor
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-100">{essay.text}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRoundAnnotations.length > 0 && (
                <div className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  isDualCorrection && dualRoundTab === 2
                    ? 'border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/10'
                    : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
                )}>
                  <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', isDualCorrection && dualRoundTab === 2 ? 'bg-indigo-400' : 'bg-amber-400')} />
                  <p className={cn('text-xs font-medium', isDualCorrection && dualRoundTab === 2 ? 'text-indigo-800 dark:text-indigo-200' : 'text-amber-800 dark:text-amber-200')}>
                    Toque nas palavras destacadas para ver o comentário do professor.
                  </p>
                </div>
              )}
              <div>{renderAnnotatedText(essay.text, activeRoundAnnotations, handleCommentClick)}</div>
              {activeComment && (
                <div
                  ref={activeCommentRef}
                  className={cn(
                    'rounded-xl border p-3 text-sm',
                    activeComment.round === 2
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-100'
                      : 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100',
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Comentário do professor</p>
                  <p className="mt-1 text-xs opacity-80">&quot;{activeComment.excerpt}&quot;</p>
                  <p className="mt-2 leading-relaxed">{activeComment.comment}</p>
                  <button
                    type="button"
                    onClick={() => setActiveComment(null)}
                    className={cn(
                      'mt-2 inline-flex min-h-9 items-center rounded-md border px-2 py-1 text-xs font-semibold',
                      activeComment.round === 2
                        ? 'border-indigo-400/60 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                        : 'border-amber-400/60 hover:bg-amber-100 dark:hover:bg-amber-500/20',
                    )}
                  >
                    Fechar comentário
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {showCorrectionPanels && isDualCorrection && (round1?.general_comment || round2?.general_comment) && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <MessageSquare className="h-4 w-4" />
              Comentários gerais
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {round1?.general_comment && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Correção 1</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                    {round1.general_comment}
                  </p>
                </div>
              )}
              {round2?.general_comment && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Correção 2</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-indigo-900 dark:text-indigo-100">
                    {round2.general_comment}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {showCorrectionPanels && !isDualCorrection && essay.general_comment && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <MessageSquare className="h-4 w-4" />
              Comentário geral do professor
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                {(essay.corrector_name || 'Professor').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {essay.corrector_name || 'Professor'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {essay.general_comment}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
