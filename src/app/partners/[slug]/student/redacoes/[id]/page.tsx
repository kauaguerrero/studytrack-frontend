'use client';

import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, MessageSquare, PenLine } from 'lucide-react';
import { useEssayNotification } from '@/contexts/EssayNotificationContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type EssayStatus = 'pending' | 'corrected' | 'seen';

interface EssayAnnotation {
  id: string;
  start_offset: number;
  end_offset: number;
  type: 'comment' | 'correction';
  comment_text: string | null;
  original_text: string | null;
  corrected_text: string | null;
}

interface CompetencyScore {
  competency: number;
  score: number;
  comment: string | null;
}

interface EssayDetail {
  id: string;
  status: EssayStatus;
  theme?: string | null;
  text: string;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  general_comment: string | null;
  competency_scores: CompetencyScore[];
  annotations: EssayAnnotation[];
  corrector_name?: string | null;
  corrector_avatar_url?: string | null;
}

const COMPETENCY_LABELS = [
  'Domínio da norma culta da língua escrita',
  'Compreensão da proposta e aplicação de conceitos',
  'Seleção e organização das informações',
  'Conhecimento dos mecanismos linguísticos',
  'Proposta de intervenção',
];

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getStatusLabel(status: EssayStatus): string {
  if (status === 'pending') return 'Aguardando correção pelo professor';
  if (status === 'corrected') return 'Corrigida';
  return 'Vista';
}

function progressColor(score: number): string {
  if (score >= 160) return 'bg-emerald-500';
  if (score >= 120) return 'bg-amber-500';
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
  onCommentClick: (payload: { id: string; comment: string; excerpt: string }) => void,
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
    if (annotation.type === 'comment') {
      const commentText = annotation.comment_text || 'Comentário do professor';
      return (
        <button
          key={segment.key}
          type="button"
          onClick={() => onCommentClick({ id: annotation.id, comment: commentText, excerpt: coveredText })}
          className="inline cursor-pointer rounded-sm border-b-2 border-dashed border-amber-400 bg-amber-400/15 px-0.5 text-left font-medium text-amber-700 underline decoration-amber-500/70 underline-offset-2 transition-colors hover:bg-amber-400/30 hover:border-amber-500 active:scale-95 dark:text-amber-200 dark:decoration-amber-400/70 dark:hover:bg-amber-400/25"
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
  const [activeComment, setActiveComment] = useState<{ id: string; comment: string; excerpt: string } | null>(null);
  const activeCommentRef = useRef<HTMLDivElement>(null);

  const handleCommentClick = (payload: { id: string; comment: string; excerpt: string }) => {
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

        // Requisito: ao abrir redação corrigida, marca como vista automaticamente.
        if (data.status === 'corrected') {
          void fetch(`/api/partners/${slug}/essays/${id}/seen`, {
            method: 'PATCH',
          }).then(() => {
            if (!mounted) return;
            setEssay((prev) => (prev ? { ...prev, status: 'seen' } : prev));
            void refresh();
          }).catch(() => {
            // Sem bloqueio visual para o usuário caso PATCH falhe.
          });
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

  const orderedScores = useMemo(() => {
    if (!essay?.competency_scores) return [];
    return [...essay.competency_scores].sort((a, b) => a.competency - b.competency);
  }, [essay?.competency_scores]);

  const scoreSum = useMemo(
    () => orderedScores.reduce((acc, item) => acc + (item.score || 0), 0),
    [orderedScores],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
            {error || 'Redação não encontrada.'}
          </div>
        </div>
      </div>
    );
  }

  const isPending = essay.status === 'pending';
  const showCorrectionPanels = essay.status === 'corrected' || essay.status === 'seen';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
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
                Redação - {formatDateBR(essay.submitted_at)}
              </h1>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CalendarDays className="h-4 w-4" />
                Enviada em {formatDateBR(essay.submitted_at)}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Tema:</span> {essay.theme || 'Não informado'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  essay.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                  essay.status === 'corrected' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                  essay.status === 'seen' && 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
                )}
              >
                {getStatusLabel(essay.status)}
              </span>

              {showCorrectionPanels && (
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
                  {essay.total_score ?? scoreSum} / 1000
                </p>
              )}
            </div>
          </div>
        </header>

        {showCorrectionPanels && orderedScores.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Notas por competência</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Soma: {scoreSum} / 1000</p>
            </div>

            <div className="space-y-4">
              {orderedScores.map((item) => {
                const fullComment = item.comment || '';
                const isLong = fullComment.length > 80;
                const expanded = !!expandedCompetencies[item.competency];
                const visibleComment = isLong && !expanded ? `${fullComment.slice(0, 80)}...` : fullComment;

                return (
                  <div key={item.competency} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Competência {item.competency} — {COMPETENCY_LABELS[item.competency - 1]}
                      </p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.score} / 200</p>
                    </div>

                    <Progress
                      value={(item.score / 200) * 100}
                      className="h-2.5 bg-slate-200 dark:bg-slate-800"
                      indicatorClassName={progressColor(item.score)}
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

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <PenLine className="h-4 w-4" />
            <span className="text-slate-700 dark:text-slate-200">Texto da redação</span>
          </div>

          {isPending ? (
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                Aguardando correção pelo professor
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-100">{essay.text}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(essay.annotations?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Toque nas palavras destacadas em laranja para ver o comentário do professor.
                  </p>
                </div>
              )}
              <div>{renderAnnotatedText(essay.text, essay.annotations || [], handleCommentClick)}</div>
              {activeComment && (
                <div ref={activeCommentRef} className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Comentário do professor</p>
                  <p className="mt-1 text-xs opacity-80">&quot;{activeComment.excerpt}&quot;</p>
                  <p className="mt-2 leading-relaxed">{activeComment.comment}</p>
                  <button
                    type="button"
                    onClick={() => setActiveComment(null)}
                    className="mt-2 inline-flex min-h-9 items-center rounded-md border border-amber-400/60 px-2 py-1 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20"
                  >
                    Fechar comentário
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {showCorrectionPanels && essay.general_comment && (
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
