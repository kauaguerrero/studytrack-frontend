'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import type { MonthlyCheckInAnswerInput, MonthlyCheckInResult } from '@/types/gamification';
import { usePopupTheme } from './popupTheme';
import { getIdentityTitleIcon, getProgressTierMeta } from './titleSystem';

interface CheckInOption {
  value: string;
  label: string;
}

interface CheckInQuestion {
  id: MonthlyCheckInAnswerInput['question_id'];
  eyebrow: string;
  prompt: string;
  options: CheckInOption[];
}

const QUESTIONS: CheckInQuestion[] = [
  {
    id: 'goal_axis',
    eyebrow: 'Momento do mês',
    prompt: 'Qual objetivo melhor descreve seu momento neste mês?',
    options: [
      { value: 'approval_fast', label: 'Passar no vestibular o quanto antes' },
      { value: 'build_base', label: 'Evoluir minha base sem me comparar tanto' },
      { value: 'discipline', label: 'Ganhar consistência e disciplina' },
      { value: 'competitive_level', label: 'Subir meu nível competitivo' },
      { value: 'confidence', label: 'Recuperar confiança nos estudos' },
    ],
  },
  {
    id: 'focus_area',
    eyebrow: 'Energia atual',
    prompt: 'Qual área mais puxa sua energia hoje?',
    options: [
      { value: 'languages', label: 'Linguagens e redação' },
      { value: 'humanities', label: 'Ciências humanas' },
      { value: 'nature', label: 'Ciências da natureza' },
      { value: 'math', label: 'Matemática' },
      { value: 'balanced', label: 'Equilíbrio entre todas' },
    ],
  },
  {
    id: 'study_style',
    eyebrow: 'Jeito de estudar',
    prompt: 'Como você costuma estudar melhor?',
    options: [
      { value: 'routine', label: 'Com rotina fixa e planejamento' },
      { value: 'short_goals', label: 'Com metas curtas e objetivas' },
      { value: 'alternating', label: 'Alternando matérias para não cansar' },
      { value: 'deep_dive', label: 'Indo fundo em um tema por vez' },
      { value: 'flexible', label: 'No embalo da motivação, com mais flexibilidade' },
    ],
  },
  {
    id: 'challenge_response_axis',
    eyebrow: 'Diante da dificuldade',
    prompt: 'Quando uma questão difícil aparece, você tende a:',
    options: [
      { value: 'insist', label: 'Insistir até entender' },
      { value: 'skip_return', label: 'Pular e voltar depois com estratégia' },
      { value: 'pattern_logic', label: 'Buscar padrão e lógica antes de responder' },
      { value: 'intuition', label: 'Confiar na intuição e avançar' },
      { value: 'review_theory', label: 'Rever a teoria antes de tentar de novo' },
    ],
  },
  {
    id: 'motivation_axis',
    eyebrow: 'Motor do mês',
    prompt: 'Que tipo de conquista mais te move agora?',
    options: [
      { value: 'ranking', label: 'Ver meu nome subir no ranking' },
      { value: 'mastery', label: 'Sentir que estou dominando o conteúdo' },
      { value: 'consistency', label: 'Manter uma rotina que eu consiga sustentar' },
      { value: 'target_course', label: 'Me aproximar do curso que eu quero' },
      { value: 'self_proof', label: 'Provar para mim mesmo que consigo' },
    ],
  },
];

interface Props {
  firstName: string;
  organizationName: string;
  onComplete: (result: MonthlyCheckInResult) => void;
  submitMonthlyCheckIn: (answers: MonthlyCheckInAnswerInput[]) => Promise<MonthlyCheckInResult>;
}

type Phase = 'welcome' | 'form' | 'celebration';

