"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Tipagem mais permissiva para evitar conflito com o banco
interface QuestionProps {
  question: {
    id: string;
    subject: string;
    topic?: string;
    question_text: string;
    options: any; // Aceita tanto objeto quanto array (tratamos abaixo)
    exam_source?: string;
    explanation?: string;
  };
}

export function QuestionCard({ question }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleAnswer = async (option: string) => {
    if (status !== 'idle' || loading) return;
    
    setLoading(true);
    setSelected(option);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('http://127.0.0.1:5000/api/questions/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          question_id: question.id,
          option: option
        })
      });

      const result = await res.json();
      
      if (result.is_correct) {
        setStatus('correct');
      } else {
        setStatus('wrong');
        setCorrectOption(result.correct_option);
      }

    } catch (error) {
      console.error(error);
      alert("Erro ao enviar resposta");
    } finally {
      setLoading(false);
    }
  };

  // Garante que options seja um Objeto para renderizar
  const optionsRender = Array.isArray(question.options) 
    ? question.options.reduce((acc: any, cur, i) => ({ ...acc, [String.fromCharCode(97 + i)]: cur }), {})
    : question.options;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wide mr-2">
            {question.subject}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {question.exam_source}
          </span>
        </div>
      </div>

      <p className="text-slate-800 text-lg mb-6 leading-relaxed whitespace-pre-wrap">
        {question.question_text}
      </p>

      <div className="space-y-3">
        {Object.entries(optionsRender).map(([key, text]: any) => {
          let styleClass = "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
          
          if (status !== 'idle') {
            if (key === correctOption) styleClass = "border-green-500 bg-green-50 text-green-800";
            else if (key === selected && status === 'wrong') styleClass = "border-red-500 bg-red-50 text-red-800";
            else if (key === selected && status === 'correct') styleClass = "border-green-500 bg-green-50 text-green-800";
            else styleClass = "border-slate-100 opacity-50";
          }

          return (
            <button
              key={key}
              onClick={() => handleAnswer(key)}
              disabled={status !== 'idle'}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${styleClass}`}
            >
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                 status === 'idle' ? 'border-slate-300 text-slate-500' : 'border-current'
              }`}>
                {status === 'idle' && loading && selected === key ? <Loader2 className="animate-spin w-3 h-3"/> : key.toUpperCase()}
              </div>
              <span className="text-sm">{text}</span>
            </button>
          );
        })}
      </div>

      {status !== 'idle' && question.explanation && (
        <div className={`mt-6 p-4 rounded-xl text-sm ${status === 'correct' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {status === 'correct' ? <CheckCircle2 size={18}/> : <HelpCircle size={18}/>}
            {status === 'correct' ? 'Mandou bem!' : 'Não foi dessa vez.'}
          </div>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  );
}