'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import { 
  CheckCircle2, 
  Trash2, // Ícone de Lixeira
  Inbox, 
  Filter, 
  Bot, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  ArrowLeft
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
}

interface AdminQuestion {
  id: string;
  external_id: string;
  year: number;
  subject: string;
  difficulty: string;
  statement: string;
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
      setQuestions(data || []);
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
    // 1. Optimistic Update
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
                status: 'approved',
                // verified_by: user.id, // Descomente se tiver a coluna
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

  const subjects = Array.from(new Set(questions.map(q => q.subject))).sort();

  // --- RENDER HELPERS ---
  const getDifficultyColor = (diff: string) => {
    if (!diff) return 'bg-slate-100 text-slate-700';
    switch (diff.toLowerCase()) {
      case 'fácil': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200';
      case 'médio': return 'bg-amber-100 text-amber-700 hover:bg-amber-200';
      case 'difícil': return 'bg-rose-100 text-rose-700 hover:bg-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER & TOOLBAR --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4">
            <Link href="/portal/admin">
                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                    <ArrowLeft size={20} />
                </Button>
            </Link>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                Curadoria de Conteúdo
                <Badge variant="secondary" className="text-base px-3 py-1">Admin</Badge>
                </h1>
                <p className="text-slate-500 mt-2 text-lg max-w-2xl">
                Revise, valide e publique questões submetidas pela IA ou equipe pedagógica.
                </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto pl-14 md:pl-0">
             {/* Stats Pill */}
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200 mr-2">
                <div className={`w-2 h-2 rounded-full ${questions.length > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="font-bold text-slate-700 text-sm">
                  {questions.length} Pendentes
                </span>
             </div>

             {/* Filters */}
             <div className="flex gap-2 w-full md:w-auto">
               <Select value={filterSubject} onValueChange={setFilterSubject}>
                 <SelectTrigger className="w-[160px] bg-white">
                   <Filter className="w-4 h-4 mr-2 text-slate-400" />
                   <SelectValue placeholder="Matéria" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todas Matérias</SelectItem>
                   {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>

               <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                 <SelectTrigger className="w-[140px] bg-white">
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

        {/* --- CONTENT AREA --- */}
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
             {[1,2,3,4].map(i => (
               <div key={i} className="space-y-4 p-6 bg-white rounded-2xl border border-slate-200">
                  <div className="flex justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                  <Skeleton className="h-32 w-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
               </div>
             ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
              <Inbox size={48} className="text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Fila Zerada!</h3>
            <p className="text-slate-500 mt-2 max-w-md text-center">
              Nenhuma questão pendente corresponde aos filtros atuais. Ótimo trabalho.
            </p>
            {(filterSubject !== 'all' || filterDifficulty !== 'all') && (
               <Button variant="link" onClick={() => { setFilterSubject('all'); setFilterDifficulty('all'); }}>
                 Limpar filtros
               </Button>
            )}
            <Button onClick={fetchPending} variant="outline" className="mt-8 border-slate-300 text-slate-600">
              Recarregar Dados
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredQuestions.map((q) => (
              <Card key={q.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
                
                {/* --- CARD HEADER --- */}
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none uppercase tracking-wider text-[10px] px-2">
                        {q.subject}
                      </Badge>
                      <Badge variant="outline" className={`border-none uppercase tracking-wider text-[10px] px-2 ${getDifficultyColor(q.difficulty)}`}>
                        {q.difficulty}
                      </Badge>
                      {q.year && (
                        <Badge variant="outline" className="bg-white text-slate-500 border-slate-200 gap-1">
                           <Calendar size={10} /> {q.year}
                        </Badge>
                      )}
                      {q.is_ai_generated && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1 hover:bg-purple-200">
                           <Bot size={12} /> IA Generated
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                      ID: {q.external_id?.substring(0,8) || 'N/A'}
                    </span>
                  </div>
                </CardHeader>

                {/* --- CARD CONTENT --- */}
                <CardContent className="p-6 space-y-6">
                  
                  {/* Contexto */}
                  {q.context && (
                    <div className="relative pl-4 border-l-4 border-slate-200 py-1">
                      <div className="absolute -left-[27px] -top-1 bg-white text-slate-300 p-1 rounded-full border border-slate-100">
                         <BookOpen size={14} />
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none text-slate-600 italic leading-relaxed">
                        <ReactMarkdown>{q.context}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Enunciado */}
                  <div className="prose prose-slate max-w-none text-slate-900 font-medium leading-relaxed">
                    <ReactMarkdown>{q.statement}</ReactMarkdown>
                  </div>

                  {/* Imagens */}
                  {q.images && q.images.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {q.images.map((img, i) => (
                        <div key={i} className="relative group/img">
                           <img 
                              src={img} 
                              alt={`Apoio ${i}`} 
                              className="h-28 w-auto rounded-lg border border-slate-200 object-cover hover:scale-105 transition-transform cursor-zoom-in" 
                           />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Alternativas */}
                  <div className="grid gap-2 pt-2">
                    {q.alternatives?.map((alt) => {
                      const isCorrect = alt.letter === q.correct_alternative;
                      return (
                        <div 
                          key={alt.letter}
                          className={`
                            relative flex items-start gap-3 p-3 rounded-xl border text-sm transition-all
                            ${isCorrect 
                               ? 'bg-emerald-50/70 border-emerald-200 shadow-sm' 
                               : 'bg-white border-slate-100 text-slate-500 opacity-90'
                            }
                          `}
                        >
                          <div className={`
                             shrink-0 w-6 h-6 flex items-center justify-center rounded-md font-bold text-xs border
                             ${isCorrect 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                             }
                          `}>
                            {alt.letter}
                          </div>
                          <div className={`flex-1 leading-snug ${isCorrect ? 'text-emerald-900 font-medium' : ''}`}>
                             {alt.text || <span className="italic opacity-50">Conteúdo de Imagem</span>}
                          </div>
                          {isCorrect && <CheckCircle2 size={16} className="text-emerald-600 mt-0.5" />}
                        </div>
                      )
                    })}
                    {!q.alternatives && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200">
                            <AlertCircle size={16} /> 
                            Questão sem alternativas cadastradas.
                        </div>
                    )}
                  </div>
                </CardContent>

                {/* --- CARD FOOTER --- */}
                <CardFooter className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                   <Button 
                      variant="outline" 
                      className="flex-1 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 h-11"
                      onClick={() => handleDecision(q.id, 'reject')}
                      disabled={!!processingId}
                   >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar
                   </Button>
                   
                   <Button 
                      className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white h-11 shadow-lg shadow-slate-200"
                      onClick={() => handleDecision(q.id, 'approve')}
                      disabled={!!processingId}
                   >
                      {processingId === q.id ? (
                        <div className="flex items-center gap-2">
                           <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                           Processando...
                        </div>
                      ) : (
                        <>
                           <CheckCircle2 className="w-4 h-4 mr-2" />
                           Aprovar Questão
                        </>
                      )}
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}