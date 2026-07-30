'use client';

import { Fragment, useState, useEffect, useMemo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import {
  extractAlternativeImageUrls,
} from '@/components/questions/rendering';
import { QuestionDisplay } from '@/components/questions/QuestionDisplay';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { formatScientificText } from '@/lib/scientific-text';
import {
  CheckCircle2,
  Trash2,
  Search,
  Bot,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Edit3,
  X,
  Save,
  LoaderCircle,
  ImagePlus,
  Archive,
  ArchiveRestore,
  FileText,
  Filter,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  bank?: string | null;
  exam_year: number;
  created_at?: string;
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

type SortField = 'created_at' | 'exam_year' | 'external_id' | 'subject' | 'discipline' | 'difficulty' | 'status' | 'source';
type SortDirection = 'asc' | 'desc';

interface QuestionFiltersState {
  query: string;
  source: string;
  subject: string;
  discipline: string;
  difficulty: string;
  year: string;
  status: string;
  tipo: string;
  variant: string;
  hasImages: string;
  sortField: SortField;
  sortDirection: SortDirection;
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

const markdownImageRegex = /!\[[^\]]*]\((.*?)\)/g;
const ufuSyntheticTitleRegex = /^Questão\s+\d+\s*-\s*UFU Vestibular\s+\d{4}\/[12]\s*$/i;

function normalizeSourceLabel(value: string | null | undefined): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === 'ENEM' || normalized === 'INEP_ENEM' || normalized === 'ENEM_OFICIAL') return 'ENEM';
  if (normalized === 'UFU' || normalized === 'UFU_VEST') return 'UFU_VEST';
  if (normalized === 'UEG' || normalized === 'UEG_VEST') return 'UEG_VEST';
  if (normalized === 'UNESP' || normalized === 'UNESP_VEST') return 'UNESP';
  if (normalized === 'UFG' || normalized === 'UFG_VEST') return 'UFG_VEST';
  return normalized;
}

function resolveQuestionSource(question: Partial<AdminQuestion> | null | undefined): string {
  if (!question) return 'UNKNOWN';

  const bankSource = normalizeSourceLabel(question.bank);
  if (bankSource) return bankSource;

  const metadataSource = normalizeSourceLabel(question.metadata?.source);
  if (metadataSource) return metadataSource;

  const examIdSource = normalizeSourceLabel(question.metadata?.exam_id);
  if (examIdSource?.startsWith('UFU_')) return 'UFU_VEST';
  if (examIdSource?.startsWith('UEG_')) return 'UEG_VEST';
  if (examIdSource?.startsWith('UNESP_')) return 'UNESP';
  if (examIdSource?.startsWith('UFG_')) return 'UFG_VEST';
  if (examIdSource?.startsWith('ENEM')) return 'ENEM';

  const externalId = String(question.external_id || '').trim().toUpperCase();
  if (externalId.startsWith('UFU_')) return 'UFU_VEST';
  if (externalId.startsWith('UEG_')) return 'UEG_VEST';
  if (externalId.startsWith('UNESP_')) return 'UNESP';
  if (externalId.startsWith('UFG_')) return 'UFG_VEST';
  if (externalId.startsWith('ENEM')) return 'ENEM';

  const title = String(question.title || '').trim().toUpperCase();
  if (title.includes('ENEM')) return 'ENEM';
  if (title.includes('UFU')) return 'UFU_VEST';
  if (title.includes('UEG')) return 'UEG_VEST';
  if (title.includes('UNESP')) return 'UNESP';
  if (title.includes('UFG')) return 'UFG_VEST';

  return 'UNKNOWN';
}

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

function getEditableMetadata(metadata: any): Record<string, any> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {};
}

