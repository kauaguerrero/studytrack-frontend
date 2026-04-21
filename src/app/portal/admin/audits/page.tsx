'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock3,
  Edit3,
  Filter,
  Layers3,
  LoaderCircle,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Save,
  TerminalSquare,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

type AuditType = 'media' | 'data' | 'classification' | 'content' | 'render';
type AuditStatus = 'pending' | 'pass' | 'flagged' | 'needs_manual_review' | 'accepted_exception' | 'resolved' | 'error' | string;
type AuditSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical' | string;

interface QuestionLite {
  id: string;
  external_id: string;
  exam_year: number | null;
  subject: string | null;
  discipline: string | null;
  difficulty: string | null;
}

interface AlternativeInfo {
  letter: string;
  text: string;
  image?: string;
  isCorrect?: boolean;
}

interface QuestionFull extends QuestionLite {
  title?: string | null;
  context?: string | null;
  statement?: string | null;
  alternatives_intro?: string | null;
  alternatives?: AlternativeInfo[];
  correct_alternative?: string | null;
  images?: string[];
  metadata?: Record<string, unknown>;
  ai_reasoning?: { thought?: string };
  is_verified?: boolean;
  status?: string | null;
}

interface EditableAlternativeInfo {
  letter: string;
  text: string;
  image?: string;
  isCorrect?: boolean;
}

interface EditableQuestionForm {
  id: string;
  subject: string;
  discipline: string;
  difficulty: string;
  exam_year: number | null;
  title: string;
  context: string;
  alternatives_intro: string;
  alternatives: EditableAlternativeInfo[];
  correct_alternative: string;
  images: string[];
  ai_reasoning: { thought: string };
}

type SuggestedFixDecision = 'accepted' | 'rejected' | null;

interface AuditRow {
  id: string;
  audit_type: AuditType;
  status: AuditStatus;
  severity: AuditSeverity;
  issue_codes: string[];
  issue_count: number;
  latest_run_at: string | null;
  latest_run_version: string | null;
  question: QuestionLite | null;
  exception?: { state: string; reason?: string | null } | null;
}

interface AuditRun {
  run_id: string;
  source?: string;
  status: string;
  audits?: AuditType[];
  audit_version?: string | null;
  params: Record<string, any>;
  started_at: string;
  pid: number | null;
  completed_at: string | null;
  returncode: number | null;
  compatibility_key?: string | null;
  current_audit?: string | null;
  current_question_external_id?: string | null;
  processed_questions?: number | null;
  total_questions?: number | null;
  eta_seconds?: number | null;
  error_message?: string | null;
  cancellation_requested_at?: string | null;
  cancelled_at?: string | null;
  artifact_count?: number;
  artifacts?: Array<{
    audit_type?: string;
    path?: string | null;
    returncode?: number | null;
    generated_at?: string | null;
  }>;
  log_line_count?: number;
  log_tail?: string[];
  log_window?: {
    items: string[];
    total: number;
    start: number;
    end: number;
    has_more: boolean;
    next_before: number | null;
  };
  summary?: {
    total_rows?: number;
    flagged_rows?: number;
    by_audit_type?: Record<string, {
      total_rows: number;
      flagged_rows: number;
      status_counts: Record<string, number>;
    }>;
  };
  progress?: {
    current_audit?: string | null;
    current_question_external_id?: string | null;
    processed_questions?: number | null;
    total_questions?: number | null;
    eta_seconds?: number | null;
  };
}

interface RunComparisonPayload {
  compatible: boolean;
  current: AuditRun;
  previous: AuditRun;
  delta: { flagged_rows: number; total_rows: number };
  by_audit_type: Array<{
    audit_type: AuditType;
    current_flagged: number;
    previous_flagged: number;
    delta_flagged: number;
    current_total: number;
    previous_total: number;
  }>;
}

interface DashboardPayload {
  baseline_missing: boolean;
  display_context?: {
    mode: 'official_baseline' | 'partial_run' | 'empty';
    run_id?: string;
    baseline_id?: string;
    official_run_id?: string;
    audit_version?: string | null;
    compatibility_key?: string | null;
    baseline_scope?: string | null;
    scope_metadata?: Record<string, any>;
    official_at?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    audits?: AuditType[];
    summary?: { total_rows?: number; flagged_rows?: number; by_audit_type?: Record<string, any> };
  };
  baseline: {
    baseline_id: string;
    audit_version: string | null;
    compatibility_key: string | null;
  } | null;
  overview: {
    total_questions: number;
    fully_audited_questions: number;
    missing_coverage_questions: number;
    coverage_percent: number;
    open_findings: number;
    critical_findings: number;
    exceptions_pending: number;
    latest_run_at: string | null;
  };
  coverage_by_type: Array<{
    audit_type: AuditType;
    audited_questions: number;
    covered_questions: number;
    flagged_rows: number;
    coverage_percent: number;
  }>;
  severity_distribution: Array<{ severity: string; total: number }>;
  breakdowns: { subject: Array<{ label: string; total: number }> };
  recent_runs: AuditRun[];
  filter_options: {
    years: number[];
    subjects: string[];
    disciplines: string[];
    difficulties: string[];
    issues: string[];
  };
}

interface AuditDetail {
  id: string;
  audit_type: AuditType;
  status: AuditStatus;
  scanner_status?: string;
  severity: AuditSeverity;
  issue_codes: string[];
  issue_count: number;
  latest_run_at: string | null;
  latest_run_version: string | null;
  latest_run_id?: string | null;
  latest_run_group_id?: string | null;
  latest_baseline_id?: string | null;
  latest_report?: Record<string, unknown> | null;
  exception?: {
    id?: string;
    state: string;
    reason?: string | null;
    notes?: string | null;
  } | null;
  question?: QuestionFull | null;
  suggested_fix?: {
    kind: 'prepend_missing_context_text';
    source_pdf?: string | null;
    question_number?: string | null;
    missing_body_text: string;
    suggested_context: string;
  } | null;
}

const AUDIT_META: Record<AuditType, {
  label: string;
  tone: string;
  chart: string;
  description: string;
  checks: string[];
  outOfScope: string;
}> = {
  media: {
    label: 'Asset Audit',
    tone: 'bg-amber-100 text-amber-800 border-amber-200',
    chart: '#f59e0b',
    description: 'Verifica integridade de imagens e mídias associadas à questão.',
    checks: ['imagens ausentes ou quebradas', 'URLs inválidas ou inacessíveis', 'referências de mídia inconsistentes'],
    outOfScope: 'Não avalia layout final no navegador nem qualidade pedagógica do ativo.',
  },
  data: {
    label: 'Data Audit',
    tone: 'bg-sky-100 text-sky-800 border-sky-200',
    chart: '#0ea5e9',
    description: 'Valida estrutura e completude do payload da questão.',
    checks: ['campos obrigatórios ausentes', 'alternativas inválidas', 'payload estrutural inconsistente'],
    outOfScope: 'Não avalia aderência à taxonomia nem qualidade editorial profunda.',
  },
  classification: {
    label: 'Classification Audit',
    tone: 'bg-violet-100 text-violet-800 border-violet-200',
    chart: '#8b5cf6',
    description: 'Confere subject e discipline contra a taxonomia oficial da plataforma.',
    checks: ['subject fora da taxonomia', 'discipline incompatível com a matéria', 'uso de alias de subject'],
    outOfScope: 'Não avalia dificuldade, conteúdo pedagógico ou renderização.',
  },
  content: {
    label: 'Content Audit',
    tone: 'bg-orange-100 text-orange-800 border-orange-200',
    chart: '#f97316',
    description: 'Detecta problemas editoriais objetivos e artefatos textuais da questão.',
    checks: ['prompt vazio ou curto demais', 'placeholders quebrados', 'markdown inválido', 'alternativas suspeitas ou duplicadas'],
    outOfScope: 'Não faz julgamento semântico profundo nem revisão pedagógica avançada.',
  },
  render: {
    label: 'Render Audit',
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    chart: '#10b981',
    description: 'Audita como a questão realmente aparece no navegador em viewports e variantes reais.',
    checks: ['erros de renderização', 'requests falhos', 'console errors', 'evidências visuais por screenshot'],
    outOfScope: 'Não substitui validação humana de UX fina nem correção conceitual da questão.',
  },
};

const SEVERITY_COLORS: Record<string, string> = {
  none: '#94a3b8',
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#7f1d1d',
};

function formatDateTime(value?: string | null) {
  if (value === null || value === undefined || value === '') return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEta(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function buildEditForm(question: QuestionFull): EditableQuestionForm {
  return {
    id: question.id,
    subject: question.subject || '',
    discipline: question.discipline || '',
    difficulty: question.difficulty || '',
    exam_year: question.exam_year ?? null,
    title: question.title || '',
    context: question.context || '',
    alternatives_intro: question.alternatives_intro || question.statement || '',
    alternatives: (question.alternatives || []).map(alternative => ({
      letter: alternative.letter,
      text: alternative.text || '',
      image: alternative.image,
      isCorrect: alternative.isCorrect,
    })),
    correct_alternative: question.correct_alternative || '',
    images: question.images || [],
    ai_reasoning: { thought: question.ai_reasoning?.thought || '' },
  };
}

function buildQuestionWithSuggestedFix(
  question: QuestionFull,
  suggestedFix?: AuditDetail['suggested_fix'] | null,
): QuestionFull {
  if (!suggestedFix?.suggested_context) return question;
  return {
    ...question,
    context: suggestedFix.suggested_context,
  };
}

function normalizeSuggestedFixSnippet(text?: string | null) {
  if (!text) return '';
  return text
    .replace(/\r/g, '')
    .replace(/([^\n])\n([^\n])/g, '$1 $2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readJsonPayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeImageUrl(raw: string): string | null {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/^['"]|['"]$/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;
  if (cleaned.startsWith('/storage/v1/object/public/')) return cleaned;
  return null;
}

function extractAlternativeImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeImageUrl(String(item)))
      .filter((url): url is string => Boolean(url));
  }
  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      return extractAlternativeImageUrls(parsed);
    } catch {
      // ignore and fall through
    }
  }
  const direct = normalizeImageUrl(raw);
  return direct ? [direct] : [];
}

