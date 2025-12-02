'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// --- Interfaces ---
interface Alternative {
  label: string;
  text: string;
  isCorrect?: boolean;
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

export default function BancoDeQuestoes() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filterSubject, setFilterSubject] = useState('')
  const [loading, setLoading] = useState(false)

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

      if (error) {
        throw error
      }

      if (data) {
        // O segredo: Cast duplo para limpar qualquer erro de tipagem do Supabase
        const typedData = data as unknown as Question[]
        setQuestions(typedData)
      }
    } catch (err) {
      console.error('Erro ao buscar questões:', err)
      alert('Erro ao carregar. Verifique o console.')
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

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">📚 Banco de Questões</h1>

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
              <option value="Ciências da Natureza">Geral</option>
            </optgroup>

            <optgroup label="Ciências Humanas">
              <option value="História">História</option>
              <option value="Geografia">Geografia</option>
              <option value="Filosofia">Filosofia</option>
              <option value="Sociologia">Sociologia</option>
            </optgroup>

            <optgroup label="Linguagens e Códigos">
              <option value="Língua Portuguesa">Língua Portuguesa</option>
              <option value="Literatura">Literatura</option>
              <option value="Artes">Artes</option>
              <option value="Língua Estrangeira (Inglês)">Inglês</option>
              <option value="Língua Estrangeira (Espanhol)">Espanhol</option>
            </optgroup>

            <optgroup label="Matemática">
              <option value="Matemática">Matemática</option>
            </optgroup>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Carregando banco de dados...</p>
          </div>
        )}

        {/* Questions List */}
        {!loading && (
          <div className="space-y-6">
            {questions.map((q) => (
              <div key={q.id} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                    {q.exam_year}
                  </span>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                    {q.subject || 'Geral'}
                  </span>
                </div>

                {/* Texto de Contexto */}
                {q.context_text && (
                  <div className="mb-4 p-4 bg-gray-50 text-sm text-gray-700 italic border-l-4 border-blue-400 rounded-r-lg">
                    {q.context_text}
                  </div>
                )}

                {/* Enunciado */}
                <div className="mb-6 text-gray-900 font-medium leading-relaxed whitespace-pre-line">
                  {q.statement}
                </div>

                {/* Imagens */}
                {q.images && q.images.length > 0 && (
                  <div className="mb-6">
                    <img
                      src={q.images[0]}
                      alt="Material de apoio"
                      className="max-w-full md:max-w-lg rounded-lg border border-gray-200 mx-auto"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Alternativas */}
                <div className="space-y-3">
                  {q.alternatives?.map((alt, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group flex gap-4 items-start"
                      onClick={() => alert(`Você selecionou a alternativa ${alt.label}`)}
                    >
                      <span className="flex-shrink-0 font-bold text-blue-600 bg-blue-50 w-8 h-8 flex items-center justify-center rounded-full border border-blue-100 group-hover:bg-white group-hover:border-blue-200">
                        {alt.label}
                      </span>
                      <div
                        className="text-gray-700 flex-1 pt-1"
                        dangerouslySetInnerHTML={{ __html: alt.text }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {questions.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhuma questão encontrada para este filtro.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}