function updateImageAssetMetadata(
  metadata: any,
  imageUrl: string,
  patch: Record<string, any>,
): Record<string, any> {
  const root = getEditableMetadata(metadata);
  const agentic = root.agentic_etl && typeof root.agentic_etl === 'object' ? { ...root.agentic_etl } : {};
  const assets = Array.isArray(agentic.image_assets) ? [...agentic.image_assets] : [];
  const existingIndex = assets.findIndex((asset) => asset && typeof asset === 'object' && asset.url === imageUrl);
  const baseAsset = existingIndex >= 0 && assets[existingIndex] && typeof assets[existingIndex] === 'object'
    ? { ...assets[existingIndex] }
    : {
        url: imageUrl,
        role: 'context_image',
        original_layout: 'single',
        display_hint: 'responsive_fit',
        source_order: assets.length + 1,
      };

  const nextAsset = { ...baseAsset, ...patch, url: imageUrl };
  const nextAssets = existingIndex >= 0
    ? assets.map((asset, index) => index === existingIndex ? nextAsset : asset)
    : [...assets, nextAsset];

  return {
    ...root,
    agentic_etl: {
      ...agentic,
      image_assets: nextAssets,
    },
  };
}

function findImageAssetMetadata(metadata: any, imageUrl: string): Record<string, any> {
  const assets = metadata?.agentic_etl?.image_assets;
  if (!Array.isArray(assets)) return {};
  const asset = assets.find((item) => item && typeof item === 'object' && item.url === imageUrl);
  return asset && typeof asset === 'object' ? asset : {};
}

function getDisplayTitle(question?: AdminQuestion): string {
  const title = String(question?.title || '').trim();
  if (!title) return '';
  if (question?.metadata?.source === 'UFU_VEST' && ufuSyntheticTitleRegex.test(title)) {
    return '';
  }
  return title;
}

function getQuestionHeaderLabel(question?: AdminQuestion | null): string {
  const title = getDisplayTitle(question as AdminQuestion);
  if (title) return title;

  const intro = String(question?.alternatives_intro || '').trim();
  if (!intro) return '';

  // Strip $...$ math delimiters so raw LaTeX doesn't appear in plain-text <h2> headers
  return intro
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]*\$/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 140);
}

const DEFAULT_FILTERS: QuestionFiltersState = {
  query: '',
  source: 'all',
  subject: 'all',
  discipline: 'all',
  difficulty: 'all',
  year: 'all',
  status: 'all',
  tipo: 'all',
  variant: 'all',
  hasImages: 'all',
  sortField: 'created_at',
  sortDirection: 'asc',
};

const SORT_FIELD_LABELS: Record<SortField, string> = {
  created_at: 'Data de criação',
  exam_year: 'Ano da prova',
  external_id: 'External ID',
  subject: 'Matéria',
  discipline: 'Disciplina',
  difficulty: 'Dificuldade',
  status: 'Status editorial',
  source: 'Fonte',
};

function countActiveFilters(filters: QuestionFiltersState): number {
  return [
    filters.query.trim() ? 1 : 0,
    filters.source !== 'all' ? 1 : 0,
    filters.subject !== 'all' ? 1 : 0,
    filters.discipline !== 'all' ? 1 : 0,
    filters.difficulty !== 'all' ? 1 : 0,
    filters.year !== 'all' ? 1 : 0,
    filters.hasImages !== 'all' ? 1 : 0,
    filters.sortField !== DEFAULT_FILTERS.sortField ? 1 : 0,
    filters.sortDirection !== DEFAULT_FILTERS.sortDirection ? 1 : 0,
  ].reduce((sum, item) => sum + item, 0);
}

function getQuestionTipo(question: Partial<AdminQuestion> | null | undefined): string {
  return String(question?.metadata?.tipo || '').trim().toUpperCase();
}

function getQuestionVariant(question: Partial<AdminQuestion> | null | undefined): string {
  return String(question?.metadata?.variant || '').trim().toUpperCase();
}

