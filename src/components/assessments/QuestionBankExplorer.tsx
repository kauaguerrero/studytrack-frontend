'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Filter, PlusCircle, CheckCircle, Loader2, LayoutGrid, List, AlertCircle, ChevronDown } from 'lucide-react';
import { getSubjects } from '@/constants/taxonomy';
import { QuestionCard } from '@/components/questions/QuestionCard';

interface QuestionBankExplorerProps {
  onSelectQuestion: (question: any) => void;
  selectedIds: string[];
}

export function QuestionBankExplorer({ onSelectQuestion, selectedIds }: QuestionBankExplorerProps) {
  // Estados de Dados
  const [questions, setQuestions] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de Filtro
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');

  // Helpers
  const subjects = getSubjects();

  // Função de Busca (Consumindo API Flask)
  const fetchQuestions = useCallback(async (resetPage = false) => {
    setLoading(true);
    setError('');
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const currentPage = resetPage ? 1 : page;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      
      // Monta Query Params
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '10', // Carrega em blocos de 10
        query: search,
        subject: selectedSubject,
        difficulty: selectedDifficulty
      });

      const res = await fetch(`${apiUrl}/api/enterprise/assessment/questions/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error("Falha ao buscar questões.");

      const data = await res.json();
      
      if (resetPage) {
        setQuestions(data.data || []);
        setPage(2); // Prepara próxima página
      } else {
        setQuestions(prev => [...prev, ...(data.data || [])]);
        setPage(prev => prev + 1);
      }
      
      setTotalCount(data.count || 0);

    } catch (err) {
      console.error(err);
      setError("Erro ao conectar com o banco de questões.");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedSubject, selectedDifficulty]);

  // Debounce da Busca e Reset de Filtros
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchQuestions(true); // Resetar página ao mudar filtros
    }, 600);
    return () => clearTimeout(delay);
  }, [search, selectedSubject, selectedDifficulty]);

  // Renderização de Badges
  const getDifficultyColor = (diff: string) => {
    switch(diff?.toLowerCase()) {
        case 'fácil': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'médio': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'difícil': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      
      {/* --- TOOLBAR --- */}
      <div className="bg-white p-5 border-b border-slate-200 space-y-4 z-10 shadow-sm">
        
        {/* Search Input */}
        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              placeholder="Pesquisar por enunciado, código ou tópico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {/* View Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><List size={18}/></button>
            <button onClick={() => setViewMode('CARD')} className={`p-2 rounded-lg transition-all ${viewMode === 'CARD' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={18}/></button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            <div className="relative min-w-[180px]">
                <select 
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-400 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                >
                    <option value="all">Todas as Matérias</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>

            <div className="relative min-w-[150px]">
                <select 
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-400 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                    <option value="all">Qualquer Dificuldade</option>
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>
            
            <div className="ml-auto flex items-center px-3 text-xs font-bold text-slate-400 uppercase tracking-wide">
                {totalCount} Questões encontradas
            </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
        
        {/* Error State */}
        {error && (
            <div className="flex flex-col items-center justify-center h-40 text-red-500 gap-2 bg-red-50 rounded-xl border border-red-100 mb-4">
                <AlertCircle /> {error}
            </div>
        )}

        {/* List of Questions */}
        {questions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search size={32} className="opacity-50"/>
             </div>
             <p className="font-medium">Nenhum resultado encontrado.</p>
             <p className="text-sm">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'CARD' ? 'grid-cols-1' : 'grid-cols-1'} pb-8`}>
            {questions.map(q => {
              const isSelected = selectedIds.includes(q.id);
              // CORREÇÃO CRÍTICA: Fallback seguro para o texto
              const displayText = q.alternatives_intro || q.statement || "Texto da questão indisponível.";
              
              return (
                <div 
                    key={q.id} 
                    className={`group relative bg-white rounded-xl border transition-all duration-200 overflow-hidden
                        ${isSelected 
                            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10 shadow-sm' 
                            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                >
                   {/* Conteúdo */}
                   <div className="p-5">
                      {viewMode === 'LIST' ? (
                        <div className="flex flex-col gap-3">
                           {/* Tags Header */}
                           <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                    {q.subject}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${getDifficultyColor(q.difficulty)}`}>
                                    {q.difficulty}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 ml-auto">
                                    ID: {q.external_id || "N/A"}
                                </span>
                           </div>
                           
                           {/* Contexto (se houver) */}
                           {q.context && (
                               <div className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-2 line-clamp-2">
                                   {q.context}
                               </div>
                           )}

                           {/* Pergunta */}
                           <div className="pr-24">
                               <p className="text-sm text-slate-800 font-medium leading-relaxed line-clamp-3">
                                   {displayText}
                               </p>
                           </div>
                        </div>
                      ) : (
                        // Card Mode usa o componente completo
                        <QuestionCard question={q} userId="preview" />
                      )}
                   </div>

                   {/* Botão de Ação (Posicionado Absolutamente) */}
                   <div className="absolute top-5 right-5">
                      <button 
                        onClick={() => onSelectQuestion(q)}
                        disabled={isSelected}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default' 
                            : 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-md active:scale-95'
                        }`}
                      >
                        {isSelected ? <><CheckCircle size={14}/> Adicionada</> : <><PlusCircle size={14}/> Adicionar</>}
                      </button>
                   </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Trigger */}
        {questions.length < totalCount && (
            <div className="flex justify-center py-4">
                <button 
                    onClick={() => fetchQuestions(false)}
                    disabled={loading}
                    className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-sm shadow-sm"
                >
                    {loading ? <Loader2 className="animate-spin" size={16}/> : <PlusCircle size={16}/>}
                    Carregar mais questões
                </button>
            </div>
        )}
        
        {loading && questions.length === 0 && (
            <div className="space-y-4">
                {[1,2,3].map(i => (
                    <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse"></div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}