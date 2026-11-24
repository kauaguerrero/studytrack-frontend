'use client';

// Mini-quiz da revisão SRS. As questões vêm sem gabarito; a correção e a nota
// (again/hard/good/easy) são calculadas no backend. Sem questões disponíveis,
// cai na autoavaliação (que nunca vale "Fácil").
//
// Depois de concluir: um cartão por questão (acertou/errou, o que marcou e o
// gabarito) e o modo "Rever questões", que mostra a questão inteira com a
// alternativa certa e a marcada destacadas. Tudo com o que já está na tela:
// nenhuma chamada nova ao backend.

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, CalendarClock, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import {
  cronogramaFetch, formatDayMonth, type QuizQuestion, type QuizResponse, type ReviewResult,
} from '@/lib/cronograma';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

const GRADE_LABEL: Record<ReviewResult['grade'], string> = {
  again: 'Precisa rever', hard: 'Difícil', good: 'Bom', easy: 'Fácil',
};

const SELF_OPTIONS: { grade: 'again' | 'hard' | 'good'; label: string; hint: string }[] = [
  { grade: 'again', label: 'Não lembrei', hint: 'revisa amanhã' },
  { grade: 'hard', label: 'Lembrei com esforço', hint: 'intervalo curto' },
  { grade: 'good', label: 'Lembrei bem', hint: 'intervalo maior' },
];

type QResult = ReviewResult['results'][number];

/** Começo do enunciado em texto puro, para o cartão do resultado. */
function preview(q: QuizQuestion): string {
  const raw = [q.context, q.alternatives_intro].filter(Boolean).join(' ');
  const text = raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_#>`$\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 110 ? `${text.slice(0, 110).trimEnd()}…` : text;
}

