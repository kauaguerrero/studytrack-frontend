'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { formatScientificText } from '@/lib/scientific-text';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  ArrowLeft,
  Flag,
  CheckCircle2,
  Loader2,
  User,
  FileQuestion,
  Calendar,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// --- TIPAGEM ---
interface AlternativeInfo {
  letter: string;
  text: string;
  image?: string;
  isCorrect?: boolean;
}

interface QuestionFull {
  id: string;
  external_id?: string;
  exam_year?: number;
  subject?: string;
  discipline?: string;
  difficulty?: string;
  title?: string;
  context?: string;
  statement?: string;
  alternatives_intro?: string;
  alternatives: AlternativeInfo[];
  correct_alternative?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
  ai_reasoning?: { thought?: string };
  is_verified?: boolean;
}

interface ReporterInfo {
  id: string;
  full_name?: string;
  email?: string;
}

interface ResolverInfo {
  id: string;
  full_name?: string;
  email?: string;
}

interface QuestionReportRow {
  id: string;
  question_id: string;
  user_id: string;
  error_category: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolver: ResolverInfo | null;
  question: QuestionFull | null;
  reporter: ReporterInfo;
}

const ERROR_CATEGORY_LABELS: Record<string, string> = {
  estrutural: 'Formatação / Estrutura',
  conteudo: 'Erro no enunciado',
  resposta: 'Resposta incorreta',
  outro: 'Outro',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<QuestionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão inválida. Faça login novamente.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${apiUrl}/api/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.status === 401 || res.status === 403) {
        toast.error('Acesso negado. Apenas administradores.');
        return;
      }
      if (!res.ok) {
        throw new Error('Falha ao carregar reports');
      }

      const data = (await res.json()) as { data: QuestionReportRow[]; total: number };
      setReports(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error(err);
      void reportError("AdminReportsError", String(err));
      toast.error('Erro ao carregar reports.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supabase.auth]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolve = async (reportId: string) => {
    setProcessingId(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão inválida.');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${apiUrl}/api/admin/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const result = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok) {
        toast.error(result.error ?? 'Falha ao marcar como resolvido.');
        return;
      }

      toast.success('Report marcado como resolvido.');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      console.error(err);
      void reportError("AdminReportsError", String(err));
      toast.error('Erro ao processar.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        {/* --- HEADER & TOOLBAR --- */}
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
                <Flag className="w-6 h-6 text-amber-500" />
                Reports de Questões
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {total} report(s) no filtro atual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
              <SelectTrigger className="w-[160px] bg-white h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="reviewing">Em revisão</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {/* --- KANBAN LIST --- */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <Card className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <CardHeader className="border-b border-slate-100 p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Nenhum report no filtro</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">
                {statusFilter === 'pending' || statusFilter === 'reviewing'
                  ? 'Não há reports pendentes no momento.'
                  : 'Altere o filtro de status para ver outros reports.'}
              </p>
              <Button onClick={fetchReports} variant="outline" className="mt-6 border-slate-300">
                Atualizar
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const isExpanded = expandedId === report.id;
                const q = report.question;
                return (
                  <Card
                    key={report.id}
                    className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors"
                  >
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              report.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }
                          >
                            {report.status === 'pending'
                              ? 'Pendente'
                              : report.status === 'reviewing'
                                ? 'Em revisão'
                                : 'Resolvido'}
                          </Badge>
                          {report.status === 'resolved' && report.resolved_at && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              Resolvido em{' '}
                              {new Date(report.resolved_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {report.resolver?.full_name && (
                                <> por <strong>{report.resolver.full_name}</strong></>
                              )}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {ERROR_CATEGORY_LABELS[report.error_category] ?? report.error_category}
                          </Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(report.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-600"
                            onClick={() => setExpandedId(isExpanded ? null : report.id)}
                          >
                            {isExpanded ? (
                              <><ChevronUp className="h-4 w-4 mr-1" /> Ocultar questão</>
                            ) : (
                              <><ChevronDown className="h-4 w-4 mr-1" /> Ver questão</>
                            )}
                          </Button>
                          {report.status !== 'resolved' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                              onClick={() => handleResolve(report.id)}
                              disabled={processingId === report.id}
                            >
                              {processingId === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                  Marcar resolvido
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      {report.description && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Erro relatado</p>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {report.description}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                          <FileQuestion className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Questão</p>
                            {q ? (
                              <>
                                <p className="text-sm font-medium text-slate-800">
                                  {q.subject ?? '—'} {q.exam_year != null && `(${q.exam_year})`}
                                </p>
                                <p className="text-xs text-slate-500 font-mono">
                                  {q.external_id ?? report.question_id?.slice(0, 8)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm text-amber-700 flex items-center gap-1">
                                <AlertCircle size={14} /> Questão removida ou indisponível
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Quem reportou</p>
                            <p className="text-sm font-medium text-slate-800">
                              {report.reporter?.full_name ?? report.reporter?.email ?? '—'}
                            </p>
                            {report.reporter?.email && (
                              <p className="text-xs text-slate-500">{report.reporter.email}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Conteúdo completo da questão (igual curadoria) */}
                      {isExpanded && q && (
                        <div className="mt-6 pt-6 border-t border-slate-200 space-y-6 bg-slate-50/50 rounded-xl p-6">
                          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={16} /> Conteúdo da questão
                          </h4>
                          {q.context && (
                            <div className="relative pl-5 border-l-4 border-slate-200 py-1">
                              <div className="prose prose-slate max-w-none text-slate-600 italic text-sm leading-relaxed">
                                <ReactMarkdown>{formatScientificText(q.context)}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          {(q.title || q.alternatives_intro) && (
                            <div className="prose prose-slate max-w-none text-slate-800 text-sm font-medium leading-relaxed">
                              {q.title && <h5 className="text-base font-bold mb-2">{q.title}</h5>}
                              <ReactMarkdown>{formatScientificText(q.alternatives_intro ?? '')}</ReactMarkdown>
                            </div>
                          )}
                          {q.images && q.images.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                              {q.images.map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Apoio ${i + 1}`}
                                  className="h-40 w-auto rounded-lg border border-slate-200 object-contain bg-white"
                                />
                              ))}
                            </div>
                          )}
                          {q.alternatives && q.alternatives.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase">Alternativas</p>
                              {q.alternatives.map((alt) => {
                                const isCorrect = alt.letter === q.correct_alternative;
                                return (
                                  <div
                                    key={alt.letter}
                                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <span className="font-bold w-6">{alt.letter}.</span>
                                    <span className={isCorrect ? 'text-emerald-800 font-medium' : 'text-slate-700'}>
                                      {alt.text ? formatScientificText(alt.text) : '(imagem)'}
                                    </span>
                                    {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {q.ai_reasoning?.thought && (
                            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <Bot size={14} className="text-purple-600" />
                                <span className="text-xs font-bold text-purple-800 uppercase">Raciocínio / Comentário</span>
                              </div>
                              <p className="text-sm text-purple-900 leading-relaxed italic">
                                {q.ai_reasoning.thought}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
