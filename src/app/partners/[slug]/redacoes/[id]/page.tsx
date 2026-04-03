'use client';

import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { cn } from '@/lib/utils';
import { ArrowLeft, Send, X } from 'lucide-react';

type Annotation = {
  id: string;
  start_offset: number;
  end_offset: number;
  type: 'comment' | 'correction';
  comment_text: string | null;
  original_text: string | null;
  corrected_text: string | null;
};

type CompetencyScore = {
  competency: number;
  score: number;
  comment: string;
};

type EssayDetail = {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  text: string;
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  general_comment: string | null;
  competency_scores: Array<{
    competency: number;
    score: number;
    comment: string | null;
  }>;
  annotations: Array<{
    id: string;
    start_offset: number;
    end_offset: number;
    type: 'comment' | 'correction';
    comment_text: string | null;
    original_text: string | null;
    corrected_text: string | null;
  }>;
};

type SelectedTextState = { start: number; end: number; text: string };
type PopupState = { x: number; y: number };
type PopupMode = 'comment' | 'correction' | null;

type Segment = {
  key: string;
  start: number;
  end: number;
  text: string;
  annotation: Annotation | null;
};

const COMPETENCY_NAMES = [
  'Domínio da norma culta da língua escrita',
  'Compreensão da proposta e aplicação de conceitos',
  'Seleção e organização das informações',
  'Conhecimento dos mecanismos linguísticos',
  'Proposta de intervenção',
];

const SCORE_OPTIONS = [0, 40, 80, 120, 160, 200];

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getTotalColorClass(total: number): string {
  if (total >= 700) return 'text-emerald-400';
  if (total >= 500) return 'text-amber-300';
  return 'text-rose-400';
}