export function ReviewQuizModal({
  itemId,
  onClose,
  onDone,
}: {
  itemId: string | null;
  onClose: () => void;
  onDone: (r: ReviewResult) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  // Questão aberta no modo "rever" (null = lista do resultado).
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!itemId) return;
    setQuiz(null); setAnswers({}); setIdx(0); setResult(null); setReviewIdx(null);
    setLoading(true);
    // Troca de item no meio do carregamento: a resposta antiga é descartada.
    let stale = false;
    cronogramaFetch<QuizResponse>(`/items/${itemId}/quiz`)
      .then((qz) => { if (!stale) setQuiz(qz); })
      .catch((e) => { if (!stale) { toast.error(e.message); onClose(); } })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const submit = async (payload: { answers?: Record<string, string>; self_grade?: string }) => {
    if (!itemId) return;
    setSending(true);
    try {
      const r = await cronogramaFetch<ReviewResult>(`/items/${itemId}/review`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      setResult(r);
      onDone(r);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const questions = quiz?.questions ?? [];
  const q = questions[idx];
  const allAnswered = questions.length > 0 && questions.every((x) => answers[x.id]);
  const correctById: Record<string, QResult> = Object.fromEntries((result?.results ?? []).map((r) => [r.question_id, r]));
  const rightCount = questions.filter((x) => correctById[x.id]?.is_correct).length;
  const firstWrong = questions.findIndex((x) => correctById[x.id] && !correctById[x.id].is_correct);
  const reviewing = result && reviewIdx != null ? questions[reviewIdx] : null;

  return (
    <Dialog open={!!itemId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        <DialogHeader>
          <DialogTitle className="font-display text-[18px] text-slate-900 dark:text-white">
            Revisão{quiz ? `: ${quiz.topic}` : ''}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
            {quiz?.basis === 'discipline'
              ? `Questões de ${quiz.q_discipline}, baseadas na disciplina.`
              : quiz?.basis === 'mixed'
                ? `Questões deste conteúdo, completadas com outras de ${quiz.q_discipline}.`
                : quiz?.basis === 'node' ? 'Questões deste conteúdo.' : 'Como foi lembrar deste conteúdo?'}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}

        {/* ── Resultado: resumo + um cartão por questão ── */}
        {result && !reviewing && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[13px] text-slate-600 dark:text-white/60">Resultado</p>
              <p className="font-display text-[22px] font-black text-slate-900 dark:text-white">
                {GRADE_LABEL[result.grade]}
                {result.accuracy != null && <span className="ml-2 text-[15px] font-bold text-slate-500">{Math.round(result.accuracy * 100)}% de acerto</span>}
              </p>
              {questions.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1" aria-hidden>
                    {questions.map((x) => (
                      <span key={x.id} className={`h-2 flex-1 rounded-full ${correctById[x.id]?.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    ))}
                  </div>
                  <span className="shrink-0 text-[12.5px] font-bold text-slate-700 dark:text-white/75">
                    {rightCount} de {questions.length} {rightCount === 1 ? 'certa' : 'certas'}
                  </span>
                </div>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-white/60">
                <CalendarClock className="h-4 w-4 shrink-0" />
                {result.next_due_on
                  ? <span>Próxima revisão em <b>{result.interval_days} {result.interval_days === 1 ? 'dia' : 'dias'}</b> ({formatDayMonth(result.next_due_on)}).</span>
                  : 'Última revisão antes da prova. Conteúdo consolidado!'}
              </p>
            </div>

            {questions.length > 0 && (
              <ul className="space-y-2" aria-label="Correção das questões">
                {questions.map((x, k) => {
                  const r = correctById[x.id];
                  const ok = !!r?.is_correct;
                  return (
                    <li key={x.id}>
                      <button type="button" onClick={() => setReviewIdx(k)}
                        aria-label={`Rever questão ${k + 1}: ${ok ? 'acertou' : 'errou'}`}
                        className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition hover:shadow-md ${ok
                          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/25 dark:bg-emerald-400/10'
                          : 'border-red-200 bg-red-50/70 dark:border-red-400/25 dark:bg-red-400/10'}`}>
                        {ok
                          ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          : <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-bold text-slate-900 dark:text-white">
                            Questão {k + 1} · {ok ? 'Acertou' : 'Errou'}
                          </span>
                          {preview(x) && <span className="mt-0.5 block truncate text-[12px] text-slate-600 dark:text-white/55">{preview(x)}</span>}
                          <span className="mt-1 flex flex-wrap gap-1.5 text-[11.5px] font-semibold">
                            <span className={`rounded-full px-2 py-0.5 ${ok ? 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-200' : 'bg-red-600/10 text-red-800 dark:text-red-200'}`}>
                              Você marcou {answers[x.id] || '-'}
                            </span>
                            {!ok && r?.correct_option && (
                              <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-emerald-800 dark:text-emerald-200">Gabarito {r.correct_option}</span>
                            )}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {questions.length > 0 && (
                <button type="button" onClick={() => setReviewIdx(firstWrong >= 0 ? firstWrong : 0)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-300 py-2.5 text-[14px] font-bold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-white dark:hover:bg-white/5">
                  <Eye className="h-4 w-4" /> {firstWrong >= 0 ? 'Rever o que errei' : 'Rever questões'}
                </button>
              )}
              <button type="button" onClick={onClose}
                className="flex-1 rounded-full py-2.5 text-[14px] font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
                Voltar ao cronograma
              </button>
            </div>
          </div>
        )}

        {/* ── Rever uma questão com o gabarito ── */}
        {reviewing && reviewIdx != null && (
          <div className="space-y-4">
            <ReviewedQuestion q={reviewing} n={reviewIdx + 1} total={questions.length}
              marked={answers[reviewing.id]} r={correctById[reviewing.id]} />
            <div className="flex items-center justify-between gap-2">
              <button type="button" disabled={reviewIdx === 0} onClick={() => setReviewIdx(reviewIdx - 1)}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-white/60 dark:hover:bg-white/10">
                Questão anterior
              </button>
              <button type="button" onClick={() => setReviewIdx(null)}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10">
                Ver resultado
              </button>
              <button type="button" disabled={reviewIdx >= questions.length - 1} onClick={() => setReviewIdx(reviewIdx + 1)}
                className="rounded-full px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand-primary)' }}>
                Próxima questão
              </button>
            </div>
          </div>
        )}

        {!loading && !result && quiz && questions.length === 0 && (
          <div className="grid gap-2">
            {SELF_OPTIONS.map((o) => (
              <button key={o.grade} type="button" disabled={sending} onClick={() => submit({ self_grade: o.grade })}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-slate-900">
                <span className="text-[14px] font-bold text-slate-900 dark:text-white">{o.label}</span>
                <span className="text-[12px] text-slate-500 dark:text-white/50">{o.hint}</span>
              </button>
            ))}
          </div>
        )}

        {!loading && !result && q && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              {questions.map((x, k) => (
                <button key={x.id} type="button" onClick={() => setIdx(k)} aria-label={`Questão ${k + 1}`}
                  className={`h-1.5 flex-1 rounded-full ${k === idx ? 'bg-slate-900 dark:bg-white' : answers[x.id] ? 'bg-slate-400' : 'bg-slate-200 dark:bg-white/15'}`} />
              ))}
            </div>
            <p className="text-[11.5px] font-semibold text-slate-500 dark:text-white/50">
              {q.title || `Questão ${idx + 1}`}
            </p>
            <Statement q={q} />
            <div className="grid gap-2">
              {(q.alternatives || []).map((a) => {
                const selected = answers[q.id] === a.letter;
                return (
                  <button key={a.letter} type="button"
                    onClick={() => setAnswers((s) => ({ ...s, [q.id]: a.letter }))}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left text-[13.5px] transition ${selected ? 'border-transparent ring-2' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}
                    style={selected ? { ['--tw-ring-color' as string]: 'var(--brand-ink)', background: 'color-mix(in srgb, var(--brand-ink) 8%, transparent)' } : undefined}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700 dark:bg-white/10 dark:text-white/80">{a.letter}</span>
                    <AltBody a={a} />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-white/60 dark:hover:bg-white/10">
                Anterior
              </button>
              {idx < questions.length - 1 ? (
                <button type="button" disabled={!answers[q.id]} onClick={() => setIdx((i) => i + 1)}
                  className="rounded-full px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand-primary)' }}>
                  Próxima
                </button>
              ) : (
                <button type="button" disabled={!allAnswered || sending} onClick={() => submit({ answers })}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand-primary)' }}>
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />} Concluir revisão
                </button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Statement({ q }: { q: QuizQuestion }) {
  return (
    <>
      {q.context && <QuestionRichText text={q.context} className="text-[14px] text-slate-800 dark:text-white/85" />}
      {Array.isArray(q.images) && q.images.filter((u) => typeof u === 'string').map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt="" className="max-h-72 rounded-lg border border-slate-200 dark:border-white/10" />
      ))}
      {q.alternatives_intro && <QuestionRichText text={q.alternatives_intro} className="text-[14px] font-medium text-slate-900 dark:text-white" />}
    </>
  );
}

function AltBody({ a }: { a: QuizQuestion['alternatives'][number] }) {
  return (
    <span className="min-w-0 flex-1 text-slate-800 dark:text-white/85">
      <QuestionRichText text={a.text} />
      {a.file && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.file} alt="" className="mt-1 max-h-40 rounded" />
      )}
    </span>
  );
}

/** Questão já corrigida: gabarito em verde, a marcada (se errada) em vermelho. */
function ReviewedQuestion({ q, n, total, marked, r }: {
  q: QuizQuestion; n: number; total: number; marked?: string; r?: QResult;
}) {
  const ok = !!r?.is_correct;
  const right = r?.correct_option ?? null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-semibold text-slate-500 dark:text-white/50">
          Questão {n} de {total}{q.exam_year ? ` · ${q.bank ?? ''} ${q.exam_year}`.trimEnd() : ''}
        </p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${ok
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200'
          : 'bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-200'}`}>
          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {ok ? 'Você acertou' : 'Você errou'}
        </span>
      </div>
      <Statement q={q} />
      <ul className="grid gap-2" aria-label="Alternativas corrigidas">
        {(q.alternatives || []).map((a) => {
          const isRight = a.letter === right;
          const isMarked = a.letter === marked;
          const tone = isRight
            ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-400/50 dark:bg-emerald-400/10'
            : isMarked
              ? 'border-red-400 bg-red-50 dark:border-red-400/50 dark:bg-red-400/10'
              : 'border-slate-200 opacity-70 dark:border-white/10';
          const badge = isRight
            ? 'bg-emerald-600 text-white'
            : isMarked ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80';
          return (
            <li key={a.letter} className={`flex items-start gap-3 rounded-xl border p-3 text-[13.5px] ${tone}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${badge}`}>{a.letter}</span>
              <AltBody a={a} />
              {(isRight || isMarked) && (
                <span className={`shrink-0 text-[11.5px] font-bold ${isRight ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {isRight && isMarked ? 'Sua resposta · Gabarito' : isRight ? 'Gabarito' : 'Sua resposta'}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!right && (
        <p className="text-[12px] text-slate-500 dark:text-white/50">Gabarito indisponível para esta questão.</p>
      )}
    </div>
  );
}
