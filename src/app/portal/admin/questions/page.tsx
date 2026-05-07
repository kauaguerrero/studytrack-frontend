'use client';

import { Fragment, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
  splitQuestionContextAndSource,
} from '@/components/questions/rendering';
import ReactMarkdown from 'react-markdown';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { formatScientificText } from '@/lib/scientific-text';
import {
  CheckCircle2,
  Trash2,
  Filter,
  Bot,
  Calendar,
  BookOpen,
  AlertCircle,
  ArrowLeft,
  Edit3,
  X,
  Save,
  LoaderCircle,
  ImagePlus,
  ShieldCheck,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// --- TIPAGEM ---
interface Alternative {
  letter: string;
  text: string;
  image?: string | string[] | null;
  file?: string | string[] | null;
  isCorrect?: boolean;
}

interface AdminQuestion {
  id: string;
  external_id: string;
  exam_year: number;
  subject: string;
  discipline?: string;
  difficulty: string;
  title?: string;
  alternatives_intro: string;
  context?: string;
  alternatives: Alternative[];
  correct_alternative: string;
  images: string[];
  is_ai_generated?: boolean;
  ai_reasoning?: {
    thought?: string;
    explanation?: string;
  } | null;
  metadata?: any;
  is_verified?: boolean;
  status?: string;
}

interface AuditQuestionItem {
  id: string;
  audit_type: string;
  status: string;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  issue_codes: string[];
  latest_run_at?: string | null;
  latest_run_version?: string | null;
  latest_report?: any;
  question: AdminQuestion;
}

interface ValidationCheck {
  key: string;
  label: string;
  weight: number;
  score: number;
  status: 'pass' | 'warning' | 'fail';
  summary: string;
  issues: string[];
  hard_block?: boolean;
}

interface QuestionCurationValidation {
  available: boolean;
  source?: string;
  exam_id?: string;
  question_number?: number;
  variant?: string;
  editorial_score?: number;
  editorial_status?: 'green' | 'yellow' | 'red';
  parser_score?: number;
  parser_status?: 'green' | 'yellow' | 'red';
  comparison_confidence?: 'high' | 'reduced' | 'low';
  summary?: string;
  editorial_reasons?: string[];
  parser_reasons?: string[];
  editorial_checks?: ValidationCheck[];
  parser_checks?: ValidationCheck[];
  evidence?: {
    source?: string;
    exam_id?: string;
    question_number?: number;
    variant?: string;
    official_answer?: string | null;
    parser_context?: string | null;
    parser_alternatives_intro?: string | null;
    chunk_image_urls: string[];
    chunk_excerpt?: string;
    detected_flags: string[];
    parser_metrics?: Record<string, number>;
  };
  score?: number;
  status?: 'green' | 'yellow' | 'red';
  reasons?: string[];
  checks?: ValidationCheck[];
  parser_snapshot?: {
    chunk_excerpt?: string;
    parser_context?: string | null;
    parser_alternatives_intro?: string | null;
    chunk_image_urls: string[];
    official_answer?: string | null;
  };
  reason?: string;
}

const markdownImageRegex = /!\[[^\]]*]\((.*?)\)/g;
const mathSegmentRegex = /(\$\$[\s\S]+?(?<!\\)\$\$|\$(?!\$)[\s\S]+?(?<!\\)\$)/g;
const ufuSyntheticTitleRegex = /^Questão\s+\d+\s*-\s*UFU Vestibular\s+\d{4}\/[12]\s*$/i;

function normalizeUrl(raw: string): string | null {
  const cleaned = String(raw || '')
    .trim()
    .replace(/^<|>$/g, '')
    .replace(/^['"]|['"]$/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) return cleaned;
  if (cleaned.startsWith('/storage/v1/object/public/')) return cleaned;
  return null;
}

function extractMarkdownImageUrls(text: string): string[] {
  if (!text) return [];
  const matches = Array.from(text.matchAll(markdownImageRegex));
  return matches
    .map((m) => normalizeUrl(m[1] || ''))
    .filter((url): url is string => Boolean(url));
}

function stripMarkdownImages(text: string): string {
  if (!text) return '';
  return text.replace(markdownImageRegex, '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDuplicatedIntroFromContext(context: string, intro: string): string {
  const cleanContext = stripMarkdownImages(context || '');
  const cleanIntro = stripMarkdownImages(intro || '');
  if (!cleanContext || !cleanIntro) return cleanContext;

  const escapedIntro = escapeRegExp(cleanIntro);
  const duplicatedSuffix = new RegExp(`\\s*${escapedIntro}\\s*$`);
  return cleanContext.replace(duplicatedSuffix, '').trim();
}

function getDisplayTitle(question?: AdminQuestion): string {
  const title = String(question?.title || '').trim();
  if (!title) return '';
  if (question?.metadata?.source === 'UFU_VEST' && ufuSyntheticTitleRegex.test(title)) {
    return '';
  }
  return title;
}

function extractImageUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeUrl(String(item)))
      .filter((url): url is string => Boolean(url));
  }

  if (typeof value !== 'string') return [];
  const raw = value.trim();
  if (!raw) return [];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      return extractImageUrls(parsed);
    } catch {
      // segue para os parsers abaixo
    }
  }

  const mdUrls = extractMarkdownImageUrls(raw);
  if (mdUrls.length > 0) return mdUrls;

  const direct = normalizeUrl(raw);
  return direct ? [direct] : [];
}

function normalizeLatexForKatex(value: string): string {
  return value
    .replace(/\$\$/g, '')
    .replace(/^\$/g, '')
    .replace(/\$$/g, '')
    .trim();
}

function normalizePlainLatexText(value: string): string {
  return normalizeLatexForKatex(value)
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\,/g, ',')
    .replace(/\\:/g, ':')
    .replace(/\\;/g, ';')
    .replace(/\\!/g, '!')
    .replace(/\\\?/g, '?')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyMathSegment(segment: string): boolean {
  const latex = normalizeLatexForKatex(segment);
  if (!latex) return false;

  // Avoid sending currency/price-like fragments to KaTeX.
  if (/^[\d\s.,]+$/.test(latex)) return false;

  if (/[\\^_{}()=<>+\-*/]/.test(latex) || latex.includes('[') || latex.includes(']')) return true;
  if (/[±×÷∑∫√∞≈≠≤≥]/.test(latex)) return true;

  // Allow simple inline variables like $x$ or $y1$.
  if (/^[A-Za-z](?:[A-Za-z0-9]{0,2})?$/.test(latex)) return true;

  // Allow compact algebraic expressions without LaTeX commands.
  if (/^[A-Za-z0-9]+(?:\s*[=+\-*/<>]\s*[A-Za-z0-9]+)+$/.test(latex)) return true;

  return false;
}

function normalizeQuestionText(text?: string | null): string {
  return formatScientificText(text || '');
}

function getQuestionComment(question?: AdminQuestion | null): string {
  const aiReasoning = question?.ai_reasoning;

  if (aiReasoning && typeof aiReasoning === 'object') {
    const thought = typeof aiReasoning.thought === 'string' ? aiReasoning.thought.trim() : '';
    if (thought) return thought;

    const explanation = typeof aiReasoning.explanation === 'string' ? aiReasoning.explanation.trim() : '';
    if (explanation) return explanation;
  }

  return '';
}

function getValidationTone(status?: 'green' | 'yellow' | 'red') {
  switch (status) {
    case 'green':
      return {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-500',
        track: 'bg-emerald-100',
      };
    case 'yellow':
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        bar: 'bg-amber-500',
        track: 'bg-amber-100',
      };
    case 'red':
      return {
        badge: 'border-rose-200 bg-rose-50 text-rose-700',
        bar: 'bg-rose-500',
        track: 'bg-rose-100',
      };
    default:
      return {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        bar: 'bg-amber-500',
        track: 'bg-amber-100',
      };
  }
}

function splitMarkdownTableRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseMarkdownTable(block: string): {
  headers: string[];
  aligns: Array<'left' | 'center' | 'right'>;
  rows: string[][];
} | null {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;
  if (!lines[0].includes('|') || !lines[1].includes('|')) return null;

  const headers = splitMarkdownTableRow(lines[0]);
  const separators = splitMarkdownTableRow(lines[1]);

  if (headers.length === 0 || headers.length !== separators.length) return null;

  const aligns = separators.map((separator) => {
    if (!/^:?-{3,}:?$/.test(separator)) return null;
    const startsWithColon = separator.startsWith(':');
    const endsWithColon = separator.endsWith(':');
    if (startsWithColon && endsWithColon) return 'center';
    if (endsWithColon) return 'right';
    return 'left';
  });

  if (aligns.some((align) => align == null)) return null;

  const rows = lines.slice(2).map(splitMarkdownTableRow);
  if (rows.some((row) => row.length !== headers.length)) return null;

  return {
    headers,
    aligns: aligns as Array<'left' | 'center' | 'right'>,
    rows,
  };
}

