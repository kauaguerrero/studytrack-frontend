'use client';

import { useState, useEffect, useMemo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
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
  AlertCircle,
  ArrowLeft,
  Edit3,
  X,
  Save,
  LoaderCircle,
  ImagePlus,
  Archive,
  ArchiveRestore,
  Filter,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  RotateCcw,
  ArrowDownUp,
} from 'lucide-react';
import { toast } from 'sonner';

// UI Components
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
  const [toolPanel, setToolPanel] = useState<'filters' | 'shortcuts' | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);

  const supabase = createClient();

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
          // O arquivo é só um "estacionamento" pra quem ainda está em revisão
          // (is_verified=false). Se um report nessa questão for resolvido
          // enquanto ela está arquivada, is_verified volta pra true sozinho
          // (ver restore_question_verified_if_no_open_reports) — e ela deixa
          // de ser "arquivada pendente" mesmo sem ninguém clicar em desarquivar.
          .eq('is_verified', false)
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
      setArchivedQuestions(prev => prev.map(q => q.id === editForm.id ? { ...q, ...payload } : q));
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

      if (isModifierPressed && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setCommentOpen(current => !current);
        return;
      }

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
      } else if (isModifierPressed && e.key.toLowerCase() === 'a') {
        if (mode === 'curation') {
          e.preventDefault();
          void handleArchive(activeQuestion.id);
        } else if (mode === 'archived') {
          e.preventDefault();
          void handleUnarchive(activeQuestion.id);
        }
      } else if (mode !== 'audit' && !isModifierPressed && e.key.toLowerCase() === 'e') {
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
  const getSeverityColor = (severity: AuditQuestionItem['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const queuePosition = currentItems.length > 0
    ? `${currentIndex + 1}/${currentItems.length}`
    : '0';
  const activeSource = resolveQuestionSource(activeQuestion);
  const activeQuestionVariant = activeQuestion?.metadata?.tipo || activeQuestion?.metadata?.variant || '';
  const modeTitle = mode === 'curation' ? 'Curadoria' : mode === 'audit' ? 'Auditoria' : 'Arquivados';
  const isListLoading = mode === 'curation' ? loading : mode === 'archived' ? archivedLoading : auditLoading;
  const refreshCurrentList = mode === 'curation' ? fetchPending : mode === 'archived' ? fetchArchived : fetchAuditQueue;
  const isBusy = !!processingId || !!auditProcessingId || questionPublishingAction !== null;
  const goToOffset = (offset: number) => {
    setCurrentIndex(current => Math.min(Math.max(0, current + offset), Math.max(0, currentItems.length - 1)));
  };

  const renderRailButton = (config: {
    id: 'filters' | 'shortcuts';
    icon: ReactNode;
    label: string;
    badge?: number;
  }) => (
    <button
      key={config.id}
      type="button"
      title={config.label}
      aria-label={config.label}
      aria-pressed={toolPanel === config.id}
      onClick={() => setToolPanel(current => (current === config.id ? null : config.id))}
      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        toolPanel === config.id
          ? 'bg-slate-900 text-white'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {config.icon}
      {config.badge ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
          {config.badge}
        </span>
      ) : null}
    </button>
  );

  const selectTriggerClass = 'h-9 rounded-lg border-slate-200 bg-white text-sm shadow-none';

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-100 font-sans text-slate-900">

      {/* ================= COLUNA PRINCIPAL ================= */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* --- BARRA DE COMANDO (única faixa fixa) --- */}
        <header className="z-30 flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 md:px-3">
          <Link href="/portal/admin" title="Voltar ao portal admin">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-500 hover:text-slate-900">
              <ArrowLeft size={18} />
            </Button>
          </Link>

          <div className="flex shrink-0 items-center rounded-lg bg-slate-100 p-0.5">
            {([
              { id: 'curation' as const, label: 'Curadoria' },
              { id: 'archived' as const, label: 'Arquivados' },
            ]).map(item => (
              <button
                key={item.id}
                type="button"
                disabled={isEditing}
                onClick={() => setMode(item.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  mode === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-900"
              title="Anterior (seta esquerda)"
              disabled={isEditing || currentIndex === 0}
              onClick={() => goToOffset(-1)}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-[54px] text-center font-mono text-xs font-semibold tabular-nums text-slate-600">
              {queuePosition}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-900"
              title="Próxima (seta direita)"
              disabled={isEditing || currentIndex >= currentItems.length - 1}
              onClick={() => goToOffset(1)}
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <div className="min-w-0 flex-1" />

          {/* AÇÕES */}
          {isEditing && editForm ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                className="h-8 rounded-lg px-3 text-sm text-slate-500 hover:text-slate-900"
                onClick={cancelEditing}
                disabled={!!processingId}
              >
                Cancelar
              </Button>
              <Button
                className="h-8 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={saveEditing}
                disabled={!!processingId}
                title="Ctrl/Cmd + S"
              >
                {processingId === editForm.id
                  ? <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Save className="mr-1.5 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          ) : !activeQuestion ? null : mode === 'curation' ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Deletar questão (Delete)"
                disabled={isBusy}
                onClick={() => {
                  setQuestionPublishingAction('delete');
                  void handleDecision(activeQuestion.id, 'reject');
                }}
              >
                {questionPublishingAction === 'delete'
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                title="Arquivar (Ctrl/Cmd + A)"
                disabled={isBusy}
                onClick={() => void handleArchive(activeQuestion.id)}
              >
                {questionPublishingAction === 'archive'
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <Archive className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="h-8 rounded-lg border-slate-200 px-2.5 text-sm font-medium text-slate-700"
                title="Editar questão (E)"
                disabled={!!processingId}
                onClick={startEditing}
              >
                <Edit3 className="h-4 w-4 md:mr-1.5" />
                <span className="hidden md:inline">Editar</span>
              </Button>
              <Button
                className="h-8 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                title="Aprovar e publicar (Enter)"
                disabled={isBusy}
                onClick={() => {
                  setQuestionPublishingAction('approve');
                  void handleDecision(activeQuestion.id, 'approve');
                }}
              >
                {questionPublishingAction === 'approve'
                  ? <LoaderCircle className="h-4 w-4 md:mr-1.5 animate-spin" />
                  : <CheckCircle2 className="h-4 w-4 md:mr-1.5" />}
                <span className="hidden md:inline">Aprovar</span>
              </Button>
            </div>
          ) : mode === 'archived' ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 rounded-lg border-slate-200 px-2.5 text-sm font-medium text-slate-700"
                title="Editar questão (E)"
                disabled={!!processingId}
                onClick={startEditing}
              >
                <Edit3 className="h-4 w-4 md:mr-1.5" />
                <span className="hidden md:inline">Editar</span>
              </Button>
              <Button
                className="h-8 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"
                title="Desarquivar e devolver à curadoria (Ctrl/Cmd + A)"
                disabled={isBusy}
                onClick={() => void handleUnarchive(activeQuestion.id)}
              >
                {questionPublishingAction === 'unarchive'
                  ? <LoaderCircle className="h-4 w-4 md:mr-1.5 animate-spin" />
                  : <ArchiveRestore className="h-4 w-4 md:mr-1.5" />}
                <span className="hidden md:inline">Desarquivar</span>
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                className="h-8 rounded-lg border-amber-200 px-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50"
                disabled={!!auditProcessingId || activeQuestion.is_verified === false}
                onClick={() => moveQuestionToCuration(activeQuestion.id)}
              >
                {auditProcessingId === activeQuestion.id ? 'Movendo...' : 'Mover para curadoria'}
              </Button>
              <Button
                className="h-8 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white hover:bg-amber-700"
                disabled={!!auditProcessingId || activeQuestion.is_verified === true}
                onClick={() => handleDecision(activeQuestion.id, 'approve')}
              >
                {activeQuestion.is_verified === true ? 'Já publicada' : 'Aprovar após correção'}
              </Button>
            </div>
          )}
        </header>

        {/* --- CANVAS DA QUESTÃO (único elemento rolável) --- */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1200px] px-3 py-2 md:px-5 md:py-2.5">

            {isListLoading ? (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ) : !activeQuestion ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white py-20">
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${mode === 'archived' ? 'bg-slate-50' : 'bg-emerald-50'}`}>
                  {mode === 'archived'
                    ? <Archive size={32} className="text-slate-400" />
                    : <CheckCircle2 size={32} className="text-emerald-500" />}
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {mode === 'curation' ? 'Fila limpa' : mode === 'audit' ? 'Auditoria limpa' : 'Arquivo vazio'}
                </h3>
                <p className="mt-1.5 max-w-sm text-center text-sm text-slate-500">
                  {mode === 'curation'
                    ? 'Nenhuma questão pendente para os filtros atuais.'
                    : mode === 'audit'
                      ? 'Nenhum achado aberto para os filtros atuais.'
                      : 'Nenhuma questão arquivada para os filtros atuais.'}
                </p>
                <div className="mt-5 flex gap-2">
                  {activeFilterCount > 0 && (
                    <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                      Limpar filtros
                    </Button>
                  )}
                  <Button variant="outline" className="h-9 rounded-lg text-sm" onClick={refreshCurrentList}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Recarregar
                  </Button>
                </div>
              </div>
            ) : isEditing && editForm ? (
              <div className="space-y-5">
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Editor.</span>{' '}
                  Ctrl/Cmd + B negrito · I itálico · U sublinhado · Enter parágrafo · S salvar. Clique na letra da alternativa para definir o gabarito.
                </p>
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
              <>
                {/* Identidade da questão: uma linha, sem caixa */}
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] leading-4 text-slate-400">
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    {activeQuestion.subject}
                  </span>
                  <span className="font-mono text-slate-500">
                    {activeQuestion.external_id || activeQuestion.id.substring(0, 8)}
                  </span>
                  {getDisplayTitle(activeQuestion) && (
                    <><span>·</span><span className="max-w-[280px] truncate">{getDisplayTitle(activeQuestion)}</span></>
                  )}
                  {activeQuestion.discipline && <><span>·</span><span>{activeQuestion.discipline}</span></>}
                  {activeQuestionVariant && <><span>·</span><span className="uppercase">{activeQuestionVariant}</span></>}
                  {activeSource && activeSource !== 'UNKNOWN' && (
                    <><span>·</span><span>{activeSource}</span></>
                  )}
                  {activeQuestion.exam_year && <><span>·</span><span>{activeQuestion.exam_year}</span></>}
                  {activeQuestion.difficulty && <><span>·</span><span>{activeQuestion.difficulty}</span></>}
                  {activeQuestion.is_ai_generated && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                      <Bot size={11} /> IA gerada
                    </span>
                  )}
                  {mode === 'archived' && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      <Archive size={11} /> Arquivada
                    </span>
                  )}
                </div>

                {mode === 'audit' && activeAuditItem && (
                  <div className="mb-3 space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="text-amber-700" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Achados da auditoria</span>
                      <Badge variant="outline" className={`rounded-full text-[10px] uppercase ${getSeverityColor(activeAuditItem.severity)}`}>
                        {activeAuditItem.severity}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeAuditItem.issue_codes.map(code => (
                        <Badge key={code} variant="outline" className="border-amber-200 bg-white text-[11px] text-amber-800">
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {activeQuestionPreview ? (
                  <QuestionDisplay
                    key={activeQuestion.id}
                    question={activeQuestionPreview}
                    showAnswer
                    readOnly
                    compact
                    splitLayout
                    className="[&_img]:max-h-[150px] [&_img]:object-contain"
                    footer={activeQuestionComment ? (
                      <details
                        className="group mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2"
                        open={commentOpen}
                        onToggle={(event) => setCommentOpen(event.currentTarget.open)}
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-blue-950 marker:content-['']">
                          <Bot size={15} className="text-blue-600" />
                          Comentário do professor
                          <kbd className="ml-auto rounded border border-blue-200 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-normal text-blue-500">
                            Ctrl/Cmd + M
                          </kbd>
                          <ChevronRight size={14} className="text-blue-400 transition-transform group-open:rotate-90" />
                        </summary>
                        <QuestionRichText
                          text={activeQuestionComment}
                          className="mt-2 text-sm leading-snug text-slate-700 [&_p]:my-2 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0"
                        />
                      </details>
                    ) : undefined}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="font-medium">Nenhuma questão selecionada.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ================= GAVETA DE FERRAMENTAS ================= */}
      {toolPanel && (
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-200 bg-white">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              {toolPanel === 'filters' ? 'Filtros e ordenação' : 'Atalhos'}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-900"
              onClick={() => setToolPanel(null)}
              aria-label="Fechar painel"
            >
              <X size={15} />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {toolPanel === 'filters' ? (
              <div className="space-y-3">
                {mode === 'audit' && (
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Auditoria · {auditSummary.flagged} achado(s) em {auditSummary.totalAudited}
                    </p>
                    <Select value={auditType} onValueChange={(value) => setAuditType(value as typeof auditType)} disabled={isEditing}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Tipo de auditoria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="media">Asset audit</SelectItem>
                        <SelectItem value="data">Data audit</SelectItem>
                        <SelectItem value="classification">Classification audit</SelectItem>
                        <SelectItem value="render">Render audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={filters.query}
                    onChange={(event) => setFilters(current => ({ ...current, query: event.target.value }))}
                    placeholder="Buscar ID, título, contexto..."
                    className="h-9 rounded-lg border-slate-200 pl-9 text-sm"
                    disabled={isEditing}
                  />
                </div>

                <Select value={filters.source} onValueChange={(value) => setFilters(current => ({ ...current, source: value }))} disabled={isEditing}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Fonte" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {sources.map(source => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.subject} onValueChange={(value) => setFilters(current => ({ ...current, subject: value }))} disabled={isEditing}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Matéria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as matérias</SelectItem>
                    {subjects.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={filters.discipline} onValueChange={(value) => setFilters(current => ({ ...current, discipline: value }))} disabled={isEditing}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Disciplina" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as disciplinas</SelectItem>
                    {disciplines.map(discipline => <SelectItem key={discipline} value={discipline}>{discipline}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={filters.difficulty} onValueChange={(value) => setFilters(current => ({ ...current, difficulty: value }))} disabled={isEditing}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Dificuldade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Dificuldade</SelectItem>
                      <SelectItem value="Fácil">Fácil</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Difícil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.year} onValueChange={(value) => setFilters(current => ({ ...current, year: value }))} disabled={isEditing}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Ano" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={filters.hasImages} onValueChange={(value) => setFilters(current => ({ ...current, hasImages: value }))} disabled={isEditing}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Imagens" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Com e sem imagens</SelectItem>
                    <SelectItem value="with">Com imagens</SelectItem>
                    <SelectItem value="without">Sem imagens</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    <ArrowDownUp size={12} /> Ordenação
                  </p>
                  <Select value={filters.sortField} onValueChange={(value) => setFilters(current => ({ ...current, sortField: value as SortField }))} disabled={isEditing}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Ordenar por" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SORT_FIELD_LABELS) as SortField[]).map(field => (
                        <SelectItem key={field} value={field}>{SORT_FIELD_LABELS[field]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.sortDirection} onValueChange={(value) => setFilters(current => ({ ...current, sortDirection: value as SortDirection }))} disabled={isEditing}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Direção" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Crescente</SelectItem>
                      <SelectItem value="desc">Decrescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{currentItems.length} item(ns) na fila</span>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      className="h-7 rounded-md px-2 text-xs text-slate-500 hover:text-slate-900"
                      disabled={isEditing}
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fila</p>
                  {[
                    ['← →', 'Navegar entre questões'],
                    ['Enter', 'Aprovar e publicar'],
                    ['Delete', 'Deletar permanentemente'],
                    ['Ctrl/Cmd + A', mode === 'archived' ? 'Desarquivar' : 'Arquivar'],
                    ['E', 'Editar questão'],
                    ['Ctrl/Cmd + M', 'Abrir/fechar comentário do professor'],
                  ].map(([keys, description]) => (
                    <div key={keys} className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="text-[13px]">{description}</span>
                      <kbd className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{keys}</kbd>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Editor</p>
                  {[
                    ['Ctrl/Cmd + B', 'Negrito'],
                    ['Ctrl/Cmd + I', 'Itálico'],
                    ['Ctrl/Cmd + U', 'Sublinhado'],
                    ['Ctrl/Cmd + Enter', 'Novo parágrafo'],
                    ['Ctrl/Cmd + S', 'Salvar alterações'],
                  ].map(([keys, description]) => (
                    <div key={keys} className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="text-[13px]">{description}</span>
                      <kbd className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ================= RÉGUA DE FERRAMENTAS ================= */}
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-slate-200 bg-white py-2">
        {renderRailButton({
          id: 'filters',
          icon: <Filter size={17} />,
          label: 'Filtros e ordenação',
          badge: activeFilterCount || undefined,
        })}
        {renderRailButton({
          id: 'shortcuts',
          icon: <Keyboard size={17} />,
          label: 'Atalhos de teclado',
        })}
        <button
          type="button"
          title={`Recarregar ${modeTitle.toLowerCase()}`}
          aria-label={`Recarregar ${modeTitle.toLowerCase()}`}
          onClick={refreshCurrentList}
          disabled={isListLoading}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
        >
          <RotateCcw size={17} className={isListLoading ? 'animate-spin' : undefined} />
        </button>
      </nav>
    </div>
  );
}
