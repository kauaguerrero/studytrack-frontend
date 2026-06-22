import React, { useState } from 'react';
import { BrainCircuit } from 'lucide-react';
import { reportError } from '@/lib/reportError';
import { QuestionDisplay } from '@/components/questions/QuestionDisplay';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { createClient } from '@/lib/supabase/client';

interface Alternative {
  letter: string;
  text: string;
  image?: string | string[] | null;
  file?: string | string[] | null;
}

interface Question {
  id: string;
  external_id: string;
  year: number;
  bank?: string;
  subject: string;
  difficulty: string;
  context: string; 
  statement: string;
  alternatives: Alternative[];
  correct_option: string;
  explanation: string;
  images?: unknown;
  metadata?: unknown;
}

interface QuestionCardProps {
  question: Question;
  userId: string;
  onQuotaReached?: (reason: string) => void;
  onAnswer?: (result: {
    is_correct?: boolean;
    new_streak?: number;
    streak_updated?: boolean;
    gamification?: { points_awarded: number; shield_awarded?: boolean };
  }) => void;
  onReportError?: () => void;
  testletInfo?: { position: number; total: number };
  suppressContext?: boolean;
}

export function QuestionCard({ question, userId, onQuotaReached, onAnswer, onReportError, testletInfo, suppressContext = false }: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (letter: string) => {
    if (!showAnswer) setSelected(letter);
  };

  const confirmAnswer = async () => {
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);

    const localIsCorrect = String(selected).toUpperCase() === String(question.correct_option).toUpperCase();
    let answerResult: {
      is_correct?: boolean;
      new_streak?: number;
      streak_updated?: boolean;
      gamification?: { points_awarded: number; shield_awarded?: boolean };
    } = {
      is_correct: localIsCorrect,
    };

    try {
        async function submitAnswerWithRetry() {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          if (!token) throw new Error('Unauthorized');

          let lastError: unknown = null;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              return await fetch('/api/proxy/questions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ question_id: question.id, option: selected }),
              });
            } catch (error) {
              lastError = error;
              if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 300));
              }
            }
          }
          throw lastError instanceof Error ? lastError : new Error('Load failed');
        }

        if (!userId) {
          setShowAnswer(true);
          setIsSubmitting(false);
          if (onAnswer) onAnswer(answerResult);
          return;
        }

        const res = await submitAnswerWithRetry();

        const data = await res.json();

        // --- TRATAMENTO DE ERRO DE COTA ---
        if (res.status === 403) {
            if (onQuotaReached) onQuotaReached(data.code);
            setIsSubmitting(false); // Libera para tentar de novo se comprar
            return;
        }

        // Verifica Trigger de Sucesso (Ex: respondeu 15ª questão)
        if (data.quota_status === "limit_reached" && onQuotaReached) {
            onQuotaReached("DAILY_QUOTA_REACHED");
        }

        answerResult = {
          is_correct: data.is_correct ?? localIsCorrect,
          new_streak: data.new_streak,
          streak_updated: data.streak_updated,
          gamification: data.gamification,
        };

    } catch(e) { console.error(e); void reportError("QuestionCardError", String(e)); }

    setShowAnswer(true);
    setIsSubmitting(false);
    if (onAnswer) onAnswer(answerResult);
  };

  const footer = (
    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
        {!showAnswer ? (
            <button
            onClick={confirmAnswer}
            disabled={!selected || isSubmitting}
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200 dark:shadow-slate-950 hover:-translate-y-1"
            >
            Confirmar Resposta
            </button>
        ) : (
             <div className="p-6 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex gap-4 items-start animate-in fade-in slide-in-from-top-4">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                    <BrainCircuit size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Comentário do Professor</h4>
                    <QuestionRichText text={question.explanation} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed" />
                </div>
             </div>
        )}
      </div>
  );

  return (
    <QuestionDisplay
      question={question}
      selected={selected}
      showAnswer={showAnswer}
      onSelect={handleSelect}
      onReportError={onReportError}
      testletInfo={testletInfo}
      suppressContext={suppressContext}
      footer={footer}
    />
  );
}