function isMarkdownBlock(text: string): boolean {
  return /^\s*(#{1,6}\s|>|\|.*\||[-*+]\s|\d+\.\s|!\[)/m.test(text);
}

function renderInlineRichText(text: string, keyPrefix: string) {
  const segments = text.split(mathSegmentRegex).filter(Boolean);

  return segments.map((segment, segmentIndex) => {
    const previousSegment = segments[segmentIndex - 1] || '';
    const nextSegment = segments[segmentIndex + 1] || '';
    const isMath =
      (segment.startsWith('$$') || (segment.startsWith('$') && segment.endsWith('$'))) &&
      isLikelyMathSegment(segment);

    if (!isMath) {
      if (segment.startsWith('$') && segment.endsWith('$')) {
        const plainText = normalizePlainLatexText(segment);
        return (
          <span
            key={`${keyPrefix}-${segmentIndex}-${segment.slice(0, 20)}`}
            className="whitespace-pre-wrap"
          >
            <ReactMarkdown components={{ p: ({ children }) => <Fragment>{children}</Fragment> }}>
              {plainText}
            </ReactMarkdown>
          </span>
        );
      }

      const lines = segment.split('\n');
      return (
        <span
          key={`${keyPrefix}-${segmentIndex}-${segment.slice(0, 20)}`}
          className="whitespace-pre-wrap"
        >
          {lines.map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 && <br />}
              <ReactMarkdown components={{ p: ({ children }) => <Fragment>{children}</Fragment> }}>
                {line}
              </ReactMarkdown>
            </Fragment>
          ))}
        </span>
      );
    }

    const rawLatex = normalizeLatexForKatex(segment);
    const latex = rawLatex.replace(/(?<!\\)%/g, '\\%');
    const needsLeadingSpace = /\s$/.test(previousSegment);
    const needsTrailingSpace = /^\s/.test(nextSegment);
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: segment.startsWith('$$'),
        output: 'html',
      } as Parameters<typeof katex.renderToString>[1] & {
        output?: 'html' | 'mathml' | 'htmlAndMathml'
      });
      return (
        <Fragment key={`${keyPrefix}-${segmentIndex}-${latex.slice(0, 20)}`}>
          {needsLeadingSpace ? ' ' : null}
          <span
            className="katex-fragment inline-block align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {needsTrailingSpace ? ' ' : null}
        </Fragment>
      );
    } catch {
      return (
        <code
          key={`${keyPrefix}-${segmentIndex}-${latex.slice(0, 20)}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-700"
        >
          {latex}
        </code>
      );
    }
  });
}

function RichText({ text, className }: { text?: string | null; className?: string }) {
  const normalized = normalizeQuestionText(text);
  const paragraphs = useMemo(
    () => normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [normalized],
  );

  return (
    <div className={className}>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const table = parseMarkdownTable(paragraph);
        if (table) {
          return (
            <div key={`${paragraphIndex}-${paragraph.slice(0, 20)}`} className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse rounded-xl border border-slate-300 bg-white text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {table.headers.map((header, headerIndex) => (
                      <th
                        key={`${paragraphIndex}-header-${headerIndex}`}
                        className={`border border-slate-300 px-4 py-2 font-semibold text-slate-900 ${
                          table.aligns[headerIndex] === 'center'
                            ? 'text-center'
                            : table.aligns[headerIndex] === 'right'
                              ? 'text-right'
                              : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={`${paragraphIndex}-row-${rowIndex}`} className="odd:bg-white even:bg-slate-50">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${paragraphIndex}-row-${rowIndex}-cell-${cellIndex}`}
                          className={`border border-slate-300 px-4 py-2 text-slate-700 ${
                            table.aligns[cellIndex] === 'center'
                              ? 'text-center'
                              : table.aligns[cellIndex] === 'right'
                                ? 'text-right'
                                : 'text-left'
                          }`}
                        >
                          {renderInlineRichText(normalizeQuestionText(cell), `${paragraphIndex}-row-${rowIndex}-cell-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (isMarkdownBlock(paragraph)) {
          return (
            <ReactMarkdown
              key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}
              components={{
                img: ({ src, alt }) => (
                  <img
                    src={src || ''}
                    alt={alt || 'Imagem da questão'}
                    className="my-4 h-auto max-h-40 md:max-h-52 w-auto max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm"
                  />
                ),
              }}
            >
              {paragraph}
            </ReactMarkdown>
          );
        }

        const segments = paragraph.split(mathSegmentRegex).filter(Boolean);

        return (
          <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>
            {renderInlineRichText(paragraph, `${paragraphIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [auditItems, setAuditItems] = useState<AuditQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [auditProcessingId, setAuditProcessingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'curation' | 'audit' | 'archived'>('curation');
  const [auditType, setAuditType] = useState<'media' | 'data' | 'classification' | 'render'>('media');
  const [auditSummary, setAuditSummary] = useState<{ totalAudited: number; flagged: number }>({ totalAudited: 0, flagged: 0 });

  // Filtros Locais
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  // Controle de Edição
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<AdminQuestion | null>(null);
  const [validation, setValidation] = useState<QuestionCurationValidation | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [questionPublishingAction, setQuestionPublishingAction] = useState<'approve' | 'delete' | 'archive' | 'unarchive' | null>(null);
  const [archivedQuestions, setArchivedQuestions] = useState<AdminQuestion[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [alternativeImageInputs, setAlternativeImageInputs] = useState<Record<string, string>>({});
  const [alternativeImageUploading, setAlternativeImageUploading] = useState<string | null>(null);

  const supabase = createClient();
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

  const parseQuestionRow = (q: any): AdminQuestion => {
    let parsedAlternatives = [];
    try {
      parsedAlternatives = typeof q.alternatives === 'string'
        ? JSON.parse(q.alternatives)
        : q.alternatives || [];
    } catch (e) {
      console.error(`Erro ao fazer parse das alternativas na questão ${q.id}`, e);
      void reportError("AdminQuestionsParseError", String(e));
    }

    let parsedReasoning = null;
    try {
      if (q.ai_reasoning) {
        if (typeof q.ai_reasoning === 'string') {
          try {
            parsedReasoning = JSON.parse(q.ai_reasoning);
          } catch {
            parsedReasoning = { thought: q.ai_reasoning };
          }
        } else {
          parsedReasoning = q.ai_reasoning;
        }
      }
    } catch (e) {
      console.error(`Erro ao fazer parse do ai_reasoning na questão ${q.id}`, e);
      void reportError("AdminQuestionsParseError", String(e));
    }

    let parsedMetadata = null;
    try {
      if (q.metadata) {
        parsedMetadata = typeof q.metadata === 'string'
          ? JSON.parse(q.metadata)
          : q.metadata;
      }
    } catch (e) {}

    return {
      ...q,
      alternatives: parsedAlternatives,
      ai_reasoning: parsedReasoning,
      metadata: parsedMetadata,
      images: q.images || [],
    };
  };

  // --- DATA FETCHING ---
  const fetchPending = async () => {
    setLoading(true);

    try {
      const PAGE_SIZE = 1000;
      const allData: any[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('is_verified', false)
          .neq('status', 'rejected')
          .neq('status', 'archived')
          .order('created_at', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      setQuestions(allData.map((q: any) => parseQuestionRow(q)));
    } catch (error) {
      console.error("Erro Supabase:", error);
      void reportError("AdminQuestionsFetchError", String(error));
      toast.error("Erro de conexão com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditQueue = async () => {
    setAuditLoading(true);

    try {
      const PAGE_SIZE = 1000;
      const allAuditData: any[] = [];
      let from = 0;

      while (true) {
        const { data: page, error: pageError } = await supabase
          .from('question_audit_results')
          .select(`
            id,
            audit_type,
            status,
            severity,
            issue_codes,
            latest_run_at,
            latest_run_version,
            latest_report,
            questions (*)
          `)
          .eq('audit_type', auditType)
          .neq('status', 'pass')
          .order('updated_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (pageError) throw pageError;
        if (!page || page.length === 0) break;
        allAuditData.push(...page);
        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const [auditedCountRes, flaggedCountRes] = await Promise.all([
        supabase
          .from('question_audit_results')
          .select('id', { count: 'exact', head: true })
          .eq('audit_type', auditType),
        supabase
          .from('question_audit_results')
          .select('id', { count: 'exact', head: true })
          .eq('audit_type', auditType)
          .neq('status', 'pass'),
      ]);

      const mapped: AuditQuestionItem[] = allAuditData
        .filter((row: any) => row.questions)
        .map((row: any) => ({
          id: row.id,
          audit_type: row.audit_type,
          status: row.status,
          severity: row.severity,
          issue_codes: row.issue_codes || [],
          latest_run_at: row.latest_run_at,
          latest_run_version: row.latest_run_version,
          latest_report: row.latest_report,
          question: parseQuestionRow(row.questions),
        }));

      setAuditItems(mapped);
      setAuditSummary({
        totalAudited: auditedCountRes.count || 0,
        flagged: flaggedCountRes.count || 0,
      });
    } catch (error) {
      console.error("Erro audit queue:", error);
      void reportError("AdminQuestionsAuditFetchError", String(error));
      toast.error("Erro ao carregar achados da auditoria.");
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchArchived = async () => {
    setArchivedLoading(true);
    try {
      const PAGE_SIZE = 1000;
      const allData: any[] = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('status', 'archived')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      setArchivedQuestions(allData.map((q: any) => parseQuestionRow(q)));
    } catch (error) {
      console.error("Erro ao buscar arquivadas:", error);
      void reportError("AdminQuestionsArchivedFetchError", String(error));
      toast.error("Erro ao carregar questões arquivadas.");
    } finally {
      setArchivedLoading(false);
    }
  };

  const handleArchive = async (id: string) => {
    const previousQuestions = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== id));
    setCurrentIndex(0);
    setQuestionPublishingAction('archive');

    try {
      const { error } = await supabase
        .from('questions')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;
      toast.success("Questão arquivada.");
      setArchivedQuestions(prev => {
        const archived = previousQuestions.find(q => q.id === id);
        return archived ? [{ ...archived, status: 'archived' }, ...prev] : prev;
      });
    } catch (err: any) {
      setQuestions(previousQuestions);
      void reportError("AdminQuestionsArchiveError", String(err));
      toast.error(`Falha ao arquivar: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setQuestionPublishingAction(null);
    }
  };

  const handleUnarchive = async (id: string) => {
    const previousArchived = [...archivedQuestions];
    setArchivedQuestions(prev => prev.filter(q => q.id !== id));
    setCurrentIndex(0);
    setQuestionPublishingAction('unarchive');

    try {
      const { error } = await supabase
        .from('questions')
        .update({ status: 'active', is_verified: false })
        .eq('id', id);

      if (error) throw error;
      toast.success("Questão devolvida à curadoria.");
      fetchPending();
    } catch (err: any) {
      setArchivedQuestions(previousArchived);
      void reportError("AdminQuestionsUnarchiveError", String(err));
      toast.error(`Falha ao desarquivar: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setQuestionPublishingAction(null);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchAuditQueue();
  }, []);

  useEffect(() => {
    if (mode === 'audit') {
      fetchAuditQueue();
    } else if (mode === 'archived') {
      fetchArchived();
    }
  }, [auditType, mode]);

  // --- ACTIONS ---
  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    // 1. Optimistic Update (Padrão de Fila - Remove o item imediatamente da UI)
    const previousQuestions = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== id));
    setCurrentIndex(0);
    setProcessingId(id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida");

      if (decision === 'reject') {
        // DELETE SUPREMO (O Banco de Dados fará o CASCADE automaticamente agora)
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success("Questão removida permanentemente de todo o sistema.");
        setAuditItems(prev => prev.filter(item => item.question.id !== id));

      } else {
        // UPDATE: Aprova
        const { error } = await supabase
          .from('questions')
          .update({
            is_verified: true,
            status: 'active',
            verified_by: user.id
          })
          .eq('id', id);

        if (error) throw error;
        toast.success("Questão aprovada e publicada!");
        setAuditItems(prev => prev.map(item => (
          item.question.id === id
            ? { ...item, question: { ...item.question, is_verified: true, status: 'active' } }
            : item
        )));
      }

    } catch (err: any) {
      // Rollback UI
      console.error("ERRO DETALHADO:", JSON.stringify(err, null, 2));
      void reportError("AdminQuestionsEditError", String(err));
      const errorMessage = err?.message || "Erro desconhecido";

      setQuestions(previousQuestions);
      toast.error(`Falha: ${errorMessage}`);
    } finally {
      setProcessingId(null);
      setQuestionPublishingAction(null);
    }
  };

  const startEditing = () => {
    if (!activeQuestion) return;
    setEditForm(JSON.parse(JSON.stringify(activeQuestion)));
    setAlternativeImageInputs({});
    setAlternativeImageUploading(null);
    setNewImageUrl('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm(null);
    setAlternativeImageInputs({});
    setAlternativeImageUploading(null);
    setNewImageUrl('');
    setIsEditing(false);
  };

  const saveEditing = async () => {
    if (!editForm) return;
    setProcessingId(editForm.id);

    try {
      const payload = {
        subject: editForm.subject,
        discipline: editForm.discipline,
        difficulty: editForm.difficulty,
        exam_year: editForm.exam_year,
        title: editForm.title,
        alternatives_intro: editForm.alternatives_intro,
        context: editForm.context,
        alternatives: editForm.alternatives.map(alt => ({
          ...alt,
          isCorrect: alt.letter === editForm.correct_alternative,
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

      // Update local state directly
      setQuestions(prev => prev.map(q => q.id === editForm.id ? { ...q, ...payload } : q));
      setAuditItems(prev => prev.map(item => (
        item.question.id === editForm.id
          ? { ...item, question: { ...item.question, ...payload } }
          : item
      )));
      toast.success("Edições salvas! Revise e aprove a questão.");
      setIsEditing(false);
      setEditForm(null);
      setAlternativeImageInputs({});
      setAlternativeImageUploading(null);
      setNewImageUrl('');
    } catch (err: any) {
      console.error("Erro ao salvar edição:", err);
      void reportError("AdminQuestionsEditError", String(err));
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const importAlternativeImage = async (alternativeIndex: number) => {
    if (!editForm || !activeQuestion) return;
    const alternative = editForm.alternatives[alternativeIndex];
    if (!alternative) return;

    const imageUrl = (alternativeImageInputs[alternative.letter] || '').trim();
    if (!imageUrl) {
      toast.error('Informe a URL da imagem da alternativa.');
      return;
    }

    setAlternativeImageUploading(alternative.letter);
    try {
      const response = await fetch('/api/admin/question-audits/upload-alternative-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          questionId: editForm.id,
          externalId: activeQuestion.external_id || editForm.id,
          alternativeLetter: alternative.letter,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao importar imagem da alternativa');
      }

      const publicUrl = String(payload?.publicUrl || '').trim();
      if (!publicUrl) throw new Error('URL pública da imagem não retornada.');

      setEditForm(current => {
        if (!current) return current;
        return {
          ...current,
          alternatives: current.alternatives.map((item, currentIndex) => (
            currentIndex === alternativeIndex
              ? { ...item, image: publicUrl }
              : item
          )),
        };
      });
      setAlternativeImageInputs(current => ({ ...current, [alternative.letter]: '' }));
      toast.success(`Imagem vinculada à alternativa ${alternative.letter}.`);
    } catch (error: any) {
      console.error('Erro ao importar imagem da alternativa:', error);
      void reportError('AdminQuestionsAlternativeImageImportError', String(error));
      toast.error(String(error?.message || error));
    } finally {
      setAlternativeImageUploading(null);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const source = q.metadata?.source || 'UNKNOWN';
      const matchSource = filterSource === 'all' || source === filterSource;
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      const matchYear = filterYear === 'all' || String(q.exam_year) === filterYear;
      return matchSource && matchSubject && matchDifficulty && matchYear;
    });
  }, [questions, filterSource, filterSubject, filterDifficulty, filterYear]);

  const filteredAuditItems = useMemo(() => {
    return auditItems.filter(item => {
      const q = item.question;
      const source = q.metadata?.source || 'UNKNOWN';
      const matchSource = filterSource === 'all' || source === filterSource;
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      const matchYear = filterYear === 'all' || String(q.exam_year) === filterYear;
      return matchSource && matchSubject && matchDifficulty && matchYear;
    });
  }, [auditItems, filterSource, filterSubject, filterDifficulty, filterYear]);

  const filteredArchived = useMemo(() => {
    return archivedQuestions.filter(q => {
      const source = q.metadata?.source || 'UNKNOWN';
      const matchSource = filterSource === 'all' || source === filterSource;
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      const matchYear = filterYear === 'all' || String(q.exam_year) === filterYear;
      return matchSource && matchSubject && matchDifficulty && matchYear;
    });
  }, [archivedQuestions, filterSource, filterSubject, filterDifficulty, filterYear]);

  const activeList = mode === 'audit' ? auditItems.map(i => i.question) : mode === 'archived' ? archivedQuestions : questions;

  const sources = Array.from(
    new Set(activeList.map(q => q.metadata?.source || 'UNKNOWN'))
  ).filter(Boolean).sort();

  const subjects = Array.from(
    new Set(activeList.map(q => q.subject))
  ).filter(Boolean).sort();

  const years = Array.from(
    new Set(activeList.map(q => q.exam_year))
  ).filter(Boolean).sort((a, b) => b - a);

  // Índice para navegação por setas (seta esq/dir)
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItems = mode === 'audit' ? filteredAuditItems : mode === 'archived' ? filteredArchived : filteredQuestions;
  const activeAuditItem = filteredAuditItems.length
    ? filteredAuditItems[Math.min(currentIndex, filteredAuditItems.length - 1)]
    : undefined;
  const activeQuestion = mode === 'audit'
    ? activeAuditItem?.question
    : mode === 'archived'
      ? (filteredArchived.length ? filteredArchived[Math.min(currentIndex, filteredArchived.length - 1)] : undefined)
      : (filteredQuestions.length ? filteredQuestions[Math.min(currentIndex, filteredQuestions.length - 1)] : undefined);
  const activeQuestionContextText = useMemo(
    () => splitQuestionContextAndSource(activeQuestion?.context || '').body,
    [activeQuestion?.context],
  );
  const activeQuestionSourceText = useMemo(
    () => splitQuestionContextAndSource(activeQuestion?.context || '').source || '',
    [activeQuestion?.context],
  );
  const activeQuestionStatementText = useMemo(
    () => activeQuestion?.alternatives_intro || '',
    [activeQuestion?.alternatives_intro],
  );
  const activeQuestionDisplayTitle = useMemo(
    () => getDisplayTitle(activeQuestion),
    [activeQuestion],
  );
  const activeQuestionComment = useMemo(
    () => getQuestionComment(activeQuestion),
    [activeQuestion],
  );
  const activeQuestionSupportImages = useMemo(() => {
    if (!activeQuestion) return [];
    return extractDetachedQuestionImageUrls(
      activeQuestion.images,
      activeQuestion.context,
      activeQuestion.alternatives_intro,
    );
  }, [activeQuestion]);
  const activeValidationStatus = validation?.editorial_status || validation?.status || 'red';
  const activeValidationScore = typeof validation?.editorial_score === 'number'
    ? validation.editorial_score
    : typeof validation?.score === 'number'
      ? validation.score
      : 0;
  const validationAvailable = validation?.available ?? false;
  const activeValidationTone = getValidationTone(activeValidationStatus);
  const activeParserStatus = validation?.parser_status || 'red';
  const activeParserScore = typeof validation?.parser_score === 'number' ? validation.parser_score : 0;
  const activeParserTone = getValidationTone(activeParserStatus);
  const comparisonConfidence = validation?.comparison_confidence || (validation?.available ? 'high' : 'low');
  const editorialChecks = validation?.editorial_checks || validation?.checks || [];
  const parserChecks = validation?.parser_checks || [];
  const editorialReasons = validation?.editorial_reasons || validation?.reasons || [];
  const parserReasons = validation?.parser_reasons || [];
  const validationEvidenceSource = validation?.evidence?.source || activeQuestion?.metadata?.source || 'UNKNOWN';
  const validationEvidenceExamId = validation?.evidence?.exam_id || activeQuestion?.external_id;
  const validationOfficialAnswer = validation?.evidence?.official_answer || validation?.parser_snapshot?.official_answer || null;
  const validationChunkImageUrls = validation?.evidence?.chunk_image_urls || validation?.parser_snapshot?.chunk_image_urls || [];
  const validationParserIntro = validation?.evidence?.parser_alternatives_intro || validation?.parser_snapshot?.parser_alternatives_intro || null;
  const validationParserContext = validation?.evidence?.parser_context || validation?.parser_snapshot?.parser_context || null;
  const validationChunkExcerpt = validation?.evidence?.chunk_excerpt || validation?.parser_snapshot?.chunk_excerpt || '';
  const validationDetectedFlags = validation?.evidence?.detected_flags || [];
  const validationParserMetrics = validation?.evidence?.parser_metrics || null;

  useEffect(() => {
    let cancelled = false;

    const fetchValidation = async () => {
      if (!activeQuestion?.id || isEditing) {
        setValidation(null);
        setValidationError(null);
        setValidationLoading(false);
        return;
      }

      setValidationLoading(true);
      setValidationError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const response = await fetch(`${apiUrl}/api/enterprise/assessment/admin/questions/${activeQuestion.id}/curation-validation`, {
          headers,
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          const message = payload?.error || payload?.message || `Falha ao carregar validação (HTTP ${response.status}).`;
          setValidation(null);
          setValidationError(message);
          return;
        }

        const nextValidation = payload?.validation || null;
        setValidation(nextValidation);
        if (!nextValidation?.available) {
          setValidationError(
            nextValidation?.reason
            || nextValidation?.editorial_reasons?.[0]
            || nextValidation?.reasons?.[0]
            || payload?.error
            || 'Validação estrutural indisponível para esta questão.'
          );
        }
      } catch (error: any) {
        if (cancelled) return;
        setValidation(null);
        setValidationError(error?.message || 'Falha ao carregar validação estrutural.');
      } finally {
        if (!cancelled) setValidationLoading(false);
      }
    };

    void fetchValidation();
    return () => {
      cancelled = true;
    };
  }, [activeQuestion?.id, isEditing, apiUrl, supabase]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsEditing(false);
    setEditForm(null);
    setAlternativeImageInputs({});
    setAlternativeImageUploading(null);
    setNewImageUrl('');
  }, [mode]);

  // --- KEYBOARD SHORTCUTS (UX/UI B2B Flow) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';

      if (isSaveShortcut && isEditing && editForm && !processingId) {
        e.preventDefault();
        void saveEditing();
        return;
      }

      if (!activeQuestion || processingId || auditProcessingId || questionPublishingAction !== null) return;

      if (isTyping || isEditing) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(i => Math.min(i + 1, currentItems.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(i => Math.max(0, i - 1));
      } else if (mode === 'curation' && e.key === 'Enter') {
        e.preventDefault();
        setQuestionPublishingAction('approve');
        handleDecision(activeQuestion.id, 'approve');
      } else if (mode === 'curation' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        setQuestionPublishingAction('delete');
        handleDecision(activeQuestion.id, 'reject');
      } else if (mode === 'curation' && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        void handleArchive(activeQuestion.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, processingId, auditProcessingId, isEditing, editForm, currentItems.length, mode, questionPublishingAction]);

  const moveQuestionToCuration = async (questionId: string) => {
    setAuditProcessingId(questionId);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_verified: false, status: 'audit_flagged' })
        .eq('id', questionId);

      if (error) throw error;

      setAuditItems(prev => prev.map(item => (
        item.question.id === questionId
          ? { ...item, question: { ...item.question, is_verified: false, status: 'audit_flagged' } }
          : item
      )));
      toast.success("Questão movida para curadoria.");
      fetchPending();
    } catch (err: any) {
      console.error("Erro ao mover para curadoria:", err);
      void reportError("AdminQuestionsMoveToCurationError", String(err));
      toast.error(`Falha ao mover: ${err.message}`);
    } finally {
      setAuditProcessingId(null);
    }
  };

  // --- RENDER HELPERS ---
  const getDifficultyColor = (diff: string) => {
    if (!diff) return 'bg-slate-100 text-slate-700';
    switch (diff.toLowerCase()) {
      case 'fácil': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'médio': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'difícil': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getSeverityColor = (severity: AuditQuestionItem['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const queueLabel = currentItems.length > 0
    ? `${currentIndex + 1} de ${currentItems.length} na fila`
    : '0 na fila';
  const activeSource = activeQuestion?.metadata?.source || 'UNKNOWN';
  const activeQuestionVariant = activeQuestion?.metadata?.tipo || validation?.variant || '';
  const modeTitle = mode === 'curation' ? 'Curadoria' : mode === 'audit' ? 'Auditoria' : 'Arquivados';
  const modeBadge = mode === 'curation' ? 'Workspace Editorial' : mode === 'audit' ? 'Qualidade & Diagnóstico' : 'Histórico';
  const modeDescription = mode === 'curation'
    ? 'Revise questões com foco em leitura, edição e publicação rápida.'
    : mode === 'audit'
      ? 'Inspecione achados automatizados antes de devolver ou publicar.'
      : 'Recupere itens arquivados sem perder o contexto editorial.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-2 font-sans text-slate-900 md:p-4 xl:p-6">
      <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-4">

        {/* --- HEADER & TOOLBAR --- */}
        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,_rgba(15,23,42,0.04),_rgba(59,130,246,0.06))] px-3 py-4 md:px-5 lg:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex items-start gap-4">
                <Link href="/portal/admin">
                  <Button variant="outline" size="icon" className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white/90 hover:bg-white hover:text-slate-900">
                    <ArrowLeft size={20} />
                  </Button>
                </Link>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-900">
                      Portal Admin
                    </Badge>
                    <Badge variant="secondary" className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">
                      {modeBadge}
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-[1.65rem] font-bold tracking-tight text-slate-950 md:text-[2rem]">
                      {modeTitle}
                    </h1>
                    <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-600 md:text-sm">
                      {modeDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:min-w-[400px]">
                <div className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Posição Atual</p>
                  <div className="mt-2 flex items-center gap-2 text-slate-900">
                    <div className={`h-2.5 w-2.5 rounded-full ${currentItems.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <p className="text-base font-semibold">{queueLabel}</p>
                  </div>
                </div>

                <div className={`rounded-xl border px-3.5 py-2.5 shadow-sm ${
                  mode === 'audit'
                    ? 'border-amber-200 bg-amber-50/80'
                    : mode === 'archived'
                      ? 'border-slate-200 bg-slate-100/80'
                      : 'border-emerald-200 bg-emerald-50/80'
                }`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {mode === 'audit' ? 'Cobertura da Auditoria' : mode === 'archived' ? 'Arquivo' : 'Ritmo da Curadoria'}
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {mode === 'audit'
                      ? `${auditSummary.flagged} achado(s) em ${auditSummary.totalAudited}`
                      : mode === 'archived'
                        ? `${filteredArchived.length} item(ns) visíveis`
                        : `${filteredQuestions.length} pendente(s) nos filtros`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 md:px-5 lg:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={mode === 'curation' ? 'default' : 'outline'}
                  className={mode === 'curation' ? 'h-9 rounded-xl bg-slate-900 px-3 text-sm text-white hover:bg-slate-800' : 'h-9 rounded-xl bg-white px-3 text-sm'}
                  onClick={() => setMode('curation')}
                >
                  Curadoria
                </Button>
                <Button
                  variant={mode === 'audit' ? 'default' : 'outline'}
                  className={mode === 'audit' ? 'h-9 rounded-xl bg-slate-900 px-3 text-sm text-white hover:bg-slate-800' : 'h-9 rounded-xl bg-white px-3 text-sm'}
                  onClick={() => setMode('audit')}
                >
                  Auditoria
                </Button>
                <Button
                  variant={mode === 'archived' ? 'default' : 'outline'}
                  className={mode === 'archived' ? 'h-9 rounded-xl bg-slate-500 px-3 text-sm text-white hover:bg-slate-600' : 'h-9 rounded-xl bg-white px-3 text-sm'}
                  onClick={() => setMode('archived')}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivados
                </Button>
              </div>

              {mode === 'audit' && (
                <div className="flex flex-wrap gap-2">
                  <Button variant={auditType === 'media' ? 'default' : 'outline'} className={auditType === 'media' ? 'h-9 rounded-xl bg-amber-600 px-3 text-sm text-white hover:bg-amber-700' : 'h-9 rounded-xl bg-white px-3 text-sm'} onClick={() => setAuditType('media')}>
                    Asset Audit
                  </Button>
                  <Button variant={auditType === 'data' ? 'default' : 'outline'} className={auditType === 'data' ? 'h-9 rounded-xl bg-amber-600 px-3 text-sm text-white hover:bg-amber-700' : 'h-9 rounded-xl bg-white px-3 text-sm'} onClick={() => setAuditType('data')}>
                    Data Audit
                  </Button>
                  <Button variant={auditType === 'classification' ? 'default' : 'outline'} className={auditType === 'classification' ? 'h-9 rounded-xl bg-amber-600 px-3 text-sm text-white hover:bg-amber-700' : 'h-9 rounded-xl bg-white px-3 text-sm'} onClick={() => setAuditType('classification')}>
                    Classification Audit
                  </Button>
                  <Button variant={auditType === 'render' ? 'default' : 'outline'} className={auditType === 'render' ? 'h-9 rounded-xl bg-amber-600 px-3 text-sm text-white hover:bg-amber-700' : 'h-9 rounded-xl bg-white px-3 text-sm'} onClick={() => setAuditType('render')}>
                    Render Audit
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  <Select value={filterSubject} onValueChange={setFilterSubject} disabled={isEditing}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm">
                      <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
                      <SelectValue placeholder="Matéria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Matérias</SelectItem>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={filterSource} onValueChange={setFilterSource} disabled={isEditing}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Origens</SelectItem>
                      {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty} disabled={isEditing}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm">
                      <SelectValue placeholder="Dificuldade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Dific.</SelectItem>
                      <SelectItem value="Fácil">Fácil</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Difícil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterYear} onValueChange={setFilterYear} disabled={isEditing}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Anos</SelectItem>
                      {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Atalhos</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Navegue com <span className="font-semibold text-slate-800">←</span> e <span className="font-semibold text-slate-800">→</span>.
                    {mode === 'curation' ? ' Aprove aprovação com Enter, delete com Delete e arquivo com A.' : ''}
                    {isEditing ? ' Salve rapidamente com Ctrl/Cmd + S.' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- CONTENT AREA: THE QUEUE --- */}
        <div className="flex flex-col">
          {(mode === 'curation' ? loading : mode === 'archived' ? archivedLoading : auditLoading) ? (
            <Card className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
              <CardHeader className="border-b border-slate-100 p-6">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="p-8 flex-1 space-y-6">
                <Skeleton className="h-32 w-full" />
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : !activeQuestion ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm animate-in fade-in zoom-in duration-300">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ring-8 ${mode === 'archived' ? 'bg-slate-50 ring-slate-50/50' : 'bg-emerald-50 ring-emerald-50/50'}`}>
                {mode === 'archived'
                  ? <Archive size={40} className="text-slate-400" />
                  : <CheckCircle2 size={40} className="text-emerald-500" />}
              </div>
              <h3 className="text-2xl font-bold text-slate-900">
                {mode === 'curation' ? 'Fila Limpa!' : mode === 'audit' ? 'Auditoria Limpa!' : 'Arquivo Vazio'}
              </h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">
                {mode === 'curation'
                  ? 'Nenhuma questão pendente para os filtros atuais. A curadoria está em dia.'
                  : mode === 'audit'
                    ? 'Nenhum achado aberto para os filtros atuais. A auditoria está em dia.'
                    : 'Nenhuma questão arquivada para os filtros atuais.'}
              </p>
              {(filterSource !== 'all' || filterSubject !== 'all' || filterDifficulty !== 'all' || filterYear !== 'all') && (
                <Button variant="link" onClick={() => { setFilterSource('all'); setFilterSubject('all'); setFilterDifficulty('all'); setFilterYear('all'); }} className="mt-4 text-blue-600">
                  Limpar filtros e ver tudo
                </Button>
              )}
              <Button
                onClick={mode === 'curation' ? fetchPending : mode === 'archived' ? fetchArchived : fetchAuditQueue}
                variant="outline"
                className="mt-6 border-slate-300 text-slate-600"
              >
                Recarregar Base
              </Button>
            </div>
          ) : (
            /* ACTIVE QUESTION CARD */
            <Card
              key={activeQuestion.id}
              className="group relative flex w-full animate-in flex-col rounded-[24px] border border-slate-200/80 bg-white shadow-[0_24px_72px_-36px_rgba(15,23,42,0.42)] slide-in-from-right-8 fade-in duration-300"
            >

              {/* HEADER DA QUESTÃO */}
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.95),_rgba(239,246,255,0.9))] px-3 py-4 md:px-5 lg:px-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-blue-700">
                          {activeQuestion.subject}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                          {activeSource}
                        </Badge>
                        {activeQuestionVariant && (
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                            {activeQuestionVariant}
                          </Badge>
                        )}
                        {activeQuestion.discipline && (
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                            {activeQuestion.discipline}
                          </Badge>
                        )}
                        <Badge variant="outline" className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getDifficultyColor(activeQuestion.difficulty)}`}>
                          {activeQuestion.difficulty}
                        </Badge>
                        {activeQuestion.exam_year && (
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-2.5 py-1 text-[10px] text-slate-600">
                            <Calendar size={12} className="mr-1" /> {activeQuestion.exam_year}
                          </Badge>
                        )}
                        {activeQuestion.is_ai_generated && (
                          <Badge className="rounded-full border border-purple-200 bg-purple-100 px-2.5 py-1 text-[10px] text-purple-700 hover:bg-purple-200">
                            <Bot size={12} className="mr-1" /> IA Gerada
                          </Badge>
                        )}
                        {mode === 'audit' && activeAuditItem && (
                          <>
                            <Badge variant="outline" className={`rounded-full ${getSeverityColor(activeAuditItem.severity)}`}>
                              Auditoria {activeAuditItem.severity}
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-600">
                              {activeAuditItem.issue_codes.length} achado(s)
                            </Badge>
                          </>
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-950 md:text-[1.35rem]">
                          {activeQuestionDisplayTitle || activeQuestion.alternatives_intro || 'Questão em revisão'}
                        </h2>
                        <p className="mt-1 text-[13px] leading-5 text-slate-600">
                          Leia, edite e publique sem perder o contexto da prova e do parser.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/90 px-3.5 py-3 shadow-sm lg:min-w-[220px]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identificador</p>
                      <p className="mt-2 break-all font-mono text-xs text-slate-600">
                        {activeQuestion.external_id || activeQuestion.id.substring(0, 8)}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Fila</p>
                          <p className="mt-1 font-semibold text-slate-900">{queueLabel}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Modo</p>
                          <p className="mt-1 font-semibold text-slate-900">{modeTitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* CONTEÚDO (MUDANÇA ENTRE MODO DE EXIBIÇÃO E EDIÇÃO) */}
              {isEditing && editForm ? (
                <div className="space-y-5 bg-slate-50/40 px-3 py-5 md:px-5 lg:px-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">Editor de curadoria</p>
                    <p className="mt-1">Use `Ctrl/Cmd + S` para salvar. Clique na letra da alternativa para definir o gabarito.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Matéria</label>
                      <Input value={editForm.subject || ''} onChange={e => setEditForm({ ...editForm, subject: e.target.value })} className="mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Disciplina</label>
                      <Input value={editForm.discipline || ''} onChange={e => setEditForm({ ...editForm, discipline: e.target.value })} className="mt-1 bg-white" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Dificuldade</label>
                      <select
                        value={editForm.difficulty || ''}
                        onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:border-slate-500"
                      >
                        <option value="Fácil">Fácil</option>
                        <option value="Médio">Médio</option>
                        <option value="Difícil">Difícil</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-slate-500">Ano</label>
                      <Input type="number" value={editForm.exam_year || ''} onChange={e => setEditForm({ ...editForm, exam_year: parseInt(e.target.value) || 0 })} className="mt-1 bg-white" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Contexto / Texto Base</label>
                    <textarea
                      value={editForm.context || ''}
                      onChange={e => setEditForm({ ...editForm, context: e.target.value })}
                      rows={6}
                      className="mt-1 min-h-[140px] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Título</label>
                    <textarea
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      rows={3}
                      className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Comando / Introdução das alternativas</label>
                    <textarea
                      value={editForm.alternatives_intro || ''}
                      onChange={e => setEditForm({ ...editForm, alternatives_intro: e.target.value })}
                      rows={3}
                      className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="text-xs font-bold uppercase text-slate-500">Imagens da questão</label>
                    <div className="mt-3 flex flex-col gap-3 md:flex-row">
                      <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="Adicionar URL de imagem" className="bg-white md:flex-1" />
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-white"
                        onClick={() => {
                          const value = newImageUrl.trim();
                          if (!value) return;
                          setEditForm({ ...editForm, images: [...(editForm.images || []), value] });
                          setNewImageUrl('');
                        }}
                      >
                        Adicionar imagem
                      </Button>
                    </div>
                    {editForm.images?.length ? (
                      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                        {editForm.images.map((img, i) => (
                          <div key={img + i} className="relative shrink-0">
                            <img src={img} className="h-32 w-auto rounded-lg border border-slate-200 object-contain" alt={`Imagem ${i + 1}`} />
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, idx) => idx !== i) })}
                              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">Nenhuma imagem vinculada.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase text-slate-500">Alternativas</label>
                    {editForm.alternatives?.map((alt, i) => {
                      const isSelected = editForm.correct_alternative === alt.letter;
                      const alternativeImages = extractAlternativeImageUrls(alt);
                      const isUploading = alternativeImageUploading === alt.letter;
                      return (
                        <div key={alt.letter} className={`rounded-2xl border p-4 ${isSelected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const nextAlternatives = editForm.alternatives.map(item => ({ ...item, isCorrect: item.letter === alt.letter }));
                                setEditForm({ ...editForm, correct_alternative: alt.letter, alternatives: nextAlternatives });
                              }}
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${isSelected ? 'border-emerald-600 bg-emerald-500 text-white' : 'border-slate-300 bg-slate-100 text-slate-700'}`}
                            >
                              {alt.letter}
                            </button>
                            <textarea
                              value={alt.text}
                              onChange={e => {
                                const nextAlternatives = [...editForm.alternatives];
                                nextAlternatives[i].text = e.target.value;
                                setEditForm({ ...editForm, alternatives: nextAlternatives });
                              }}
                              rows={3}
                              className="min-h-[84px] flex-1 rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-slate-400"
                              placeholder={`Texto da alternativa ${alt.letter}`}
                            />
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                            <div className="flex flex-col gap-3 md:flex-row">
                              <Input
                                value={alternativeImageInputs[alt.letter] || ''}
                                onChange={e => setAlternativeImageInputs(current => ({ ...current, [alt.letter]: e.target.value }))}
                                placeholder={`URL da imagem da alternativa ${alt.letter}`}
                                className="bg-white md:flex-1"
                              />
                              <Button type="button" variant="outline" className="bg-white" disabled={isUploading} onClick={() => void importAlternativeImage(i)}>
                                {isUploading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                                Inserir imagem
                              </Button>
                            </div>
                            {alternativeImages.length > 0 ? (
                              <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                                {alternativeImages.map((img, index) => (
                                  <div key={`${alt.letter}-${img}-${index}`} className="relative shrink-0">
                                    <img src={img} alt={`Alternativa ${alt.letter}`} className="h-28 w-auto rounded-lg border border-slate-200 object-contain" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextAlternatives = [...editForm.alternatives];
                                        nextAlternatives[i] = { ...nextAlternatives[i], image: null, file: null };
                                        setEditForm({ ...editForm, alternatives: nextAlternatives });
                                      }}
                                      className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm text-slate-500">Nenhuma imagem vinculada a esta alternativa.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-purple-600">Comentário do professor (`ai_reasoning`)</label>
                    <textarea
                      value={editForm.ai_reasoning?.thought || ''}
                      onChange={e => setEditForm({ ...editForm, ai_reasoning: { ...editForm.ai_reasoning, thought: e.target.value } })}
                      rows={5}
                      className="mt-1 min-h-[128px] w-full rounded-xl border border-purple-200 bg-purple-50/40 p-3 font-mono text-sm outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-3 py-5 md:px-5 lg:px-6">
                  <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(390px,0.9fr)] xl:gap-6">
                    <div className="space-y-8 min-w-0">

                  {mode === 'audit' && activeAuditItem && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-700" />
                        <span className="text-sm font-bold text-amber-900 uppercase tracking-wider">Achados da Auditoria</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeAuditItem.issue_codes.map(code => (
                          <Badge key={code} variant="outline" className="bg-white border-amber-200 text-amber-800">
                            {code}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-amber-900">
                        Última execução: {activeAuditItem.latest_run_at ? new Date(activeAuditItem.latest_run_at).toLocaleString('pt-BR') : 'N/A'}
                        {activeAuditItem.latest_run_version ? ` • versão ${activeAuditItem.latest_run_version}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Contexto */}
                  {activeQuestionContextText && (
                    <div className="relative rounded-[24px] border border-slate-200 bg-slate-50/80 px-4 py-4 md:px-5">
                      <div className="absolute -left-3 top-5 bg-white text-slate-400 p-1.5 rounded-full border border-slate-200 shadow-sm">
                        <BookOpen size={16} />
                      </div>
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Contexto</p>
                      <div className="prose prose-slate max-w-none text-slate-600 italic leading-relaxed text-[15px]">
                        <RichText text={activeQuestionContextText} />
                      </div>
                    </div>
                  )}

                  {activeQuestionSourceText && (
                    <div className="-mt-4 prose prose-slate max-w-none text-[12px] leading-relaxed text-slate-500">
                      <RichText text={activeQuestionSourceText} />
                    </div>
                  )}

                  {/* Imagens de Apoio */}
                  {activeQuestionSupportImages.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                      {activeQuestionSupportImages.map((img, i) => (
                        <div key={i} className="relative shrink-0 snap-center group/img">
                          <img
                            src={img}
                            alt={`Apoio ${i}`}
                            className="max-h-40 md:max-h-52 w-auto max-w-full rounded-xl border border-slate-200 object-contain shadow-sm hover:shadow-md transition-all cursor-zoom-in"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comando da Questão */}
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Enunciado</p>
                    <div className="prose prose-slate prose-lg max-w-none text-slate-900 font-medium leading-relaxed">
                      <RichText text={activeQuestionStatementText} />
                    </div>
                  </div>

                  {/* Bloco de Alternativas */}
                  <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Alternativas</h4>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                        {activeQuestion.alternatives?.length || 0} opção(ões)
                      </span>
                    </div>
                    {activeQuestion.alternatives && activeQuestion.alternatives.length > 0 ? (
                      activeQuestion.alternatives.map((alt) => {
                        const normalizedCorrect = String(activeQuestion.correct_alternative || '').toUpperCase();
                        const fallbackCorrect = activeQuestion.alternatives.filter(a => a.isCorrect === true);
                        const isCorrect = normalizedCorrect
                          ? String(alt.letter || '').toUpperCase() === normalizedCorrect
                          : (fallbackCorrect.length === 1 && fallbackCorrect[0].letter === alt.letter);
                        const alternativeImages = extractAlternativeImageUrls(alt);
                        const alternativeText = alt.text || '';

                        return (
                          <div
                            key={alt.letter}
                            className={`
                              relative flex items-center gap-4 p-4 rounded-xl border transition-all
                              ${isCorrect
                                ? 'bg-emerald-50/50 border-emerald-300 shadow-sm ring-1 ring-emerald-100'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }
                            `}
                          >
                            <div className={`
                               shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm border
                               ${isCorrect
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                              }
                            `}>
                              {alt.letter}
                            </div>
                            <div className={`flex-1 text-[15px] leading-snug ${isCorrect ? 'text-emerald-950 font-medium' : 'text-slate-700'}`}>
                              {alternativeImages.length > 0 && (
                                <div className="mb-3 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                  {alternativeImages.map((img, index) => (
                                    <img
                                      key={`${alt.letter}-${index}-${img}`}
                                      src={img}
                                      alt={`Alternativa ${alt.letter}`}
                                      className="max-h-32 md:max-h-36 rounded-lg border border-slate-200 object-contain bg-white"
                                    />
                                  ))}
                                </div>
                              )}
                              {alternativeText ? <RichText text={alternativeText} /> : <span className="italic opacity-50">Conteúdo em anexo/imagem</span>}
                            </div>
                            {isCorrect && (
                              <div className="shrink-0 pl-2">
                                <CheckCircle2 size={24} className="text-emerald-500" />
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                        <AlertCircle size={20} className="shrink-0" />
                        <span className="font-medium">ATENÇÃO:</span> Esta questão foi importada sem alternativas ou houve falha no parsing.
                      </div>
                    )}
                  </div>

                  {activeQuestionComment && (
                    <div className="mt-6 rounded-[24px] border border-purple-100 bg-purple-50/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot size={16} className="text-purple-600" />
                        <span className="text-sm font-bold text-purple-900 uppercase tracking-wider">Comentário do professor</span>
                      </div>
                      <div className="text-sm text-purple-800 leading-relaxed italic">
                        <RichText text={activeQuestionComment} />
                      </div>
                    </div>
                  )}
                    </div>

                    <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
                      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/90 shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-slate-600" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Confiabilidade editorial</p>
                              <p className="text-xs text-slate-500">Comparação direta entre banco, chunk/parser, gabarito e imagens.</p>
                            </div>
                          </div>
                                  <Badge variant="outline" className={activeValidationTone.badge}>
                                    {validationAvailable ? `${activeValidationStatus.toUpperCase()} • ${activeValidationScore.toFixed(0)}%` : 'INDISPONÍVEL'}
                                  </Badge>
                        </div>

                        <div className="space-y-4 p-4">
                          {validationLoading ? (
                            <div className="space-y-3">
                              <Skeleton className="h-8 w-36" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-36 w-full rounded-xl" />
                            </div>
                          ) : (
                            <>
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-end justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Confiabilidade Editorial</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                      {validationAvailable ? `${activeValidationScore.toFixed(1)}%` : 'Indisponível'}
                                    </p>
                                  </div>
                                  <div className="text-right text-xs text-slate-500">
                                    <p>{validationEvidenceSource}</p>
                                    <p>{validationEvidenceExamId}</p>
                                  </div>
                                </div>
                                <Progress
                                  value={validationAvailable ? activeValidationScore : 0}
                                  className={activeValidationTone.track + ' h-3'}
                                  indicatorClassName={activeValidationTone.bar}
                                />
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <p className="text-xs text-slate-500">
                                    {validationAvailable
                                      ? 'Verde a partir de 85%. Amarelo entre 60% e 84,9%. Vermelho abaixo disso.'
                                      : 'Validação estrutural indisponível para esta fonte ou para esta questão.'}
                                  </p>
                                  {comparisonConfidence !== 'high' ? (
                                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                                      Confiança {comparisonConfidence === 'reduced' ? 'reduzida' : 'baixa'}
                                    </Badge>
                                  ) : null}
                                </div>
                                {validation?.summary ? (
                                  <p className="mt-3 text-sm text-slate-600">{validation.summary}</p>
                                ) : null}
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-end justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Saúde do Parser</p>
                                    <p className="text-2xl font-bold text-slate-900">{activeParserScore.toFixed(1)}%</p>
                                  </div>
                                  <Badge variant="outline" className={activeParserTone.badge}>
                                    {activeParserStatus.toUpperCase()}
                                  </Badge>
                                </div>
                                <Progress value={activeParserScore} className={activeParserTone.track + ' h-2'} indicatorClassName={activeParserTone.bar} />
                                {validationDetectedFlags.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {validationDetectedFlags.map((flag) => (
                                      <Badge key={flag} variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                        {flag}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>

                              {validationError && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                  {validationError}
                                </div>
                              )}

                              {editorialChecks.length ? (
                                <div className="space-y-3">
                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-slate-900">Checks editoriais</p>
                                  </div>
                                  {editorialChecks.map((check) => (
                                    <div key={check.key} className="rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                                          <p className="mt-1 text-xs text-slate-500">{check.summary}</p>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className={check.status === 'pass'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : check.status === 'warning'
                                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                                              : 'border-rose-200 bg-rose-50 text-rose-700'}
                                        >
                                          {check.score.toFixed(0)}%
                                        </Badge>
                                      </div>
                                      <Progress
                                        value={check.score}
                                        className="mt-3 h-2 bg-slate-100"
                                        indicatorClassName={check.status === 'pass' ? 'bg-emerald-500' : check.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}
                                      />
                                      {check.issues.length > 0 && (
                                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                                          {check.issues.map((issue, index) => (
                                            <p key={`${check.key}-${index}`}>• {issue}</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {parserChecks.length ? (
                                <div className="space-y-3">
                                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <p className="text-sm font-semibold text-slate-900">Checks técnicos do parser</p>
                                  </div>
                                  {parserChecks.map((check) => (
                                    <div key={`parser-${check.key}`} className="rounded-xl border border-slate-200 bg-white p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                                          <p className="mt-1 text-xs text-slate-500">{check.summary}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {check.hard_block ? (
                                            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                                              Hard block
                                            </Badge>
                                          ) : null}
                                          <Badge
                                            variant="outline"
                                            className={check.status === 'pass'
                                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                              : check.status === 'warning'
                                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                : 'border-rose-200 bg-rose-50 text-rose-700'}
                                          >
                                            {check.score.toFixed(0)}%
                                          </Badge>
                                        </div>
                                      </div>
                                      <Progress
                                        value={check.score}
                                        className="mt-3 h-2 bg-slate-100"
                                        indicatorClassName={check.status === 'pass' ? 'bg-emerald-500' : check.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}
                                      />
                                      {check.issues.length > 0 && (
                                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                                          {check.issues.map((issue, index) => (
                                            <p key={`parser-${check.key}-${index}`}>• {issue}</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="text-sm font-semibold text-slate-900">Motivos principais</p>
                                <div className="mt-3 space-y-4 text-sm text-slate-600">
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Motivos editoriais</p>
                                    <div className="space-y-2">
                                      {editorialReasons.map((reason, index) => (
                                        <p key={`${activeQuestion.id}-editorial-reason-${index}`}>• {reason}</p>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Alertas técnicos do parser</p>
                                    <div className="space-y-2">
                                      {parserReasons.length ? parserReasons.map((reason, index) => (
                                        <p key={`${activeQuestion.id}-parser-reason-${index}`}>• {reason}</p>
                                      )) : (
                                        <p>• Nenhum alerta técnico relevante.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
                                <p className="font-semibold text-slate-900">Evidências</p>
                                {validationOfficialAnswer ? (
                                  <p className="mt-2">
                                    Gabarito oficial: <span className="font-semibold text-slate-900">{normalizeQuestionText(validationOfficialAnswer)}</span>
                                  </p>
                                ) : null}
                                <p className="mt-2">
                                  Imagens encontradas no chunk/parser: <span className="font-semibold text-slate-900">{validationChunkImageUrls.length}</span>
                                </p>
                                {validationParserIntro ? (
                                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 font-medium text-slate-800">Comando reconstruído pelo parser</p>
                                    <RichText text={validationParserIntro} className="text-slate-600" />
                                  </div>
                                ) : null}
                                {validationParserContext ? (
                                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 font-medium text-slate-800">Contexto reconstruído pelo parser</p>
                                    <RichText text={validationParserContext} className="text-slate-600" />
                                  </div>
                                ) : null}
                                {validationChunkExcerpt ? (
                                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 font-medium text-slate-800">Bloco completo do chunk</p>
                                    <RichText text={validationChunkExcerpt} className="text-slate-600" />
                                  </div>
                                ) : null}
                                {validationParserMetrics ? (
                                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <p className="mb-2 font-medium text-slate-800">Métricas do parser</p>
                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                      {Object.entries(validationParserMetrics).map(([key, value]) => (
                                        <p key={key}>
                                          <span className="font-medium text-slate-800">{key}:</span> {String(value)}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              )}

              {/* STICKY FOOTER ACTIONS (Decision Layer) */}
              {isEditing ? (
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6">
                  <div className="flex flex-col gap-3 md:flex-row">
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    onClick={cancelEditing}
                    disabled={!!processingId}
                  >
                    Cancelar Edição
                  </Button>

                  <Button
                    className="h-12 flex-[2] rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:translate-y-[-1px] hover:bg-blue-700"
                    onClick={saveEditing}
                    disabled={!!processingId}
                  >
                    {processingId === activeQuestion?.id ? (
                      <><LoaderCircle className="w-5 h-5 mr-2 animate-spin" />Salvando...</>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações (`Ctrl/Cmd+S`)
                      </>
                    )}
                  </Button>
                </div>
                </div>
              ) : mode === 'audit' ? (
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                  <Button
                    variant="outline"
                    className="h-12 min-w-[160px] flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    onClick={fetchAuditQueue}
                    disabled={!!auditProcessingId}
                  >
                    Recarregar Auditoria
                  </Button>

                  <Button
                    className="h-12 min-w-[200px] flex-[2] rounded-xl bg-amber-600 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 transition-all hover:translate-y-[-1px] hover:bg-amber-700"
                    onClick={() => handleDecision(activeQuestion.id, 'approve')}
                    disabled={!!auditProcessingId || activeQuestion.is_verified === true}
                  >
                    {activeQuestion.is_verified === true ? 'Já publicada' : 'Aprovar após Correção'}
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 min-w-[200px] flex-[2] rounded-xl border-amber-300 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => moveQuestionToCuration(activeQuestion.id)}
                    disabled={!!auditProcessingId || activeQuestion.is_verified === false}
                  >
                    {auditProcessingId === activeQuestion.id ? 'Movendo...' : (activeQuestion.is_verified === false ? 'Já está na Curadoria' : 'Mover para Curadoria')}
                  </Button>
                </div>
                </div>
              ) : mode === 'archived' ? (
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6">
                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                  <Button
                    variant="outline"
                    className="h-12 min-w-[160px] flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    onClick={fetchArchived}
                    disabled={!!questionPublishingAction}
                  >
                    Recarregar Arquivo
                  </Button>

                  <Button
                    className="h-12 min-w-[200px] flex-[2] rounded-xl bg-slate-700 text-sm font-semibold text-white shadow-lg shadow-slate-700/20 transition-all hover:translate-y-[-1px] hover:bg-slate-800"
                    onClick={() => void handleUnarchive(activeQuestion.id)}
                    disabled={!!questionPublishingAction}
                  >
                    {questionPublishingAction === 'unarchive' ? (
                      <><LoaderCircle className="w-5 h-5 mr-2 animate-spin" />Desarquivando...</>
                    ) : (
                      <>
                        <ArchiveRestore className="w-5 h-5 mr-2" />
                        Desarquivar (volta à curadoria)
                      </>
                    )}
                  </Button>
                </div>
                </div>
              ) : (
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6">
                  <div className="mb-3 flex flex-wrap gap-2 md:hidden">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      Delete = Deletar
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      A = Arquivar
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      Enter = Aprovar
                    </span>
                  </div>
                  {/* Dicas de Teclado Flutuantes */}
                  <div className="absolute -top-8 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm uppercase tracking-wider">
                      DELETE = Deletar
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm uppercase tracking-wider">
                      A = Arquivar
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm uppercase tracking-wider">
                      ENTER = Aprovar
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
                  <Button
                    variant="outline"
                    className="h-12 min-w-[110px] flex-1 rounded-xl border-red-200 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setQuestionPublishingAction('delete');
                      void handleDecision(activeQuestion.id, 'reject');
                    }}
                    disabled={!!processingId || questionPublishingAction !== null}
                  >
                    {questionPublishingAction === 'delete' ? <LoaderCircle className="w-5 h-5 mr-2 animate-spin" /> : <Trash2 className="w-5 h-5 mr-2" />}
                    Deletar
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 min-w-[110px] flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => void handleArchive(activeQuestion.id)}
                    disabled={!!processingId || questionPublishingAction !== null}
                  >
                    {questionPublishingAction === 'archive' ? <LoaderCircle className="w-5 h-5 mr-2 animate-spin" /> : <Archive className="w-5 h-5 mr-2" />}
                    Arquivar
                  </Button>

                  <Button
                    variant="outline"
                    className="h-12 min-w-[110px] flex-1 rounded-xl border-slate-300 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    onClick={startEditing}
                    disabled={!!processingId}
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Editar
                  </Button>

                  <Button
                    className="h-12 min-w-[180px] flex-[2] rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-all hover:translate-y-[-1px] hover:bg-slate-800"
                    onClick={() => {
                      setQuestionPublishingAction('approve');
                      void handleDecision(activeQuestion.id, 'approve');
                    }}
                    disabled={!!processingId || questionPublishingAction !== null}
                  >
                    {processingId === activeQuestion.id || questionPublishingAction === 'approve' ? (
                      <><LoaderCircle className="w-5 h-5 mr-2 animate-spin" />Processando...</>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Aprovar e Publicar
                      </>
                    )}
                  </Button>
                </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
