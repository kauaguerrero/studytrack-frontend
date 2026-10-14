'use client';

/**
 * Painel admin — Relatório de Inteligência Pedagógica mensal por organização.
 *
 * A geração roda no process group `worker` do backend (Chromium imprimindo o
 * PDF), então a tela é assíncrona por necessidade, não por estilo: pedir é
 * `POST`, e o estado real vem do polling até `completed` ou `failed`.
 *
 * Os meses são derivados no cliente a partir da data de hoje, e só meses
 * ENCERRADOS aparecem — o relatório compara o mês inteiro com o anterior, e
 * oferecer o mês corrente convidaria o gestor a ler como queda o que é apenas
 * o calendário ainda não ter terminado. O backend recusa o mês corrente de
 * todo modo; aqui ele simplesmente não é oferecido.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, Download, Loader2, RefreshCw, AlertCircle, Building2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  is_mock: boolean;
}

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ReportJob {
  job_id: string;
  org_id: string;
  period_start: string;
  status: JobStatus;
  essays_count: number | null;
  students_count: number | null;
  error_message: string | null;
  download_url: string | null;
}

const MONTH_LABELS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** Os 12 meses encerrados mais recentes, do mais novo para o mais antigo. */
function closedMonths(count = 12): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  // Começa no mês anterior ao corrente: o corrente não está encerrado.
  for (let back = 1; back <= count; back += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    months.push({
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${MONTH_LABELS[month - 1]} de ${year}`,
    });
  }
  return months;
}

const STATUS_BADGE: Record<JobStatus, { label: string; className: string }> = {
  pending: { label: 'Na fila', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  processing: { label: 'Gerando', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Pronto', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Falhou', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const POLL_INTERVAL_MS = 4000;

export default function AdminMonthlyReportsPage() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>('');

  const [jobs, setJobs] = useState<Record<string, ReportJob>>({});
  const [jobsLoading, setJobsLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const months = useMemo(() => closedMonths(), []);
  const apiUrl = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, ''),
    [],
  );

  // Um timer por job em andamento. Guardado em ref porque o cleanup tem de
  // alcançar os timers mesmo quando o componente desmonta no meio da geração.
  const pollTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) throw new Error('Sessão inválida');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  useEffect(() => () => {
    Object.values(pollTimers.current).forEach(clearTimeout);
    pollTimers.current = {};
  }, []);

  // ── Organizações ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/b2b/organizations');
        if (!res.ok) throw new Error('Falha ao carregar organizações');
        const data = await res.json();
        if (!alive) return;
        const list: OrgOption[] = (data.organizations ?? []).map((o: OrgOption) => ({
          id: o.id, name: o.name, slug: o.slug, is_mock: o.is_mock,
        }));
        setOrgs(list);
      } catch {
        if (alive) toast.error('Não foi possível carregar as organizações.');
      } finally {
        if (alive) setOrgsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── Jobs da org selecionada ───────────────────────────────────────────────
  const loadJobs = useCallback(async (targetOrg: string) => {
    setJobsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${apiUrl}/api/admin/org-monthly-reports?org_id=${encodeURIComponent(targetOrg)}`,
        { headers },
      );
      if (res.status === 401 || res.status === 403) {
        toast.error('Acesso negado.');
        return;
      }
      if (!res.ok) throw new Error('Falha ao carregar relatórios');
      const data = await res.json();
      const byMonth: Record<string, ReportJob> = {};
      for (const job of (data.items ?? []) as ReportJob[]) {
        byMonth[String(job.period_start).slice(0, 7)] = job;
      }
      setJobs(byMonth);
      // Retoma o acompanhamento de qualquer geração que já estava correndo
      // quando a tela abriu (recarregar a página não deve perder o job).
      Object.values(byMonth).forEach((job) => {
        if (job.status === 'pending' || job.status === 'processing') schedulePoll(job);
      });
    } catch {
      toast.error('Não foi possível carregar os relatórios desta organização.');
    } finally {
      setJobsLoading(false);
    }
    // schedulePoll é estável (useCallback sem deps mutáveis além de apiUrl/headers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, getAuthHeaders]);

  useEffect(() => {
    if (!orgId) {
      setJobs({});
      return;
    }
    Object.values(pollTimers.current).forEach(clearTimeout);
    pollTimers.current = {};
    loadJobs(orgId);
  }, [orgId, loadJobs]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const pollOnce = useCallback(async (job: ReportJob) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/api/admin/org-monthly-reports/${job.job_id}`, { headers });
      if (!res.ok) return;
      const fresh = await res.json() as ReportJob;
      const monthKey = String(fresh.period_start).slice(0, 7);
      setJobs((prev) => ({ ...prev, [monthKey]: fresh }));

      if (fresh.status === 'pending' || fresh.status === 'processing') {
        schedulePoll(fresh);
        return;
      }
      delete pollTimers.current[fresh.job_id];
      if (fresh.status === 'completed') {
        toast.success('Relatório pronto para download.');
      } else {
        toast.error(fresh.error_message || 'A geração do relatório falhou.');
      }
    } catch {
      // Falha de rede não encerra o acompanhamento: tenta de novo no próximo ciclo.
      schedulePoll(job);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl, getAuthHeaders]);

  function schedulePoll(job: ReportJob) {
    clearTimeout(pollTimers.current[job.job_id]);
    pollTimers.current[job.job_id] = setTimeout(() => pollOnce(job), POLL_INTERVAL_MS);
  }

  // ── Ações ─────────────────────────────────────────────────────────────────
  async function handleGenerate(monthKey: string) {
    if (!orgId) return;
    setRequesting(monthKey);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/api/admin/org-monthly-reports`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, month: monthKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Não foi possível iniciar a geração.');
        return;
      }
      const job: ReportJob = {
        job_id: data.job_id,
        org_id: orgId,
        period_start: `${monthKey}-01`,
        status: data.status as JobStatus,
        essays_count: null,
        students_count: null,
        error_message: null,
        download_url: null,
      };
      setJobs((prev) => ({ ...prev, [monthKey]: job }));
      schedulePoll(job);
      toast.success('Geração iniciada. O relatório leva cerca de um minuto.');
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setRequesting(null);
    }
  }

  const selectedOrg = orgs.find((o) => o.id === orgId);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/portal/admin">
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <FileText className="w-6 h-6 text-violet-500" />
                Relatório Mensal
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Inteligência Pedagógica por organização
              </p>
            </div>
          </div>

          <div className="w-full md:w-72">
            {orgsLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <Select value={orgId} onValueChange={setOrgId}>
                <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Selecione a organização" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}{org.is_mock ? ' (demo)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {!orgId ? (
          <Card className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm">
            <CardContent className="py-16 flex flex-col items-center text-center gap-3">
              <Building2 className="w-10 h-10 text-slate-300" />
              <p className="text-slate-600 font-medium">Selecione uma organização</p>
              <p className="text-sm text-slate-500 max-w-sm">
                O relatório cobre a produção de redações do mês: participação, desempenho
                por banca, competências e temas trabalhados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedOrg?.is_mock && (
              <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Esta é uma organização de demonstração — os números do relatório não
                  representam uso real.
                </span>
              </div>
            )}

            {jobsLoading ? (
              <>
                <Skeleton className="h-[72px] w-full rounded-2xl" />
                <Skeleton className="h-[72px] w-full rounded-2xl" />
                <Skeleton className="h-[72px] w-full rounded-2xl" />
              </>
            ) : (
              months.map(({ key, label }) => {
                const job = jobs[key];
                const status = job?.status;
                const running = status === 'pending' || status === 'processing';
                const isRequesting = requesting === key;
                const badge = status ? STATUS_BADGE[status] : null;

                return (
                  <Card
                    key={key}
                    className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors"
                  >
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 capitalize">{label}</span>
                          {badge && (
                            <Badge variant="outline" className={`${badge.className} text-xs`}>
                              {badge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {status === 'completed' && job.essays_count !== null
                            ? `${job.essays_count} redação(ões) · ${job.students_count} aluno(s)`
                            : status === 'failed'
                              ? (job.error_message || 'Falha na geração.')
                              : running
                                ? 'Gerando o PDF — leva cerca de um minuto.'
                                : 'Ainda não gerado.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {status === 'completed' && job.download_url && (
                          <a href={job.download_url} target="_blank" rel="noopener noreferrer">
                            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
                              <Download className="w-4 h-4 mr-2" />
                              Baixar
                            </Button>
                          </a>
                        )}

                        <Button
                          variant={status === 'completed' ? 'outline' : 'default'}
                          disabled={running || isRequesting}
                          onClick={() => handleGenerate(key)}
                          className={
                            status === 'completed'
                              ? 'rounded-xl border-slate-200'
                              : 'rounded-xl bg-violet-600 hover:bg-violet-700 text-white'
                          }
                        >
                          {running || isRequesting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Gerando
                            </>
                          ) : status === 'completed' || status === 'failed' ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Gerar de novo
                            </>
                          ) : (
                            'Gerar'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