function insertParagraphBreakAtCursor(
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  apply: (nextValue: string) => void,
) {
  if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
  event.preventDefault();
  const target = event.currentTarget;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const nextValue = target.value.slice(0, start) + '\n\n' + target.value.slice(end);
  apply(nextValue);
  window.requestAnimationFrame(() => {
    target.selectionStart = start + 2;
    target.selectionEnd = start + 2;
  });
}

function countActiveResultFilters(filters: {
  audit_type: string;
  status: string;
  severity: string;
  year: string;
  subject: string;
  discipline: string;
  difficulty: string;
  issue: string;
}) {
  let count = 0;
  if (filters.audit_type) count += 1;
  if (filters.status) count += 1;
  if (filters.severity) count += 1;
  if (filters.year) count += 1;
  if (filters.subject) count += 1;
  if (filters.discipline) count += 1;
  if (filters.difficulty) count += 1;
  if (filters.issue) count += 1;
  return count;
}

function classForSeverity(severity: string) {
  if (severity === 'critical') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (severity === 'high') return 'bg-red-100 text-red-800 border-red-200';
  if (severity === 'medium') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (severity === 'low') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function classForStatus(status: string) {
  if (status === 'flagged') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'error') return 'bg-rose-100 text-rose-800 border-rose-200';
  if (status === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === 'needs_manual_review') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (status === 'accepted_exception') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'resolved') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'pass') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function classForRunStatus(status: string) {
  if (status === 'running') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'failed') return 'bg-red-100 text-red-800 border-red-200';
  if (status === 'cancelled') return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query === '' ? '' : '?' + query;
}

function buildCommandPreview(config: {
  audits: AuditType[];
  year: string;
  subject: string;
  discipline: string;
  difficulty: string;
  limit: string;
  questionId: string;
  includeReviewed: boolean;
  auditVersion: string;
  timeout: string;
  baseUrl: string;
  serviceUrl: string;
  variants: string;
  viewports: string;
}) {
  const parts = [
    'venv/bin/python scripts/run_question_audits.py',
    '--audits ' + config.audits.join(','),
    '--persist',
    '--audit-version ' + (config.auditVersion || 'ui-phase4-v1'),
  ];
  if (config.year !== 'all') parts.push('--year ' + config.year);
  if (config.subject !== 'all') parts.push('--subject "' + config.subject + '"');
  if (config.discipline !== 'all') parts.push('--discipline "' + config.discipline + '"');
  if (config.difficulty !== 'all') parts.push('--difficulty "' + config.difficulty + '"');
  if (config.limit !== '') parts.push('--limit ' + config.limit);
  if (config.questionId !== '') parts.push('--question-id ' + config.questionId);
  if (config.includeReviewed) parts.push('--include-reviewed');
  if (config.timeout !== '') parts.push('--timeout ' + config.timeout);
  if (config.audits.includes('render')) {
    if (config.baseUrl !== '') parts.push('--base-url ' + JSON.stringify(config.baseUrl));
    if (config.serviceUrl !== '') parts.push('--service-url ' + JSON.stringify(config.serviceUrl));
    if (config.variants !== '') parts.push('--variants ' + config.variants);
    if (config.viewports !== '') parts.push('--viewports ' + config.viewports);
  }
  return parts.join(' \\\n  ');
}

