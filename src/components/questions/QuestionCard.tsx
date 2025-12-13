import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { CheckCircle2, XCircle, BrainCircuit, ImageIcon } from 'lucide-react';

interface Alternative {
  letter: string;
  text: string;
  image?: string; // URL da imagem, se houver
}

interface Question {
  id: string;
  external_id: string;
  year: number;
  subject: string;
  difficulty: string;
  context: string; 
  statement: string;
  alternatives: Alternative[];
  correct_option: string;
  explanation: string;
  images: string[];
}

interface QuestionCardProps {
  question: Question;
  userId: string;
}

export function QuestionCard({ question, userId }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (letter: string) => {
    if (!showAnswer) setSelected(letter);
  };

  const confirmAnswer = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        await fetch(`${apiUrl}/api/questions/answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, question_id: question.id, option: selected })
        });
    } catch(e) { console.error(e) }

    setShowAnswer(true);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 transition-all">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {question.subject}
        </span>
        <span className="text-slate-400 text-xs font-bold">
            {question.year} • {question.difficulty}
        </span>
      </div>

      {/* Imagens do Enunciado */}
      {question.images?.map((img, i) => (
          <div key={i} className="mb-6 flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <img src={img} alt="Material de apoio" className="max-h-80 object-contain rounded-lg" />
          </div>
      ))}

      {/* Contexto (Texto Base) */}
      {question.context && (
        <div className="prose prose-slate prose-sm max-w-none mb-6 text-slate-600 border-l-4 border-blue-200 pl-4 py-1 leading-relaxed">
          <ReactMarkdown>{question.context}</ReactMarkdown>
        </div>
      )}

      {/* Comando (Pergunta) */}
      <div className="font-medium text-slate-900 text-lg mb-8 leading-relaxed">
        <ReactMarkdown>{question.statement}</ReactMarkdown>
      </div>

      {/* Alternativas */}
      <div className="space-y-3">
        {question.alternatives.map((alt) => {
          const isSelected = selected === alt.letter;
          // Compara sem case sensitive e garante string
          const isCorrect = String(alt.letter).toUpperCase() === String(question.correct_option).toUpperCase();
          
          let style = "border-slate-200 hover:bg-slate-50 hover:border-blue-200 cursor-pointer";
          let circleStyle = "bg-white text-slate-500 border-slate-200";

          if (showAnswer) {
            if (isCorrect) {
                style = "border-green-500 bg-green-50/50 ring-1 ring-green-500 cursor-default";
                circleStyle = "bg-green-500 text-white border-green-500";
            } else if (isSelected && !isCorrect) {
                style = "border-red-500 bg-red-50/50 ring-1 ring-red-500 cursor-default";
                circleStyle = "bg-red-500 text-white border-red-500";
            } else {
                style = "opacity-50 grayscale border-slate-100 cursor-default";
            }
          } else if (isSelected) {
            style = "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600";
            circleStyle = "bg-blue-600 text-white border-blue-600";
          }

          return (
            <button
              key={alt.letter}
              onClick={() => handleSelect(alt.letter)}
              disabled={showAnswer}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group relative ${style}`}
            >
              <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-all ${circleStyle}`}>
                {alt.letter}
              </span>
              
              <div className="flex-1">
                  {alt.image && (
                      <div className="mb-2">
                          <img src={alt.image} alt={`Opção ${alt.letter}`} className="max-h-32 rounded border border-slate-200" />
                      </div>
                  )}
                  {alt.text ? (
                      <span className={`text-base leading-snug ${showAnswer && isCorrect ? 'text-green-900 font-medium' : 'text-slate-700'}`}>
                          {alt.text}
                      </span>
                  ) : !alt.image && (
                      <span className="text-slate-400 italic text-sm">(Imagem indisponível)</span>
                  )}
              </div>
              
              {showAnswer && isCorrect && <CheckCircle2 className="text-green-600 shrink-0" size={20} />}
              {showAnswer && isSelected && !isCorrect && <XCircle className="text-red-600 shrink-0" size={20} />}
            </button>
          );
        })}
      </div>

      {/* Botão de Confirmação */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        {!showAnswer ? (
            <button
            onClick={confirmAnswer}
            disabled={!selected || isSubmitting}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200 hover:-translate-y-1"
            >
            Confirmar Resposta
            </button>
        ) : (
             <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4 items-start animate-in fade-in slide-in-from-top-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 shrink-0">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 mb-2">Comentário do Professor</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{question.explanation}</p>
                </div>
             </div>
        )}
      </div>
    </div>
  );
}