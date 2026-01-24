'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ArrowLeft,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
}

interface AdminQuestion {
  id: string;
  external_id: string;
  exam_year: number;
  subject: string;
  difficulty: string;
  title: string;
  context?: string;
  alternatives: Alternative[];
  correct_alternative: string;
  images: string[];
  is_ai_generated?: boolean;
  metadata?: any;
}

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Filtros
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  const supabase = createClient();

  // --- DATA FETCHING ---
  const fetchPending = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('is_verified', false)
        .neq('status', 'archived')
        .order('created_at', { ascending: true })
        .limit(50); 

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Erro Supabase:", error);
      toast.error("Erro ao carregar fila de curadoria.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // --- LÓGICA DE FILTRAGEM ---
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchSubject = filterSubject === 'all' || q.subject === filterSubject;
      const matchDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchSubject && matchDifficulty;
    });
  }, [questions, filterSubject, filterDifficulty]);

  const currentQuestion = filteredQuestions[0];
  const remainingCount = filteredQuestions.length;

  const subjects = useMemo(() => 
    Array.from(new Set(questions.map(q => q.subject))).sort(), 
  [questions]);

  // --- ACTIONS ---
  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!currentQuestion) return;
    
    const targetId = currentQuestion.id;
    setProcessing(true);

    const prevQuestions = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== targetId));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão inválida");

      if (decision === 'reject') {
        const { error } = await supabase
            .from('questions')
            .delete()
            .eq('id', targetId);

        if (error) throw error;
        toast("Questão removida permanentemente.", { icon: <Trash2 className="w-4 h-4 text-red-500"/> });

      } else {
        const { error } = await supabase
            .from('questions')
            .update({ 
                is_verified: true, 
                status: 'active',
                verified_by: user.id,
            })
            .eq('id', targetId);

        if (error) throw error;
        toast.success("Questão validada e ativada!", { duration: 2000 });
      }

    } catch (err: any) {
      console.error(err);
      setQuestions(prevQuestions);
      toast.error(`Falha: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- HELPER DE CORES ---
  const getDifficultyColor = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'fácil': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'médio': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'difícil': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col">
      
      {/* HEADER FIXO */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 md:px-8 md:py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/portal/admin">
              <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-full -ml-2">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
          </Link>
          <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">Mesa de Curadoria</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Layers className="w-3 h-3" />
                <span>{remainingCount} na fila</span>
              </div>
          </div>
        </div>
        
        {/* Filtros Compactos */}
        <div className="flex gap-2">
           <Select value={filterSubject} onValueChange={setFilterSubject}>
             <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
               <SelectValue placeholder="Matéria" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todas</SelectItem>
               {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
             </SelectContent>
           </Select>
           
           <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
             <SelectTrigger className="w-[110px] h-9 text-xs bg-slate-50 border-slate-200 hidden md:flex">
               <SelectValue placeholder="Nível" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos</SelectItem>
               <SelectItem value="Fácil">Fácil</SelectItem>
               <SelectItem value="Médio">Médio</SelectItem>
               <SelectItem value="Difícil">Difícil</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 flex flex-col">
        
        {loading ? (
           <div className="space-y-6 animate-pulse">
             <Skeleton className="h-64 w-full rounded-2xl bg-slate-200" />
             <div className="space-y-3">
               <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
               <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
               <Skeleton className="h-12 w-full rounded-xl bg-slate-200" />
             </div>
           </div>
        ) : !currentQuestion ? (
          <div className="flex flex-col items-center justify-center flex-1 py-10 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Você zerou a fila!</h2>
            <p className="text-slate-500 mt-2 max-w-md">
              Não há mais questões pendentes com os filtros atuais.
            </p>
            {(filterSubject !== 'all' || filterDifficulty !== 'all') && (
               <Button variant="link" onClick={() => { setFilterSubject('all'); setFilterDifficulty('all'); }} className="mt-4">
                 Limpar filtros
               </Button>
            )}
            <Button onClick={fetchPending} variant="outline" className="mt-8 border-slate-300">
              Verificar novamente
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300 fade-in" key={currentQuestion.id}>
             
             {/* Progress Bar */}
             <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(((questions.length - remainingCount + 1) / (questions.length + 1)) * 100, 100)}%` }}
                />
             </div>

             <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
                
                {/* Metadados */}
                <div className="bg-slate-50/80 backdrop-blur border-b border-slate-100 px-6 py-3 flex justify-between items-center text-xs">
                   <div className="flex gap-2 items-center">
                      <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700 shadow-sm">
                        {currentQuestion.subject || 'Geral'}
                      </Badge>
                      <Badge variant="outline" className={`${getDifficultyColor(currentQuestion.difficulty)} border-transparent shadow-sm`}>
                        {currentQuestion.difficulty || 'N/A'}
                      </Badge>
                      {currentQuestion.exam_year && (
                         <span className="flex items-center gap-1 text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                           <Calendar className="w-3 h-3" /> {currentQuestion.exam_year}
                         </span>
                      )}
                      {currentQuestion.is_ai_generated && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">
                           <Bot className="w-3 h-3 mr-1" /> IA
                        </Badge>
                      )}
                   </div>
                   <span className="font-mono text-slate-400 opacity-60">ID: {currentQuestion.external_id?.slice(0,6)}</span>
                </div>

                <CardContent className="p-6 md:p-8 space-y-8">
                  
                  {/* Contexto */}
                  {currentQuestion.context && (
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                         <BookOpen size={12} /> Texto Base
                      </div>
                      <div className="prose prose-sm max-w-none text-slate-600 italic leading-relaxed">
                        <ReactMarkdown>{currentQuestion.context}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Enunciado */}
                  <div>
                    <div className="prose prose-lg max-w-none text-slate-900 font-medium leading-relaxed">
                      <ReactMarkdown>{currentQuestion.title || "Sem enunciado..."}</ReactMarkdown>
                    </div>

                    {/* Imagens */}
                    {currentQuestion.images && currentQuestion.images.length > 0 && (
                      <div className="mt-6 flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                        {currentQuestion.images.map((img, i) => (
                          <img 
                            key={i} 
                            src={img} 
                            alt={`Figura ${i+1}`} 
                            className="h-48 w-auto rounded-lg border border-slate-200 object-contain bg-slate-50" 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alternativas */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alternativas</p>
                    <div className="grid gap-3">
                      {currentQuestion.alternatives?.map((alt) => {
                        const isCorrect = alt.letter === currentQuestion.correct_alternative;
                        return (
                          <div 
                            key={alt.letter}
                            className={`
                              relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200
                              ${isCorrect 
                                 ? 'bg-emerald-50 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-sm z-10' 
                                 : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                               }
                            `}
                          >
                            <div className={`
                               shrink-0 w-7 h-7 flex items-center justify-center rounded-lg font-bold text-sm border shadow-sm
                               ${isCorrect 
                                  ? 'bg-emerald-500 border-emerald-600 text-white' 
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                               }
                            `}>
                              {alt.letter}
                            </div>
                            
                            {/* FIX: CSS Class direto na div pai ao invés do ReactMarkdown para evitar erro de TS */}
                            <div className={`flex-1 text-sm md:text-base leading-relaxed [&_p]:m-0 ${isCorrect ? 'text-emerald-950 font-medium' : ''}`}>
                               <ReactMarkdown>{alt.text || ''}</ReactMarkdown>
                               {!alt.text && <span className="italic opacity-50 text-xs">Imagem na alternativa</span>}
                            </div>
                            
                            {isCorrect && (
                              <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                            )}
                          </div>
                        )
                      })}
                      {(!currentQuestion.alternatives || currentQuestion.alternatives.length === 0) && (
                         <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-3 border border-amber-100">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">Questão sem alternativas cadastradas. Revisar JSON.</span>
                         </div>
                      )}
                    </div>
                  </div>
                </CardContent>

                {/* FOOTER FIXO */}
                <CardFooter className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-10 flex flex-col sm:flex-row gap-3">
                   <Button 
                      variant="outline" 
                      className="w-full sm:w-auto h-12 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 font-medium transition-all active:scale-95"
                      onClick={() => handleDecision('reject')}
                      disabled={processing}
                   >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Rejeitar (Excluir)
                   </Button>
                   
                   <div className="flex-1 hidden sm:block"></div>

                   <Button 
                      className="w-full sm:w-auto h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                      onClick={() => handleDecision('approve')}
                      disabled={processing}
                   >
                      {processing ? (
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Processando...
                        </div>
                      ) : (
                        <>
                           <CheckCircle2 className="w-5 h-5 mr-2" />
                           Aprovar Questão
                        </>
                      )}
                   </Button>
                </CardFooter>
             </Card>
          </div>
        )}
      </main>
    </div>
  );
}