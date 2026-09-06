'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Timer } from 'lucide-react';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { AlternativeImages, QuestionContentBlocks, QuestionSupportImages } from '@/components/questions/QuestionMedia';
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
  getQuestionContentBlocks,
  deriveTestletSharedContext,
} from '@/components/questions/rendering';
import type { SelectedQuestion } from '@/types/simulado-preview';

interface SimuladoPreviewModalProps {
  questions: SelectedQuestion[];
  brandPrimary: string;
  onBrand: string;
  /** Minutos (string ou número) — só para exibir o timer "livre"/fixo no header, não conta de verdade. */
  timeLimitMins?: string | number | null;
  onClose: () => void;
  /** Botões extras no header (ex.: "Sortear novamente", "Baixar PDF"). */
  headerExtra?: React.ReactNode;
  /** Texto do botão final, quando o preview chega ao fim (default: "Fechar preview"). */
  finalLabel?: string;
  onFinal?: () => void;
}

/**
 * Preview em tela de como o aluno vai ver o simulado — 100% renderizado a
 * partir do array `questions` recebido via props (nunca busca nada por conta
 * própria). Compartilhado entre o wizard Personalizado e o fluxo Aleatório
 * (após o dry-run de preview), para garantir que os dois modos mostram
 * exatamente a mesma experiência ao founder.
 */
