'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, PlusCircle, CheckCircle, Loader2, LayoutGrid, List, AlertCircle, ChevronDown, ImageIcon, Filter, BookOpen } from 'lucide-react';
import { QuestionCard } from '@/components/questions/QuestionCard';

// --- TAXONOMIA DE ELITE (Espelho do Backend para UX Consistente) ---
const TAXONOMY: Record<string, string[]> = {
    "Matemática": ["Matemática Básica", "Grandezas Proporcionais", "Geometria Plana", "Geometria Espacial", "Estatística e Gráficos", "Probabilidade", "Análise Combinatória", "Funções", "Logaritmos", "Trigonometria", "Matemática Financeira"],
    "Física": ["Cinemática", "Dinâmica", "Estática e Hidrostática", "Termologia", "Óptica Geométrica", "Ondulatória", "Eletrodinâmica", "Eletrostática e Magnetismo", "Física Moderna"],
    "Química": ["Química Geral e Inorgânica", "Atomística", "Físico-Química", "Termoquímica", "Equilíbrio Químico", "Eletroquímica", "Química Orgânica", "Química Ambiental"],
    "Biologia": ["Citologia e Metabolismo", "Genética e Biotecnologia", "Evolução", "Ecologia", "Fisiologia Humana", "Saúde e Doenças", "Botânica", "Zoologia"],
    "História": ["Brasil Colônia", "Brasil Império", "Brasil República", "História Antiga", "Idade Média", "Idade Moderna", "Idade Contemporânea", "História da América"],
    "Geografia": ["Geografia Física", "Geografia Humana", "Geografia Econômica", "Geopolítica", "Geografia do Brasil", "Cartografia", "Meio Ambiente e Sustentabilidade"],
    "Filosofia": ["Filosofia Antiga e Medieval", "Filosofia Moderna", "Filosofia Contemporânea", "Ética e Política", "Teoria do Conhecimento"],
    "Sociologia": ["Mundo do Trabalho", "Cultura e Indústria Cultural", "Poder, Estado e Política", "Movimentos Sociais", "Desigualdade e Estratificação Social"],
    "Linguagens": ["Interpretação de Texto", "Gêneros Textuais", "Funções da Linguagem", "Figuras de Linguagem", "Literatura Brasileira", "Arte e Cultura", "Variação Linguística", "Gramática Aplicada"],
    "Inglês": ["Interpretação de Texto", "Vocabulário e Gramática"],
    "Espanhol": ["Interpretação de Texto", "Vocabulário e Gramática"]
};

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
  const [selectedDiscipline, setSelectedDiscipline] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');

  // Helpers
  const subjects = Object.keys(TAXONOMY);
  const availableDisciplines = selectedSubject !== 'all' ? TAXONOMY[selectedSubject] || [] : [];

  // Reset de Disciplina quando Matéria muda
  useEffect(() => {
      setSelectedDiscipline('all');
  }, [selectedSubject]);

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
        per_page: '10', 
        query: search,
        subject: selectedSubject,
        discipline: selectedDiscipline,
        difficulty: selectedDifficulty
      });

      const res = await fetch(`${apiUrl}/api/enterprise/assessment/questions/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error("Falha ao buscar questões.");

      const data = await res.json();
      
      if (resetPage) {
        setQuestions(data.data || []);
        setPage(2); 
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
  }, [page, search, selectedSubject, selectedDiscipline, selectedDifficulty]);

  // Debounce da Busca e Reset de Filtros
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchQuestions(true); // Resetar página ao mudar filtros
    }, 600);
    return () => clearTimeout(delay);
  }, [search, selectedSubject, selectedDiscipline, selectedDifficulty]);

  // Renderização de Badges
  const getDifficultyColor = (diff: string) => {
    switch(diff?.toLowerCase()) {
        case 'fácil': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'médio': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'difícil': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] rounded-3xl border border-slate-200 overflow-hidden shadow-2xl relative">
      
      {/* --- TOOLBAR (Sticky & Organized) --- */}
      <div className="bg-white p-6 border-b border-slate-200 z-20 shadow-sm sticky top-0">
        
        {/* Top Row: Search & Count */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-lg placeholder:text-slate-400"
              placeholder="Pesquisar por código, enunciado ou palavra-chave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-3 min-w-[200px]">
             <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                {loading ? 'Carregando...' : `${totalCount} Questões`}
             </span>
             <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={20}/></button>
                <button onClick={() => setViewMode('CARD')} className={`p-2 rounded-lg transition-all ${viewMode === 'CARD' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={20}/></button>
             </div>
          </div>
        </div>

        {/* Filters Row (Grid para melhor alinhamento) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filter: Subject */}
            <div className="relative">
                <select 
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                >
                    <option value="all">Todas as Matérias</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            </div>

            {/* Filter: Discipline */}
            <div className="relative">
                <select 
                    className={`w-full pl-4 pr-10 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none appearance-none transition-colors
                        ${selectedSubject === 'all' 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70' 
                            : 'bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer hover:bg-slate-50'
                        }`}
                    value={selectedDiscipline}
                    onChange={(e) => setSelectedDiscipline(e.target.value)}
                    disabled={selectedSubject === 'all'}
                >
                    <option value="all">
                        {selectedSubject === 'all' ? 'Selecione uma Matéria primeiro' : 'Todos os Tópicos'}
                    </option>
                    {availableDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            </div>

            {/* Filter: Difficulty */}
            <div className="relative">
                <select 
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 appearance-none cursor-pointer hover:bg-slate-50 transition-colors"
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                    <option value="all">Qualquer Dificuldade</option>
                    <option value="Fácil">Fácil</option>
                    <option value="Médio">Médio</option>
                    <option value="Difícil">Difícil</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            </div>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
        
        {/* Error State */}
        {error && (
            <div className="flex flex-col items-center justify-center p-8 text-red-600 gap-3 bg-red-50 rounded-2xl border-2 border-red-100 mb-6 animate-in fade-in">
                <AlertCircle size={32} /> 
                <span className="font-bold">{error}</span>
            </div>
        )}

        {/* Empty State */}
        {questions.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                <Filter size={40} className="opacity-30 text-slate-500"/>
             </div>
             <p className="font-bold text-xl text-slate-600">Nenhum resultado encontrado.</p>
             <p className="text-base mt-2 max-w-xs text-center">Tente ajustar seus filtros de busca ou remover termos específicos.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'CARD' ? 'grid-cols-1' : 'grid-cols-1'} pb-10`}>
            {questions.map(q => {
              const isSelected = selectedIds.includes(q.id);
              const displayText = q.alternatives_intro || q.statement || "Texto da questão indisponível.";
              
              // --- PARSER INTELIGENTE DE IMAGENS ---
              let imageUrl = null;
              let contextText = q.context; 

              if (q.images && typeof q.images === 'string') {
                  const markdownMatch = q.images.match(/!\[.*?\]\((.*?)\)/);
                  if (markdownMatch) imageUrl = markdownMatch[1];
                  else if (q.images.startsWith('http')) imageUrl = q.images;
              }

              if (!imageUrl && typeof q.context === 'string') {
                  const markdownMatch = q.context.match(/!\[.*?\]\((.*?)\)/);
                  if (markdownMatch) {
                      imageUrl = markdownMatch[1]; 
                      contextText = q.context.replace(markdownMatch[0], '').trim();
                  }
              }

              return (
                <div 
                    key={q.id} 
                    className={`group relative bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden
                        ${isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/30 shadow-none' 
                            : 'border-slate-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1'
                        }`}
                >
                    {/* Conteúdo */}
                    <div className="p-6">
                      {viewMode === 'LIST' ? (
                        <div className="flex flex-col gap-4">
                           {/* Tags Header */}
                           <div className="flex items-center gap-3 flex-wrap border-b border-slate-100 pb-4">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-slate-800 text-white px-3 py-1.5 rounded-md shadow-sm">
                                    {q.subject}
                                </span>
                                {q.discipline && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md border border-slate-200">
                                        {q.discipline}
                                    </span>
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border ${getDifficultyColor(q.difficulty)}`}>
                                    {q.difficulty}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 ml-auto bg-slate-50 px-2 py-1 rounded">
                                    ID: {q.external_id || "N/A"}
                                </span>
                           </div>
                           
                           <div className="flex gap-6 items-start">
                               {/* Thumbnail de Imagem */}
                               {imageUrl && (
                                   <div className="flex-shrink-0 w-32 h-32 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                                       <img src={imageUrl} alt="Questão" className="w-full h-full object-contain mix-blend-multiply" />
                                   </div>
                               )}

                               <div className="flex-1 min-w-0">
                                   {/* Contexto Limpo */}
                                   {contextText && (
                                       <div className="text-xs text-slate-500 italic border-l-4 border-slate-300 pl-3 line-clamp-2 mb-3 font-serif bg-slate-50 py-2 pr-2 rounded-r-lg">
                                            "{contextText}"
                                       </div>
                                   )}

                                   {/* Pergunta */}
                                   <div className="pr-32">
                                       <p className="text-base text-slate-800 font-semibold leading-relaxed line-clamp-3 group-hover:text-black">
                                           {displayText}
                                       </p>
                                   </div>
                               </div>
                           </div>
                        </div>
                      ) : (
                        <QuestionCard 
                            question={q} 
                            userId="" /* Passando string vazia para satisfazer a tipagem obrigatória */
                        />
                      )}
                    </div>

                    {/* Botão de Ação (Floating) */}
                    <div className="absolute top-6 right-6">
                      <button 
                        onClick={() => onSelectQuestion(q)}
                        disabled={isSelected}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md transform ${
                          isSelected 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200 cursor-default opacity-100' 
                            : 'bg-slate-900 text-white hover:bg-blue-600 hover:scale-105 hover:shadow-lg'
                        }`}
                      >
                        {isSelected ? <><CheckCircle size={16}/> Adicionada</> : <><PlusCircle size={16}/> Adicionar</>}
                      </button>
                    </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More Trigger */}
        {questions.length < totalCount && (
            <div className="flex justify-center py-8">
                <button 
                    onClick={() => fetchQuestions(false)}
                    disabled={loading}
                    className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3 text-sm shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <PlusCircle size={18}/>}
                    Carregar mais questões
                </button>
            </div>
        )}
        
        {loading && questions.length === 0 && (
            <div className="space-y-6">
                {[1,2,3].map(i => (
                    <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 animate-pulse shadow-sm"></div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
}