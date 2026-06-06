'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Download,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  XCircle,
} from 'lucide-react';

interface PrintedExam {
  id: string;
  title: string;
  scheduled_simulado_id?: string | null;
}

interface SubjectResult {
  correct: number;
  total: number;
  percentage: number;
}

interface Submission {
  id: string;
  student_id?: string | null;
  external_name?: string | null;
  student_name?: string | null;
  score: number | null;
  total_questions: number | null;
  percentage?: number | null;
  graded_at: string;
  results_by_subject?: Record<string, SubjectResult> | null;
}

interface RankingEntry {
  student_id: string;
  full_name?: string | null;
  score: number | null;
  total_questions: number | null;
  score_pct?: number | null;
  completed_at?: string | null;
  results_by_subject?: Record<string, SubjectResult> | null;
}

interface Participant {
  id: string;
  source: 'printed' | 'online';
  student_id?: string | null;
  external_name?: string | null;
  student_name?: string | null;
  score: number | null;
  total_questions: number | null;
  percentage?: number | null;
  graded_at?: string | null;
  results_by_subject?: Record<string, SubjectResult> | null;
}

function formatDateBR(iso?: string | null) {
  if (!iso) return 'Data indisponivel';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function resolvePercentage(participant: Participant) {
  if (typeof participant.percentage === 'number') return participant.percentage;
  const score = participant.score ?? 0;
  const total = participant.total_questions ?? 0;
  return total > 0 ? roundOne((score / total) * 100) : 0;
}

function CountUp({
  value,
  suffix = '',
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const motionValue = useMotionValue(0);
  const text = useTransform(motionValue, (latest) => `${latest.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span>{text}</motion.span>;
}

function scoreTone(percentage: number) {
  if (percentage >= 70) return 'bg-emerald-500';
  if (percentage >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function PrintedExamResultsPage() {
  const { slug, scheduled_id: scheduledId } = useParams<{ slug: string; scheduled_id: string }>();
  const router = useRouter();

  const [printedExam, setPrintedExam] = useState<PrintedExam | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
    if (!slug || !scheduledId) return;
    void loadResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, scheduledId]);

  async function loadResults() {
    setLoading(true);
    setError(null);
    try {
      const examsRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams?scheduled_simulado_id=${scheduledId}`);
      if (!examsRes.ok) {
        const data = await examsRes.json().catch(() => ({}));
        setError(data.error ?? 'Nao foi possivel carregar a prova impressa.');
        return;
      }

      const examsData = await examsRes.json();
      const exam: PrintedExam | null = (examsData.printed_exams ?? [])[0] ?? null;
      setPrintedExam(exam);

      let printedParticipants: Participant[] = [];

      if (exam) {
        const submissionsRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams/${exam.id}/results`);
        if (!submissionsRes.ok) {
          const data = await submissionsRes.json().catch(() => ({}));
          setError(data.error ?? 'Nao foi possivel carregar os resultados.');
          return;
        }

        const submissionsData = await submissionsRes.json();
        printedParticipants = (submissionsData.submissions ?? []).map((submission: Submission) => ({
          ...submission,
          source: 'printed' as const,
        }));
      }

      const rankingRes = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${scheduledId}/ranking`);
      if (!rankingRes.ok) {
        const data = await rankingRes.json().catch(() => ({}));
        setError(data.error ?? 'Nao foi possivel carregar os resultados online.');
        return;
      }

      const rankingData = await rankingRes.json();
      const onlineParticipants: Participant[] = (rankingData.ranking ?? []).map((entry: RankingEntry) => ({
        id: `online-${entry.student_id}`,
        source: 'online',
        student_id: entry.student_id,
        student_name: entry.full_name,
        score: entry.score,
        total_questions: entry.total_questions,
        percentage: entry.score_pct,
        graded_at: entry.completed_at,
        results_by_subject: entry.results_by_subject ?? {},
      }));

      setParticipants([...printedParticipants, ...onlineParticipants]);
    } catch {
      setError('Erro de conexao. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function downloadExternalReport(participant: Participant) {
    setDownloadingId(participant.id);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/exam-results/${participant.id}/relatorio.pdf`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Nao foi possivel gerar o relatorio PDF.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${(participant.student_name ?? 'aluno').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  const stats = useMemo(() => {
    const total = participants.length;
    const ranked = participants.map((participant) => ({
      participant,
      percentage: resolvePercentage(participant),
    }));
    const average = total > 0
      ? roundOne(ranked.reduce((sum, item) => sum + item.percentage, 0) / total)
      : 0;
    const best = ranked.length > 0
      ? ranked.reduce((acc, item) => (item.percentage > acc.percentage ? item : acc), ranked[0])
      : null;
    const worst = ranked.length > 0
      ? ranked.reduce((acc, item) => (item.percentage < acc.percentage ? item : acc), ranked[0])
      : null;

    return { total, average, best, worst };
  }, [participants]);

  const latestGradedAt = participants
    .map((participant) => participant.graded_at)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0];

  return (
    <PartnerLayout>
      <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-24 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
        <div className="mb-6 flex items-start gap-3">
          <button
            type="button"
            onClick={() => router.push(`/partners/${slug}/simulados`)}
            className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-primary)]">
                Resultados do Simulado
              </p>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                Presencial + Online
              </span>
            </div>
            <h1 className="truncate text-xl font-extrabold text-slate-900 dark:text-white">
              {printedExam?.title ?? 'Correcoes lancadas'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {latestGradedAt ? `Ultima correcao em ${formatDateBR(latestGradedAt)}` : 'Sem correcoes lancadas'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        ) : error ? (
          <div className="max-w-lg rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          </div>
        ) : participants.length === 0 ? (
          <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-900 sm:p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ClipboardList className="h-8 w-8" />
            </div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              Nenhuma correcao lancada ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use o botao de correcao para lancar os resultados.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Participantes',
                  value: stats.total,
                  suffix: '',
                  decimals: 0,
                  sub: 'participantes listados',
                  Icon: Users,
                },
                {
                  label: 'Media geral',
                  value: stats.average,
                  suffix: '%',
                  decimals: 1,
                  sub: 'aproveitamento medio',
                  Icon: BarChart3,
                },
                {
                  label: 'Melhor desempenho',
                  value: stats.best?.percentage ?? 0,
                  suffix: '%',
                  decimals: 1,
                  sub: stats.best?.participant.student_name ?? 'Sem aluno',
                  Icon: TrendingUp,
                },
                {
                  label: 'Pior desempenho',
                  value: stats.worst?.percentage ?? 0,
                  suffix: '%',
                  decimals: 1,
                  sub: stats.worst?.participant.student_name ?? 'Sem aluno',
                  Icon: TrendingDown,
                },
              ].map(({ label, value, suffix, decimals, sub, Icon }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                  className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {label}
                    </p>
                    <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
                  </div>
                  <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                    <CountUp value={value} suffix={suffix} decimals={decimals} />
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {sub}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="max-w-4xl space-y-3">
              {participants.map((participant, index) => {
                const score = participant.score ?? 0;
                const total = participant.total_questions ?? 0;
                const percentage = resolvePercentage(participant);
                const subjectEntries = Object.entries(participant.results_by_subject ?? {});
                const isPrinted = participant.source === 'printed';
                return (
                  <motion.article
                    key={participant.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.35) }}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                            {isPrinted && !participant.student_id ? <Award className="h-4 w-4" /> : <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                                {participant.student_name ?? 'Aluno sem nome'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {isPrinted ? 'Corrigido em' : 'Finalizado em'} {formatDateBR(participant.graded_at)}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            isPrinted
                              ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                          }`}>
                            {isPrinted ? 'Correção Presencial' : 'Online'}
                          </span>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                            {score}/{total}
                          </p>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {percentage}% de acerto
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            className={`h-full rounded-full ${scoreTone(percentage)}`}
                          />
                        </div>
                      </div>

                      {subjectEntries.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {subjectEntries.map(([subject, result]) => (
                            <div key={subject} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{subject}</p>
                                <p className="text-xs font-black tabular-nums text-slate-900 dark:text-white">{result.percentage}%</p>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.max(0, Math.min(100, result.percentage))}%` }}
                                  transition={{ duration: 0.6, ease: 'easeOut' }}
                                  className={`h-full rounded-full ${scoreTone(result.percentage)}`}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {result.correct}/{result.total} acertos
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void downloadExternalReport(participant)}
                          disabled={downloadingId === participant.id}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {downloadingId === participant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          Gerar Relatorio PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/partners/${slug}/exam-results/${participant.id}`)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                          Ver Detalhe <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push(`/partners/${slug}/simulados/${scheduledId}/corrigir`)}
          className="fixed bottom-5 right-5 z-40 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Plus className="h-4 w-4" />
          Nova Correcao
        </button>
      </div>
    </PartnerLayout>
  );
}