export default function SimuladoPreviewModal({
  questions,
  brandPrimary,
  onBrand,
  timeLimitMins,
  onClose,
  headerExtra,
  finalLabel,
  onFinal,
}: SimuladoPreviewModalProps) {
  const [previewIndex, setPreviewIndex] = useState(0);
  // Se o array de questões mudar de referência (ex.: "Sortear novamente"),
  // reinicia a navegação do preview do começo — ajustado durante a
  // renderização (não em um efeito) para evitar um render extra em cascata.
  const [trackedQuestions, setTrackedQuestions] = useState(questions);
  if (trackedQuestions !== questions) {
    setTrackedQuestions(questions);
    setPreviewIndex(0);
  }

  const currentPreviewQuestion = questions[previewIndex] ?? null;

  const previewGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string | null; items: SelectedQuestion[] }> = [];
    questions.forEach((question) => {
      if (question.testletGroupId) {
        const last = groups[groups.length - 1];
        if (last && last.key === question.testletGroupId) {
          last.items.push(question);
        } else {
          groups.push({
            key: question.testletGroupId,
            label: `T${groups.filter((group) => group.label).length + 1}`,
            items: [question],
          });
        }
      } else {
        groups.push({
          key: question.id,
          label: null,
          items: [question],
        });
      }
    });
    return groups;
  }, [questions]);

  const previewGroupIndex = useMemo(() => {
    return Math.max(0, previewGroups.findIndex((group) => group.items.some((item) => item.id === currentPreviewQuestion?.id)));
  }, [currentPreviewQuestion?.id, previewGroups]);
  const currentPreviewGroup = previewGroups[previewGroupIndex] ?? null;
  const isPreviewTestlet = Boolean(currentPreviewGroup?.label && currentPreviewGroup.items.length > 1);
  const previewContextQuestion = currentPreviewGroup?.items[0] ?? null;
  // Mesma dedução de contexto compartilhado (por maior prefixo de linhas em
  // comum, não só "questões idênticas") que a tela real do aluno usa — sem
  // isso, o preview mostrava só o context da PRIMEIRA questão do grupo,
  // ignorando qualquer parte extra de contexto específica das demais.
  const previewGroupContextData = useMemo(
    () => deriveTestletSharedContext(currentPreviewGroup?.items ?? []),
    [currentPreviewGroup],
  );

  const timeLabel = timeLimitMins !== undefined && timeLimitMins !== null && String(timeLimitMins).trim() !== ''
    ? `${timeLimitMins}:00`
    : '--:--';

  return (
    <div className="fixed inset-0 z-[130] bg-[#F5F5F7] flex flex-col">
      <div className="shrink-0">
        <div className="bg-white border-b border-slate-100 px-4 py-2 shadow-sm flex justify-between items-center gap-3">
          <div className="shrink-0 flex flex-col items-start gap-0.5">
            <div className="text-xs sm:text-sm font-extrabold text-slate-500 tabular-nums leading-none">
              {Math.min(previewGroupIndex + 1, Math.max(previewGroups.length, 1))}
              <span className="text-slate-300"> / {previewGroups.length}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 tabular-nums leading-none">
              <Timer className="w-3 h-3" />
              preview do aluno
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {headerExtra}
            <div className="flex flex-col items-center font-mono font-black tabular-nums px-3 py-1.5 rounded-xl border-2 bg-slate-50 text-slate-700 border-slate-200">
              <span className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5 opacity-60">
                {timeLabel !== '--:--' ? 'Tempo' : 'Livre'}
              </span>
              <span className="text-base sm:text-lg leading-none">
                {timeLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold uppercase px-3 py-2 rounded-lg cursor-pointer min-h-[44px] transition-colors text-red-500 hover:bg-red-50"
            >
              Fechar
            </button>
          </div>
        </div>

        <div className="h-1 bg-slate-200">
          <div
            className="h-1 transition-all duration-300 ease-out"
            style={{
              width: `${previewGroups.length > 0 ? ((previewGroupIndex + 1) / previewGroups.length) * 100 : 0}%`,
              background: brandPrimary,
            }}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto overscroll-y-contain">
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          {!currentPreviewQuestion || !currentPreviewGroup ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Nenhuma questão para visualizar.
            </div>
          ) : (
            <>
              <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: brandPrimary, color: onBrand }}>
                      {previewContextQuestion?.subject}
                    </span>
                    {previewContextQuestion?.difficulty && (
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                        {previewContextQuestion.difficulty}
                      </span>
                    )}
                    {previewContextQuestion?.discipline && (
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                        {previewContextQuestion.discipline}
                      </span>
                    )}
                    {isPreviewTestlet && (
                      <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                        Testlet ({currentPreviewGroup.items.length} itens)
                      </span>
                    )}
                  </div>
                </div>

                {isPreviewTestlet && (
                  <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800">
                    Leia o texto a seguir para responder as próximas {currentPreviewGroup.items.length} questões
                  </div>
                )}

                {previewContextQuestion && getQuestionContentBlocks(previewContextQuestion.metadata).length > 0 ? (
                  <QuestionContentBlocks metadata={previewContextQuestion.metadata} className="mb-5" />
                ) : (
                  <>
                    {previewGroupContextData.sharedContext && (
                      <QuestionRichText
                        text={previewGroupContextData.sharedContext}
                        className="prose prose-slate max-w-none mb-5 text-slate-600 border-l-4 pl-4 text-sm leading-relaxed"
                        style={{ borderColor: brandPrimary }}
                      />
                    )}

                    {(() => {
                      const supportImages = extractDetachedQuestionImageUrls(
                        previewContextQuestion?.images,
                        previewContextQuestion?.context,
                        previewContextQuestion?.alternatives_intro,
                      );
                      if (supportImages.length === 0) return null;
                      return (
                        <QuestionSupportImages
                          images={supportImages}
                          metadata={previewContextQuestion?.metadata}
                          className="mb-5"
                        />
                      );
                    })()}
                  </>
                )}

                <div className="space-y-6">
                  {currentPreviewGroup.items.map((question, index) => (
                    <div key={question.id} className={`rounded-2xl border p-5 ${isPreviewTestlet ? 'border-slate-200 bg-slate-50/70' : 'border-transparent bg-transparent p-0'}`}>
                      {isPreviewTestlet && index > 0 && (
                        <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
                          Referente ao texto-base acima
                        </div>
                      )}
                      {isPreviewTestlet && (
                        <div className="mb-4">
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                            Testlet {index + 1}/{currentPreviewGroup.items.length}
                          </span>
                        </div>
                      )}

                      {previewGroupContextData.perQuestionContext[question.id] && (
                        <QuestionRichText
                          text={previewGroupContextData.perQuestionContext[question.id]}
                          className="prose prose-slate max-w-none mb-5 text-sm text-slate-600 leading-relaxed"
                        />
                      )}

                      <QuestionRichText
                        text={question.alternatives_intro}
                        className="prose prose-slate max-w-none text-base md:text-lg text-slate-900 font-medium mb-7 leading-relaxed"
                      />

                      <div className="space-y-3">
                        {(question.alternatives || []).map((alt) => {
                          const alternativeImages = extractAlternativeImageUrls(alt);
                          return (
                            <div key={`${question.id}-${alt.letter}`} className="w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start bg-white border-slate-200">
                              <span className="w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors bg-slate-50 text-slate-500 border-slate-200">
                                {alt.letter}
                              </span>
                              <div className="flex-1 pt-1">
                                {alternativeImages.length > 0 && (
                                  <AlternativeImages images={alternativeImages} metadata={question.metadata} letter={alt.letter} />
                                )}
                                {alt.text ? (
                                  <QuestionRichText text={alt.text} className="text-sm leading-snug text-slate-700" />
                                ) : alternativeImages.length === 0 ? (
                                  <span className="text-sm italic text-slate-400">
                                    Conteúdo da alternativa indisponível.
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {previewGroups.map((group, i) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => {
                      const firstQuestion = group.items[0];
                      const qIndex = questions.findIndex((item) => item.id === firstQuestion.id);
                      if (qIndex >= 0) setPreviewIndex(qIndex);
                    }}
                    className={`min-w-8 rounded-full px-3 h-8 text-xs font-extrabold transition-all cursor-pointer ${
                      i === previewGroupIndex ? 'scale-110 shadow-sm' : 'bg-slate-200 text-slate-600'
                    }`}
                    style={i === previewGroupIndex ? { background: brandPrimary, color: onBrand } : {}}
                  >
                    {group.label ?? i + 1}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4">
        <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const prevGroup = previewGroups[previewGroupIndex - 1];
              if (!prevGroup) return;
              const qIndex = questions.findIndex((item) => item.id === prevGroup.items[0].id);
              if (qIndex >= 0) setPreviewIndex(qIndex);
            }}
            disabled={previewGroupIndex === 0}
            className="flex-1 px-4 py-3 text-slate-500 disabled:opacity-30 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
          </button>

          {previewGroupIndex < previewGroups.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const nextGroup = previewGroups[previewGroupIndex + 1];
                if (!nextGroup) return;
                const qIndex = questions.findIndex((item) => item.id === nextGroup.items[0].id);
                if (qIndex >= 0) setPreviewIndex(qIndex);
              }}
              className="flex-[1.35] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
              style={{ background: brandPrimary, color: onBrand }}
            >
              {isPreviewTestlet ? 'Próximo bloco' : 'Próxima'} <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onFinal?.(); onClose(); }}
              className="flex-[1.35] bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer min-h-[44px]"
            >
              {finalLabel ?? 'Fechar preview'} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
