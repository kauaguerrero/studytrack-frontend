'use client';

// Mini-quiz da revisão SRS. As questões vêm sem gabarito; a correção e a nota
// (again/hard/good/easy) são calculadas no backend. Sem questões disponíveis,
// cai na autoavaliação (que nunca vale "Fácil").

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import {
  cronogramaFetch, formatDayMonth, type QuizResponse, type ReviewResult,
} from '@/lib/cronograma';

const GRADE_LABEL: Record<ReviewResult['grade'], string> = {
  again: 'Precisa rever', hard: 'Difícil', good: 'Bom', easy: 'Fácil',
};

const SELF_OPTIONS: { grade: 'again' | 'hard' | 'good'; label: string; hint: string }[] = [
  { grade: 'again', label: 'Não lembrei', hint: 'revisa amanhã' },
  { grade: 'hard', label: 'Lembrei com esforço', hint: 'intervalo curto' },
  { grade: 'good', label: 'Lembrei bem', hint: 'intervalo maior' },
];

export function ReviewQuizModal({
  itemId,
  onClose,
  onDone,
}: {
  itemId: string | null;
  onClose: () => void;
  onDone: (r: ReviewResult) => void;
}) {
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    if (!itemId) return;
    setQuiz(null); setAnswers({}); setIdx(0); setResult(null);
    setLoading(true);
    cronogramaFetch<QuizResponse>(`/items/${itemId}/quiz`)
      .then(setQuiz)
      .catch((e) => { toast.error(e.message); onClose(); })
      .finally(() => setLoading(false));
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
  const correctById = Object.fromEntries((result?.results ?? []).map((r) => [r.question_id, r]));

  return (
    <Dialog open={!!itemId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
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

        {result && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-[13px] text-slate-600 dark:text-white/60">Resultado</p>
              <p className="font-display text-[22px] font-black text-slate-900 dark:text-white">
                {GRADE_LABEL[result.grade]}
                {result.accuracy != null && <span className="ml-2 text-[15px] font-bold text-slate-500">{Math.round(result.accuracy * 100)}% de acerto</span>}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-white/60">
                <CalendarClock className="h-4 w-4" />
                {result.next_due_on
                  ? <>Próxima revisão em <b className="mx-1">{result.interval_days} {result.interval_days === 1 ? 'dia' : 'dias'}</b> ({formatDayMonth(result.next_due_on)}).</>
                  : 'Última revisão antes da prova. Conteúdo consolidado!'}
              </p>
            </div>
            {questions.length > 0 && (
              <ul className="space-y-1.5">
                {questions.map((x, k) => {
                  const r = correctById[x.id];
                  return (
                    <li key={x.id} className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-white/70">
                      {r?.is_correct ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                      Questão {k + 1}: você marcou {answers[x.id] || '-'}{r && !r.is_correct && r.correct_option ? `, gabarito ${r.correct_option}` : ''}
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={onClose}
              className="w-full rounded-full py-2.5 text-[14px] font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
              Voltar ao cronograma
            </button>
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
            {q.context && <QuestionRichText text={q.context} className="text-[14px] text-slate-800 dark:text-white/85" />}
            {Array.isArray(q.images) && q.images.filter((u) => typeof u === 'string').map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="max-h-72 rounded-lg border border-slate-200 dark:border-white/10" />
            ))}
            {q.alternatives_intro && <QuestionRichText text={q.alternatives_intro} className="text-[14px] font-medium text-slate-900 dark:text-white" />}
            <div className="grid gap-2">
              {(q.alternatives || []).map((a) => {
                const selected = answers[q.id] === a.letter;
                return (
                  <button key={a.letter} type="button"
                    onClick={() => setAnswers((s) => ({ ...s, [q.id]: a.letter }))}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left text-[13.5px] transition ${selected ? 'border-transparent ring-2' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}
                    style={selected ? { ['--tw-ring-color' as string]: 'var(--brand-primary)', background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' } : undefined}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700 dark:bg-white/10 dark:text-white/80">{a.letter}</span>
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-white/85">
                      <QuestionRichText text={a.text} />
                      {a.file && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.file} alt="" className="mt-1 max-h-40 rounded" />
                      )}
                    </span>
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
