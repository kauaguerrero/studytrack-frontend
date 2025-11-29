"use client";

import { useState, useEffect } from "react";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { Filter, Search, Loader2 } from "lucide-react";

export default function QuestionBankPage() {
  // CORREÇÃO AQUI: Tipagem explícita para o array
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: "Todas",
    difficulty: "Todas"
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      
      if (filters.subject !== "Todas") params.append("subject", filters.subject);
      if (filters.difficulty !== "Todas") params.append("difficulty", filters.difficulty);

      // Nota: Verifique se a porta do seu backend é 5000
      const res = await fetch(`http://127.0.0.1:5000/api/questions?${params}`);
      const data = await res.json();
      
      setQuestions(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [filters, page]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR DE FILTROS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-6">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Filter size={20} /> Filtros
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="subject-filter" className="text-xs font-bold text-slate-500 uppercase block mb-2">Matéria</label>
                <select 
                  id="subject-filter"
                  aria-label="Filtrar por matéria"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  value={filters.subject}
                  onChange={(e) => setFilters({...filters, subject: e.target.value})}
                >
                  <option value="Todas">Todas</option>
                  <option value="Matemática">Matemática</option>
                  <option value="Português">Português</option>
                  <option value="História">História</option>
                  <option value="Física">Física</option>
                  <option value="Química">Química</option>
                  <option value="Biologia">Biologia</option>
                  <option value="Geografia">Geografia</option>
                </select>
              </div>

              <div>
                <label htmlFor="difficulty-filter" className="text-xs font-bold text-slate-500 uppercase block mb-2">Dificuldade</label>
                <select 
                  id="difficulty-filter"
                  aria-label="Filtrar por dificuldade"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  value={filters.difficulty}
                  onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
                >
                  <option value="Todas">Todas</option>
                  <option value="Easy">Fácil</option>
                  <option value="Medium">Média</option>
                  <option value="Hard">Difícil</option>
                </select>
              </div>

              <button 
                onClick={() => setPage(1)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search size={18} /> Filtrar
              </button>
            </div>
          </div>
        </div>

        {/* LISTA DE QUESTÕES */}
        <div className="lg:col-span-3">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-900">Banco de Questões</h1>
            <span className="text-sm text-slate-500">{total} questões encontradas</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600 w-8 h-8"/></div>
          ) : (
            <div className="space-y-6">
              {questions.length > 0 ? (
                questions.map((q: any) => (
                  <QuestionCard key={q.id} question={q} />
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-500">Nenhuma questão encontrada com esses filtros.</p>
                </div>
              )}
            </div>
          )}

          {/* PAGINAÇÃO */}
          <div className="flex justify-center gap-2 mt-8">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-700"
            >
              Anterior
            </button>
            <span className="px-4 py-2 bg-white border rounded-lg font-bold text-blue-600">
              Página {page}
            </span>
            <button 
              disabled={questions.length < 10} 
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-700"
            >
              Próxima
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}