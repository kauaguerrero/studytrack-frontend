import React, { useMemo, useState } from 'react';
import { ArrowUp, BookOpen, CheckCircle2, XCircle, BrainCircuit, Flag } from 'lucide-react';
import { reportError } from '@/lib/reportError';
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
  getQuestionContentBlocks,
  splitQuestionContextAndSource,
} from '@/components/questions/rendering';
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

  const supportImages = useMemo(() => {
    return extractDetachedQuestionImageUrls(
      question.images,
      question.context,
      question.statement,
    );
  }, [question.images, question.context, question.statement]);
  const contextSegments = useMemo(
    () => splitQuestionContextAndSource(question.context),
    [question.context],
  );
  const hasContentBlocks = useMemo(
    () => getQuestionContentBlocks(question.metadata).length > 0,
    [question.metadata],
  );

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

  return (
    <div className="bg-card dark:bg-card p-6 md:p-8 rounded-3xl shadow-sm border border-border transition-all">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {question.subject}
          </span>
          {question.bank && (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700">
              {question.bank}
            </span>
          )}
          {testletInfo && (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
              Testlet {testletInfo.position}/{testletInfo.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReportError && (
            <button
              type="button"
              onClick={onReportError}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-ring"
              title="Reportar erro nesta questão"
            >
              <Flag className="h-3.5 w-3.5" />
              Reportar erro
            </button>
          )}
          <span className="text-muted-foreground text-xs font-bold">
            {[question.year, question.difficulty].filter(Boolean).join(' • ')}
          </span>
        </div>
      </div>

      {testletInfo?.position === 1 && !suppressContext && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800 flex items-center gap-2">
          <BookOpen size={16} className="shrink-0" />
          Leia o texto a seguir para responder {testletInfo.total > 1 ? `as próximas ${testletInfo.total} questões` : 'a questão'}
        </div>
      )}

      {testletInfo && testletInfo.position > 1 && !suppressContext && (
        <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 flex items-center gap-1.5">
          <ArrowUp size={12} />
          Referente ao texto da questão anterior
        </div>
      )}

      {!suppressContext && hasContentBlocks ? (
        <QuestionContentBlocks metadata={question.metadata} className="mb-6" />
      ) : (
        <>
          {!suppressContext && contextSegments.body && (
            <QuestionRichText
              text={contextSegments.body}
              className="prose prose-slate dark:prose-invert prose-sm max-w-none mb-6 text-muted-foreground border-l-4 border-blue-200 dark:border-blue-700 pl-4 py-1 leading-relaxed"
            />
          )}

          {!suppressContext && supportImages.length > 0 && (
            <QuestionSupportImages images={supportImages} metadata={question.metadata} className="mb-6" />
          )}

          {!suppressContext && contextSegments.source && (
            <QuestionRichText
              text={contextSegments.source}
              className="prose prose-slate dark:prose-invert prose-xs max-w-none -mt-3 mb-5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400"
            />
          )}
        </>
      )}

      <QuestionRichText
        text={question.statement}
        className="font-medium text-card-foreground text-lg mb-8 leading-relaxed"
      />

      <div className="space-y-3">
        {question.alternatives.map((alt) => {
          const isSelected = selected === alt.letter;
          const isCorrect = String(alt.letter).toUpperCase() === String(question.correct_option).toUpperCase();
          const alternativeImages = extractAlternativeImageUrls(alt);
          
          let style = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-700 cursor-pointer";
          let circleStyle = "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600";

          if (showAnswer) {
            if (isCorrect) {
                style = "border-green-500 bg-green-50/50 dark:bg-green-900/30 ring-1 ring-green-500 cursor-default";
                circleStyle = "bg-green-500 text-white border-green-500";
            } else if (isSelected && !isCorrect) {
                style = "border-red-500 bg-red-50/50 dark:bg-red-900/30 ring-1 ring-red-500 cursor-default";
                circleStyle = "bg-red-500 text-white border-red-500";
            } else {
                style = "opacity-50 grayscale border-slate-100 dark:border-slate-700 cursor-default";
            }
          } else if (isSelected) {
            style = "border-blue-600 bg-blue-50/50 dark:bg-blue-900/40 ring-1 ring-blue-600";
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
                  {alternativeImages.length > 0 && (
                      <AlternativeImages images={alternativeImages} metadata={question.metadata} letter={alt.letter} />
                  )}
                  {alt.text ? (
                      <QuestionRichText
                        text={alt.text}
                        className={`text-base leading-snug ${showAnswer && isCorrect ? 'text-green-900 dark:text-green-100 font-medium' : 'text-slate-700 dark:text-slate-100'}`}
                      />
                  ) : alternativeImages.length === 0 && (
                      <span className="text-slate-400 dark:text-slate-500 italic text-sm">(Imagem indisponível)</span>
                  )}
              </div>
              
              {showAnswer && isCorrect && <CheckCircle2 className="text-green-600 shrink-0" size={20} />}
              {showAnswer && isSelected && !isCorrect && <XCircle className="text-red-600 shrink-0" size={20} />}
            </button>
          );
        })}
      </div>

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
    </div>
  );
}
