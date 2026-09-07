'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { MOCK_SIMULADO_PARTICIPANTS } from '../../../../../../../studytrack-tutorial-mock';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock,
  Download,
  FileText,
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

interface FailedStudent {
  id: string;
  name: string;
}

interface IndividualReportsJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalItems: number;
  completedItems: number;
  failedItems: number;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  failedStudents: FailedStudent[];
}

interface ClassReportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl: string | null;
  errorMessage: string | null;
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

// Estimativa de tempo restante do job de relatórios individuais — calculada
// de verdade a partir do progresso observado (taxa = concluidos / tempo
// decorrido desde a criacao do job), como uma barra de download real, nao
// mais um chute fixo (a estimativa antiga multiplicava "quantos faltam" por
// uma constante arbitraria de segundos/aluno — nunca se ajustava porque
// dependia so do numero de concluidos, que so mudava perto do fim do job
// antes do backend passar a reportar progresso em tempo real).
function estimateRemainingLabel(total: number, completed: number, createdAt: string | null) {
  const remaining = Math.max(0, total - completed);
  if (remaining === 0) return 'Finalizando...';
  if (completed === 0 || !createdAt) {
    return `${completed} de ${total} alunos concluídos · calculando tempo restante...`;
  }
  const elapsedSecs = (Date.now() - new Date(createdAt).getTime()) / 1000;
  const ratePerSec = elapsedSecs > 0 ? completed / elapsedSecs : 0;
  if (ratePerSec <= 0) {
    return `${completed} de ${total} alunos concluídos · calculando tempo restante...`;
  }
  const estimatedSecs = Math.max(1, Math.round(remaining / ratePerSec));
  const timeLabel = estimatedSecs < 60
    ? `~${estimatedSecs}s restantes`
    : `~${Math.ceil(estimatedSecs / 60)} min restantes`;
  return `${completed} de ${total} alunos concluídos · ${timeLabel}`;
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
  const { org } = useOrg();
  const router = useRouter();

  const [printedExam, setPrintedExam] = useState<PrintedExam | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [generatingClassReport, setGeneratingClassReport] = useState(false);
  const [classReportElapsedSecs, setClassReportElapsedSecs] = useState(0);
  const [classReportJob, setClassReportJob] = useState<ClassReportJob | null>(null);
  const [creatingIndividualJob, setCreatingIndividualJob] = useState(false);
  const [individualJob, setIndividualJob] = useState<IndividualReportsJob | null>(null);
  const [retryJob, setRetryJob] = useState<IndividualReportsJob | null>(null);

  // Relatorio geral da turma e uma unica requisicao sincrona (nao um job
  // com progresso real como o individual) — o unico numero honesto que da
  // pra mostrar enquanto espera e o tempo REAL decorrido (sempre exato,
  // por definicao), nunca uma estimativa de "quanto falta" que a gente nao
  // tem como calcular sem um job de verdade por tras.
  useEffect(() => {
    if (!generatingClassReport) return;
    setClassReportElapsedSecs(0);
    const interval = window.setInterval(() => {
      setClassReportElapsedSecs((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [generatingClassReport]);

  async function fetchWithAuth(url: string, init?: RequestInit) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    return fetch(`${api}${url}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
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

    if (org.is_mock) {
      setParticipants(MOCK_SIMULADO_PARTICIPANTS as unknown as Participant[]);
      setLoading(false);
      return;
    }
    try {
      const examsRes = await fetchWithAuth(`/api/partners/${slug}/printed-exams?scheduled_simulado_id=${scheduledId}`);
      if (!examsRes.ok) {
        const data = await examsRes.json().catch(() => ({}));
        setError(data.error ?? 'Não foi possível carregar a prova impressa.');
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
          setError(data.error ?? 'Não foi possível carregar os resultados.');
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
        setError(data.error ?? 'Não foi possível carregar os resultados online.');
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
      setError('Erro de conexão. Tente novamente.');
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
        setError(data.error ?? 'Não foi possível gerar o relatório PDF.');
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

  // Relatório geral da turma virou um job assíncrono (ver
  // create_class_report_job/run_class_report_job no backend) — o POST só
  // cria o job e devolve o job_id na hora; quem acompanha o progresso e
  // baixa o PDF pronto é o polling logo abaixo (usePollClassReportJob),
  // mesmo padrão já usado pelos relatórios individuais. Isso tira o
  // Chromium do ciclo de request síncrono, que segurava a única thread do
  // gunicorn em produção (causa dos erros de conexão sob carga).
  async function downloadClassReport() {
    setGeneratingClassReport(true);
    setError(null);
    setClassReportJob(null);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${scheduledId}/report.pdf`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.job_id) {
        setError(data.error ?? 'Não foi possível gerar o relatório geral da turma.');
        setGeneratingClassReport(false);
        return;
      }
      setClassReportJob({ jobId: data.job_id, status: data.status ?? 'pending', downloadUrl: null, errorMessage: null });
    } catch {
      setError('Erro de conexão ao gerar o relatório geral da turma.');
      setGeneratingClassReport(false);
    }
  }

  function usePollClassReportJob(job: ClassReportJob | null, setJob: (j: ClassReportJob) => void) {
    useEffect(() => {
      if (!job || job.status === 'completed' || job.status === 'failed') return;
      const interval = window.setInterval(async () => {
        try {
          const res = await fetchWithAuth(
            `/api/partners/${slug}/scheduled-simulados/${scheduledId}/report.pdf/${job.jobId}`
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setJob({
              jobId: data.job_id,
              status: data.status,
              downloadUrl: data.download_url ?? null,
              errorMessage: data.error_message ?? null,
            });
          }
        } catch {
          // Polling silencioso — a próxima tentativa cobre uma falha pontual.
        }
      }, 2000);
      return () => window.clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.jobId, job?.status, slug, scheduledId]);
  }

  usePollClassReportJob(classReportJob, setClassReportJob);

  useEffect(() => {
    if (!classReportJob) return;
    if (classReportJob.status === 'completed' || classReportJob.status === 'failed') {
      setGeneratingClassReport(false);
      if (classReportJob.status === 'failed') {
        setError(classReportJob.errorMessage ?? 'Não foi possível gerar o relatório geral da turma.');
      }
    }
  }, [classReportJob]);

  async function createIndividualReportsJob(studentIds?: string[]): Promise<IndividualReportsJob | null> {
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/partners/${slug}/scheduled-simulados/${scheduledId}/individual-reports`, {
        method: 'POST',
        body: JSON.stringify(studentIds ? { student_ids: studentIds } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível iniciar a geração dos relatórios individuais.');
        return null;
      }
      return {
        jobId: data.job_id,
        status: data.status ?? 'pending',
        totalItems: 0,
        completedItems: 0,
        failedItems: 0,
        downloadUrl: null,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        failedStudents: [],
      };
    } catch {
      setError('Erro de conexão ao iniciar a geração dos relatórios individuais.');
      return null;
    }
  }

  async function startIndividualReportsJob() {
    setCreatingIndividualJob(true);
    try {
      const job = await createIndividualReportsJob();
      if (job) {
        setIndividualJob(job);
        setRetryJob(null);
      }
    } finally {
      setCreatingIndividualJob(false);
    }
  }

  // "Tentar novamente" só para os alunos que esgotaram as tentativas de
  // renderizacao no job principal (ver run_individual_reports_job — esses
  // alunos ficam de fora do ZIP original, nunca com uma versao degradada
  // silenciosa). Roda como um job A PARTE (retryJob) pra nao sobrescrever o
  // link de download do ZIP que ja terminou com sucesso pros demais alunos.
  async function retryFailedStudents() {
    if (!individualJob?.failedStudents.length) return;
    setCreatingIndividualJob(true);
    try {
      const job = await createIndividualReportsJob(individualJob.failedStudents.map((s) => s.id));
      if (job) setRetryJob(job);
    } finally {
      setCreatingIndividualJob(false);
    }
  }

  // Polling de progresso dos jobs de relatórios individuais (principal e,
  // se houver, o de nova tentativa) — para quando o job chega em
  // completed/failed.
  function usePollIndividualJob(job: IndividualReportsJob | null, setJob: (j: IndividualReportsJob) => void) {
    useEffect(() => {
      if (!job || job.status === 'completed' || job.status === 'failed') return;
      const interval = window.setInterval(async () => {
        try {
          const res = await fetchWithAuth(
            `/api/partners/${slug}/scheduled-simulados/${scheduledId}/individual-reports/${job.jobId}`
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setJob({
              jobId: data.job_id,
              status: data.status,
              totalItems: data.total_items ?? 0,
              completedItems: data.completed_items ?? 0,
              failedItems: data.failed_items ?? 0,
              downloadUrl: data.download_url ?? null,
              errorMessage: data.error_message ?? null,
              createdAt: data.created_at ?? job.createdAt,
              failedStudents: data.failed_students ?? [],
            });
          }
        } catch {
          // Polling silencioso — a próxima tentativa cobre uma falha pontual.
        }
      }, 4000);
      return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.jobId, job?.status, slug, scheduledId]);
  }

  usePollIndividualJob(individualJob, setIndividualJob);
  usePollIndividualJob(retryJob, setRetryJob);

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
              {printedExam?.title ?? 'Correções lançadas'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {latestGradedAt ? `Última correção em ${formatDateBR(latestGradedAt)}` : 'Sem correções lançadas'}
            </p>
          </div>
        </div>

        {!org.is_mock && !loading && !error && participants.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void downloadClassReport()}
              disabled={generatingClassReport}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {generatingClassReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Gerar relatório geral da turma
            </button>

            <button
              type="button"
              onClick={() => void startIndividualReportsJob()}
              disabled={creatingIndividualJob || (individualJob != null && individualJob.status !== 'completed' && individualJob.status !== 'failed')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {creatingIndividualJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Gerar relatórios individuais (ZIP)
            </button>
          </div>
        )}

        {generatingClassReport && (
          <div className="mb-6 max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--brand-primary)]" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Montando o relatório geral da turma...{' '}
                <span className="font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {classReportElapsedSecs}s decorridos
                </span>
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                  style={{ animationDelay: `${i * 90 + 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {classReportJob && classReportJob.status === 'completed' && (
          <div className="mb-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Relatório geral da turma pronto</p>
              </div>
              {classReportJob.downloadUrl && (
                <a
                  href={classReportJob.downloadUrl}
                  onClick={() => setClassReportJob(null)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </a>
              )}
            </div>
          </div>
        )}

        {individualJob && (
          <div className="mb-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            {individualJob.status === 'failed' ? (
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Falha ao gerar os relatórios individuais</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{individualJob.errorMessage ?? 'Erro desconhecido.'}</p>
                </div>
              </div>
            ) : individualJob.status === 'completed' ? (
              <div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Relatórios individuais prontos ({individualJob.completedItems}/{individualJob.totalItems} alunos)
                      </p>
                    </div>
                  </div>
                  {individualJob.downloadUrl && (
                    <a
                      href={individualJob.downloadUrl}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      <Download className="h-4 w-4" />
                      Baixar ZIP
                    </a>
                  )}
                </div>
                {individualJob.failedItems > 0 && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {individualJob.errorMessage
                          ?? `${individualJob.failedItems} relatório(s) não puderam ser gerados e não entraram no ZIP.`}
                      </span>
                    </div>
                    {individualJob.failedStudents.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void retryFailedStudents()}
                        disabled={creatingIndividualJob || (retryJob != null && retryJob.status !== 'completed' && retryJob.status !== 'failed')}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Tentar novamente só p/ esses alunos
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--brand-primary)]" />
                  <div className="min-w-0">
                    <p className="text-base font-black tabular-nums text-slate-900 dark:text-white">
                      {individualJob.totalItems > 0
                        ? `Gerando relatórios ${individualJob.completedItems}/${individualJob.totalItems}`
                        : 'Preparando os dados de cada aluno...'}
                    </p>
                    {individualJob.totalItems > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {estimateRemainingLabel(individualJob.totalItems, individualJob.completedItems, individualJob.createdAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Isso pode levar alguns minutos numa turma grande. Fique nesta tela ate concluir — se sair ou atualizar a pagina, voce perde o acompanhamento e precisa gerar de novo.</span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {individualJob.totalItems > 0 ? (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(4, Math.min(100, Math.round((individualJob.completedItems / individualJob.totalItems) * 100)))}%`,
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    />
                  ) : (
                    <motion.div
                      className="h-full w-1/3 rounded-full"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                      animate={{ x: ['-100%', '250%'] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                  {Array.from({ length: Math.max(individualJob.totalItems, 6) }).map((_, i) => {
                    const isDone = i < individualJob.completedItems;
                    return (
                      <div
                        key={i}
                        className={`flex h-7 items-center justify-center rounded-md border transition-colors ${
                          isDone
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'animate-pulse border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                        style={isDone ? undefined : { animationDelay: `${(i % 6) * 100}ms` }}
                      >
                        {isDone && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {retryJob && (
          <div className="mb-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Nova tentativa (só os alunos que falharam)</p>
            {retryJob.status === 'failed' ? (
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400">{retryJob.errorMessage ?? 'Erro desconhecido.'}</p>
              </div>
            ) : retryJob.status === 'completed' ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {retryJob.completedItems}/{retryJob.totalItems} relatório(s) gerados nesta nova tentativa
                  </p>
                </div>
                {retryJob.downloadUrl && (
                  <a
                    href={retryJob.downloadUrl}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    <Download className="h-4 w-4" />
                    Baixar ZIP (só estes alunos)
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--brand-primary)]" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {retryJob.totalItems > 0
                    ? estimateRemainingLabel(retryJob.totalItems, retryJob.completedItems, retryJob.createdAt)
                    : 'Preparando...'}
                </p>
              </div>
            )}
          </div>
        )}

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
              Nenhuma correção lançada ainda.
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Use o botão de correção para lançar os resultados.
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
                  label: 'Média geral',
                  value: stats.average,
                  suffix: '%',
                  decimals: 1,
                  sub: 'aproveitamento médio',
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
                const isExternal = isPrinted && !participant.student_id;
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
                        {isExternal && (
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
                            Gerar Relatório PDF
                          </button>
                        )}
                        {isPrinted && (
                          <button
                            type="button"
                            onClick={() => router.push(`/partners/${slug}/exam-results/${participant.id}`)}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                          >
                            Ver Detalhe <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        )}

        {/* A bottom nav do PartnerLayout é fixed bottom-0 z-40 com min-h-[56px]
            e só some em md+. Com bottom-5 o FAB caía inteiro atrás dela e, no
            mesmo z-index, a nav (posterior no DOM) ganhava o empilhamento. */}
        <button
          type="button"
          onClick={() => router.push(`/partners/${slug}/simulados/${scheduledId}/corrigir`)}
          className="fixed right-5 z-40 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Plus className="h-4 w-4" />
          Nova Correção
        </button>
      </div>
    </PartnerLayout>
  );
}
