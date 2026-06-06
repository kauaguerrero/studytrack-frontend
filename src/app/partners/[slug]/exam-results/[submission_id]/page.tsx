'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { useOrg } from '@/contexts/OrgContext';
import {
  ChevronLeft, CheckCircle2, XCircle, MinusCircle,
  BarChart2, User, CalendarDays, BookOpen,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface SubjectResult { correct: number; total: number; percentage: number }

interface Submission {
  id: string;
  exam_title?: string;
  student_name?: string | null;
  graded_by_name?: string | null;
  graded_at: string;
  score: number;
  total_questions: number;
  percentage: number;
  answers: Record<string, string | null>;
  correct_answers?: Record<string, string | null>;
  results_by_subject?: Record<string, SubjectResult>;
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function scoreColor(pct: number) {
  if (pct >= 65) return '#22c55e';
  if (pct >= 45) return '#f59e0b';
  return '#ef4444';
}

const RING_CIRC = 2 * Math.PI * 48;

// ── Component ──────────────────────────────────────────────────────────────────
export default function ExamResultPage() {
  const { slug, submission_id } = useParams<{ slug: string; submission_id: string }>();
  const router = useRouter();
  const { org } = useOrg();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  async function fetchWithAuth(url: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return fetch(`${api}${url}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  }

  useEffect(() => {
    if (!submission_id) return;
    void loadSubmission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission_id]);

  async function loadSubmission() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/exam-results/${submission_id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Resultado não encontrado.');
        return;
      }
      const data = await res.json();
      setSubmission(data.submission);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Score ring animation
  useEffect(() => {
    if (!submission) return;
    const target = submission.percentage;
    let start: number | null = null;
    const dur = 1000;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [submission]);

  if (loading) {
    return (
      <PartnerLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-primary)]" />
        </div>
      </PartnerLayout>
    );
  }

  if (error || !submission) {
    return (
      <PartnerLayout>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{error ?? 'Resultado não encontrado.'}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-xs font-bold text-[var(--brand-primary)] hover:underline"
          >
            Voltar
          </button>
        </div>
      </PartnerLayout>
    );
  }

  const pct = submission.percentage;
  const ringColor = scoreColor(pct);
  const offset = RING_CIRC * (1 - animatedScore / 100);
  const correctAnswers = submission.correct_answers ?? {};
  const userAnswers = submission.answers ?? {};
  const questionNumbers = Object.keys(correctAnswers).sort((a, b) => Number(a) - Number(b));
  const hasSubjectBreakdown = submission.results_by_subject && Object.keys(submission.results_by_subject).length > 0;

  return (
    <PartnerLayout>
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
              Resultado da Prova Impressa
            </p>
            <h1 className="break-words text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
              {submission.exam_title ?? 'Resultado'}
            </h1>
          </div>
        </div>

        <div className="max-w-2xl space-y-5">

          {/* Score hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
          >
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
              {/* Ring */}
              <div className="relative shrink-0">
                <svg width="120" height="120" className="-rotate-90">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="48" fill="none"
                    stroke={ringColor} strokeWidth="8"
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tabular-nums" style={{ color: ringColor }}>
                    {animatedScore}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Acerto</span>
                </div>
              </div>

              {/* Info */}
              <div className="w-full min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <p className="break-words text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                    {submission.score}
                    <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">/{submission.total_questions}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">questões corretas</p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {submission.student_name && (
                    <p className="flex items-start justify-center gap-1.5 break-words sm:justify-start">
                      <User className="h-3.5 w-3.5" />
                      {submission.student_name}
                    </p>
                  )}
                  <p className="flex items-start justify-center gap-1.5 break-words sm:justify-start">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateBR(submission.graded_at)}
                  </p>
                  {submission.graded_by_name && (
                    <p className="flex items-start justify-center gap-1.5 break-words sm:justify-start">
                      <BookOpen className="h-3.5 w-3.5" />
                      Corrigido por {submission.graded_by_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Breakdown por matéria */}
          {hasSubjectBreakdown && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[var(--brand-primary)]" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Desempenho por Matéria</p>
              </div>
              <div className="space-y-2.5">
                {Object.entries(submission.results_by_subject!).map(([subj, res]) => (
                  <div key={subj}>
                    <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">{subj}</span>
                      <span className="text-xs font-bold tabular-nums" style={{ color: scoreColor(res.percentage) }}>
                        {res.correct}/{res.total} · {res.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${res.percentage}%`, backgroundColor: scoreColor(res.percentage) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Lista de questões */}
          {questionNumbers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5"
            >
              <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Gabarito</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {questionNumbers.map((key) => {
                  const correct = (correctAnswers[key] ?? '').toUpperCase();
                  const user = (userAnswers[key] ?? '').toUpperCase();
                  const isCorrect = !!user && !!correct && user === correct;
                  const isBlank = !user;

                  return (
                    <div
                      key={key}
                      className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                        isBlank
                          ? 'border-slate-200 dark:border-slate-700'
                          : isCorrect
                            ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5'
                            : 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/5'
                      }`}
                    >
                      {isBlank ? (
                        <MinusCircle className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      ) : isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Q{key}</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {isBlank ? (
                            <span className="text-slate-400">—</span>
                          ) : isCorrect ? (
                            <span className="text-emerald-600 dark:text-emerald-400">{user}</span>
                          ) : (
                            <>
                              <span className="text-red-500 line-through mr-1">{user}</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{correct}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                Resposta tachada = marcada pelo aluno · Verde = correta
              </p>
            </motion.div>
          )}

        </div>
      </div>
    </PartnerLayout>
  );
}
