'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
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
  Code2,
  MessageSquare,
  Send,
  TrendingUp,
  Clock,
  BarChart3,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  role?: string;
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
  technical_context?: Record<string, unknown> | null;
  admin_comment?: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolver: ResolverInfo | null;
  question: QuestionFull | null;
  reporter: ReporterInfo;
}

interface ReportKpis {
  total: number;
  by_status: { pending: number; reviewing: number; resolved: number };
  by_category: { estrutural: number; conteudo: number; resposta: number; outro: number };
  avg_resolution_hours: number | null;
  resolved_this_week: number;
  daily_series: { date: string; count: number }[];
}

const ERROR_CATEGORY_LABELS: Record<string, string> = {
  estrutural: 'Formatação / Estrutura',
  conteudo: 'Erro no enunciado',
  resposta: 'Resposta incorreta',
  outro: 'Outro',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  founder: 'Gestor',
  admin: 'Admin',
  associate: 'Associado',
  dev: 'Dev',
};

const DAYS_OPTIONS = [
  { label: 'Últimos 7 dias', value: '7' },
  { label: 'Últimos 30 dias', value: '30' },
  { label: 'Últimos 90 dias', value: '90' },
  { label: 'Todos', value: 'all' },
];

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({ kpis, loading }: { kpis: ReportKpis | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }
  if (!kpis) return null;

  const cards = [
    { label: 'Pendentes', value: kpis.by_status.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
    { label: 'Em Revisão', value: kpis.by_status.reviewing, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    { label: 'Resolvidos esta semana', value: kpis.resolved_this_week, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    { label: 'Total (período)', value: kpis.total, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className={`text-3xl font-black mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-200 px-5 py-3">
        <div className="flex items-center gap-1.5 mr-2">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Por categoria</span>
        </div>
        {Object.entries(ERROR_CATEGORY_LABELS).map(([key, label]) => (
          <Badge key={key} variant="secondary" className="text-xs gap-1.5">
            {label}
            <span className="font-black text-slate-700">{kpis.by_category[key as keyof typeof kpis.by_category] ?? 0}</span>
          </Badge>
        ))}
        {kpis.avg_resolution_hours !== null && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Tempo médio de resolução: <strong className="text-slate-700">{kpis.avg_resolution_hours}h</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [reports, setReports] = useState<QuestionReportRow[]>([]);
  const [kpis, setKpis] = useState<ReportKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [resolveDialogId, setResolveDialogId] = useState<string | null>(null);
  const [resolveComment, setResolveComment] = useState('');

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    if (!session?.access_token) throw new Error('Sessão inválida');
    return { Authorization: `Bearer ${session.access_token}` };
  }, []);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  const fetchKpis = useCallback(async () => {
    setKpisLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (daysFilter !== 'all') params.set('days', daysFilter);
      const res = await fetch(`${apiUrl}/api/admin/reports/kpis?${params}`, { headers });
      if (res.ok) setKpis(await res.json() as ReportKpis);
    } catch { /* silencioso */ } finally {
      setKpisLoading(false);
    }
  }, [apiUrl, daysFilter, getAuthHeaders]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (daysFilter !== 'all') params.set('days', daysFilter);

      const res = await fetch(`${apiUrl}/api/admin/reports?${params}`, { headers });
      if (res.status === 401 || res.status === 403) { toast.error('Acesso negado.'); return; }
      if (!res.ok) throw new Error('Falha ao carregar reports');

      const data = await res.json() as { data: QuestionReportRow[]; total: number };
      const rows = data.data ?? [];
      setReports(rows);
      setTotal(data.total ?? 0);
      // Pre-populate comment fields com admin_comments existentes
      const initialComments: Record<string, string> = {};
      rows.forEach((r) => { if (r.admin_comment) initialComments[r.id] = r.admin_comment; });
      setCommentValues((prev) => ({ ...initialComments, ...prev }));
    } catch (err) {
      void reportError("AdminReportsError", String(err));
      toast.error('Erro ao carregar reports.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, daysFilter, apiUrl, getAuthHeaders]);

  useEffect(() => { void fetchReports(); void fetchKpis(); }, [fetchReports, fetchKpis]);

  const handleSaveComment = async (reportId: string) => {
    const comment = (commentValues[reportId] ?? '').trim();
    if (!comment) { toast.error('Escreva um comentário antes de salvar.'); return; }
    setSavingCommentId(reportId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/api/admin/reports/${reportId}/comment`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const result = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) { toast.error(result.error ?? 'Falha ao salvar comentário.'); return; }
      toast.success('Comentário salvo.');
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, admin_comment: comment } : r));
    } catch (err) {
      void reportError("AdminReportsCommentError", String(err));
      toast.error('Erro ao salvar.');
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialogId) return;
    setProcessingId(resolveDialogId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${apiUrl}/api/admin/reports/${resolveDialogId}/resolve`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_comment: resolveComment.trim() || null }),
      });
      const result = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) { toast.error(result.error ?? 'Falha ao marcar como resolvido.'); return; }
      toast.success('Report resolvido e aluno notificado.');
      setReports((prev) => prev.filter((r) => r.id !== resolveDialogId));
      setTotal((t) => Math.max(0, t - 1));
      setResolveDialogId(null);
      setResolveComment('');
      void fetchKpis();
    } catch (err) {
      void reportError("AdminReportsError", String(err));
      toast.error('Erro ao processar.');
    } finally {
      setProcessingId(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter('pending');
    setCategoryFilter('all');
    setDaysFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || daysFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="w-full max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/portal/admin">
              <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl border-slate-200">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <Flag className="w-6 h-6 text-amber-500" />
                Reports de Questões
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">{total} report(s) no filtro atual</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { void fetchReports(); void fetchKpis(); }} disabled={loading}>
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <KpiStrip kpis={kpis} loading={kpisLoading} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
            <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="reviewing">Em revisão</SelectItem>
              <SelectItem value="resolved">Resolvidos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={loading}>
            <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="estrutural">Formatação / Estrutura</SelectItem>
              <SelectItem value="conteudo">Erro no enunciado</SelectItem>
              <SelectItem value="resposta">Resposta incorreta</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={daysFilter} onValueChange={setDaysFilter} disabled={loading}>
            <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              {DAYS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 h-9">
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Report list */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Nenhum report no filtro</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">Altere os filtros para ver outros reports.</p>
              <Button onClick={() => { void fetchReports(); }} variant="outline" className="mt-6 border-slate-300">Atualizar</Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report) => {
                const isExpanded = expandedId === report.id;
                const isTechExpanded = expandedTechId === report.id;
                const q = report.question;
                return (
                  <Card key={report.id} className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={
                            report.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : report.status === 'reviewing' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                          }>
                            {report.status === 'pending' ? 'Pendente' : report.status === 'reviewing' ? 'Em revisão' : 'Resolvido'}
                          </Badge>
                          {report.status === 'resolved' && report.resolved_at && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              Resolvido em {new Date(report.resolved_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {report.resolver?.full_name && <> por <strong>{report.resolver.full_name}</strong></>}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {ERROR_CATEGORY_LABELS[report.error_category] ?? report.error_category}
                          </Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(report.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-slate-600" onClick={() => setExpandedId(isExpanded ? null : report.id)}>
                            {isExpanded ? <><ChevronUp className="h-4 w-4 mr-1" />Ocultar questão</> : <><ChevronDown className="h-4 w-4 mr-1" />Ver questão</>}
                          </Button>
                          {report.status !== 'resolved' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                              onClick={() => { setResolveDialogId(report.id); setResolveComment(''); }}
                              disabled={processingId === report.id}>
                              {processingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1.5" />Marcar resolvido</>}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* Erro relatado */}
                      {report.description && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Erro relatado</p>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
                        </div>
                      )}

                      {/* Contexto técnico — colapsável */}
                      {report.technical_context && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedTechId(isTechExpanded ? null : report.id)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                          >
                            <Code2 className="h-3.5 w-3.5" />
                            Detalhes técnicos
                            {isTechExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                          {isTechExpanded && (
                            <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                              {JSON.stringify(report.technical_context, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Reporter info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                          <FileQuestion className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Questão</p>
                            {q ? (
                              <>
                                <p className="text-sm font-medium text-slate-800">{q.subject ?? '—'} {q.exam_year != null && `(${q.exam_year})`}</p>
                                <p className="text-xs text-slate-500 font-mono">{q.external_id ?? report.question_id?.slice(0, 8)}</p>
                              </>
                            ) : (
                              <p className="text-sm text-amber-700 flex items-center gap-1"><AlertCircle size={14} /> Questão removida</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">Quem reportou</p>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-800">{report.reporter?.full_name ?? report.reporter?.email ?? '—'}</p>
                              {report.reporter?.role && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ROLE_LABELS[report.reporter.role] ?? report.reporter.role}</Badge>
                              )}
                            </div>
                            {report.reporter?.email && <p className="text-xs text-slate-500">{report.reporter.email}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Comentário admin */}
                      <div className="pt-2 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Comentário para o aluno
                        </label>
                        <div className="flex gap-2">
                          <textarea
                            rows={2}
                            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
                            placeholder="Explique ao aluno o que foi encontrado e como foi resolvido…"
                            value={commentValues[report.id] ?? ''}
                            onChange={(e) => setCommentValues((prev) => ({ ...prev, [report.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 self-end rounded-xl"
                            onClick={() => void handleSaveComment(report.id)}
                            disabled={savingCommentId === report.id}
                          >
                            {savingCommentId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" />Salvar</>}
                          </Button>
                        </div>
                      </div>

                      {/* Questão expandida */}
                      {isExpanded && q && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-5 bg-slate-50/50 rounded-xl p-5">
                          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={16} /> Conteúdo da questão
                          </h4>
                          {q.context && (
                            <div className="relative pl-5 border-l-4 border-slate-200 py-1">
                              <div className="prose prose-slate max-w-none text-slate-600 italic text-sm leading-relaxed">
                                <SafeMarkdown>{formatScientificText(q.context)}</SafeMarkdown>
                              </div>
                            </div>
                          )}
                          {(q.title || q.alternatives_intro) && (
                            <div className="prose prose-slate max-w-none text-slate-800 text-sm font-medium leading-relaxed">
                              {q.title && <h5 className="text-base font-bold mb-2">{q.title}</h5>}
                              <SafeMarkdown>{formatScientificText(q.alternatives_intro ?? '')}</SafeMarkdown>
                            </div>
                          )}
                          {q.images && q.images.length > 0 && (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                              {q.images.map((img, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={img} alt={`Apoio ${i + 1}`} className="h-40 w-auto rounded-lg border border-slate-200 object-contain bg-white" />
                              ))}
                            </div>
                          )}
                          {q.alternatives && q.alternatives.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-500 uppercase">Alternativas</p>
                              {q.alternatives.map((alt) => {
                                const isCorrect = alt.letter === q.correct_alternative;
                                return (
                                  <div key={alt.letter} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                    <span className="font-bold w-6">{alt.letter}.</span>
                                    <span className={isCorrect ? 'text-emerald-800 font-medium' : 'text-slate-700'}>{alt.text ? formatScientificText(alt.text) : '(imagem)'}</span>
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
                              <p className="text-sm text-purple-900 leading-relaxed italic">{q.ai_reasoning.thought}</p>
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

      {/* Resolve dialog */}
      <Dialog open={!!resolveDialogId} onOpenChange={(open) => { if (!open) { setResolveDialogId(null); setResolveComment(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Marcar como resolvido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              O aluno será notificado automaticamente. Adicione uma explicação opcional sobre o que foi encontrado e como foi resolvido.
            </p>
            <textarea
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
              placeholder="Ex: Notação decimal foi corrigida de 19.3 para 19,3. Obrigado pelo reporte!"
              value={resolveComment}
              onChange={(e) => setResolveComment(e.target.value)}
            />
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              A mensagem padrão já agradece e informa a resolução. Seu texto adicional aparece logo abaixo.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResolveDialogId(null); setResolveComment(''); }}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void handleResolve()} disabled={!!processingId}>
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirmar resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
