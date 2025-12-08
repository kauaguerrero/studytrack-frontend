'use client';

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, BrainCircuit, AlertCircle, Filter, BookOpen, ChevronDown, Layers } from 'lucide-react'

// --- Interfaces ---
interface Alternative {
  label: string;
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string; // UUID
  exam_year: number;
  subject: string;
  statement: string;
  context_text?: string;
  images: string[];
  alternatives: Alternative[];
  metadata?: {
    ai_topic?: string;
    ai_processed?: boolean;
  };
}

// Utilitário para cores das matérias
const getSubjectColor = (subject: string) => {
  if (!subject) return 'bg-gray-100 text-gray-700 border-gray-200';
  const s = subject.toLowerCase();
  if (s.includes('matemática')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('física') || s.includes('química') || s.includes('biologia')) return 'bg-green-50 text-green-700 border-green-200';
  if (s.includes('história') || s.includes('geografia') || s.includes('filosofia')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s.includes('português') || s.includes('literatura') || s.includes('inglês')) return 'bg-pink-50 text-pink-700 border-pink-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

// --- Componente de Cartão de Questão Individual ---
function QuestionItem({ question, userId }: { question: Question, userId: string }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    correctOption: string;
    explanation?: string;
  } | null>(null);

  const handleAnswer = async (optionLabel: string) => {
    if (isSubmitting || result) return;

    setSelectedOption(optionLabel);
    setIsSubmitting(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/questions/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          question_id: question.id,
          option: optionLabel
        })
      });

      const data = await response.json();

      setResult({
        correct: data.is_correct,
        correctOption: data.correct_option,
        explanation: data.explanation
      });

    } catch (error) {
      console.error("Erro ao responder:", error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lógica de limpeza de texto (para evitar duplicidade)
  let displayStatement = question.statement;
  if (question.context_text) {
    const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
    const cleanContext = normalize(question.context_text);
    const cleanStatement = normalize(question.statement);

    if (cleanStatement.startsWith(cleanContext)) {
      displayStatement = question.statement.substring(question.context_text.length).trim();
      displayStatement = displayStatement.replace(/^[\.\-\s]+/, '');
    } else if (question.statement.includes(question.context_text)) {
      displayStatement = question.statement.replace(question.context_text, '').trim();
    }
  }

  const aiTopic = question.metadata?.ai_topic || "";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
      
      {/* Cabeçalho do Card */}
      <div className="bg-slate-50/50 border-b border-slate-100 p-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
            <BookOpen size={12} className="text-slate-400"/>
            {question.exam_year}
          </span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${getSubjectColor(question.subject)}`}>
            {question.subject || 'Geral'}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          ID: {question.id.slice(0, 8)}
        </div>
      </div>

      <div className="p-6">
        {/* Contexto (Texto de Apoio) */}
        {question.context_text && (
          <div className="mb-6 p-5 bg-blue-50/50 text-slate-700 text-sm italic border-l-4 border-blue-400 rounded-r-xl leading-relaxed">
            {question.context_text}
          </div>
        )}

        {/* Enunciado */}
        <div className="mb-8 text-slate-900 font-medium text-lg leading-relaxed whitespace-pre-line">
          {question.statement}
        </div>

        {/* Imagens */}
        {question.images && question.images.length > 0 && (
          <div className="mb-8 p-2 bg-slate-50 rounded-xl border border-slate-100 flex justify-center">
            <img
              src={question.images[0]}
              alt="Material de apoio"
              className="max-h-[400px] rounded-lg shadow-sm"
              loading="lazy"
            />
          </div>
        )}

        {/* Alternativas */}
        <div className="space-y-3">
          {question.alternatives?.map((alt, idx) => {
            let containerClass = "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer";
            let circleClass = "bg-slate-100 text-slate-500 border-slate-300 group-hover:border-blue-400 group-hover:text-blue-600";
            let textClass = "text-slate-700";
            let icon = null;

            // Estados Pós-Resposta
            if (result) {
              if (alt.label === result.correctOption) {
                containerClass = "bg-green-50 border-green-500 ring-1 ring-green-500 cursor-default";
                circleClass = "bg-green-100 text-green-700 border-green-500 font-bold";
                textClass = "text-green-900 font-medium";
                icon = <CheckCircle2 size={20} className="text-green-600 shrink-0 animate-in zoom-in" />;
              } else if (alt.label === selectedOption && !result.correct) {
                containerClass = "bg-red-50 border-red-400 ring-1 ring-red-400 cursor-default";
                circleClass = "bg-red-100 text-red-700 border-red-400 font-bold";
                textClass = "text-red-900 font-medium";
                icon = <XCircle size={20} className="text-red-600 shrink-0 animate-in zoom-in" />;
              } else {
                containerClass = "opacity-50 grayscale border-slate-100 cursor-default";
              }
            } 
            // Estado Selecionado (antes da resposta chegar)
            else if (selectedOption === alt.label) {
              containerClass = "bg-blue-50 border-blue-500 ring-1 ring-blue-500 cursor-wait";
              circleClass = "bg-blue-100 text-blue-700 border-blue-500 font-bold";
            }

            return (
              <button
                key={idx}
                disabled={!!result || isSubmitting}
                onClick={() => handleAnswer(alt.label)}
                className={`w-full text-left p-4 border rounded-xl transition-all duration-200 flex gap-4 items-center group relative overflow-hidden ${containerClass}`}
              >
                <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-sm transition-colors ${circleClass}`}>
                  {alt.label}
                </span>
                <div className={`flex-1 text-base leading-snug ${textClass}`} dangerouslySetInnerHTML={{ __html: alt.text }} />
                {icon}
              </button>
            );
          })}
        </div>

        {/* Explicação da IA */}
        {result && result.explanation && (
          <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className={`p-5 rounded-2xl border flex gap-4 items-start shadow-sm ${result.correct ? 'bg-green-50/50 border-green-100' : 'bg-amber-50/50 border-amber-100'}`}>
              <div className={`p-2 rounded-lg shrink-0 ${result.correct ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                <BrainCircuit size={24} />
              </div>
              <div>
                <h4 className={`font-bold mb-1 ${result.correct ? 'text-green-800' : 'text-amber-800'}`}>
                  {result.correct ? "Análise do Tutor IA" : "Entenda o conceito"}
                </h4>
                <p className="text-slate-700 text-sm leading-relaxed">
                  {result.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Página Principal ---
export default function BancoDeQuestoes() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [availableTopics, setAvailableTopics] = useState<string[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  // 1. Carrega Tópicos ao mudar a Matéria
  useEffect(() => {
    async function loadTopics() {
      if (!filterSubject || filterSubject === 'Todas') {
        setAvailableTopics([]);
        setFilterTopic('');
        return;
      }

      setLoadingTopics(true);
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/questions/topics?subject=${encodeURIComponent(filterSubject)}`);
        const data = await res.json();
        setAvailableTopics(data);
        setFilterTopic('');
      } catch (err) {
        console.error("Erro ao carregar tópicos", err);
      } finally {
        setLoadingTopics(false);
      }
    }
    loadTopics();
  }, [filterSubject]);

  // 2. Busca Questões
  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      let query = supabase
        .from('questions')
        .select('*')
        .limit(20)
        .order('exam_year', { ascending: false })

      if (filterSubject && filterSubject !== 'Todas') {
        if (filterSubject === 'Física') {
          query = query.ilike('subject', '%Física%').neq('subject', 'Educação Física')
        } else {
          query = query.eq('subject', filterSubject)
        }
      }

      if (filterTopic && filterTopic !== 'Todos') {
        query = query.eq('metadata->>ai_topic', filterTopic)
      }

      const { data, error } = await query
      if (error) throw error
      if (data) setQuestions(data as unknown as Question[])

    } catch (err) {
      console.error('Erro ao buscar questões:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [filterSubject, filterTopic])

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* Header com Gradiente */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Banco de Questões</h1>
              <p className="text-xs text-slate-500 font-medium">Treine com foco no ENEM</p>
            </div>
          </div>

          {/* Filtro Estilizado */}
          <div className="relative w-full sm:w-auto min-w-[240px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Filter size={16} />
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronDown size={16} />
            </div>
            <select
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all hover:bg-white hover:border-slate-300 shadow-sm"
              onChange={(e) => setFilterSubject(e.target.value)}
              value={filterSubject}
            >
              <option value="">📚 Todas as Matérias</option>
              <optgroup label="Ciências da Natureza">
                <option value="Biologia">🧬 Biologia</option>
                <option value="Física">⚡ Física</option>
                <option value="Química">🧪 Química</option>
              </optgroup>
              <optgroup label="Ciências Humanas">
                <option value="História">🏛️ História</option>
                <option value="Geografia">🌍 Geografia</option>
                <option value="Filosofia">🤔 Filosofia</option>
                <option value="Sociologia">👥 Sociologia</option>
              </optgroup>
              <optgroup label="Linguagens">
                <option value="Língua Portuguesa">📖 Português</option>
                <option value="Literatura">🎭 Literatura</option>
                <option value="Inglês">🇺🇸 Inglês</option>
                <option value="Espanhol">🇪🇸 Espanhol</option>
              </optgroup>
              <option value="Matemática">📐 Matemática</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium animate-pulse">Carregando questões...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {userId && questions.map((q) => (
              <QuestionItem key={q.id} question={q} userId={userId} />
            ))}

            {questions.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 mx-auto max-w-lg">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma questão encontrada</h3>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                  Tente mudar o filtro ou volte mais tarde para novos conteúdos.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}