function getQuestionSearchBlob(question: AdminQuestion): string {
  return [
    question.external_id,
    question.title,
    question.subject,
    question.discipline,
    question.context,
    question.alternatives_intro,
    resolveQuestionSource(question),
    getQuestionTipo(question),
    getQuestionVariant(question),
    question.status,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getQuestionSortValue(question: AdminQuestion, field: SortField): string | number {
  switch (field) {
    case 'created_at':
      return question.created_at ? new Date(question.created_at).getTime() : 0;
    case 'exam_year':
      return Number(question.exam_year || 0);
    case 'external_id':
      return String(question.external_id || '').toUpperCase();
    case 'subject':
      return String(question.subject || '').toUpperCase();
    case 'discipline':
      return String(question.discipline || '').toUpperCase();
    case 'difficulty':
      return String(question.difficulty || '').toUpperCase();
    case 'status':
      return String(question.status || '').toUpperCase();
    case 'source':
      return resolveQuestionSource(question);
    default:
      return '';
  }
}

function applyQuestionFilters(questions: AdminQuestion[], filters: QuestionFiltersState): AdminQuestion[] {
  const normalizedQuery = filters.query.trim().toLowerCase();

  const filtered = questions.filter((question) => {
    const source = resolveQuestionSource(question);
    const tipo = getQuestionTipo(question);
    const variant = getQuestionVariant(question);
    const hasImages = Array.isArray(question.images) && question.images.length > 0;

    if (normalizedQuery && !getQuestionSearchBlob(question).includes(normalizedQuery)) return false;
    if (filters.source !== 'all' && source !== filters.source) return false;
    if (filters.subject !== 'all' && question.subject !== filters.subject) return false;
    if (filters.discipline !== 'all' && (question.discipline || '') !== filters.discipline) return false;
    if (filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false;
    if (filters.year !== 'all' && String(question.exam_year) !== filters.year) return false;
    if (filters.status !== 'all' && (question.status || '') !== filters.status) return false;
    if (filters.tipo !== 'all' && tipo !== filters.tipo) return false;
    if (filters.variant !== 'all' && variant !== filters.variant) return false;
    if (filters.hasImages === 'with' && !hasImages) return false;
    if (filters.hasImages === 'without' && hasImages) return false;

    return true;
  });

  return filtered.sort((left, right) => {
    const leftValue = getQuestionSortValue(left, filters.sortField);
    const rightValue = getQuestionSortValue(right, filters.sortField);

    let comparison = 0;
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      comparison = leftValue - rightValue;
    } else {
      comparison = String(leftValue).localeCompare(String(rightValue), 'pt-BR', { numeric: true, sensitivity: 'base' });
    }

    if (comparison === 0) {
      comparison = String(left.external_id || '').localeCompare(String(right.external_id || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
    }

    return filters.sortDirection === 'asc' ? comparison : -comparison;
  });
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


function applyInlineFormattingShortcut(
  event: ReactKeyboardEvent<HTMLTextAreaElement>,
  apply: (nextValue: string) => void,
) {
  const isModifierPressed = event.ctrlKey || event.metaKey;
  if (!isModifierPressed) return false;

  const target = event.currentTarget;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const hasSelection = end > start;
  const selectedText = target.value.slice(start, end);

  const wrapSelection = (prefix: string, suffix: string, placeholder: string) => {
    event.preventDefault();
    const wrappedText = `${prefix}${hasSelection ? selectedText : placeholder}${suffix}`;
    const nextValue = target.value.slice(0, start) + wrappedText + target.value.slice(end);
    apply(nextValue);
    window.requestAnimationFrame(() => {
      if (hasSelection) {
        target.selectionStart = start;
        target.selectionEnd = start + wrappedText.length;
        return;
      }
      target.selectionStart = start + prefix.length;
      target.selectionEnd = start + wrappedText.length - suffix.length;
    });
  };

  const key = event.key.toLowerCase();
  if (key === 'b') {
    wrapSelection('**', '**', 'texto em negrito');
    return true;
  }
  if (key === 'i') {
    wrapSelection('*', '*', 'texto em itálico');
    return true;
  }
  if (key === 'u') {
    wrapSelection('<u>', '</u>', 'texto sublinhado');
    return true;
  }
  if (key === 'enter') {
    event.preventDefault();
    const nextValue = target.value.slice(0, start) + '\n\n' + target.value.slice(end);
    apply(nextValue);
    window.requestAnimationFrame(() => {
      target.selectionStart = start + 2;
      target.selectionEnd = start + 2;
    });
    return true;
  }

  return false;
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

  const [filters, setFilters] = useState<QuestionFiltersState>(DEFAULT_FILTERS);

  // Controle de Edição
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<AdminQuestion | null>(null);
  const [questionPublishingAction, setQuestionPublishingAction] = useState<'approve' | 'delete' | 'archive' | 'unarchive' | null>(null);
  const [archivedQuestions, setArchivedQuestions] = useState<AdminQuestion[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [questionImageUploading, setQuestionImageUploading] = useState(false);
  const [alternativeImageInputs, setAlternativeImageInputs] = useState<Record<string, string>>({});
  const [alternativeImageUploading, setAlternativeImageUploading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showPdf, setShowPdf] = useState(true);
  const [sourcePdfUrl, setSourcePdfUrl] = useState<string | null>(null);
  const [sourcePdfLoading, setSourcePdfLoading] = useState(false);
  const [sourcePdfError, setSourcePdfError] = useState<string | null>(null);

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
        metadata: editForm.metadata,
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

  const uploadQuestionImageFile = async (file: File) => {
    if (!editForm) return;
    setQuestionImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionId', editForm.id);
      formData.append('externalId', activeQuestion?.external_id || editForm.id);

      const res = await fetch('/api/admin/question-audits/upload-question-image', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Falha ao fazer upload da imagem.');
        return;
      }

      const publicUrl = String(json.publicUrl || '').trim();
      if (!publicUrl) {
        toast.error('Upload concluído sem URL pública retornada.');
        return;
      }

      setEditForm(current => {
        if (!current) return current;
        return {
          ...current,
          images: [...(current.images || []), publicUrl],
          metadata: updateImageAssetMetadata(current.metadata, publicUrl, {
            role: 'context_image',
            display_hint: 'responsive_fit',
            original_layout: 'single',
          }),
        };
      });
      toast.success('Imagem enviada e vinculada à questão.');
    } catch (error: any) {
      void reportError('AdminQuestionImageFileUploadError', String(error));
      toast.error(String(error?.message || 'Erro ao enviar imagem.'));
    } finally {
      setQuestionImageUploading(false);
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

  const uploadAlternativeImageFile = async (alternativeIndex: number, file: File) => {
    if (!editForm || !activeQuestion) return;
    const alternative = editForm.alternatives[alternativeIndex];
    if (!alternative) return;

    setAlternativeImageUploading(alternative.letter);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionId', editForm.id);
      formData.append('externalId', activeQuestion.external_id || editForm.id);
      formData.append('alternativeLetter', alternative.letter);

      const response = await fetch('/api/admin/question-audits/upload-alternative-image', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao enviar imagem da alternativa');
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
      toast.success(`Imagem enviada para a alternativa ${alternative.letter}.`);
    } catch (error: any) {
      void reportError('AdminQuestionsAlternativeImageFileUploadError', String(error));
      toast.error(String(error?.message || error));
    } finally {
      setAlternativeImageUploading(null);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredQuestions = useMemo(() => applyQuestionFilters(questions, filters), [questions, filters]);
  const filteredAuditItems = useMemo(() => {
    const allowedIds = new Set(applyQuestionFilters(auditItems.map(item => item.question), filters).map(item => item.id));
    return auditItems
      .filter(item => allowedIds.has(item.question.id))
      .sort((left, right) => {
        const leftValue = getQuestionSortValue(left.question, filters.sortField);
        const rightValue = getQuestionSortValue(right.question, filters.sortField);

        let comparison = 0;
        if (typeof leftValue === 'number' && typeof rightValue === 'number') {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue), 'pt-BR', { numeric: true, sensitivity: 'base' });
        }

        if (comparison === 0) {
          comparison = String(left.question.external_id || '').localeCompare(
            String(right.question.external_id || ''),
            'pt-BR',
            { numeric: true, sensitivity: 'base' },
          );
        }

        return filters.sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [auditItems, filters]);
  const filteredArchived = useMemo(() => applyQuestionFilters(archivedQuestions, filters), [archivedQuestions, filters]);

  const activeList = mode === 'audit' ? auditItems.map(i => i.question) : mode === 'archived' ? archivedQuestions : questions;

  const sources = Array.from(
    new Set(activeList.map(q => resolveQuestionSource(q)))
  ).filter(Boolean).sort();

  const subjects = Array.from(
    new Set(activeList.map(q => q.subject))
  ).filter(Boolean).sort();

  const disciplines = Array.from(
    new Set(activeList.map(q => q.discipline).filter(Boolean))
  ).sort() as string[];

  const years = Array.from(
    new Set(activeList.map(q => q.exam_year))
  ).filter(Boolean).sort((a, b) => b - a);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

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
  const activeQuestionDisplayTitle = useMemo(
    () => getDisplayTitle(activeQuestion),
    [activeQuestion],
  );
  const activeQuestionComment = useMemo(
    () => getQuestionComment(activeQuestion),
    [activeQuestion],
  );
  const activeQuestionPreview = useMemo(() => {
    if (!activeQuestion) return null;
    return {
      id: activeQuestion.id,
      external_id: activeQuestion.external_id,
      year: activeQuestion.exam_year,
      bank: activeQuestion.bank,
      subject: activeQuestion.subject,
      difficulty: activeQuestion.difficulty || 'Médio',
      context: activeQuestion.context || '',
      statement: activeQuestion.alternatives_intro || '',
      alternatives: activeQuestion.alternatives || [],
      correct_option: activeQuestion.correct_alternative,
      explanation: activeQuestionComment,
      images: activeQuestion.images,
      metadata: activeQuestion.metadata,
    };
  }, [activeQuestion, activeQuestionComment]);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchSourcePdf = async () => {
      if (!activeQuestion?.id || isEditing || !showPdf) {
        setSourcePdfUrl(null);
        setSourcePdfError(null);
        setSourcePdfLoading(false);
        return;
      }

      setSourcePdfLoading(true);
      setSourcePdfError(null);
      setSourcePdfUrl(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: HeadersInit = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {};
        const response = await fetch(`${apiUrl}/api/admin/questions/${activeQuestion.id}/source-pdf`, {
          headers,
        });
        if (cancelled) return;

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setSourcePdfError(payload?.error || payload?.message || `Falha ao carregar PDF (HTTP ${response.status}).`);
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSourcePdfUrl(objectUrl);
      } catch (error: any) {
        if (cancelled) return;
        setSourcePdfError(error?.message || 'Falha ao carregar PDF da prova.');
      } finally {
        if (!cancelled) setSourcePdfLoading(false);
      }
    };

    void fetchSourcePdf();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeQuestion?.id, isEditing, showPdf, apiUrl, supabase]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsEditing(false);
    setEditForm(null);
    setAlternativeImageInputs({});
    setAlternativeImageUploading(null);
    setNewImageUrl('');
  }, [mode]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [filters, mode]);

  // --- KEYBOARD SHORTCUTS (UX/UI B2B Flow) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (isModifierPressed && e.key.toLowerCase() === 's' && isEditing && editForm && !processingId) {
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
      } else if (mode === 'curation' && isModifierPressed && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        void handleArchive(activeQuestion.id);
      } else if (mode === 'curation' && isModifierPressed && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        startEditing();
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
  const activeSource = resolveQuestionSource(activeQuestion);
  const activeQuestionVariant = activeQuestion?.metadata?.tipo || activeQuestion?.metadata?.variant || '';
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

        {!showFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur md:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-slate-900">
                {modeTitle}
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                {queueLabel}
              </Badge>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                {activeFilterCount > 0 ? `${activeFilterCount} filtro(s)` : 'Filtros ocultos'}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl bg-white px-3 text-sm"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Mostrar filtros
              </Button>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl bg-white px-3 text-sm"
                  onClick={() => setShowPdf(current => !current)}
                >
                  {showPdf ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
                  {showPdf ? 'Ocultar PDF' : 'Mostrar PDF'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* --- HEADER & TOOLBAR --- */}
        {showFilters && (
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={mode === 'curation' ? 'default' : 'outline'}
                    className={mode === 'curation' ? 'h-9 rounded-xl bg-slate-900 px-3 text-sm text-white hover:bg-slate-800' : 'h-9 rounded-xl bg-white px-3 text-sm'}
                    onClick={() => setMode('curation')}
                  >
                    Curadoria
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl bg-white px-3 text-sm"
                    onClick={() => setShowFilters(false)}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Ocultar filtros
                  </Button>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl bg-white px-3 text-sm"
                      onClick={() => setShowPdf(current => !current)}
                    >
                      {showPdf ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}
                      {showPdf ? 'Ocultar PDF' : 'Mostrar PDF'}
                    </Button>
                  )}
                </div>
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

              <div className="grid grid-cols-1 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                          {activeFilterCount > 0 ? `${activeFilterCount} filtro(s) ativo(s)` : 'Sem filtros extras'}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                          Ordem: {SORT_FIELD_LABELS[filters.sortField]} • {filters.sortDirection === 'asc' ? 'crescente' : 'decrescente'}
                        </Badge>
                      </div>
                      {activeFilterCount > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={isEditing}
                          className="h-8 rounded-lg px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => setFilters(DEFAULT_FILTERS)}
                        >
                          Limpar filtros
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={filters.query}
                          onChange={(event) => setFilters(current => ({ ...current, query: event.target.value }))}
                          placeholder="Buscar por external ID, título, contexto..."
                          className="h-10 rounded-xl border-slate-200 pl-10 text-sm"
                          disabled={isEditing}
                        />
                      </div>

                      <Select value={filters.source} onValueChange={(value) => setFilters(current => ({ ...current, source: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Fonte" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as fontes</SelectItem>
                          {sources.map(source => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filters.subject} onValueChange={(value) => setFilters(current => ({ ...current, subject: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Matéria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as matérias</SelectItem>
                          {subjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filters.discipline} onValueChange={(value) => setFilters(current => ({ ...current, discipline: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as disciplinas</SelectItem>
                          {disciplines.map(discipline => <SelectItem key={discipline} value={discipline}>{discipline}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-5">
                      <Select value={filters.difficulty} onValueChange={(value) => setFilters(current => ({ ...current, difficulty: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Dificuldade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Dificuldade</SelectItem>
                          <SelectItem value="Fácil">Fácil</SelectItem>
                          <SelectItem value="Médio">Médio</SelectItem>
                          <SelectItem value="Difícil">Difícil</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filters.year} onValueChange={(value) => setFilters(current => ({ ...current, year: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os anos</SelectItem>
                          {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={filters.hasImages} onValueChange={(value) => setFilters(current => ({ ...current, hasImages: value }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Imagens" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="with">Com imagens</SelectItem>
                          <SelectItem value="without">Sem imagens</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filters.sortField} onValueChange={(value) => setFilters(current => ({ ...current, sortField: value as SortField }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Data de criação</SelectItem>
                          <SelectItem value="exam_year">Ano da prova</SelectItem>
                          <SelectItem value="external_id">External ID</SelectItem>
                          <SelectItem value="subject">Matéria</SelectItem>
                          <SelectItem value="discipline">Disciplina</SelectItem>
                          <SelectItem value="difficulty">Dificuldade</SelectItem>
                          <SelectItem value="status">Status editorial</SelectItem>
                          <SelectItem value="source">Fonte</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filters.sortDirection} onValueChange={(value) => setFilters(current => ({ ...current, sortDirection: value as SortDirection }))} disabled={isEditing}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm shadow-none">
                          <SelectValue placeholder="Direção" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Crescente</SelectItem>
                          <SelectItem value="desc">Decrescente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

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
              {activeFilterCount > 0 && (
                <Button
                  variant="link"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-4 text-blue-600"
                >
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold tracking-tight text-slate-950 md:text-[1.35rem]">
                            {getQuestionHeaderLabel(activeQuestion) || 'Questão em revisão'}
                          </h2>
                        </div>
                        {mode === 'curation' ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] text-slate-500">Enter aprova</Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] text-slate-500">Delete deleta</Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] text-slate-500">Ctrl/Cmd + A arquiva</Badge>
                            <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] text-slate-500">Ctrl/Cmd + Q edita</Badge>
                          </div>
                        ) : null}
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
                    <p className="mt-1">Use `Ctrl/Cmd + B` para negrito, `Ctrl/Cmd + I` para itálico, `Ctrl/Cmd + U` para sublinhado, `Ctrl/Cmd + Enter` para parágrafo e `Ctrl/Cmd + S` para salvar. Clique na letra da alternativa para definir o gabarito.</p>
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
                      onKeyDown={e => applyInlineFormattingShortcut(e, nextValue => setEditForm({ ...editForm, context: nextValue }))}
                      rows={6}
                      className="mt-1 min-h-[140px] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Título</label>
                    <textarea
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      onKeyDown={e => applyInlineFormattingShortcut(e, nextValue => setEditForm({ ...editForm, title: nextValue }))}
                      rows={3}
                      className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Comando / Introdução das alternativas</label>
                    <textarea
                      value={editForm.alternatives_intro || ''}
                      onChange={e => setEditForm({ ...editForm, alternatives_intro: e.target.value })}
                      onKeyDown={e => applyInlineFormattingShortcut(e, nextValue => setEditForm({ ...editForm, alternatives_intro: nextValue }))}
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
                        disabled={questionImageUploading}
                        onClick={async () => {
                          const value = newImageUrl.trim();
                          if (!value) return;
                          setQuestionImageUploading(true);
                          try {
                            const res = await fetch('/api/admin/question-audits/upload-question-image', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                imageUrl: value,
                                questionId: editForm.id,
                                externalId: activeQuestion?.external_id || editForm.id,
                              }),
                            });
                            const json = await res.json();
                            if (!res.ok) {
                              alert(json.error || 'Falha ao fazer upload da imagem.');
                              return;
                            }
                            setEditForm({
                              ...editForm,
                              images: [...(editForm.images || []), json.publicUrl],
                              metadata: updateImageAssetMetadata(editForm.metadata, json.publicUrl, {
                                role: 'context_image',
                                display_hint: 'responsive_fit',
                                original_layout: 'single',
                              }),
                            });
                            setNewImageUrl('');
                          } catch {
                            alert('Erro ao conectar ao servidor de upload.');
                          } finally {
                            setQuestionImageUploading(false);
                          }
                        }}
                      >
                        {questionImageUploading ? 'Enviando…' : 'Adicionar imagem'}
                      </Button>
                    </div>
                    <div className="mt-3">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={questionImageUploading}
                        className="bg-white"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          e.currentTarget.value = '';
                          if (file) void uploadQuestionImageFile(file);
                        }}
                      />
                      <p className="mt-1 text-xs text-slate-500">Upload direto envia a imagem para o bucket público padrão e vincula a URL à questão.</p>
                    </div>
                    {editForm.images?.length ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {editForm.images.map((img, i) => (
                          <div key={img + i} className="relative rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <img src={img} className="mx-auto h-32 w-auto rounded-lg border border-slate-200 bg-white object-contain" alt={`Imagem ${i + 1}`} />
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, idx) => idx !== i) })}
                              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                            <div className="mt-3 space-y-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full bg-white"
                                onClick={() => {
                                  const markdown = `![Imagem da questão](${img})`;
                                  setEditForm({
                                    ...editForm,
                                    context: [editForm.context || '', markdown].filter(Boolean).join('\n\n'),
                                  });
                                }}
                              >
                                Inserir no contexto
                              </Button>
                              <Input
                                value={findImageAssetMetadata(editForm.metadata, img).caption || ''}
                                placeholder="Legenda da imagem"
                                className="bg-white"
                                onChange={e => setEditForm({
                                  ...editForm,
                                  metadata: updateImageAssetMetadata(editForm.metadata, img, { caption: e.target.value || null }),
                                })}
                              />
                              <Input
                                value={findImageAssetMetadata(editForm.metadata, img).source || ''}
                                placeholder="Fonte da imagem"
                                className="bg-white"
                                onChange={e => setEditForm({
                                  ...editForm,
                                  metadata: updateImageAssetMetadata(editForm.metadata, img, { source: e.target.value || null }),
                                })}
                              />
                              <select
                                value={findImageAssetMetadata(editForm.metadata, img).original_layout || 'single'}
                                onChange={e => setEditForm({
                                  ...editForm,
                                  metadata: updateImageAssetMetadata(editForm.metadata, img, { original_layout: e.target.value }),
                                })}
                                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm outline-none focus:border-slate-500"
                              >
                                <option value="single">Imagem única</option>
                                <option value="side_by_side">Lado a lado</option>
                                <option value="stacked">Empilhada</option>
                                <option value="inline">Inline</option>
                              </select>
                            </div>
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
                              onKeyDown={e => applyInlineFormattingShortcut(e, nextValue => {
                                const nextAlternatives = [...editForm.alternatives];
                                nextAlternatives[i].text = nextValue;
                                setEditForm({ ...editForm, alternatives: nextAlternatives });
                              })}
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
	                            <div className="mt-3">
	                              <Input
	                                type="file"
	                                accept="image/*"
	                                disabled={isUploading}
	                                className="bg-white"
	                                onChange={e => {
	                                  const file = e.target.files?.[0];
	                                  e.currentTarget.value = '';
	                                  if (file) void uploadAlternativeImageFile(i, file);
	                                }}
	                              />
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
                      onKeyDown={e => applyInlineFormattingShortcut(e, nextValue => setEditForm({ ...editForm, ai_reasoning: { ...editForm.ai_reasoning, thought: nextValue } }))}
                      rows={5}
                      className="mt-1 min-h-[128px] w-full rounded-xl border border-purple-200 bg-purple-50/40 p-3 font-mono text-sm outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-3 py-5 md:px-5 lg:px-6">
                  <div className={`grid grid-cols-1 items-start gap-5 ${showPdf ? 'xl:grid-cols-2' : ''} xl:gap-6`}>
                    <section className={`min-w-0 overflow-y-auto pr-1 ${showFilters ? 'xl:h-[calc(100vh-320px)]' : 'xl:h-[calc(100vh-210px)]'} xl:min-h-[620px]`}>
                      <div className="space-y-8">
                        {mode === 'audit' && activeAuditItem && (
                          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle size={16} className="text-amber-700" />
                              <span className="text-sm font-bold uppercase tracking-wider text-amber-900">Achados da Auditoria</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {activeAuditItem.issue_codes.map(code => (
                                <Badge key={code} variant="outline" className="border-amber-200 bg-white text-amber-800">
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

                        {activeQuestionPreview ? (
                          <QuestionDisplay
                            question={activeQuestionPreview}
                            showAnswer
                            readOnly
                            footer={activeQuestionComment ? (
                              <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                                <div className="mb-3 flex items-center gap-2">
                                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                                    <Bot size={18} />
                                  </div>
                                  <h3 className="font-semibold text-blue-950">Comentário do Professor</h3>
                                </div>
                                <QuestionRichText text={activeQuestionComment} className="text-sm leading-relaxed text-slate-700" />
                              </div>
                            ) : undefined}
                          />
                        ) : (
                          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                            <AlertCircle size={20} className="shrink-0" />
                            <span className="font-medium">ATENÇÃO:</span> Nenhuma questão selecionada.
                          </div>
                        )}
                      </div>
                    </section>

                    {showPdf && (
                      <aside className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm xl:sticky xl:top-6">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-600" />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">PDF da prova</p>
                              <p className="text-xs text-slate-500">{activeQuestion.external_id || activeQuestion.id}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 rounded-lg px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => setShowPdf(false)}
                          >
                            Ocultar
                          </Button>
                        </div>

                        <div className={`h-[70vh] min-h-[560px] bg-slate-100 ${showFilters ? 'xl:h-[calc(100vh-320px)]' : 'xl:h-[calc(100vh-210px)]'} xl:min-h-[620px]`}>
                          {sourcePdfLoading ? (
                            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                              <LoaderCircle className="h-8 w-8 animate-spin text-slate-500" />
                              <p className="text-sm text-slate-500">Carregando PDF da prova...</p>
                            </div>
                          ) : sourcePdfUrl ? (
                            <iframe
                              title={`PDF da prova ${activeQuestion.external_id || activeQuestion.id}`}
                              src={sourcePdfUrl}
                              className="h-full w-full border-0 bg-white"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                              <FileText className="h-10 w-10 text-slate-400" />
                              <p className="text-sm font-semibold text-slate-800">PDF indisponível</p>
                              <p className="max-w-sm text-xs leading-5 text-slate-500">
                                {sourcePdfError || 'Não foi possível localizar o PDF de origem para esta questão.'}
                              </p>
                            </div>
                          )}
                        </div>
                      </aside>
                    )}
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
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
                </div>
              ) : mode === 'audit' ? (
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6 xl:hidden">
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
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6 xl:hidden">
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
                <div className="sticky bottom-2 z-20 border-t border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur md:px-5 lg:px-6 xl:hidden">
                  <div className="mb-3 flex flex-wrap gap-2 md:hidden">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      Delete = Deletar
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-sm">
                      Ctrl/Cmd + A = Arquivar
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
                      Ctrl/Cmd + A = Arquivar
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
