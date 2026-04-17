'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import ReactMarkdown from 'react-markdown';
import {
  CheckCircle2,
  Trash2,
  Inbox,
  Filter,
  Bot,
  Calendar,
  BookOpen,
  AlertCircle,
  ArrowLeft,
  Layers,
  Edit3,
  X,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  image?: string;
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
    thought: string;
  };
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

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [auditItems, setAuditItems] = useState<AuditQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [auditProcessingId, setAuditProcessingId] = useState<string | null>(null);
  const [mode, setMode] = useState<'curation' | 'audit'>('curation');
  const [auditType, setAuditType] = useState<'media' | 'data' | 'classification' | 'render'>('media');
  const [auditSummary, setAuditSummary] = useState<{ totalAudited: number; flagged: number }>({ totalAudited: 0, flagged: 0 });

  // Filtros Locais
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Controle de Edição
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<AdminQuestion | null>(null);

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
        parsedReasoning = typeof q.ai_reasoning === 'string'
          ? JSON.parse(q.ai_reasoning)
          : q.ai_reasoning;
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
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_verified', false)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const sanitizedData: AdminQuestion[] = (data || []).map((q: any) => parseQuestionRow(q));

      setQuestions(sanitizedData);
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
      const [{ data, error }, auditedCountRes, flaggedCountRes] = await Promise.all([
        supabase
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
          .limit(100),
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

      if (error) throw error;

      const mapped: AuditQuestionItem[] = (data || [])
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

  useEffect(() => {
    fetchPending();
    fetchAuditQueue();
  }, []);

  useEffect(() => {
    if (mode === 'audit') {
      fetchAuditQueue();
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
    }
  };

  const startEditing = () => {
    if (!activeQuestion) return;
    setEditForm(JSON.parse(JSON.stringify(activeQuestion))); // Deep copy
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm(null);
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
        alternatives: editForm.alternatives,
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
      toast.success("Edições salvas! Revise e aprove a questão.");
      setIsEditing(false);
      setEditForm(null);
    } catch (err: any) {
      console.error("Erro ao salvar edição:", err);
      void reportError("AdminQuestionsEditError", String(err));
      toast.error(`Falha ao salvar: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  // --- FILTERING LOGIC ---
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchSubject && matchDifficulty;
    });
  }, [questions, filterSubject, filterDifficulty]);

  const filteredAuditItems = useMemo(() => {
    return auditItems.filter(item => {
      const q = item.question;
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchSubject && matchDifficulty;
    });
  }, [auditItems, filterSubject, filterDifficulty]);

  const subjects = Array.from(
    new Set(
      (mode === 'audit'
        ? auditItems.map(item => item.question.subject)
        : questions.map(q => q.subject))
    )
  ).filter(Boolean).sort();

  // Índice para navegação por setas (seta esq/dir)
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItems = mode === 'audit' ? filteredAuditItems : filteredQuestions;
  const activeAuditItem = filteredAuditItems.length
    ? filteredAuditItems[Math.min(currentIndex, filteredAuditItems.length - 1)]
    : undefined;
  const activeQuestion = mode === 'audit'
    ? activeAuditItem?.question
    : filteredQuestions.length
      ? filteredQuestions[Math.min(currentIndex, filteredQuestions.length - 1)]
      : undefined;

  useEffect(() => {
    setCurrentIndex(0);
    setIsEditing(false);
    setEditForm(null);
  }, [mode]);

  // --- KEYBOARD SHORTCUTS (UX/UI B2B Flow) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeQuestion || processingId || auditProcessingId || isEditing) return;

      // Ignora atalhos se o usuário estiver digitando em algum input global
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(i => Math.min(i + 1, currentItems.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(i => Math.max(0, i - 1));
      } else if (mode === 'curation' && e.key === 'Enter') {
        e.preventDefault();
        handleDecision(activeQuestion.id, 'approve');
      } else if (mode === 'curation' && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDecision(activeQuestion.id, 'reject');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, processingId, auditProcessingId, isEditing, currentItems.length, mode]);

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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">

        {/* --- HEADER & TOOLBAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/portal/admin">
              <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                <ArrowLeft size={20} />
              </Button>
            </Link>

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                {mode === 'curation' ? 'Curadoria' : 'Auditoria'}
                <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-slate-100 text-slate-600">
                  {mode === 'curation' ? 'Modo Foco' : 'Qualidade'}
                </Badge>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto">
              <Button
                variant={mode === 'curation' ? 'default' : 'outline'}
                className={mode === 'curation' ? 'bg-slate-900 hover:bg-slate-800 text-white' : ''}
                onClick={() => setMode('curation')}
              >
                Curadoria
              </Button>
              <Button
                variant={mode === 'audit' ? 'default' : 'outline'}
                className={mode === 'audit' ? 'bg-slate-900 hover:bg-slate-800 text-white' : ''}
                onClick={() => setMode('audit')}
              >
                Auditoria
              </Button>
            </div>

            {/* Stats Pill: posição atual na fila */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${currentItems.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                <Layers size={14} className="text-slate-400" />
                {currentItems.length > 0
                  ? `${currentIndex + 1} de ${currentItems.length} na fila`
                  : '0 na fila'}
              </span>
            </div>

            {mode === 'audit' && (
              <>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant={auditType === 'media' ? 'default' : 'outline'}
                    className={auditType === 'media' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    onClick={() => setAuditType('media')}
                  >
                    Asset Audit
                  </Button>
                  <Button
                    variant={auditType === 'data' ? 'default' : 'outline'}
                    className={auditType === 'data' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    onClick={() => setAuditType('data')}
                  >
                    Data Audit
                  </Button>
                  <Button
                    variant={auditType === 'classification' ? 'default' : 'outline'}
                    className={auditType === 'classification' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    onClick={() => setAuditType('classification')}
                  >
                    Classification Audit
                  </Button>
                  <Button
                    variant={auditType === 'render' ? 'default' : 'outline'}
                    className={auditType === 'render' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                    onClick={() => setAuditType('render')}
                  >
                    Render Audit
                  </Button>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle size={14} className="text-amber-600" />
                  <span className="font-semibold text-amber-800 text-sm">
                    {auditSummary.flagged} achado(s) em {auditSummary.totalAudited} questão(ões) auditada(s)
                  </span>
                </div>
              </>
            )}

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterSubject} onValueChange={setFilterSubject} disabled={isEditing}>
                <SelectTrigger className="w-[140px] md:w-[160px] bg-white h-9 text-sm">
                  <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <SelectValue placeholder="Matéria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Matérias</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterDifficulty} onValueChange={setFilterDifficulty} disabled={isEditing}>
                <SelectTrigger className="w-[120px] md:w-[140px] bg-white h-9 text-sm">
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Dific.</SelectItem>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* --- CONTENT AREA: THE QUEUE --- */}
        <div className="flex-1 flex flex-col justify-center">
          {(mode === 'curation' ? loading : auditLoading) ? (
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
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{mode === 'curation' ? 'Fila Limpa!' : 'Auditoria Limpa!'}</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">
                {mode === 'curation'
                  ? 'Nenhuma questão pendente para os filtros atuais. A curadoria está em dia.'
                  : 'Nenhum achado aberto para os filtros atuais. A auditoria está em dia.'}
              </p>
              {(filterSubject !== 'all' || filterDifficulty !== 'all') && (
                <Button variant="link" onClick={() => { setFilterSubject('all'); setFilterDifficulty('all'); }} className="mt-4 text-blue-600">
                  Limpar filtros e ver tudo
                </Button>
              )}
              <Button onClick={mode === 'curation' ? fetchPending : fetchAuditQueue} variant="outline" className="mt-6 border-slate-300 text-slate-600">
                Recarregar Base
              </Button>
            </div>
          ) : (
            /* ACTIVE QUESTION CARD */
            <Card
              key={activeQuestion.id}
              className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-right-8 fade-in duration-300 relative group"
            >

              {/* HEADER DA QUESTÃO */}
              <div className="bg-slate-50/80 border-b border-slate-100 p-5 shrink-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none uppercase tracking-wider text-xs px-2.5 py-0.5 font-semibold rounded-md">
                      {activeQuestion.subject}
                    </Badge>
                    {activeQuestion.discipline && (
                      <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-md">
                        {activeQuestion.discipline}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`border uppercase tracking-wider text-xs px-2.5 py-0.5 font-semibold rounded-md ${getDifficultyColor(activeQuestion.difficulty)}`}>
                      {activeQuestion.difficulty}
                    </Badge>
                    {activeQuestion.exam_year && (
                      <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 gap-1.5 px-2.5 py-0.5 rounded-md">
                        <Calendar size={12} /> {activeQuestion.exam_year}
                      </Badge>
                    )}
                    {activeQuestion.is_ai_generated && (
                      <Badge className="bg-purple-100 text-purple-700 border border-purple-200 gap-1.5 hover:bg-purple-200 px-2.5 py-0.5 rounded-md">
                        <Bot size={12} /> IA Gerada
                      </Badge>
                    )}
                    {mode === 'audit' && activeAuditItem && (
                      <>
                        <Badge variant="outline" className={getSeverityColor(activeAuditItem.severity)}>
                          Auditoria {activeAuditItem.severity}
                        </Badge>
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200">
                          {activeAuditItem.issue_codes.length} achado(s)
                        </Badge>
                      </>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {activeQuestion.external_id || activeQuestion.id.substring(0, 8)}
                  </span>
                </div>
              </div>

              {/* CONTEÚDO (MUDANÇA ENTRE MODO DE EXIBIÇÃO E EDIÇÃO) */}
              {isEditing && editForm ? (
                <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-50/30">
                  {/* Metadados Básicos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Matéria</label>
                      <input
                        type="text"
                        value={editForm.subject || ''}
                        onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 mt-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Disciplina</label>
                      <input
                        type="text"
                        value={editForm.discipline || ''}
                        onChange={e => setEditForm({ ...editForm, discipline: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 mt-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Dificuldade</label>
                      <select
                        value={editForm.difficulty || ''}
                        onChange={e => setEditForm({ ...editForm, difficulty: e.target.value })}
                        className="w-full border border-slate-300 rounded-md p-2 mt-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Fácil">Fácil</option>
                        <option value="Médio">Médio</option>
                        <option value="Difícil">Difícil</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Ano</label>
                      <input
                        type="number"
                        value={editForm.exam_year || ''}
                        onChange={e => setEditForm({ ...editForm, exam_year: parseInt(e.target.value) || 0 })}
                        className="w-full border border-slate-300 rounded-md p-2 mt-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Contexto */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><BookOpen size={14} /> Contexto / Texto Base</label>
                    <textarea
                      value={editForm.context || ''}
                      onChange={e => setEditForm({ ...editForm, context: e.target.value })}
                      rows={4}
                      className="w-full border border-slate-300 rounded-md p-3 mt-1 text-sm custom-scrollbar outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Enunciado Principal */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Enunciado Principal (Título)</label>
                    <textarea
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      rows={3}
                      className="w-full border border-slate-300 rounded-md p-3 mt-1 text-sm custom-scrollbar outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Intro Alternativas */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Comando da Questão / Introdução às Alternativas</label>
                    <textarea
                      value={editForm.alternatives_intro || ''}
                      onChange={e => setEditForm({ ...editForm, alternatives_intro: e.target.value })}
                      rows={2}
                      className="w-full border border-slate-300 rounded-md p-3 mt-1 text-sm custom-scrollbar outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Imagens (Deleção apenas) */}
                  {editForm.images && editForm.images.length > 0 && (
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Imagens da Questão (Clique no X para remover)</label>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {editForm.images.map((img, i) => (
                          <div key={i} className="relative shrink-0 group/img">
                            <img src={img} className="h-32 w-auto rounded-lg border border-slate-200 object-cover" alt="Suporte" />
                            <button
                              type="button"
                              onClick={() => setEditForm({ ...editForm, images: editForm.images.filter((_, idx) => idx !== i) })}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternativas */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Alternativas (Clique na Letra para definir como Correta)</label>
                    <div className="space-y-3">
                      {editForm.alternatives?.map((alt, i) => {
                        const isSelected = editForm.correct_alternative === alt.letter;
                        return (
                          <div key={alt.letter} className={`flex items-start gap-3 p-3 border rounded-xl transition-all ${isSelected ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200' : 'border-slate-200 bg-white'}`}>
                            <button
                              type="button"
                              onClick={() => {
                                const newAlts = editForm.alternatives.map(a => ({ ...a, isCorrect: a.letter === alt.letter }));
                                setEditForm({ ...editForm, correct_alternative: alt.letter, alternatives: newAlts });
                              }}
                              className={`shrink-0 w-9 h-9 rounded-lg font-bold flex items-center justify-center border shadow-sm transition-colors ${isSelected ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-300'}`}
                            >
                              {alt.letter}
                            </button>
                            <textarea
                              value={alt.text}
                              onChange={e => {
                                const newAlts = [...editForm.alternatives];
                                newAlts[i].text = e.target.value;
                                setEditForm({ ...editForm, alternatives: newAlts });
                              }}
                              rows={2}
                              className="flex-1 border-none bg-transparent outline-none resize-none text-[15px] leading-snug custom-scrollbar placeholder:text-slate-300 font-mono"
                              placeholder={`Texto da alternativa ${alt.letter}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Comentário Professor/IA */}
                  <div>
                    <label className="text-xs font-bold text-purple-600 uppercase flex items-center gap-2"><Bot size={14} /> Comentário / Raciocínio (Aparece pro Aluno)</label>
                    <textarea
                      value={editForm.ai_reasoning?.thought || ''}
                      onChange={e => setEditForm({ ...editForm, ai_reasoning: { ...editForm.ai_reasoning, thought: e.target.value } })}
                      rows={4}
                      className="w-full border border-purple-200 rounded-md p-3 mt-1 text-sm custom-scrollbar bg-purple-50/30 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-8 custom-scrollbar">

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
                  {activeQuestion.context && (
                    <div className="relative pl-5 border-l-4 border-slate-200 py-1">
                      <div className="absolute -left-[30px] -top-1 bg-white text-slate-400 p-1.5 rounded-full border border-slate-200 shadow-sm">
                        <BookOpen size={16} />
                      </div>
                      <div className="prose prose-slate max-w-none text-slate-600 italic leading-relaxed text-[15px]">
                        <ReactMarkdown>{activeQuestion.context}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Enunciado Principal */}
                  <div className="prose prose-slate prose-lg max-w-none text-slate-900 font-medium leading-relaxed">
                    {activeQuestion.title && <h3 className="text-xl font-bold mb-2 text-slate-800">{activeQuestion.title}</h3>}
                    <ReactMarkdown>{activeQuestion.alternatives_intro || ''}</ReactMarkdown>
                  </div>

                  {/* Raciocínio da IA (Audit View) */}
                  {activeQuestion.is_ai_generated && activeQuestion.ai_reasoning?.thought && (
                    <div className="mt-6 p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot size={16} className="text-purple-600" />
                        <span className="text-sm font-bold text-purple-900 uppercase tracking-wider">Raciocínio da IA</span>
                      </div>
                      <p className="text-sm text-purple-800 leading-relaxed italic">
                        "{activeQuestion.ai_reasoning.thought}"
                      </p>
                    </div>
                  )}

                  {/* Imagens de Apoio */}
                  {activeQuestion.images && activeQuestion.images.length > 0 && (
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                      {activeQuestion.images.map((img, i) => (
                        <div key={i} className="relative shrink-0 snap-center group/img">
                          <img
                            src={img}
                            alt={`Apoio ${i}`}
                            className="h-48 w-auto rounded-xl border border-slate-200 object-cover shadow-sm hover:shadow-md transition-all cursor-zoom-in"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bloco de Alternativas */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Alternativas</h4>
                    {activeQuestion.alternatives && activeQuestion.alternatives.length > 0 ? (
                      activeQuestion.alternatives.map((alt) => {
                        // Verifica tanto a letra exata quanto o booleano 'isCorrect' retornado pela IA
                        const isCorrect = alt.letter === activeQuestion.correct_alternative || alt.isCorrect === true;

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
                              {alt.text || <span className="italic opacity-50">Conteúdo em anexo/imagem</span>}
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
                </div>
              )}

              {/* STICKY FOOTER ACTIONS (Decision Layer) */}
              {isEditing ? (
                <div className="bg-white border-t border-slate-200 p-5 shrink-0 flex gap-4 rounded-b-3xl relative">
                  <Button
                    variant="outline"
                    className="flex-1 h-14 text-base font-semibold border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
                    onClick={cancelEditing}
                    disabled={!!processingId}
                  >
                    Cancelar Edição
                  </Button>

                  <Button
                    className="flex-[2] h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:translate-y-[-1px]"
                    onClick={saveEditing}
                    disabled={!!processingId}
                  >
                    {processingId === activeQuestion?.id ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </div>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              ) : mode === 'audit' ? (
                <div className="bg-slate-50/90 backdrop-blur-md border-t border-slate-200 p-5 shrink-0 flex flex-wrap gap-4 rounded-b-3xl relative">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[180px] h-14 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
                    onClick={fetchAuditQueue}
                    disabled={!!auditProcessingId}
                  >
                    Recarregar Auditoria
                  </Button>

                  <Button
                    className="flex-[2] min-w-[220px] h-14 text-base font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/20 transition-all hover:translate-y-[-1px]"
                    onClick={() => handleDecision(activeQuestion.id, 'approve')}
                    disabled={!!auditProcessingId || activeQuestion.is_verified === true}
                  >
                    {activeQuestion.is_verified === true ? 'Já publicada' : 'Aprovar após Correção'}
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-[2] min-w-[220px] h-14 text-base font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-xl transition-colors"
                    onClick={() => moveQuestionToCuration(activeQuestion.id)}
                    disabled={!!auditProcessingId || activeQuestion.is_verified === false}
                  >
                    {auditProcessingId === activeQuestion.id ? 'Movendo...' : (activeQuestion.is_verified === false ? 'Já está na Curadoria' : 'Mover para Curadoria')}
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-50/90 backdrop-blur-md border-t border-slate-200 p-5 shrink-0 flex flex-wrap gap-4 rounded-b-3xl relative">
                  {/* Dicas de Teclado Flutuantes */}
                  <div className="absolute -top-8 left-0 right-0 flex justify-center gap-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm uppercase tracking-wider">
                      Atalho: DEL ou BACKSPACE
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm uppercase tracking-wider">
                      Atalho: ENTER
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="flex-1 min-w-[120px] h-14 text-base font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl transition-colors"
                    onClick={() => handleDecision(activeQuestion.id, 'reject')}
                    disabled={!!processingId}
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Descartar
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1 min-w-[120px] h-14 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-colors"
                    onClick={startEditing}
                    disabled={!!processingId}
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Editar
                  </Button>

                  <Button
                    className="flex-[2] min-w-[200px] h-14 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:translate-y-[-1px]"
                    onClick={() => handleDecision(activeQuestion.id, 'approve')}
                    disabled={!!processingId}
                  >
                    {processingId === activeQuestion.id ? (
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processando...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Aprovar e Publicar
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
