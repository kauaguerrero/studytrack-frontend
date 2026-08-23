'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Flag, CheckCircle2, Clock, AlertCircle, Sparkles, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { useReportNotification } from '@/contexts/ReportNotificationContext';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface MyReport {
  id: string;
  question_id: string;
  error_category: string;
  admin_comment: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  question: {
    subject?: string;
    discipline?: string;
    exam_year?: number;
    external_id?: string;
  } | null;
}

// ─── Badge de status ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-2.5 py-1 rounded-full">
        <CheckCircle2 className="h-3.5 w-3.5" /> Resolvido
      </span>
    );
  }
  if (status === 'reviewing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-full">
        <Clock className="h-3.5 w-3.5" /> Em revisão
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 px-2.5 py-1 rounded-full">
      <AlertCircle className="h-3.5 w-3.5" /> Pendente
    </span>
  );
}

// ─── Card de report ───────────────────────────────────────────────────────────

function ReportCard({ report, slug }: { report: MyReport; slug: string }) {
  const isResolved = report.status === 'resolved';
  const isReviewing = report.status === 'reviewing';
  const q = report.question;

  const questionLabel = [
    q?.subject,
    q?.discipline && q.discipline !== q?.subject ? q.discipline : null,
    q?.exam_year,
  ].filter(Boolean).join(' · ');

  const bankUrl = `/partners/${slug}/student/banco-de-questoes?question_id=${report.question_id}`;

  const accentColor = isResolved ? '#10b981' : isReviewing ? '#3b82f6' : '#f59e0b';

  return (
    <ElevatedCard accentColor={accentColor} className="h-full">
      <div className="p-5 space-y-4 flex flex-col h-full">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={report.status} />
          <span className="text-xs text-slate-400">
            {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Info da questão */}
        <div className="flex-1 space-y-0.5">
          {questionLabel ? (
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{questionLabel}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">Questão não encontrada</p>
          )}
          {q?.external_id && (
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{q.external_id}</p>
          )}
        </div>

        {/* Devolutiva */}
        {isResolved && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Retorno da equipe
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
              {report.admin_comment
                ? `Obrigado pelo report! ${report.admin_comment}`
                : 'Obrigado pelo report! Sua questão foi revisada e o problema foi corrigido.'}
            </p>
          </div>
        )}

        {isReviewing && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              Nossa equipe está analisando o problema que você reportou.
            </p>
          </div>
        )}

        {!isResolved && !isReviewing && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Report recebido — nossa equipe analisará em breve.
          </p>
        )}

        {/* Link banco */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={bankUrl}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver no banco de questões
          </Link>
        </div>
      </div>
    </ElevatedCard>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function MyReportsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const { refresh: refreshReportDot } = useReportNotification();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

  const fetchAndMarkSeen = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.access_token) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [reportsRes] = await Promise.all([
        fetch(`${apiUrl}/api/questions/reports`, { headers, cache: 'no-store' }),
        fetch(`${apiUrl}/api/questions/reports/mark-seen`, { method: 'POST', headers }),
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json() as { data?: MyReport[] };
        setReports(data.data ?? []);
      }

      void refreshReportDot();
    } catch { /* silencioso */ } finally {
      setLoading(false);
    }
  }, [apiUrl, refreshReportDot]);

  useEffect(() => { void fetchAndMarkSeen(); }, [fetchAndMarkSeen]);

  const resolvedCount = reports.filter((r) => r.status === 'resolved').length;
  const reviewingCount = reports.filter((r) => r.status === 'reviewing').length;
  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <ModuleGuard permKey="suporte_enabled">
      <div className="min-h-full bg-[#F4F7FA] dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-50 -m-4 md:-m-8 pb-16">
        <RevealGroup>

          {/* Hero */}
          <RevealItem className="relative px-4 pb-24 pt-8 md:px-8">
            <BrandHero>
              <div className="relative z-10 mx-auto max-w-3xl space-y-4 text-center">
                <Badge className="border-0 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
                  <Flag className="mr-2 inline-block h-4 w-4" style={{ color: HERO_ACCENT_COLOR }} />
                  Histórico
                </Badge>
                <h1 className="font-display text-3xl font-black tracking-tight text-white md:text-4xl">
                  Meus Reports
                </h1>
                <p className="text-lg text-white/60">
                  {loading
                    ? 'Carregando seus reports…'
                    : reports.length === 0
                      ? 'Nenhum report feito ainda'
                      : `${resolvedCount} resolvido${resolvedCount !== 1 ? 's' : ''} de ${reports.length} report${reports.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </BrandHero>
          </RevealItem>

          {/* Conteúdo */}
          <div className="relative z-20 mx-auto -mt-12 w-full max-w-5xl space-y-5 p-4 md:p-8">

            {/* Voltar */}
            <RevealItem>
              <Link
                href={`/partners/${slug}/student/suporte`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao suporte
              </Link>
            </RevealItem>

            {/* KPI strip */}
            {!loading && reports.length > 0 && (
              <RevealItem className="grid grid-cols-3 gap-4">
                <ElevatedCard accentColor="#f59e0b">
                  <div className="p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pendentes</p>
                    <p className="text-3xl font-black text-amber-500 mt-1">{pendingCount}</p>
                  </div>
                </ElevatedCard>
                <ElevatedCard accentColor="#3b82f6">
                  <div className="p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Em revisão</p>
                    <p className="text-3xl font-black text-blue-500 mt-1">{reviewingCount}</p>
                  </div>
                </ElevatedCard>
                <ElevatedCard accentColor="#10b981">
                  <div className="p-4 text-center">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Resolvidos</p>
                    <p className="text-3xl font-black text-emerald-500 mt-1">{resolvedCount}</p>
                  </div>
                </ElevatedCard>
              </RevealItem>
            )}

            {/* Lista */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl bg-white dark:bg-slate-800 animate-pulse border border-slate-100 dark:border-slate-700" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <ElevatedCard>
                <div className="py-16 text-center">
                  <Flag className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum report feito ainda</p>
                  <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                    Ao encontrar um erro em alguma questão, use o botão de report. Sua contribuição ajuda todos!
                  </p>
                  <Link href={`/partners/${slug}/student/banco-de-questoes`} className="mt-5 inline-block">
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Ir ao banco de questões
                    </Button>
                  </Link>
                </div>
              </ElevatedCard>
            ) : (
              <RevealItem className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} slug={slug} />
                ))}
              </RevealItem>
            )}

            {/* Aviso pendentes */}
            {!loading && reports.some((r) => r.status === 'pending' || r.status === 'reviewing') && (
              <RevealItem>
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Reports pendentes ou em revisão serão analisados em breve. Você receberá uma notificação quando forem resolvidos.
                  </p>
                </div>
              </RevealItem>
            )}

          </div>
        </RevealGroup>
      </div>
    </ModuleGuard>
  );
}