export function OnboardingDiagnosticModal({
  firstName,
  organizationName,
  onComplete,
  submitMonthlyCheckIn,
}: Props) {
  const shouldReduce = useReducedMotion();
  const theme = usePopupTheme('celebration');
  const [phase, setPhase] = useState<Phase>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MonthlyCheckInResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = QUESTIONS[questionIndex];
  const currentAnswer = answers[currentQuestion?.id ?? ''] ?? null;
  const isLastQuestion = questionIndex === QUESTIONS.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round((answeredCount / QUESTIONS.length) * 100);
  const IdentityTitleIcon = useMemo(
    () => getIdentityTitleIcon(result?.identity_title_icon),
    [result?.identity_title_icon],
  );
  const progressMeta = useMemo(
    () => getProgressTierMeta(result?.progress_tier),
    [result?.progress_tier],
  );

  const fadeIn = shouldReduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const slideIn = shouldReduce
    ? {}
    : {
        initial: { opacity: 0, x: 24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -24 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  async function handleSelect(answer: string) {
    if (!currentQuestion || isSubmitting) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(nextAnswers);
    setError(null);

    if (!isLastQuestion) {
      setQuestionIndex((prev) => prev + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = QUESTIONS.map((question) => ({
        question_id: question.id,
        answer: nextAnswers[question.id],
      }));
      const apiResult = await submitMonthlyCheckIn(payload);
      setResult(apiResult);
      setPhase('celebration');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Não foi possível concluir seu check-in mensal.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center overflow-y-auto py-6"
      style={{
        ...theme.overlayStyle,
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
    >
      <AnimatePresence mode="wait">
        {phase === 'welcome' && (
          <motion.div key="welcome" className="flex w-full max-w-xl flex-col items-center px-4 text-center sm:px-6" {...fadeIn}>
            <p className={`mb-8 text-[11px] font-bold uppercase tracking-[0.25em] ${theme.mutedClass}`}>
              {organizationName}
            </p>
            <p className={`mb-2 text-xl font-bold leading-snug ${theme.softTextClass}`}>
              Seu mês começa definindo identidade.
            </p>
            <p className={`mb-8 text-sm ${theme.mutedClass}`}>
              Em menos de 1 minuto, {firstName}, vamos mapear o perfil que você quer carregar neste mês.
            </p>

            <div className="mb-4 w-full rounded-2xl p-4 text-left" style={theme.elevatedPanelStyle}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
                Check-in do mês
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${theme.bodyClass}`}>
                Suas respostas definem um título de identidade mensal. Depois disso, sua trilha de progresso continua sendo conquistada por pontos até Lendário.
              </p>
            </div>

            <div className="mb-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                '5 perguntas rápidas',
                'Título mensal exclusivo',
                'Trilha de evolução por pontos',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl px-4 py-4 text-sm font-semibold"
                  style={theme.panelStyle}
                >
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={() => setPhase('form')}
              className="w-full rounded-xl py-4 text-sm font-extrabold text-white transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 65%, black))',
              }}
            >
              Iniciar check-in do mês
            </button>
          </motion.div>
        )}

        {phase === 'form' && currentQuestion && (
          <motion.div key={`form-${questionIndex}`} className="flex w-full max-w-2xl flex-col px-2 sm:px-4" {...slideIn}>
            <div className="mb-5 px-1">
              <div className="mb-1.5 flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-widest ${theme.mutedClass}`}>Check-in do mês</span>
                <span className={`text-[11px] font-bold ${theme.strongMutedClass}`}>{questionIndex + 1} / {QUESTIONS.length}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={theme.panelStyle}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--brand-primary)' }} />
              </div>
            </div>

            <div className="mb-4 rounded-2xl p-5" style={theme.elevatedPanelStyle}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
                {currentQuestion.eyebrow}
              </p>
              <p className={`mt-2 text-lg font-bold leading-snug ${theme.titleClass}`}>
                {currentQuestion.prompt}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {currentQuestion.options.map((option) => {
                const isSelected = currentAnswer === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => void handleSelect(option.value)}
                    disabled={isSubmitting}
                    className="flex items-start gap-3 rounded-2xl p-4 text-left text-sm transition-all active:scale-[0.99] disabled:cursor-wait"
                    style={isSelected ? { ...theme.panelStyle, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--brand-primary) 40%, transparent)' } : theme.panelStyle}
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold"
                      style={{
                        borderColor: isSelected ? 'var(--brand-primary)' : 'rgba(148,163,184,0.28)',
                        color: isSelected ? 'var(--brand-primary)' : undefined,
                      }}
                    >
                      {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : ''}
                    </span>
                    <span className={`flex-1 leading-relaxed ${theme.softTextClass}`}>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {error && (
              <p className="mt-4 text-sm font-medium text-rose-400">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {phase === 'celebration' && result && (
          <motion.div
            key="celebration"
            className="relative flex w-full max-w-md flex-col items-center px-4 text-center sm:px-6"
            {...(shouldReduce ? {} : { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } })}
          >
            <p className={`relative z-20 mb-5 text-[11px] font-bold uppercase tracking-[0.25em] ${theme.mutedClass}`}>
              {organizationName}
            </p>

            <div
              className="relative z-20 mb-1 flex h-24 w-24 items-center justify-center rounded-full border-2"
              style={{
                ...theme.elevatedPanelStyle,
                borderColor: 'rgba(15,118,110,0.28)',
                boxShadow: '0 0 0 10px rgba(15,118,110,0.10)',
              }}
            >
              <IdentityTitleIcon className="h-12 w-12" style={{ color: '#0F766E' }} aria-label={result.identity_title} />
            </div>

            <h2 className={`relative z-20 mt-3 text-2xl font-extrabold ${theme.titleClass}`}>{result.identity_title}</h2>
            <p className={`relative z-20 mt-1 text-sm ${theme.mutedClass}`}>Identidade do mês</p>
            <p className={`relative z-20 mt-2 max-w-[18rem] text-sm leading-relaxed ${theme.bodyClass}`}>
              {result.identity_title_description}
            </p>

            <div className="relative z-20 my-6 w-full rounded-2xl p-4 text-left" style={theme.elevatedPanelStyle}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.mutedClass}`}>
                Sua trilha começou em
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, ${progressMeta.color} 16%, transparent)`,
                    border: `1px solid ${progressMeta.glow}`,
                  }}
                >
                  <progressMeta.Icon className="h-5 w-5" style={{ color: progressMeta.color }} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${theme.titleClass}`}>{result.progress_tier}</p>
                  <p className={`text-xs ${theme.mutedClass}`}>
                    {result.points_to_next_tier > 0
                      ? `Faltam ${result.points_to_next_tier.toLocaleString('pt-BR')} pts para ${result.next_tier}`
                      : 'Você já está no topo da trilha deste mês.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => onComplete(result)}
              className="relative z-20 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-extrabold text-white transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 65%, black))',
              }}
            >
              Ver minha trilha de títulos
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
