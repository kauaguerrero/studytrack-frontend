'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, XCircle, BrainCircuit, AlertCircle, Sparkles } from 'lucide-react';

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
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
          {question.exam_year}
        </span>
        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
          {question.subject || 'Geral'}
        </span>
        {aiTopic && aiTopic !== "Geral" && (
          <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-100 flex items-center gap-1">
            <Sparkles size={10} />
            {aiTopic}
          </span>
        )}
      </div>

      {/* Contexto */}
      {question.context_text && (
        <div className="mb-4 p-4 bg-slate-50 text-sm text-slate-700 italic border-l-4 border-slate-300 rounded-r-lg font-serif leading-relaxed">
          {question.context_text}
        </div>
      )}

      {/* Enunciado Limpo */}
      <div className="mb-6 text-gray-900 font-medium leading-relaxed whitespace-pre-line text-lg">
        {displayStatement}
      </div>

      {/* Imagens */}
      {question.images && question.images.length > 0 && (
        <div className="mb-6 flex justify-center">
          <img
            src={question.images[0]}
            alt="Material de apoio"
            className="max-w-full md:max-w-lg rounded-lg border border-gray-200 shadow-sm"
            loading="lazy"
          />
        </div>
      )}

      {/* Alternativas */}
      <div className="space-y-3">
        {question.alternatives?.map((alt, idx) => {
          let btnClass = "border-gray-200 hover:bg-slate-50 hover:border-blue-300";
          let icon = null;

          if (result) {
            const isThisCorrect = alt.label.toUpperCase() === result.correctOption.toUpperCase();
            const isThisSelected = alt.label.toUpperCase() === selectedOption?.toUpperCase();

            if (isThisCorrect) {
              btnClass = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500";
              icon = <CheckCircle2 size={20} className="text-green-600" />;
            } else if (isThisSelected && !result.correct) {
              btnClass = "bg-red-50 border-red-500 text-red-800";
              icon = <XCircle size={20} className="text-red-600" />;
            } else {
              btnClass = "opacity-50 border-gray-100 grayscale";
            }
          } else if (selectedOption === alt.label) {
            btnClass = "bg-blue-50 border-blue-500 ring-1 ring-blue-500";
          }

          return (
            <button
              key={idx}
              disabled={!!result || isSubmitting}
              onClick={() => handleAnswer(alt.label)}
              className={`w-full text-left p-4 border rounded-xl transition-all flex gap-4 items-start relative ${btnClass}`}
            >
              <span className={`flex-shrink-0 font-bold w-8 h-8 flex items-center justify-center rounded-full border ${result && alt.label.toUpperCase() === result.correctOption.toUpperCase()
                ? 'bg-green-500 text-white border-green-600'
                : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {alt.label}
              </span>
              <div className="flex-1 pt-0.5" dangerouslySetInnerHTML={{ __html: alt.text }} />
              {icon && <div className="absolute right-4 top-4">{icon}</div>}
            </button>
          );
        })}
      </div>

      {/* Explicação da IA */}
      {result && result.explanation && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`p-5 rounded-xl border-l-4 shadow-sm ${result.correct ? 'bg-green-50 border-green-500 border-t border-r border-b border-green-100' : 'bg-amber-50 border-amber-500 border-t border-r border-b border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-2 font-bold">
              <BrainCircuit className={result.correct ? 'text-green-600' : 'text-amber-600'} size={20} />
              <span className={result.correct ? 'text-green-800' : 'text-amber-800'}>
                {result.correct ? "Feedback Inteligente" : "Análise do Tutor IA"}
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              {result.explanation}
            </p>
          </div>
        </div>
      )}
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
      // MODO REAL (Ativado)
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header e Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-4 z-20">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              📚 Banco de Questões
            </h1>
            <p className="text-slate-500 text-sm">Filtros Inteligentes com IA</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">

            {/* SELECT 1: MATÉRIA */}
            <select
              className="w-full sm:w-auto border border-slate-300 p-2.5 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
              onChange={(e) => setFilterSubject(e.target.value)}
              value={filterSubject}
            >
              <option value="">Todas as Matérias</option>
              <optgroup label="Ciências da Natureza">
                <option value="Biologia">Biologia</option>
                <option value="Física">Física</option>
                <option value="Química">Química</option>
              </optgroup>
              <optgroup label="Ciências Humanas">
                <option value="História">História</option>
                <option value="Geografia">Geografia</option>
                <option value="Filosofia">Filosofia</option>
                <option value="Sociologia">Sociologia</option>
              </optgroup>
              <optgroup label="Linguagens">
                <option value="Língua Portuguesa">Português</option>
                <option value="Literatura">Literatura</option>
                <option value="Inglês">Inglês</option>
                <option value="Espanhol">Espanhol</option>
              </optgroup>
              <option value="Matemática">Matemática</option>
            </select>

            {/* SELECT 2: TÓPICO (Dinâmico) */}
            {filterSubject && availableTopics.length > 0 && (
              <div className="relative w-full sm:w-auto">
                <select
                  className="w-full sm:w-64 border border-purple-300 p-2.5 rounded-lg bg-purple-50 text-purple-900 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-bold appearance-none"
                  onChange={(e) => setFilterTopic(e.target.value)}
                  value={filterTopic}
                  disabled={loadingTopics}
                >
                  <option value="">Todos os Tópicos</option>
                  {availableTopics.map((topic, idx) => (
                    <option key={idx} value={topic}>{topic}</option>
                  ))}
                </select>
                {loadingTopics && (
                  <div className="absolute right-3 top-3 animate-spin w-4 h-4 border-2 border-purple-600 rounded-full border-t-transparent"></div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Lista de Questões */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Carregando inteligência...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {userId && questions.map((q) => (
              <QuestionItem key={q.id} question={q} userId={userId} />
            ))}

            {questions.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="text-slate-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Nada encontrado</h3>
                <p className="text-slate-500">Tente mudar o filtro.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}