function hasIgnoredAncestor(node: Node, stopAt: HTMLElement): boolean {
  let current: Node | null = node;
  while (current && current !== stopAt) {
    if (current instanceof HTMLElement && current.dataset.ignoreOffset === 'true') {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

function getOffsetWithinContainer(
  container: HTMLElement,
  targetNode: Node,
  targetOffset: number,
): number | null {
  if (!container.contains(targetNode)) return null;
  if (hasIgnoredAncestor(targetNode, container)) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let current = walker.nextNode();

  while (current) {
    const textNode = current as Text;
    if (!hasIgnoredAncestor(textNode, container)) {
      if (textNode === targetNode) {
        return offset + Math.min(targetOffset, textNode.data.length);
      }
      offset += textNode.data.length;
    }
    current = walker.nextNode();
  }

  return null;
}

function buildSegments(text: string, annotations: Annotation[]): Segment[] {
  if (!text.length) return [];

  const owner: Array<Annotation | null> = new Array(text.length).fill(null);

  // Última annotation adicionada tem prioridade.
  annotations.forEach((ann) => {
    const start = Math.max(0, Math.min(text.length, ann.start_offset));
    const end = Math.max(start, Math.min(text.length, ann.end_offset));
    for (let i = start; i < end; i += 1) {
      owner[i] = ann;
    }
  });

  const segments: Segment[] = [];
  let start = 0;
  let currentOwner = owner[0];

  for (let i = 1; i < text.length; i += 1) {
    const nextOwner = owner[i];
    if (nextOwner !== currentOwner) {
      segments.push({
        key: `${start}-${i}-${currentOwner?.id || 'plain'}`,
        start,
        end: i,
        text: text.slice(start, i),
        annotation: currentOwner,
      });
      start = i;
      currentOwner = nextOwner;
    }
  }

  // Fecha o último segmento (inclui o caso sem anotações).
  segments.push({
    key: `${start}-${text.length}-${currentOwner?.id || 'plain'}`,
    start,
    end: text.length,
    text: text.slice(start, text.length),
    annotation: currentOwner,
  });

  return segments;
}

export default function CorrecaoRedacaoPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const textContainerRef = useRef<HTMLDivElement | null>(null);

  const [essay, setEssay] = useState<EssayDetail | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [scores, setScores] = useState<CompetencyScore[]>(
    Array.from({ length: 5 }, (_, idx) => ({
      competency: idx + 1,
      score: 0,
      comment: '',
    })),
  );
  const [generalComment, setGeneralComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedText, setSelectedText] = useState<SelectedTextState | null>(null);
  const [annotationPopup, setAnnotationPopup] = useState<PopupState | null>(null);
  const [popupMode, setPopupMode] = useState<PopupMode>(null);
  const [popupValue, setPopupValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
        const data: EssayDetail = await res.json();
        if (!mounted) return;

        setEssay(data);
        setAnnotations(
          (data.annotations || []).map((a) => ({
            id: a.id || crypto.randomUUID(),
            start_offset: a.start_offset,
            end_offset: a.end_offset,
            type: a.type,
            comment_text: a.comment_text,
            original_text: a.original_text,
            corrected_text: a.corrected_text,
          })),
        );

        const normalizedScores = Array.from({ length: 5 }, (_, idx) => {
          const comp = idx + 1;
          const existing = (data.competency_scores || []).find((s) => s.competency === comp);
          return {
            competency: comp,
            score: existing?.score ?? 0,
            comment: existing?.comment ?? '',
          };
        });
        setScores(normalizedScores);
        setGeneralComment(data.general_comment || '');
      } catch {
        if (mounted) setError('Não foi possível carregar esta redação.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEssay();
    return () => {
      mounted = false;
    };
  }, [id, slug]);

  const totalScore = useMemo(
    () => scores.reduce((acc, item) => acc + (item.score || 0), 0),
    [scores],
  );

  const canSubmit = useMemo(() => {
    const allSelected = scores.every((s) => s.score > 0);
    const hasGeneral = generalComment.trim().length >= 20;
    return allSelected && hasGeneral && !submitting;
  }, [scores, generalComment, submitting]);

  const segments = useMemo(
    () => buildSegments(essay?.text || '', annotations),
    [essay?.text, annotations],
  );

  function closePopup() {
    setAnnotationPopup(null);
    setSelectedText(null);
    setPopupMode(null);
    setPopupValue('');
    window.getSelection()?.removeAllRanges();
  }

  function handleTextMouseUp() {
    const container = textContainerRef.current;
    if (!container || !essay?.text) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }

    const start = getOffsetWithinContainer(container, range.startContainer, range.startOffset);
    const end = getOffsetWithinContainer(container, range.endContainer, range.endOffset);

    if (start === null || end === null) return;

    const offsetStart = Math.min(start, end);
    const offsetEnd = Math.max(start, end);
    if (offsetEnd <= offsetStart) return;

    const selected = essay.text.slice(offsetStart, offsetEnd);
    if (!selected.trim()) return;

    const rect = range.getBoundingClientRect();
    setSelectedText({
      start: offsetStart,
      end: offsetEnd,
      text: selected,
    });
    setAnnotationPopup({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8,
    });
    setPopupMode(null);
    setPopupValue('');
  }

  function addAnnotation() {
    if (!selectedText || !popupMode) return;

    if (!popupValue.trim()) {
      toast.error('Preencha o conteúdo da anotação.');
      return;
    }

    const next: Annotation = {
      id: crypto.randomUUID(),
      start_offset: selectedText.start,
      end_offset: selectedText.end,
      type: popupMode,
      comment_text: popupMode === 'comment' ? popupValue.trim() : null,
      original_text: selectedText.text,
      corrected_text: popupMode === 'correction' ? popupValue.trim() : null,
    };

    setAnnotations((prev) => [...prev, next]);
    closePopup();
  }

  function removeAnnotation(annotationId: string) {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId));
  }

  function scrollToAnnotation(annotationId: string) {
    const element = textContainerRef.current?.querySelector(`[data-annotation-id="${annotationId}"]`);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function submitCorrection() {
    if (!essay) return;
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const payload = {
        competency_scores: scores.map((s) => ({
          competency: s.competency,
          score: s.score,
          comment: s.comment || '',
        })),
        annotations,
        general_comment: generalComment.trim(),
      };

      const res = await fetch(`${apiUrl}/api/partners/${slug}/essays/${essay.id}/correct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível enviar a correção.');
      }

      toast.success('Correção enviada! O aluno será notificado.');
      router.push(`/partners/${slug}/redacoes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao enviar correção.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function renderAnnotatedText(): ReactNode {
    return segments.map((segment) => {
      if (!segment.annotation) {
        return <Fragment key={segment.key}>{segment.text}</Fragment>;
      }

      if (segment.annotation.type === 'comment') {
        return (
          <span
            key={segment.key}
            data-annotation-id={segment.annotation.id}
            className="rounded bg-amber-400/10 px-0.5 text-amber-100 underline decoration-amber-300/80 underline-offset-2 cursor-pointer"
            title={segment.annotation.comment_text || ''}
          >
            {segment.text}
          </span>
        );
      }

      const original = segment.annotation.original_text || segment.text;
      const corrected = segment.annotation.corrected_text || '';
      return (
        <span
          key={segment.key}
          data-annotation-id={segment.annotation.id}
          className="inline-flex items-center gap-1 rounded bg-slate-800/70 px-1 py-0.5"
        >
          <span className="line-through text-rose-500">{original}</span>{' '}
          <span className="font-semibold text-emerald-500" data-ignore-offset="true">
            {corrected}
          </span>
        </span>
      );
    });
  }

  if (loading) {
    return (
      <PartnerLayout>
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-xl bg-slate-800/80" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-slate-800/70" />
        </div>
      </PartnerLayout>
    );
  }

  if (error || !essay) {
    return (
      <PartnerLayout>
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 text-sm text-rose-200">
          {error || 'Redação não encontrada.'}
        </div>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout>
      <div className="space-y-5">
        <header className="space-y-2">
          <Link
            href={`/partners/${slug}/redacoes`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para fila
          </Link>
          <h1 className="text-2xl font-extrabold text-white">
            Correção da Redação - {formatDateBR(essay.submitted_at)}
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <section className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">Texto do aluno</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold',
                  essay.status === 'pending' && 'bg-amber-500/20 text-amber-300',
                  essay.status !== 'pending' && 'bg-emerald-500/20 text-emerald-300',
                )}
              >
                {essay.status === 'pending' ? 'Pendente' : 'Já corrigida'}
              </span>
            </div>

            <div
              ref={textContainerRef}
              onMouseUp={handleTextMouseUp}
              className="max-h-[540px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap"
            >
              {renderAnnotatedText()}
            </div>

            {annotationPopup && selectedText && (
              <div
                className="fixed z-50 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl"
                style={{ top: annotationPopup.y, left: annotationPopup.x, transform: 'translateX(-50%)' }}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-xs text-slate-300">
                    Trecho selecionado:{' '}
                    <span className="font-semibold text-slate-100">
                      &quot;{selectedText.text.slice(0, 40)}
                      {selectedText.text.length > 40 ? '...' : ''}
                      &quot;
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={closePopup}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {!popupMode ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPopupMode('comment')}
                      className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-200"
                    >
                      💬 Comentar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPopupMode('correction')}
                      className="flex-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-200"
                    >
                      ✏️ Corrigir
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={popupValue}
                      onChange={(e) => setPopupValue(e.target.value)}
                      placeholder={popupMode === 'comment' ? 'Digite o comentário...' : 'Digite a correção...'}
                      className="min-h-[88px] w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPopupMode(null);
                          setPopupValue('');
                        }}
                        className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={addAnnotation}
                        className="rounded-md bg-[var(--brand-primary)] px-2 py-1 text-xs font-semibold text-white"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Anotações adicionadas ({annotations.length})
              </h3>
              {annotations.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma anotação adicionada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => scrollToAnnotation(ann.id)}
                        className="min-w-0 text-left text-xs text-slate-200 hover:text-white"
                      >
                        <span className="font-semibold">{ann.type === 'comment' ? 'Comentário' : 'Correção'}</span>
                        {' · '}
                        {(ann.original_text || '').slice(0, 15)}
                        {(ann.original_text || '').length > 15 ? '...' : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnotation(ann.id)}
                        className="rounded-md border border-rose-500/40 px-2 py-0.5 text-xs text-rose-300 transition hover:bg-rose-500/10"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:sticky lg:top-4 lg:col-span-2">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-300">
              Notas por Competência
            </h2>

            <div className="space-y-4">
              {scores.map((item, idx) => (
                <div key={item.competency} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-200">
                    Competência {item.competency} — {COMPETENCY_NAMES[idx]}
                  </p>

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {SCORE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setScores((prev) =>
                            prev.map((s) => (
                              s.competency === item.competency
                                ? { ...s, score: option }
                                : s
                            )),
                          );
                        }}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs font-semibold transition',
                          item.score === option
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/20 text-white'
                            : 'border-slate-700 text-slate-300 hover:border-slate-500',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  <p className="mb-2 text-xs font-semibold text-slate-300">
                    Nota selecionada: <span className="text-white">{item.score} / 200</span>
                  </p>

                  <textarea
                    value={item.comment}
                    onChange={(e) => {
                      const nextComment = e.target.value;
                      setScores((prev) =>
                        prev.map((s) => (
                          s.competency === item.competency
                            ? { ...s, comment: nextComment }
                            : s
                        )),
                      );
                    }}
                    placeholder="Comentário da competência (opcional)"
                    className="min-h-[64px] w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs text-slate-100 outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total</p>
              <p className={cn('text-3xl font-extrabold', getTotalColorClass(totalScore))}>
                {totalScore} / 1000
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Comentário Geral
              </label>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Escreva um comentário geral da redação (mín. 20 caracteres)"
                className="min-h-[110px] w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <button
              type="button"
              onClick={submitCorrection}
              disabled={!canSubmit}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'Enviar Correção'}
            </button>
          </aside>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs text-slate-400">
          A correção exige nota nas 5 competências (acima de 0) e comentário geral com no mínimo 20 caracteres.
        </div>
      </div>
    </PartnerLayout>
  );
}