function QuestionPreview({ question }: { question?: QuestionFull | null }) {
  if (!question) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        <p className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Questão removida ou indisponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
      {question.context ? (
        <div className="relative border-l-4 border-slate-200 py-1 pl-5">
          <div className="prose prose-slate max-w-none text-sm italic leading-relaxed text-slate-600">
            <ReactMarkdown>{question.context}</ReactMarkdown>
          </div>
        </div>
      ) : null}

      {question.title || question.statement || question.alternatives_intro ? (
        <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-800">
          {question.title ? <h3 className="mb-2 text-base font-bold">{question.title}</h3> : null}
          <ReactMarkdown>{question.statement || question.alternatives_intro || ''}</ReactMarkdown>
        </div>
      ) : null}

      {question.images && question.images.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {question.images.map((image, index) => (
            <img
              key={image + index}
              src={image}
              alt={`Apoio ${index + 1}`}
              className="h-40 w-auto rounded-lg border border-slate-200 bg-white object-contain"
            />
          ))}
        </div>
      ) : null}

      {question.alternatives && question.alternatives.length > 0 ? (
        <div className="space-y-3">
          {question.alternatives.map((alternative) => {
            const isCorrect = alternative.letter === question.correct_alternative || alternative.isCorrect;
            const alternativeImages = extractAlternativeImageUrls(alternative.image);
            return (
              <div
                key={alternative.letter}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                    isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500'
                  }`}>
                    {alternative.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    {alternativeImages.length > 0 ? (
                      <div className="mb-2">
                        {alternativeImages.map((imageUrl, imageIndex) => (
                          <div key={`${alternative.letter}-${imageIndex}`} className={imageIndex > 0 ? 'mt-2' : ''}>
                            <img
                              src={imageUrl}
                              alt={`Alternativa ${alternative.letter}`}
                              className="max-h-32 rounded border border-slate-200"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {alternative.text ? (
                      <span className={`text-base leading-snug ${isCorrect ? 'font-medium text-emerald-800' : 'text-slate-700'}`}>
                        {alternative.text}
                      </span>
                    ) : alternativeImages.length === 0 ? (
                      <span className="text-sm italic text-slate-400">(Imagem indisponível)</span>
                    ) : null}
                  </div>
                  {isCorrect ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {question.ai_reasoning?.thought ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-bold uppercase text-sky-800">Raciocínio / Comentário</span>
          </div>
          <p className="text-sm italic leading-relaxed text-sky-900">{question.ai_reasoning.thought}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminAuditCenterPage() {
  const supabase = useMemo(() => createClient(), []);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const apiUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const drilldownRef = useRef<HTMLDivElement | null>(null);
  const runConsoleRef = useRef<HTMLDivElement | null>(null);
  const pollingErrorRef = useRef<Record<string, string>>({});

  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runCancelling, setRunCancelling] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsPage, setResultsPage] = useState(1);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedQuestionAuditId, setSelectedQuestionAuditId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [runComparisonData, setRunComparisonData] = useState<RunComparisonPayload | null>(null);

  const [filterAuditType, setFilterAuditType] = useState<'all' | AuditType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | AuditStatus>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AuditSeverity>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filterIssue, setFilterIssue] = useState('all');
  const deferredSearch = useDeferredValue(search);
  const deferredIssue = useDeferredValue(filterIssue);

  const defaultRenderBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
  const defaultRenderServiceUrl = process.env.NEXT_PUBLIC_RENDER_SERVICE_URL || 'http://127.0.0.1:3099';

  const [plannerAudits, setPlannerAudits] = useState<AuditType[]>(['render']);
  const [plannerYear, setPlannerYear] = useState('all');
  const [plannerSubject, setPlannerSubject] = useState('all');
  const [plannerDiscipline, setPlannerDiscipline] = useState('all');
  const [plannerDifficulty, setPlannerDifficulty] = useState('all');
  const [plannerLimit, setPlannerLimit] = useState('100');
  const [plannerQuestionId, setPlannerQuestionId] = useState('');
  const [plannerAuditVersion, setPlannerAuditVersion] = useState('ui-phase4-v1');
  const [plannerTimeout, setPlannerTimeout] = useState('120');
  const [plannerBaseUrl, setPlannerBaseUrl] = useState(defaultRenderBaseUrl);
  const [plannerServiceUrl, setPlannerServiceUrl] = useState(defaultRenderServiceUrl);
  const [plannerVariants, setPlannerVariants] = useState('bank,simulado,review');
  const [plannerViewports, setPlannerViewports] = useState('desktop');
  const [plannerVerifyUrls, setPlannerVerifyUrls] = useState(true);
  const [plannerIncludeReviewed, setPlannerIncludeReviewed] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [resultsFiltersOpen, setResultsFiltersOpen] = useState(false);
  const [questionPreviewOpen, setQuestionPreviewOpen] = useState(true);
  const [questionEditing, setQuestionEditing] = useState(false);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionPublishingAction, setQuestionPublishingAction] = useState<'approve_fix' | 'approve_manual' | 'unpublish' | null>(null);
  const [editForm, setEditForm] = useState<EditableQuestionForm | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [suggestedFixDecision, setSuggestedFixDecision] = useState<SuggestedFixDecision>(null);

  const resultsPageSize = 50;
  const selectedRun = useMemo(() => {
    if (selectedRunId) return runs.find(run => run.run_id === selectedRunId) || null;
    return runs[0] || null;
  }, [runs, selectedRunId]);
  const runningRun = useMemo(() => runs.find(run => run.status === 'running') || null, [runs]);
  const selectedRow = useMemo(() => rows.find(row => row.id === selectedQuestionAuditId) || rows[0] || null, [rows, selectedQuestionAuditId]);
  const selectedRowIndex = useMemo(() => {
    if (!selectedRow) return -1;
    return rows.findIndex(row => row.id === selectedRow.id);
  }, [rows, selectedRow]);
  const selectedRunCurrentAudit = selectedRun?.current_audit || selectedRun?.progress?.current_audit || '—';
  const selectedRunCurrentQuestion = selectedRun?.current_question_external_id || selectedRun?.progress?.current_question_external_id || '—';
  const selectedRunProcessed = selectedRun?.processed_questions ?? selectedRun?.progress?.processed_questions ?? 0;
  const selectedRunTotal = selectedRun?.total_questions ?? selectedRun?.progress?.total_questions ?? 0;
  const selectedRunEta = selectedRun?.eta_seconds ?? selectedRun?.progress?.eta_seconds ?? null;
  const selectedRunProgressPercent = selectedRunTotal > 0 ? Math.min(100, (selectedRunProcessed / selectedRunTotal) * 100) : 0;
  const queryFilters = useMemo(() => ({
    baseline_id: dashboard?.baseline?.baseline_id || '',
    audit_type: filterAuditType === 'all' ? '' : filterAuditType,
    status: filterStatus === 'all' ? '' : filterStatus,
    severity: filterSeverity === 'all' ? '' : filterSeverity,
    year: filterYear === 'all' ? '' : filterYear,
    subject: filterSubject === 'all' ? '' : filterSubject,
    discipline: filterDiscipline === 'all' ? '' : filterDiscipline,
    difficulty: filterDifficulty === 'all' ? '' : filterDifficulty,
    search: deferredSearch.trim(),
  }), [dashboard?.baseline?.baseline_id, filterAuditType, filterStatus, filterSeverity, filterYear, filterSubject, filterDiscipline, filterDifficulty, deferredSearch]);
  const resultQueryFilters = useMemo(() => ({
    ...queryFilters,
    issue: deferredIssue === 'all' ? '' : deferredIssue.trim(),
  }), [queryFilters, deferredIssue]);
  const activeResultFilterCount = countActiveResultFilters(resultQueryFilters);
  const questionForSuggestedFix = useMemo(() => {
    if (!detail?.question) return null;
    return buildQuestionWithSuggestedFix(detail.question, detail.suggested_fix);
  }, [detail?.question, detail?.suggested_fix]);
  const suggestedQuestionPreview = useMemo(() => {
    if (!detail?.question || !detail?.suggested_fix?.suggested_context || suggestedFixDecision === 'rejected') return null;
    return buildQuestionWithSuggestedFix(detail.question, detail.suggested_fix);
  }, [detail?.question, detail?.suggested_fix, suggestedFixDecision]);

  async function getToken() {
    const sessionResult = await supabase.auth.getSession();
    return sessionResult.data.session?.access_token || null;
  }

  async function fetchRuns(shouldSelectLatest: boolean) {
    setRunsLoading(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/runs' + buildQuery({ limit: 30 }), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await readJsonPayload(response);
      if (response.ok === false) {
        if (response.status === 401 || response.status === 403) return;
        throw new Error((payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '') || 'Falha ao carregar runs');
      }
      const nextRuns = (payload.runs || []) as AuditRun[];
      setRuns(current => {
        const merged = nextRuns.map(run => {
          const previous = current.find(item => item.run_id === run.run_id);
          return previous ? { ...previous, ...run, log_window: previous.log_window || run.log_window, artifacts: previous.artifacts || run.artifacts || [] } : run;
        });
        const pinned = selectedRunId ? current.find(item => item.run_id === selectedRunId) : null;
        if (pinned && merged.some(item => item.run_id === pinned.run_id) === false) {
          return [pinned, ...merged];
        }
        return merged;
      });
      if (shouldSelectLatest && nextRuns[0]) setSelectedRunId(nextRuns[0].run_id);
      if (selectedRunId === null && nextRuns[0]) setSelectedRunId(nextRuns[0].run_id);
      pollingErrorRef.current.runs = '';
    } catch (error) {
      const message = String(error);
      if (pollingErrorRef.current.runs !== message) {
        console.error('Erro ao carregar runs de auditoria:', error);
        pollingErrorRef.current.runs = message;
      }
      void reportError('AdminAuditRunsFetchError', String(error));
    } finally {
      setRunsLoading(false);
    }
  }

  async function fetchRunDetail(runId: string, options?: { before?: number | null }) {
    setRunDetailLoading(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/runs/' + runId + buildQuery({
        log_limit: 200,
        log_before: options?.before ?? undefined,
      }), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await readJsonPayload(response);
      if (response.ok === false) {
        if (response.status === 401 || response.status === 403) return;
        throw new Error((payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '') || 'Falha ao carregar detalhe da run');
      }
      setRuns(current => {
        const next = current.map(run => {
          if (run.run_id !== runId) return run;
          const mergedLogWindow = options?.before && run.log_window ? {
            ...payload.log_window,
            items: [...(payload.log_window?.items || []), ...(run.log_window.items || [])],
            end: run.log_window.end,
            total: payload.log_window?.total || run.log_window.total,
          } : payload.log_window;
          return { ...run, ...payload, log_window: mergedLogWindow };
        });
        return next.some(run => run.run_id === runId) ? next : current.concat(payload as AuditRun);
      });
      pollingErrorRef.current[`run:${runId}`] = '';
    } catch (error) {
      const errorKey = `run:${runId}`;
      const message = String(error);
      if (pollingErrorRef.current[errorKey] !== message) {
        console.error('Erro ao carregar detalhe da run:', error);
        pollingErrorRef.current[errorKey] = message;
      }
      void reportError('AdminAuditRunDetailFetchError', String(error));
    } finally {
      setRunDetailLoading(false);
    }
  }

  async function cancelRun(runId: string) {
    setRunCancelling(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/runs/' + runId + '/cancel', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await response.json();
      if (response.ok === false) throw new Error(payload.error || 'Falha ao cancelar run');
      toast.success('Solicitação de cancelamento enviada.');
      setRuns(current => current.map(run => run.run_id === runId ? { ...run, ...payload } : run));
      await Promise.all([fetchRuns(false), fetchRunDetail(runId)]);
    } catch (error) {
      console.error('Erro ao cancelar run de auditoria:', error);
      void reportError('AdminAuditRunCancelError', String(error));
      toast.error('Não foi possível cancelar a execução.');
    } finally {
      setRunCancelling(false);
    }
  }

  async function fetchDashboard() {
    setDashboardLoading(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/dashboard' + buildQuery(queryFilters), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await readJsonPayload(response);
      if (response.ok === false) {
        if (response.status === 401 || response.status === 403) return;
        throw new Error((payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '') || 'Falha ao carregar dashboard');
      }
      setDashboard(payload as DashboardPayload);
      pollingErrorRef.current.dashboard = '';
    } catch (error) {
      const message = String(error);
      if (pollingErrorRef.current.dashboard !== message) {
        console.error('Erro ao carregar dashboard de auditoria:', error);
        pollingErrorRef.current.dashboard = message;
      }
      void reportError('AdminAuditDashboardFetchError', String(error));
      toast.error('Não foi possível carregar o dashboard operacional.');
    } finally {
      setDashboardLoading(false);
    }
  }

  async function fetchResults(page: number) {
    setResultsLoading(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/results' + buildQuery({
        baseline_id: resultQueryFilters.baseline_id,
        audit_type: resultQueryFilters.audit_type,
        status: resultQueryFilters.status,
        severity: resultQueryFilters.severity,
        year: resultQueryFilters.year,
        subject: resultQueryFilters.subject,
        discipline: resultQueryFilters.discipline,
        difficulty: resultQueryFilters.difficulty,
        search: resultQueryFilters.search,
        issue: resultQueryFilters.issue,
        page,
        page_size: resultsPageSize,
        sort_by: 'updated_at',
        sort_dir: 'desc',
      }), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await readJsonPayload(response);
      if (response.ok === false) {
        if (response.status === 401 || response.status === 403) return;
        throw new Error((payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '') || 'Falha ao carregar resultados');
      }
      setRows((payload.items || []) as AuditRow[]);
      setResultsTotal(payload.total || 0);
      setResultsPage(payload.page || 1);
      pollingErrorRef.current.results = '';
    } catch (error) {
      const message = String(error);
      if (pollingErrorRef.current.results !== message) {
        console.error('Erro ao carregar resultados da auditoria:', error);
        pollingErrorRef.current.results = message;
      }
      void reportError('AdminAuditResultsFetchError', String(error));
      toast.error('Não foi possível carregar os resultados operacionais.');
    } finally {
      setResultsLoading(false);
    }
  }

  async function fetchDetail(id: string) {
    setDetailLoading(true);
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/results/' + id, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await readJsonPayload(response);
      if (response.ok === false) {
        if (response.status === 401 || response.status === 403) {
          setDetail(null);
          return;
        }
        throw new Error((payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : '') || 'Falha ao carregar detalhe');
      }
      setDetail((payload || null) as AuditDetail | null);
      pollingErrorRef.current[`detail:${id}`] = '';
    } catch (error) {
      const errorKey = `detail:${id}`;
      const message = String(error);
      if (pollingErrorRef.current[errorKey] !== message) {
        console.error('Erro ao carregar detalhe da questão auditada:', error);
        pollingErrorRef.current[errorKey] = message;
      }
      void reportError('AdminAuditQuestionDetailFetchError', String(error));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function fetchRunComparison(runIdA: string, runIdB: string) {
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/compare/runs' + buildQuery({
        run_id_a: runIdA,
        run_id_b: runIdB,
      }), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await response.json();
      if (response.ok === false) throw new Error(payload.error || 'Falha ao comparar runs');
      setRunComparisonData(payload as RunComparisonPayload);
    } catch (error) {
      console.error('Erro ao comparar runs:', error);
      void reportError('AdminAuditRunComparisonFetchError', String(error));
      setRunComparisonData(null);
    }
  }

  async function exportCurrentResults() {
    try {
      const token = await getToken();
      if (token === null) return;
      const response = await fetch(apiUrl + '/api/admin/question-audits/export' + buildQuery(resultQueryFilters), {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (response.ok === false) {
        const payload = await response.json();
        throw new Error(payload.error || 'Falha ao exportar resultados');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'question-audits-export.csv';
      anchor.click();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Erro ao exportar resultados:', error);
      void reportError('AdminAuditExportError', String(error));
      toast.error('Não foi possível exportar o recorte atual.');
    }
  }

  async function startRun() {
    if (plannerAudits.length === 0) {
      toast.error('Selecione ao menos uma trilha para executar.');
      return;
    }
    const renderEnabled = plannerAudits.includes('render');
    const variants = plannerVariants.split(',').map(item => item.trim()).filter(Boolean);
    const viewports = plannerViewports.split(',').map(item => item.trim()).filter(Boolean);
    if (renderEnabled && plannerBaseUrl.trim() === '') {
      toast.error('Informe a base_url para o Render Audit.');
      return;
    }
    if (renderEnabled && plannerServiceUrl.trim() === '') {
      toast.error('Informe a service_url para o Render Audit.');
      return;
    }
    if (renderEnabled && variants.length === 0) {
      toast.error('Informe ao menos uma variante para o Render Audit.');
      return;
    }
    if (renderEnabled && viewports.length === 0) {
      toast.error('Informe ao menos um viewport para o Render Audit.');
      return;
    }
    setRunSubmitting(true);
    try {
      const token = await getToken();
      if (token === null) throw new Error('Sessão administrativa não encontrada.');
      const response = await fetch(apiUrl + '/api/admin/question-audits/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          audits: plannerAudits,
          year: plannerYear === 'all' ? null : plannerYear,
          subject: plannerSubject === 'all' ? null : plannerSubject,
          discipline: plannerDiscipline === 'all' ? null : plannerDiscipline,
          difficulty: plannerDifficulty === 'all' ? null : plannerDifficulty,
          limit: plannerLimit || null,
          question_id: plannerQuestionId || null,
          audit_version: plannerAuditVersion || null,
          timeout: plannerTimeout || null,
          verify_urls: plannerVerifyUrls,
          include_reviewed: plannerIncludeReviewed,
          base_url: renderEnabled ? plannerBaseUrl.trim() : null,
          service_url: renderEnabled ? plannerServiceUrl.trim() : null,
          variants: renderEnabled ? variants : [],
          viewports: renderEnabled ? viewports : [],
        }),
      });
      const payload = await response.json();
      if (response.ok === false) throw new Error(payload.error || 'Falha ao iniciar auditoria');
      toast.success('Auditoria iniciada no backend.');
      setSelectedRunId(payload.run_id);
      setRunModalOpen(false);
      window.requestAnimationFrame(() => {
        runConsoleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      await Promise.all([fetchRuns(true), fetchDashboard(), fetchResults(1)]);
    } catch (error) {
      console.error('Erro ao iniciar run de auditoria:', error);
      void reportError('AdminAuditRunCreateError', String(error));
      toast.error(String(error));
    } finally {
      setRunSubmitting(false);
    }
  }

  async function saveQuestionEdits() {
    if (!editForm || !detail?.question) return;
    setQuestionSaving(true);
    try {
      const payload = {
        subject: editForm.subject,
        discipline: editForm.discipline,
        difficulty: editForm.difficulty,
        exam_year: editForm.exam_year,
        title: editForm.title,
        context: editForm.context,
        alternatives_intro: editForm.alternatives_intro,
        alternatives: editForm.alternatives.map(alternative => ({
          letter: alternative.letter,
          text: alternative.text,
          image: alternative.image,
          isCorrect: alternative.letter === editForm.correct_alternative,
        })),
        correct_alternative: editForm.correct_alternative,
        images: editForm.images,
        ai_reasoning: editForm.ai_reasoning,
      };

      const { error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editForm.id);

      if (error) throw error;

      setRows(current => current.map(row => (
        row.question?.id === editForm.id
          ? {
              ...row,
              question: {
                ...row.question,
                subject: payload.subject,
                discipline: payload.discipline,
                difficulty: payload.difficulty,
                exam_year: payload.exam_year,
              },
            }
          : row
      )));
      setDetail(current => {
        if (!current?.question) return current;
        return {
          ...current,
          question: {
            ...current.question,
            subject: payload.subject,
            discipline: payload.discipline,
            difficulty: payload.difficulty,
            exam_year: payload.exam_year,
            title: payload.title,
            context: payload.context,
            alternatives_intro: payload.alternatives_intro,
            alternatives: payload.alternatives,
            correct_alternative: payload.correct_alternative,
            images: payload.images,
            ai_reasoning: payload.ai_reasoning,
          },
          suggested_fix: null,
        };
      });
      setEditForm({
        ...editForm,
        alternatives: payload.alternatives.map(alternative => ({
          letter: alternative.letter,
          text: alternative.text,
          image: alternative.image,
          isCorrect: alternative.isCorrect,
        })),
      });
      setSuggestedFixDecision(null);
      toast.success('Edição salva. Revise e aprove manualmente quando concluir.');
      setQuestionEditing(false);
    } catch (error) {
      console.error('Erro ao salvar edição da questão:', error);
      void reportError('AdminAuditQuestionSaveError', String(error));
      toast.error('Não foi possível salvar a questão.');
    } finally {
      setQuestionSaving(false);
    }
  }

  async function markAuditResultHandled(nextStatus: 'pass' | 'resolved') {
    if (!selectedRow?.id) return;
    const payload = nextStatus === 'pass'
      ? { status: 'pass', severity: 'none', issue_codes: [], issue_count: 0 }
      : { status: 'resolved' };
    const { error } = await supabase
      .from('question_audit_results')
      .update(payload)
      .eq('id', selectedRow.id);
    if (error) throw error;
  }

  function removeRowFromQueue(auditRowId: string) {
    setRows(current => {
      const currentIndex = current.findIndex(row => row.id === auditRowId);
      if (currentIndex < 0) return current;
      const nextRows = current.filter(row => row.id !== auditRowId);
      const nextSelected = nextRows[currentIndex] || nextRows[currentIndex - 1] || nextRows[0] || null;
      setSelectedQuestionAuditId(nextSelected?.id || null);
      return nextRows;
    });
    setDetail(null);
  }

  async function unpublishQuestion() {
    if (!detail?.question?.id) return;
    setQuestionPublishingAction('unpublish');
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_verified: false })
        .eq('id', detail.question.id);

      if (error) throw error;
      await markAuditResultHandled('resolved');
      removeRowFromQueue(selectedRow?.id || detail.id);
      toast.success('Questão despublicada e removida do fluxo dos usuários.');
      void fetchResults(resultsPage);
    } catch (error) {
      console.error('Erro ao despublicar questão:', error);
      void reportError('AdminAuditQuestionUnpublishError', String(error));
      toast.error('Não foi possível despublicar a questão.');
    } finally {
      setQuestionPublishingAction(null);
    }
  }

  async function approveSuggestedFix() {
    if (!detail?.question?.id || !detail?.suggested_fix?.suggested_context) return;
    setQuestionPublishingAction('approve_fix');
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          context: detail.suggested_fix.suggested_context,
          is_verified: true,
          status: 'approved',
        })
        .eq('id', detail.question.id);

      if (error) throw error;
      await markAuditResultHandled('pass');
      removeRowFromQueue(selectedRow?.id || detail.id);
      toast.success('Correção aplicada à questão.');
      void fetchResults(resultsPage);
    } catch (error) {
      console.error('Erro ao aplicar correção sugerida:', error);
      void reportError('AdminAuditQuestionApproveFixError', String(error));
      toast.error('Não foi possível aplicar a correção.');
    } finally {
      setQuestionPublishingAction(null);
    }
  }

  async function approveQuestionManually() {
    if (!detail?.question?.id) return;
    setQuestionPublishingAction('approve_manual');
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          is_verified: true,
          status: 'approved',
        })
        .eq('id', detail.question.id);

      if (error) throw error;
      await markAuditResultHandled('pass');
      removeRowFromQueue(selectedRow?.id || detail.id);
      toast.success('Questão aprovada manualmente.');
      void fetchResults(resultsPage);
    } catch (error) {
      console.error('Erro ao aprovar questão manualmente:', error);
      void reportError('AdminAuditQuestionApproveManualError', String(error));
      toast.error('Não foi possível aprovar a questão manualmente.');
    } finally {
      setQuestionPublishingAction(null);
    }
  }

  function startEditingQuestion(mode: 'suggested' | 'manual') {
    if (!detail?.question) return;
    const sourceQuestion = mode === 'suggested'
      ? (questionForSuggestedFix || detail.question)
      : detail.question;
    setSuggestedFixDecision(mode === 'suggested' ? 'accepted' : 'rejected');
    setEditForm(buildEditForm(sourceQuestion));
    setQuestionEditing(true);
  }

  useEffect(() => { void fetchRuns(true); }, []);
  useEffect(() => {
    void fetchDashboard();
  }, [queryFilters]);
  useEffect(() => {
    void fetchResults(1);
  }, [resultQueryFilters]);
  useEffect(() => {
    if (selectedQuestionAuditId === null && rows[0]) setSelectedQuestionAuditId(rows[0].id);
    if (selectedQuestionAuditId !== null && rows.some(row => row.id === selectedQuestionAuditId) === false) setSelectedQuestionAuditId(rows[0] ? rows[0].id : null);
  }, [rows, selectedQuestionAuditId]);
  useEffect(() => {
    if (selectedRow && selectedRow.id) void fetchDetail(selectedRow.id);
    if (selectedRow === null) setDetail(null);
  }, [selectedRow?.id]);
  useEffect(() => {
    if (!detail?.question) {
      setEditForm(null);
      setQuestionEditing(false);
      setNewImageUrl('');
      setSuggestedFixDecision(null);
      return;
    }
    setEditForm(buildEditForm(detail.question));
    setQuestionEditing(false);
    setNewImageUrl('');
    setSuggestedFixDecision(null);
  }, [detail?.id, detail?.question?.id]);
  useEffect(() => {
    if (selectedRunId) void fetchRunDetail(selectedRunId);
  }, [selectedRunId]);
  useEffect(() => {
    setQuestionPreviewOpen(true);
  }, [selectedRow?.id]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
      if (isSaveShortcut && questionEditing) {
        event.preventDefault();
        if (!questionSaving && editForm) {
          void saveQuestionEdits();
        }
        return;
      }
      if (questionEditing || questionPublishingAction !== null || rows.length === 0) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextRow = rows[selectedRowIndex + 1];
        if (nextRow) setSelectedQuestionAuditId(nextRow.id);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const previousRow = rows[selectedRowIndex - 1];
        if (previousRow) setSelectedQuestionAuditId(previousRow.id);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (detail?.suggested_fix && suggestedFixDecision !== 'rejected') {
          void approveSuggestedFix();
          return;
        }
        if (detail?.question) {
          void approveQuestionManually();
        }
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (detail?.question) {
          void unpublishQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [questionEditing, questionPublishingAction, rows, selectedRowIndex, detail?.question?.id, detail?.suggested_fix, suggestedFixDecision, questionSaving, editForm]);
  useEffect(() => {
    if (runningRun === null) return;
    const interval = window.setInterval(() => {
      void fetchRuns(false);
      void fetchRunDetail(selectedRunId || runningRun.run_id);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [runningRun?.run_id, selectedRunId]);
  function openQuestionDrilldown(auditId: string, row?: AuditRow) {
    if (row) {
      setRows(current => current.some(item => item.id === row.id) ? current : [row, ...current]);
    }
    setSelectedQuestionAuditId(auditId);
    setResultsCollapsed(true);
    window.requestAnimationFrame(() => {
      drilldownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const displayContext = dashboard?.display_context || { mode: 'empty' as const };
  const isPartialContext = displayContext.mode === 'partial_run';
  const contextAudits = (displayContext.audits || []).filter(Boolean) as AuditType[];
  const coverageTitle = isPartialContext ? 'Questões auditadas' : 'Cobertura oficial';
  const coverageSubtitle = isPartialContext ? `${dashboard?.overview.coverage_percent?.toFixed(1) || '0.0'}% da base nesta execução` : `${dashboard?.overview.coverage_percent?.toFixed(1) || '0.0'}% da base`;

  const totalPages = Math.max(1, Math.ceil(resultsTotal / resultsPageSize));
  const plannerCommand = buildCommandPreview({
    audits: plannerAudits,
    year: plannerYear,
    subject: plannerSubject,
    discipline: plannerDiscipline,
    difficulty: plannerDifficulty,
    limit: plannerLimit,
    questionId: plannerQuestionId,
    includeReviewed: plannerIncludeReviewed,
    auditVersion: plannerAuditVersion,
    timeout: plannerTimeout,
    baseUrl: plannerBaseUrl,
    serviceUrl: plannerServiceUrl,
    variants: plannerVariants,
    viewports: plannerViewports,
  });
  const chartByType = (dashboard?.coverage_by_type || []).map(item => ({
    name: AUDIT_META[item.audit_type].label.replace(' Audit', ''),
    auditadas: item.audited_questions,
    achados: item.flagged_rows,
    fill: AUDIT_META[item.audit_type].chart,
  }));
  const severityData = (dashboard?.severity_distribution || []).map(item => ({
    name: item.severity,
    value: item.total,
    fill: SEVERITY_COLORS[item.severity] || '#94a3b8',
  }));
  const runComparisonCandidate = useMemo(() => {
    const compatibilityKey = displayContext.compatibility_key || dashboard?.baseline?.compatibility_key || null;
    const completedRuns = runs.filter(run => run.status === 'completed' && run.summary?.total_rows && (compatibilityKey === null || run.compatibility_key === compatibilityKey));
    if (completedRuns.length < 2) return null;
    const current = selectedRun && selectedRun.status === 'completed' ? selectedRun : completedRuns[0];
    const previous = completedRuns.find(run => run.run_id !== current.run_id);
    if (!previous) return null;
    return { current, previous };
  }, [displayContext.compatibility_key, dashboard?.baseline?.compatibility_key, runs, selectedRun]);

  useEffect(() => {
    if (!runComparisonCandidate) {
      setRunComparisonData(null);
      return;
    }
    void fetchRunComparison(runComparisonCandidate.current.run_id, runComparisonCandidate.previous.run_id);
  }, [runComparisonCandidate?.current.run_id, runComparisonCandidate?.previous.run_id]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge className="border-slate-900 bg-slate-900 text-white">Question Audit Center</Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">5 trilhas ativas</Badge>
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">analytics backend-driven</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Integridade do Banco de Questões</h1>
            <p className="mt-1 max-w-3xl text-slate-500">Cobertura oficial, achados persistidos e runs operacionais sem full scan no navegador.</p>
          </div>
          <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setRunModalOpen(true)}>
            <Play className="mr-2 h-4 w-4" />Iniciar Auditoria
          </Button>
        </div>

        {dashboard?.baseline_missing ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{isPartialContext ? `Exibindo dados da execução parcial ${displayContext.audit_version || displayContext.run_id || ''} com ${contextAudits.length} trilha(s): ${contextAudits.map(audit => AUDIT_META[audit].label).join(', ')}. Esses números não representam baseline oficial.` : 'Ainda não existe baseline oficial resolvida para este recorte. KPIs oficiais de cobertura continuam indisponíveis até a baseline oficial ser consolidada.'}</div> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardLoading || dashboard === null ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />) : (
            <>
              <Card className="border-l-4 border-l-slate-900 shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium uppercase text-slate-500">Base total</p><h3 className="mt-2 text-3xl font-bold text-slate-900">{dashboard.overview.total_questions.toLocaleString('pt-BR')}</h3><p className="mt-2 text-sm text-slate-500">questões no recorte atual</p></div><div className="rounded-xl bg-slate-100 p-3"><Layers3 className="h-5 w-5 text-slate-700" /></div></div></CardContent></Card>
              <Card className="border-l-4 border-l-blue-500 shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium uppercase text-slate-500">{coverageTitle}</p><h3 className="mt-2 text-3xl font-bold text-slate-900">{dashboard.overview.fully_audited_questions.toLocaleString('pt-BR')}</h3><p className="mt-2 text-sm text-slate-500">{coverageSubtitle}</p></div><div className="rounded-xl bg-blue-50 p-3"><ShieldCheck className="h-5 w-5 text-blue-600" /></div></div></CardContent></Card>
              <Card className="border-l-4 border-l-amber-500 shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium uppercase text-slate-500">Achados abertos</p><h3 className="mt-2 text-3xl font-bold text-slate-900">{dashboard.overview.open_findings.toLocaleString('pt-BR')}</h3><p className="mt-2 text-sm text-slate-500">{isPartialContext ? 'achados desta execução parcial' : 'fila operacional ativa'}</p></div><div className="rounded-xl bg-amber-50 p-3"><CircleAlert className="h-5 w-5 text-amber-600" /></div></div></CardContent></Card>
              <Card className="border-l-4 border-l-rose-500 shadow-sm"><CardContent className="p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-medium uppercase text-slate-500">Risco alto</p><h3 className="mt-2 text-3xl font-bold text-slate-900">{dashboard.overview.critical_findings.toLocaleString('pt-BR')}</h3><p className="mt-2 text-sm text-slate-500">manual review: {dashboard.overview.exceptions_pending}</p></div><div className="rounded-xl bg-rose-50 p-3"><AlertTriangle className="h-5 w-5 text-rose-600" /></div></div></CardContent></Card>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Radar className="h-5 w-5 text-slate-700" />Cobertura por Trilha</CardTitle>
            <CardDescription>{isPartialContext ? 'Cobertura e achados da última execução concluída para este recorte.' : 'Cobertura e achados calculados no backend.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardLoading || dashboard === null ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />) : dashboard.coverage_by_type.map(item => (
              <div key={item.audit_type} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div><div className="flex items-center gap-2"><Badge className={AUDIT_META[item.audit_type].tone}>{AUDIT_META[item.audit_type].label}</Badge><span className="text-sm text-slate-500">{item.audited_questions.toLocaleString('pt-BR')} auditadas</span></div><p className="mt-2 text-sm text-slate-500">{item.flagged_rows} achado(s) abertos</p></div>
                  <div className="min-w-[180px]"><div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">Cobertura</span><span className="font-semibold text-slate-900">{item.coverage_percent.toFixed(1)}%</span></div><Progress value={item.coverage_percent} className="h-2.5" /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Clock3 className="h-5 w-5 text-slate-700" />Runs Recentes</CardTitle>
            <CardDescription>{isPartialContext ? 'Recorte compatível com a execução parcial exibida.' : 'Recorte compatível com a baseline ativa.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardLoading || dashboard === null ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />) : (dashboard.recent_runs || []).map(run => (
              <div key={run.run_id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{run.audit_version || run.run_id}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(run.started_at)}</p></div><Badge className={classForRunStatus(run.status)}>{run.status}</Badge></div></div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-slate-700" />Panorama dos Achados</CardTitle>
            <CardDescription>Agregações calculadas no backend.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-4 text-sm font-semibold text-slate-900">Cobertura x achados por trilha</p><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartByType} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} /><Tooltip /><Bar dataKey="auditadas" radius={[8, 8, 0, 0]} fill="#cbd5e1" /><Bar dataKey="achados" radius={[8, 8, 0, 0]}>{chartByType.map(entry => <Cell key={entry.name} fill={entry.fill} />)}</Bar></BarChart></ResponsiveContainer></div></div>
            <div className="rounded-2xl border border-slate-200 p-4"><p className="mb-4 text-sm font-semibold text-slate-900">Top matérias com achados</p><div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboard?.breakdowns.subject || []} layout="vertical" margin={{ top: 10, right: 16, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" tickLine={false} axisLine={false} fontSize={12} /><YAxis dataKey="label" type="category" width={90} tickLine={false} axisLine={false} fontSize={12} /><Tooltip /><Bar dataKey="total" radius={[0, 8, 8, 0]} fill="#0f172a" /></BarChart></ResponsiveContainer></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-slate-700" />Severidade</CardTitle>
            <CardDescription>Distribuição do recorte atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={4}>{severityData.map(entry => <Cell key={entry.name} fill={entry.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
            <div className="mt-4 space-y-2">{severityData.map(item => <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} /><span className="text-sm capitalize text-slate-700">{item.name}</span></div><span className="text-sm font-semibold text-slate-900">{item.value}</span></div>)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-slate-700" />
                Explorar Resultados
              </CardTitle>
              <CardDescription>
                {isPartialContext ? 'Busca e paginação da execução parcial exibida, com filtros server-side.' : 'Busca, paginação e filtros server-side no backend.'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="bg-white" onClick={() => void exportCurrentResults()}>
                Exportar recorte
              </Button>
              <Button type="button" variant="outline" className="bg-white" onClick={() => setResultsCollapsed(resultsCollapsed === false)}>
                {resultsCollapsed ? 'Expandir resultados' : 'Minimizar resultados'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {resultsCollapsed ? null : (
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input value={search} onChange={event => { setSearch(event.target.value); setResultsPage(1); }} placeholder="Buscar external_id, matéria, run..." className="bg-white md:flex-1" />
              <Button type="button" variant="outline" className="bg-white" onClick={() => setResultsFiltersOpen(current => !current)}>
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {activeResultFilterCount > 0 ? <Badge variant="outline" className="ml-2 bg-slate-50">{activeResultFilterCount}</Badge> : null}
              </Button>
            </div>
            {resultsFiltersOpen ? (
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2 xl:grid-cols-4">
                <Select value={filterIssue} onValueChange={value => { setFilterIssue(value); setResultsPage(1); }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Issue code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os issues</SelectItem>
                    {(dashboard?.filter_options.issues || []).map(issue => <SelectItem key={issue} value={issue}>{issue}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAuditType} onValueChange={value => { setFilterAuditType(value as 'all' | AuditType); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Trilha" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as trilhas</SelectItem>{(Object.keys(AUDIT_META) as AuditType[]).map(auditType => <SelectItem key={auditType} value={auditType}>{AUDIT_META[auditType].label}</SelectItem>)}</SelectContent></Select>
                <Select value={filterStatus} onValueChange={value => { setFilterStatus(value as 'all' | AuditStatus); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="pass">Pass</SelectItem><SelectItem value="flagged">Flagged</SelectItem><SelectItem value="needs_manual_review">Needs Manual Review</SelectItem><SelectItem value="accepted_exception">Accepted Exception</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
                <Select value={filterSeverity} onValueChange={value => { setFilterSeverity(value as 'all' | AuditSeverity); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Severidade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as severidades</SelectItem><SelectItem value="none">None</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
                <Select value={filterYear} onValueChange={value => { setFilterYear(value); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Ano" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{(dashboard?.filter_options.years || []).map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>
                <Select value={filterSubject} onValueChange={value => { setFilterSubject(value); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Matéria" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as matérias</SelectItem>{(dashboard?.filter_options.subjects || []).map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent></Select>
                <Select value={filterDiscipline} onValueChange={value => { setFilterDiscipline(value); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Disciplina" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as disciplinas</SelectItem>{(dashboard?.filter_options.disciplines || []).map(discipline => <SelectItem key={discipline} value={discipline}>{discipline}</SelectItem>)}</SelectContent></Select>
                <Select value={filterDifficulty} onValueChange={value => { setFilterDifficulty(value); setResultsPage(1); }}><SelectTrigger className="bg-white"><SelectValue placeholder="Dificuldade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas as dificuldades</SelectItem>{(dashboard?.filter_options.difficulties || []).map(difficulty => <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>)}</SelectContent></Select>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge variant="outline" className="bg-white">{resultsTotal} linha(s) no filtro</Badge>
              <Badge variant="outline" className="bg-white">página {resultsPage} de {totalPages}</Badge>
              {deferredIssue.trim() ? <Badge variant="outline" className="bg-white">issue: {deferredIssue.trim()}</Badge> : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">Questão</th>
                      <th className="px-4 py-3 font-medium">Trilha</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Severidade</th>
                      <th className="px-4 py-3 font-medium">Matéria</th>
                      <th className="px-4 py-3 font-medium">Issues</th>
                      <th className="px-4 py-3 font-medium">Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {resultsLoading ? Array.from({ length: 8 }).map((_, index) => <tr key={index}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-8 w-full rounded-lg" /></td></tr>) : rows.map(row => <tr key={row.id} className={(selectedRow?.id === row.id ? 'bg-slate-50 ' : '') + 'cursor-pointer align-top hover:bg-slate-50/80'} onClick={() => { setSelectedQuestionAuditId(row.id); openQuestionDrilldown(row.id); }}><td className="px-4 py-3"><div><p className="font-semibold text-slate-900">{row.question?.external_id || row.question?.id || 'Sem ID'}</p><p className="mt-1 text-xs text-slate-500">{row.question?.exam_year || '—'} · {row.question?.discipline || 'Sem disciplina'} · {row.question?.difficulty || '—'}</p></div></td><td className="px-4 py-3"><Badge className={AUDIT_META[row.audit_type].tone}>{AUDIT_META[row.audit_type].label}</Badge></td><td className="px-4 py-3"><Badge className={classForStatus(row.status)}>{row.status}</Badge></td><td className="px-4 py-3"><Badge className={classForSeverity(row.severity)}>{row.severity}</Badge></td><td className="px-4 py-3"><div><p className="text-slate-900">{row.question?.subject || 'Sem matéria'}</p><p className="mt-1 text-xs text-slate-500">{row.question?.discipline || 'Sem disciplina'}</p></div></td><td className="px-4 py-3"><div className="flex max-w-[260px] flex-wrap gap-1.5">{(row.issue_codes || []).slice(0, 3).map(issue => <Badge key={row.id + '-' + issue} variant="outline" className="bg-white">{issue}</Badge>)}</div></td><td className="px-4 py-3"><div className="space-y-1"><p className="text-xs font-medium text-slate-900">{row.latest_run_version || 'sem-versao'}</p><p className="text-xs text-slate-500">{formatDateTime(row.latest_run_at)}</p></div></td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">Mostrando {rows.length} item(ns) desta página.</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-white" disabled={resultsPage <= 1 || resultsLoading} onClick={() => void fetchResults(resultsPage - 1)}><ChevronLeft className="mr-2 h-4 w-4" />Anterior</Button>
                <Button variant="outline" className="bg-white" disabled={resultsPage >= totalPages || resultsLoading} onClick={() => void fetchResults(resultsPage + 1)}>Próxima<ChevronRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={runModalOpen} onOpenChange={setRunModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><TerminalSquare className="h-5 w-5 text-slate-700" />Iniciar Auditoria</DialogTitle><DialogDescription>Configure a execução operacional no mesmo formato do orquestrador do terminal.</DialogDescription></DialogHeader><div className="space-y-4 pt-2"><div><p className="mb-2 text-sm font-semibold text-slate-900">Trilhas</p><div className="flex flex-wrap gap-2">{(Object.keys(AUDIT_META) as AuditType[]).map(auditType => <button key={auditType} type="button" onClick={() => setPlannerAudits(current => current.includes(auditType) ? current.filter(item => item !== auditType) : current.concat(auditType))} className={(plannerAudits.includes(auditType) ? 'border-slate-900 bg-slate-900 text-white ' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 ') + 'rounded-xl border px-3 py-2 text-sm font-medium transition-colors'}>{AUDIT_META[auditType].label}</button>)}</div></div><div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">Escopo das trilhas selecionadas</p><p className="mt-1 text-xs text-slate-500">Mostra exatamente o que cada auditoria vai verificar antes da execução.</p></div><Badge variant="outline" className="bg-white">{plannerAudits.length} trilha(s)</Badge></div><div className="space-y-3">{plannerAudits.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">Selecione ao menos uma trilha para ver o escopo auditado.</div> : plannerAudits.map(auditType => <div key={auditType} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center gap-2"><Badge className={AUDIT_META[auditType].tone}>{AUDIT_META[auditType].label}</Badge><p className="text-sm font-medium text-slate-900">{AUDIT_META[auditType].description}</p></div><div className="mt-3 flex flex-wrap gap-2">{AUDIT_META[auditType].checks.map(check => <Badge key={auditType + check} variant="outline" className="bg-white">{check}</Badge>)}</div><p className="mt-3 text-xs text-slate-500">Fora de escopo: {AUDIT_META[auditType].outOfScope}</p></div>)}</div></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input value={plannerAuditVersion} onChange={event => setPlannerAuditVersion(event.target.value)} placeholder="Versão lógica" className="bg-white" /><Input value={plannerLimit} onChange={event => setPlannerLimit(event.target.value)} placeholder="Limite opcional" className="bg-white" /><Input value={plannerQuestionId} onChange={event => setPlannerQuestionId(event.target.value)} placeholder="Question ID opcional" className="bg-white" /><Input value={plannerTimeout} onChange={event => setPlannerTimeout(event.target.value)} placeholder="Timeout em segundos" className="bg-white" /></div>{plannerAudits.includes('render') ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Input value={plannerBaseUrl} onChange={event => setPlannerBaseUrl(event.target.value)} placeholder="Base URL do frontend auditável" className="bg-white" /><Input value={plannerServiceUrl} onChange={event => setPlannerServiceUrl(event.target.value)} placeholder="Service URL do render service" className="bg-white" /><Input value={plannerVariants} onChange={event => setPlannerVariants(event.target.value)} placeholder="Variantes (ex: bank,simulado,review)" className="bg-white" /><Input value={plannerViewports} onChange={event => setPlannerViewports(event.target.value)} placeholder="Viewports (ex: desktop,mobile)" className="bg-white" /></div> : null}<div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">Incluir itens já revisados nesta trilha</p><p className="text-xs text-slate-500">Desative para auditar apenas achados ainda não tratados no fluxo operacional.</p></div><Switch checked={plannerIncludeReviewed} onCheckedChange={setPlannerIncludeReviewed} /></div><div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">Verificar URLs reais no media audit</p><p className="text-xs text-slate-500">Ative quando a execução incluir Asset Audit.</p></div><Switch checked={plannerVerifyUrls} onCheckedChange={setPlannerVerifyUrls} /></div><div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-slate-50"><div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400"><Activity className="h-3.5 w-3.5" />Command Preview</div><pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6">{plannerCommand}</pre></div><div className="flex gap-2"><Button onClick={() => void startRun()} disabled={runSubmitting} className="flex-1 bg-slate-900 text-white hover:bg-slate-800">{runSubmitting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Iniciar auditoria</Button><Button variant="outline" className="bg-white" onClick={() => setRunModalOpen(false)}>Fechar</Button></div></div></DialogContent>
      </Dialog>

      <div ref={drilldownRef}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-slate-700" />
              Drilldown da Questão
            </CardTitle>
            <CardDescription>Detalhe do item selecionado com foco total na questão renderizada.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRow === null ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Selecione uma questão na tabela para abrir o drilldown.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <Badge className={AUDIT_META[selectedRow.audit_type].tone}>{AUDIT_META[selectedRow.audit_type].label}</Badge>
                        <Badge className={classForStatus(selectedRow.status)}>{selectedRow.status}</Badge>
                        <Badge className={classForSeverity(selectedRow.severity)}>{selectedRow.severity}</Badge>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedRow.question?.external_id || selectedRow.question?.id || 'Questão sem ID'}</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedRow.question?.subject || 'Sem matéria'} · {selectedRow.question?.discipline || 'Sem disciplina'} · {selectedRow.question?.difficulty || 'Sem dificuldade'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="bg-white" disabled={!detail?.question || questionSaving || questionPublishingAction !== null} onClick={() => {
                        if (!detail?.question) return;
                        if (questionEditing) {
                          setEditForm(buildEditForm(suggestedFixDecision === 'accepted' && questionForSuggestedFix ? questionForSuggestedFix : detail.question));
                          setQuestionEditing(false);
                          return;
                        }
                        if (detail.suggested_fix && suggestedFixDecision !== 'rejected') {
                          startEditingQuestion('suggested');
                          return;
                        }
                        startEditingQuestion('manual');
                      }}>
                        {questionEditing ? <><X className="mr-2 h-4 w-4" />Cancelar edição</> : <><Edit3 className="mr-2 h-4 w-4" />Editar questão</>}
                      </Button>
                      {questionEditing ? (
                        <Button type="button" className="bg-slate-900 text-white hover:bg-slate-800" disabled={!editForm || questionSaving} onClick={() => void saveQuestionEdits()}>
                          {questionSaving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          Salvar
                        </Button>
                      ) : null}
                      {!questionEditing && detail?.question ? (
                        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={questionPublishingAction !== null} onClick={() => {
                          if (detail?.suggested_fix && suggestedFixDecision !== 'rejected') {
                            void approveSuggestedFix();
                            return;
                          }
                          void approveQuestionManually();
                        }}>
                          {questionPublishingAction === 'approve_fix' || questionPublishingAction === 'approve_manual' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          {detail?.suggested_fix && suggestedFixDecision !== 'rejected' ? 'Aprovar correção' : 'Aprovar manualmente'}
                        </Button>
                      ) : null}
                      {detail?.question ? (
                        <Button type="button" variant="outline" className="bg-white text-amber-700 border-amber-200 hover:bg-amber-50" disabled={questionPublishingAction === 'unpublish' || questionEditing || detail.question.is_verified === false} onClick={() => void unpublishQuestion()}>
                          {questionPublishingAction === 'unpublish' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {detail.question.is_verified === false ? 'Já despublicada' : 'Despublicar questão'}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900">Issue codes</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedRow.issue_codes || []).map(issue => <Badge key={selectedRow.id + '-' + issue} variant="outline" className="bg-white">{issue}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  {detail?.suggested_fix && !questionEditing && suggestedFixDecision !== 'rejected' ? (
                    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-emerald-900">Sugestão de correção</p>
                          <p className="mt-1 text-xs text-emerald-700">Você pode aprovar direto, abrir a edição já com a correção aplicada ou rejeitar a sugestão para editar manualmente.</p>
                        </div>
                        <Badge variant="outline" className="border-emerald-300 bg-white text-emerald-800">
                          {detail.suggested_fix.source_pdf || 'pdf oficial'}{detail.suggested_fix.question_number ? ` · questão ${detail.suggested_fix.question_number}` : ''}
                        </Badge>
                      </div>
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="mb-2 text-xs font-bold uppercase text-emerald-700">Trecho que será inserido</p>
                        <div className="prose prose-sm max-w-none text-emerald-950">
                          <ReactMarkdown>{normalizeSuggestedFixSnippet(detail.suggested_fix.missing_body_text)}</ReactMarkdown>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="bg-white" disabled={questionPublishingAction !== null} onClick={() => startEditingQuestion('suggested')}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Editar com correção
                        </Button>
                        <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={questionPublishingAction !== null} onClick={() => void approveSuggestedFix()}>
                          {questionPublishingAction === 'approve_fix' ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Aprovar direto
                        </Button>
                        <Button type="button" variant="outline" className="bg-white text-slate-700" disabled={questionPublishingAction !== null} onClick={() => startEditingQuestion('manual')}>
                          Rejeitar correção
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {detail?.suggested_fix && suggestedFixDecision === 'rejected' && !questionEditing ? (
                    <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Correção automática rejeitada</p>
                      <p className="mt-1 text-xs text-amber-800">A edição manual está liberada. Salve suas alterações e use “Aprovar manualmente” quando finalizar.</p>
                    </div>
                  ) : null}
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{detail?.suggested_fix && !questionEditing && suggestedFixDecision !== 'rejected' ? 'Prévia da correção' : 'Questão renderizada'}</p>
                      <p className="mt-1 text-xs text-slate-500">{detail?.suggested_fix && !questionEditing && suggestedFixDecision !== 'rejected' ? 'Visualização de como a questão ficará após aplicar a sugestão.' : 'Abra o conteúdo real da questão para inspecionar o problema.'}</p>
                    </div>
                    {!questionEditing ? <Button type="button" variant="ghost" size="sm" className="text-slate-600" onClick={() => setQuestionPreviewOpen(current => !current)}>
                      {questionPreviewOpen ? <><ChevronUp className="mr-1 h-4 w-4" />Ocultar questão</> : <><ChevronDown className="mr-1 h-4 w-4" />Ver questão</>}
                    </Button> : null}
                  </div>
                  {detailLoading && !detail?.question ? <Skeleton className="h-[480px] rounded-xl" /> : questionEditing && editForm ? (
                    <div className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div><label className="text-xs font-bold uppercase text-slate-500">Matéria</label><Input value={editForm.subject} onChange={event => setEditForm({ ...editForm, subject: event.target.value })} className="mt-1 bg-white" /></div>
                        <div><label className="text-xs font-bold uppercase text-slate-500">Disciplina</label><Input value={editForm.discipline} onChange={event => setEditForm({ ...editForm, discipline: event.target.value })} className="mt-1 bg-white" /></div>
                        <div><label className="text-xs font-bold uppercase text-slate-500">Dificuldade</label><Input value={editForm.difficulty} onChange={event => setEditForm({ ...editForm, difficulty: event.target.value })} className="mt-1 bg-white" /></div>
                        <div><label className="text-xs font-bold uppercase text-slate-500">Ano</label><Input type="number" value={editForm.exam_year ?? ''} onChange={event => setEditForm({ ...editForm, exam_year: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1 bg-white" /></div>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Contexto</label>
                        <textarea value={editForm.context} onChange={event => setEditForm({ ...editForm, context: event.target.value })} onKeyDown={event => insertParagraphBreakAtCursor(event, nextValue => setEditForm({ ...editForm, context: nextValue }))} className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Título</label>
                        <textarea value={editForm.title} onChange={event => setEditForm({ ...editForm, title: event.target.value })} onKeyDown={event => insertParagraphBreakAtCursor(event, nextValue => setEditForm({ ...editForm, title: nextValue }))} className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Comando / Introdução</label>
                        <textarea value={editForm.alternatives_intro} onChange={event => setEditForm({ ...editForm, alternatives_intro: event.target.value })} onKeyDown={event => insertParagraphBreakAtCursor(event, nextValue => setEditForm({ ...editForm, alternatives_intro: nextValue }))} className="mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs font-bold uppercase text-slate-500">Imagens da questão</p>
                        <div className="flex flex-col gap-3 md:flex-row">
                          <Input value={newImageUrl} onChange={event => setNewImageUrl(event.target.value)} placeholder="Adicionar URL de imagem" className="bg-white md:flex-1" />
                          <Button type="button" variant="outline" className="bg-white" onClick={() => {
                            const value = newImageUrl.trim();
                            if (!value || !editForm) return;
                            setEditForm({ ...editForm, images: [...editForm.images, value] });
                            setNewImageUrl('');
                          }}>
                            Adicionar imagem
                          </Button>
                        </div>
                        {editForm.images.length > 0 ? <div className="mt-4 flex gap-4 overflow-x-auto pb-2">{editForm.images.map((image, index) => <div key={image + index} className="relative shrink-0"><img src={image} alt={`Imagem ${index + 1}`} className="h-32 w-auto rounded-lg border border-slate-200 object-contain" /><button type="button" onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, currentIndex) => currentIndex !== index) })} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"><X className="h-3 w-3" /></button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Nenhuma imagem vinculada.</p>}
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase text-slate-500">Alternativas</p>
                        {editForm.alternatives.map((alternative, index) => {
                          const isCorrect = editForm.correct_alternative === alternative.letter;
                          return (
                            <div key={alternative.letter} className={`rounded-xl border p-3 ${isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                              <div className="flex items-start gap-3">
                                <button type="button" onClick={() => setEditForm({
                                  ...editForm,
                                  correct_alternative: alternative.letter,
                                  alternatives: editForm.alternatives.map(item => ({ ...item, isCorrect: item.letter === alternative.letter })),
                                })} className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>{alternative.letter}</button>
                                <textarea value={alternative.text} onChange={event => setEditForm({
                                  ...editForm,
                                  alternatives: editForm.alternatives.map((item, currentIndex) => currentIndex === index ? { ...item, text: event.target.value } : item),
                                })} onKeyDown={event => insertParagraphBreakAtCursor(event, nextValue => setEditForm({
                                  ...editForm,
                                  alternatives: editForm.alternatives.map((item, currentIndex) => currentIndex === index ? { ...item, text: nextValue } : item),
                                }))} className="min-h-[72px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Comentário / Raciocínio</label>
                        <textarea value={editForm.ai_reasoning.thought} onChange={event => setEditForm({ ...editForm, ai_reasoning: { thought: event.target.value } })} onKeyDown={event => insertParagraphBreakAtCursor(event, nextValue => setEditForm({ ...editForm, ai_reasoning: { thought: nextValue } }))} className="mt-1 min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400" />
                      </div>
                    </div>
                  ) : questionPreviewOpen ? <QuestionPreview question={suggestedQuestionPreview || detail?.question} /> : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div ref={runConsoleRef} className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-[0.95fr_1.35fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Activity className="h-5 w-5 text-slate-700" />Histórico de Runs</CardTitle><CardDescription>Listagem leve para polling; detalhe pesado só na run selecionada.</CardDescription></CardHeader><CardContent className="space-y-3">{runsLoading && runs.length === 0 ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-xl" />) : runs.slice(0, 8).map(run => <button key={run.run_id} type="button" onClick={() => setSelectedRunId(run.run_id)} className={(selectedRun?.run_id === run.run_id ? 'border-slate-900 bg-slate-900 text-white ' : 'border-slate-200 bg-white hover:bg-slate-50 ') + 'w-full rounded-2xl border p-4 text-left transition-colors'}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className={(selectedRun?.run_id === run.run_id ? 'text-white ' : 'text-slate-900 ') + 'truncate font-semibold'}>{run.audit_version || run.params.audit_version || run.run_id}</p><p className={(selectedRun?.run_id === run.run_id ? 'text-slate-300 ' : 'text-slate-500 ') + 'mt-1 text-xs'}>{formatDateTime(run.started_at)}</p><p className={(selectedRun?.run_id === run.run_id ? 'text-slate-300 ' : 'text-slate-500 ') + 'mt-2 text-xs'}>{run.current_audit || run.progress?.current_audit || 'aguardando trilha'}{(run.current_question_external_id || run.progress?.current_question_external_id) ? ` · ${run.current_question_external_id || run.progress?.current_question_external_id}` : ''}</p></div><Badge className={classForRunStatus(run.status)}>{run.status}</Badge></div></button>)}</CardContent></Card><Card><CardHeader><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><CardTitle className="flex items-center gap-2 text-lg"><TerminalSquare className="h-5 w-5 text-slate-700" />Console do Run</CardTitle><CardDescription>{selectedRun ? (selectedRun.audit_version || selectedRun.params.audit_version || selectedRun.run_id) + ' • ' + selectedRun.status : 'Selecione uma execução para acompanhar'}</CardDescription></div>{selectedRun && selectedRun.status === 'running' ? <Button variant="outline" className="bg-white" disabled={runCancelling} onClick={() => void cancelRun(selectedRun.run_id)}>{runCancelling ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Cancelar run</Button> : null}</div></CardHeader><CardContent className="space-y-4">{selectedRun === null ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">O console aparece aqui assim que houver uma execução iniciada ou selecionada.</div> : <><div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Questão atual</p><p className="mt-2 text-2xl font-bold text-slate-900">{selectedRunCurrentQuestion}</p><p className="mt-2 text-sm text-slate-500">Trilha: <span className="font-medium text-slate-700">{selectedRunCurrentAudit}</span></p></div><div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 font-semibold text-slate-900">{selectedRun.status}</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Progresso</p><p className="mt-2 text-2xl font-bold text-slate-900">{selectedRunProcessed.toLocaleString('pt-BR')} / {selectedRunTotal.toLocaleString('pt-BR')}</p></div>{formatEta(selectedRunEta) ? <Badge variant="outline" className="bg-white">ETA ~ {formatEta(selectedRunEta)}</Badge> : null}</div><Progress value={selectedRunProgressPercent} className="mt-4 h-3" /><p className="mt-3 text-xs text-slate-500">{selectedRunTotal > 0 ? `${selectedRunProgressPercent.toFixed(1)}% concluído` : 'Progresso ainda não reportado por esta trilha.'}</p></div></div>{selectedRun.error_message ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{selectedRun.error_message}</div> : null}<div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-500">{selectedRun.cancellation_requested_at ? 'Cancelamento solicitado em ' + formatDateTime(selectedRun.cancellation_requested_at) : 'Janela de logs sob demanda para evitar payload pesado.'}</div>{selectedRun.log_window?.has_more ? <Button variant="outline" className="bg-white" disabled={runDetailLoading} onClick={() => void fetchRunDetail(selectedRun.run_id, { before: selectedRun.log_window?.next_before || undefined })}>{runDetailLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}Carregar logs anteriores</Button> : null}</div><div className="rounded-2xl border border-slate-900 bg-slate-950 p-4 text-slate-100"><pre className="min-h-[280px] max-h-[520px] overflow-auto whitespace-pre-wrap text-xs leading-6">{(selectedRun.log_window?.items || selectedRun.log_tail || []).join('\n') || 'Sem logs ainda.'}</pre></div></>}</CardContent></Card></div>

      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-slate-700" />Comparativo Entre Runs</CardTitle><CardDescription>Comparação calculada no backend apenas para runs compatíveis.</CardDescription></CardHeader><CardContent>{runComparisonData === null ? <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">Assim que houver pelo menos duas execuções concluídas e compatíveis, o comparativo aparecerá aqui.</div> : <div className="space-y-4"><div className="grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Run atual</p><p className="mt-2 font-semibold text-slate-900">{runComparisonData.current.audit_version || runComparisonData.current.params.audit_version || runComparisonData.current.run_id}</p><p className="mt-2 text-sm text-slate-500">{runComparisonData.current.summary?.flagged_rows || 0} achado(s)</p></div><div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Run anterior</p><p className="mt-2 font-semibold text-slate-900">{runComparisonData.previous.audit_version || runComparisonData.previous.params.audit_version || runComparisonData.previous.run_id}</p><p className="mt-2 text-sm text-slate-500">{runComparisonData.previous.summary?.flagged_rows || 0} achado(s)</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">Delta de achados</p><p className={(runComparisonData.delta.flagged_rows > 0 ? 'text-red-600 ' : runComparisonData.delta.flagged_rows < 0 ? 'text-emerald-600 ' : 'text-slate-900 ') + 'mt-2 text-3xl font-bold'}>{runComparisonData.delta.flagged_rows > 0 ? '+' : ''}{runComparisonData.delta.flagged_rows}</p></div></div><div className="grid grid-cols-1 gap-3 lg:grid-cols-5">{runComparisonData.by_audit_type.map(item => <div key={item.audit_type} className="rounded-2xl border border-slate-200 bg-white p-4"><Badge className={AUDIT_META[item.audit_type].tone}>{AUDIT_META[item.audit_type].label}</Badge><p className="mt-3 text-sm text-slate-500">{item.current_flagged} agora vs {item.previous_flagged} antes</p><p className={(item.delta_flagged > 0 ? 'text-red-600 ' : item.delta_flagged < 0 ? 'text-emerald-600 ' : 'text-slate-900 ') + 'mt-2 text-2xl font-bold'}>{item.delta_flagged > 0 ? '+' : ''}{item.delta_flagged}</p></div>)}</div></div>}</CardContent></Card>
    </div>
  );
}
