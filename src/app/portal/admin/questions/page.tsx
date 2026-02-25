'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
  Layers
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
}

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Filtros Locais
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const supabase = createClient();

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

      // DATA MAPPER: Higienização e Parse de Strings para JSON
      const sanitizedData: AdminQuestion[] = (data || []).map((q: any) => {
        
        // Parse seguro das alternativas (Evita quebra por stringify duplo ou null)
        let parsedAlternatives = [];
        try {
           parsedAlternatives = typeof q.alternatives === 'string' 
             ? JSON.parse(q.alternatives) 
             : q.alternatives || [];
        } catch (e) {
           console.error(`Erro ao fazer parse das alternativas na questão ${q.id}`, e);
        }

        // Parse do raciocínio da IA
        let parsedReasoning = null;
        try {
           if (q.ai_reasoning) {
             parsedReasoning = typeof q.ai_reasoning === 'string' 
               ? JSON.parse(q.ai_reasoning) 
               : q.ai_reasoning;
           }
        } catch (e) {
           console.error(`Erro ao fazer parse do ai_reasoning na questão ${q.id}`, e);
        }

        // Parse do metadata (opcional, mas recomendado)
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
          images: q.images || [], // Garante array nativo ao invés de null
        };
      });

      setQuestions(sanitizedData);
    } catch (error) {
      console.error("Erro Supabase:", error);
      toast.error("Erro de conexão com o banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // --- ACTIONS ---
  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    // 1. Optimistic Update (Padrão de Fila - Remove o item imediatamente da UI)
    const previousQuestions = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== id));
    setProcessingId(id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida");

      if (decision === 'reject') {
        // DELETE REAL
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        toast.success("Questão removida permanentemente.");

      } else {
        // UPDATE: Aprova
        const { error } = await supabase
            .from('questions')
            .update({ 
                is_verified: true, 
                status: 'active', // Ajustado para 'active' conforme seu banco de dados
                verified_by: user.id, 
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        toast.success("Questão aprovada e publicada!");
      }

    } catch (err: any) {
      // Rollback
      console.error("ERRO DETALHADO:", JSON.stringify(err, null, 2));
      const errorMessage = err?.message || "Erro desconhecido";
      
      setQuestions(previousQuestions);
      toast.error(`Falha: ${errorMessage}`);
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

  const subjects = Array.from(new Set(questions.map(q => q.subject))).filter(Boolean).sort();

  // Fila: Pega sempre a primeira questão dos resultados filtrados
  const activeQuestion = filteredQuestions[0];

  // --- KEYBOARD SHORTCUTS (UX/UI B2B Flow) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeQuestion || processingId) return;
      
      // Ignora atalhos se o usuário estiver digitando em algum input global
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleDecision(activeQuestion.id, 'approve');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDecision(activeQuestion.id, 'reject');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuestion, processingId]);

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
                  Curadoria
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-slate-100 text-slate-600">Modo Foco</Badge>
                </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             {/* Stats Pill */}
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                <div className={`w-2 h-2 rounded-full ${filteredQuestions.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-semibold text-slate-700 text-sm flex items-center gap-1">
                  <Layers size={14} className="text-slate-400" />
                  {filteredQuestions.length} na fila
                </span>
             </div>

             {/* Filters */}
             <div className="flex gap-2 w-full md:w-auto">
               <Select value={filterSubject} onValueChange={setFilterSubject}>
                 <SelectTrigger className="w-[140px] md:w-[160px] bg-white h-9 text-sm">
                   <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                   <SelectValue placeholder="Matéria" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas Matérias</SelectItem>
                   {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>

               <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
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
          {loading ? (
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
              <h3 className="text-2xl font-bold text-slate-900">Fila Limpa!</h3>
              <p className="text-slate-500 mt-2 max-w-sm text-center">
                Nenhuma questão pendente para os filtros atuais. A curadoria está em dia.
              </p>
              {(filterSubject !== 'all' || filterDifficulty !== 'all') && (
                 <Button variant="link" onClick={() => { setFilterSubject('all'); setFilterDifficulty('all'); }} className="mt-4 text-blue-600">
                   Limpar filtros e ver tudo
                 </Button>
              )}
              <Button onClick={fetchPending} variant="outline" className="mt-6 border-slate-300 text-slate-600">
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
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {activeQuestion.external_id || activeQuestion.id.substring(0,8)}
                  </span>
                </div>
              </div>

              {/* CONTEÚDO SCROLLABLE */}
              <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-8 custom-scrollbar">
                
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

              {/* STICKY FOOTER ACTIONS (Decision Layer) */}
              <div className="bg-slate-50/90 backdrop-blur-md border-t border-slate-200 p-5 shrink-0 flex gap-4 rounded-b-3xl relative">
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
                    className="flex-1 h-14 text-base font-semibold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl transition-colors"
                    onClick={() => handleDecision(activeQuestion.id, 'reject')}
                    disabled={!!processingId}
                 >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Descartar
                 </Button>
                 
                 <Button 
                    className="flex-[2] h-14 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg shadow-slate-900/10 transition-all hover:translate-y-[-1px]"
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