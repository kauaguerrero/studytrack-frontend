'use client';

import { Fragment, ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, MessageSquare, PenLine } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEssayNotification } from '@/contexts/EssayNotificationContext';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

function renderAnnotatedText(
  text: string,
  annotations: EssayAnnotation[],
): ReactNode {
  if (!annotations.length) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{text}</p>;
  }

  const clean = annotations
    .filter((a) => Number.isInteger(a.start_offset) && Number.isInteger(a.end_offset))
    .filter((a) => a.start_offset >= 0 && a.end_offset > a.start_offset && a.start_offset < text.length)
    .sort((a, b) => a.start_offset - b.start_offset);

  if (!clean.length) {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{text}</p>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  clean.forEach((annotation, idx) => {
    const start = Math.max(cursor, annotation.start_offset);
    const end = Math.min(text.length, annotation.end_offset);
    if (start >= end) return;

    if (start > cursor) {
      nodes.push(
        <Fragment key={`plain-${idx}-${cursor}`}>
          {text.slice(cursor, start)}
        </Fragment>,
      );
    }

    const coveredText = text.slice(start, end);
    if (annotation.type === 'comment') {
      const tooltipText = annotation.comment_text || 'Comentário do professor';
      nodes.push(
        <Tooltip key={`comment-${annotation.id}`}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline rounded-sm border-b border-dashed border-amber-400 bg-amber-400/10 px-0.5 text-left text-amber-100 underline decoration-amber-400/70 underline-offset-2"
              title={tooltipText}
            >
              {coveredText}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
            {tooltipText}
          </TooltipContent>
        </Tooltip>,
      );
    } else {
      const original = annotation.original_text || coveredText;
      const corrected = annotation.corrected_text || '';
      nodes.push(
        <span
          key={`correction-${annotation.id}`}
          className="inline-flex flex-wrap items-center gap-1 rounded-md bg-slate-800/70 px-1 py-0.5 align-baseline"
        >
          <span className="text-red-400 line-through">{original}</span>
          {corrected && <span className="text-emerald-400">{corrected}</span>}
        </span>,
      );
    }

    cursor = end;
  });

  if (cursor < text.length) {
    nodes.push(<Fragment key="plain-tail">{text.slice(cursor)}</Fragment>);
  }

  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{nodes}</p>;
}

export default function RedacaoDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { refresh } = useEssayNotification();

  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCompetencies, setExpandedCompetencies] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let mounted = true;

    async function loadEssay() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (mounted) setError('Sessão expirada. Faça login novamente.');
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

        const res = await fetch(`${apiUrl}/api/partners/${slug}/essays/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status}`);
        }

        const data: EssayDetail = await res.json();
        if (!mounted) return;
        setEssay(data);

        // Requisito: ao abrir redação corrigida, marca como vista automaticamente.
        if (data.status === 'corrected') {
          void fetch(`${apiUrl}/api/partners/${slug}/essays/${id}/seen`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${session.access_token}` },
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
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 md:px-6 md:py-8">
          <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
          <div className="h-52 animate-pulse rounded-2xl bg-slate-800/70" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-800/70" />
        </div>
      </div>
    );
  }

  if (error || !essay) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
          <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-sm text-red-200">
            {error || 'Redação não encontrada.'}
          </div>
        </div>
      </div>
    );
  }

  const isPending = essay.status === 'pending';
  const showCorrectionPanels = essay.status === 'corrected' || essay.status === 'seen';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-3">
          <Link
            href={`/partners/${slug}/student/redacoes`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para redações
          </Link>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold md:text-2xl">
                Redação - {formatDateBR(essay.submitted_at)}
              </h1>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-400">
                <CalendarDays className="h-4 w-4" />
                Enviada em {formatDateBR(essay.submitted_at)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  essay.status === 'pending' && 'bg-amber-500/20 text-amber-300',
                  essay.status === 'corrected' && 'bg-emerald-500/20 text-emerald-300',
                  essay.status === 'seen' && 'bg-slate-500/20 text-slate-300',
                )}
              >
                {getStatusLabel(essay.status)}
              </span>

              {showCorrectionPanels && (
                <p className="text-lg font-extrabold text-emerald-300">
                  {essay.total_score ?? scoreSum} / 1000
                </p>
              )}
            </div>
          </div>
        </header>

        {showCorrectionPanels && orderedScores.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-100">Notas por competência</h2>
              <p className="text-xs text-slate-400">Soma: {scoreSum} / 1000</p>
            </div>

            <div className="space-y-4">
              {orderedScores.map((item) => {
                const fullComment = item.comment || '';
                const isLong = fullComment.length > 80;
                const expanded = !!expandedCompetencies[item.competency];
                const visibleComment = isLong && !expanded ? `${fullComment.slice(0, 80)}...` : fullComment;

                return (
                  <div key={item.competency} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-slate-100">
                        Competência {item.competency} — {COMPETENCY_LABELS[item.competency - 1]}
                      </p>
                      <p className="text-sm font-bold text-slate-200">{item.score} / 200</p>
                    </div>

                    <Progress
                      value={(item.score / 200) * 100}
                      className="h-2.5 bg-slate-800"
                      indicatorClassName={progressColor(item.score)}
                    />

                    {fullComment && (
                      <div className="rounded-lg bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
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
                            className="ml-1 font-semibold text-emerald-300 hover:text-emerald-200"
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <PenLine className="h-4 w-4" />
            Texto da redação
          </div>

          {isPending ? (
            <div className="space-y-3">
              <span className="inline-flex rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
                Aguardando correção pelo professor
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{essay.text}</p>
            </div>
          ) : (
            <div>{renderAnnotatedText(essay.text, essay.annotations || [])}</div>
          )}
        </section>

        {showCorrectionPanels && essay.general_comment && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <MessageSquare className="h-4 w-4" />
              Comentário geral do professor
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-100">
                {(essay.corrector_name || 'Professor').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {essay.corrector_name || 'Professor'}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
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
