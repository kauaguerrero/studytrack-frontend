'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, BrainCircuit, AlertCircle } from 'lucide-react'

// --- Interfaces ---
interface Alternative {
  label: string;
  text: string;
  isCorrect?: boolean; // Usado internamente ou para debug
}

interface Question {
  id: string;
  exam_year: number;
  subject: string;
  statement: string;
  context_text?: string;
  images: string[];
  alternatives: Alternative[];
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
    if (isSubmitting || result) return; // Bloqueia se já respondeu

    setSelectedOption(optionLabel);
    setIsSubmitting(true);

    try {
      // Chama a API Python
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
        explanation: data.explanation // Aqui vem a explicação da IA
      });

    } catch (error) {
      console.error("Erro ao responder:", error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header da Questão */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
          {question.exam_year}
        </span>
        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
          {question.subject || 'Geral'}
        </span>
      </div>

      {/* Contexto e Enunciado */}
      {question.context_text && (
        <div className="mb-4 p-4 bg-gray-50 text-sm text-gray-700 italic border-l-4 border-blue-400 rounded-r-lg">
          {question.context_text}
        </div>
      )}

      <div className="mb-6 text-gray-900 font-medium leading-relaxed whitespace-pre-line">
        {question.statement}
      </div>

      {/* Imagens */}
      {question.images && question.images.length > 0 && (
        <div className="mb-6">
          <img
            src={question.images[0]}
            alt="Material de apoio"
            className="max-w-full md:max-w-lg rounded-lg border border-gray-200 mx-auto"
            loading="lazy"
          />
        </div>
      )}

      {/* Alternativas */}
      <div className="space-y-3">
        {question.alternatives?.map((alt, idx) => {
          // Lógica de Cores para Feedback
          let btnClass = "border-gray-200 hover:bg-blue-50 hover:border-blue-300";
          let icon = null;

          if (result) {
            // Se já respondeu
            if (alt.label === result.correctOption) {
              btnClass = "bg-green-50 border-green-500 text-green-800"; // Correta
              icon = <CheckCircle2 size={20} className="text-green-600" />;
            } else if (alt.label === selectedOption && !result.correct) {
              btnClass = "bg-red-50 border-red-500 text-red-800"; // Errada selecionada
              icon = <XCircle size={20} className="text-red-600" />;
            } else {
              btnClass = "opacity-50 border-gray-100"; // As outras
            }
          } else if (selectedOption === alt.label) {
            btnClass = "bg-blue-50 border-blue-500"; // Selecionada (aguardando API)
          }

          return (
            <button
              key={idx}
              disabled={!!result || isSubmitting}
              onClick={() => handleAnswer(alt.label)}
              className={`w-full text-left p-3 border rounded-lg transition-all group flex gap-4 items-start ${btnClass}`}
            >
              <span className={`flex-shrink-0 font-bold w-8 h-8 flex items-center justify-center rounded-full border ${result && alt.label === result.correctOption ? 'bg-green-200 text-green-800 border-green-300' : 'bg-white text-gray-500 border-gray-200'
                }`}>
                {alt.label}
              </span>
              <div className="flex-1 pt-1" dangerouslySetInnerHTML={{ __html: alt.text }} />
              {icon}
            </button>
          );
        })}
      </div>

      {/* Explicação da IA (Só aparece se tiver resultado e explicação) */}
      {result && result.explanation && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className={`p-4 rounded-xl border ${result.correct ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-2 mb-2 font-bold">
              <BrainCircuit className={result.correct ? 'text-green-600' : 'text-amber-600'} size={20} />
              <span className={result.correct ? 'text-green-800' : 'text-amber-800'}>
                {result.correct ? "Feedback da IA" : "Entenda o Erro"}
              </span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">
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
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // 1. Pegar User ID ao montar (SUBSTITUA ESSE USEEFFECT)
  useEffect(() => {
    const getUser = async () => {
      // MODO REAL (Ativado)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [])

  // 2. Buscar Questões
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
        query = query.ilike('subject', `%${filterSubject}%`)
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
  }, [filterSubject])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 sticky top-4 z-20">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📚 Banco de Questões
          </h1>
          <select
            className="border p-2 rounded-md bg-gray-50 min-w-[200px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
        </div>

        {/* Lista de Questões */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {userId && questions.map((q) => (
              <QuestionItem key={q.id} question={q} userId={userId} />
            ))}

            {questions.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <AlertCircle className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-gray-500">Nenhuma questão encontrada.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}