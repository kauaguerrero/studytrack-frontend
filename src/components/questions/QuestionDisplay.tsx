import React, { ReactNode, useMemo } from 'react';
import { ArrowUp, BookOpen, CheckCircle2, Flag, XCircle } from 'lucide-react';
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
  getQuestionContentBlocks,
  splitQuestionContextAndSource,
} from '@/components/questions/rendering';

export interface QuestionDisplayAlternative {
  letter: string;
  text: string;
  image?: string | string[] | null;
  file?: string | string[] | null;
}

export interface QuestionDisplayQuestion {
  id: string;
  external_id: string;
  year: number;
  bank?: string | null;
  subject: string;
  difficulty: string;
  context: string;
  statement: string;
  alternatives: QuestionDisplayAlternative[];
  correct_option: string;
  explanation?: string;
  images?: unknown;
  metadata?: unknown;
}

interface QuestionDisplayProps {
  question: QuestionDisplayQuestion;
  selected?: string | null;
  showAnswer?: boolean;
  onSelect?: (letter: string) => void;
  onReportError?: () => void;
  testletInfo?: { position: number; total: number };
  suppressContext?: boolean;
  footer?: ReactNode;
  readOnly?: boolean;
  className?: string;
}

export function QuestionDisplay({
  question,
  selected = null,
  showAnswer = false,
  onSelect,
  onReportError,
  testletInfo,
  suppressContext = false,
  footer,
  readOnly = false,
  className = '',
}: QuestionDisplayProps) {
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

  return (
    <div className={['bg-card dark:bg-card p-6 md:p-8 rounded-3xl shadow-sm border border-border transition-all', className].filter(Boolean).join(' ')}>
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
          } else if (readOnly || !onSelect) {
            style = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50";
          }

          const content = (
            <>
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
            </>
          );

          if (readOnly || !onSelect) {
            return (
              <div
                key={alt.letter}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group relative ${style}`}
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={alt.letter}
              onClick={() => onSelect(alt.letter)}
              disabled={showAnswer}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group relative ${style}`}
            >
              {content}
            </button>
          );
        })}
      </div>

      {footer}
    </div>
  );
}
