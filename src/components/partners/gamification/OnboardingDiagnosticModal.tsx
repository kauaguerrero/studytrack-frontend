'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Target, Zap, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DiagnosticResult, GamificationTitle } from '@/types/gamification';

// ─── Confetti (CSS keyframes, no external dependency) ─────────────────────────

// Pre-computed to avoid Math.random at render time (no hydration mismatch)
const CONFETTI: { x: string; color: string; delay: number; dur: number; w: number; h: number }[] = [
  { x: '4%',  color: '#6366f1', delay: 0,    dur: 2.6, w: 8,  h: 12 },
  { x: '10%', color: '#f59e0b', delay: 0.15, dur: 2.9, w: 6,  h: 10 },
  { x: '17%', color: '#10b981', delay: 0.05, dur: 2.4, w: 10, h: 8  },
  { x: '24%', color: '#f43f5e', delay: 0.3,  dur: 3.1, w: 7,  h: 12 },
  { x: '31%', color: '#a855f7', delay: 0.1,  dur: 2.7, w: 9,  h: 7  },
  { x: '39%', color: '#fbbf24', delay: 0.22, dur: 2.5, w: 6,  h: 11 },
  { x: '46%', color: '#6366f1', delay: 0.35, dur: 3.0, w: 11, h: 8  },
  { x: '53%', color: '#10b981', delay: 0.08, dur: 2.8, w: 7,  h: 9  },
  { x: '60%', color: '#f43f5e', delay: 0.25, dur: 2.6, w: 8,  h: 6  },
  { x: '67%', color: '#a855f7', delay: 0.12, dur: 2.9, w: 10, h: 10 },
  { x: '74%', color: '#6366f1', delay: 0.4,  dur: 2.4, w: 6,  h: 12 },
  { x: '81%', color: '#f59e0b', delay: 0.18, dur: 3.2, w: 9,  h: 7  },
  { x: '87%', color: '#10b981', delay: 0.28, dur: 2.7, w: 7,  h: 11 },
  { x: '93%', color: '#f43f5e', delay: 0.06, dur: 2.5, w: 11, h: 8  },
  { x: '97%', color: '#a855f7', delay: 0.22, dur: 2.8, w: 8,  h: 9  },
];

function ConfettiLayer() {
  return (
    <>
      <style>{`
        @keyframes _diagConfettiFall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden" aria-hidden>
        {CONFETTI.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              borderRadius: 2,
              animation: `_diagConfettiFall ${p.dur}s ${p.delay}s ease-in infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── Title metadata ────────────────────────────────────────────────────────────

const TITLE_META: Record<GamificationTitle, { Icon: LucideIcon; desc: string }> = {
  Iniciante: { Icon: Target, desc: 'Começa a trilha'    },
  Veterano:  { Icon: Zap,    desc: 'Sabe o caminho'     },
  Expert:    { Icon: Trophy, desc: 'Domina o conteúdo' },
};

function resolveLocal(score: number): { title: GamificationTitle; points: number } {
  if (score === 5) return { title: 'Expert',   points: 247 };
  if (score >= 3)  return { title: 'Veterano', points: 150 };
  return                  { title: 'Iniciante', points: 50  };
}

// ─── Animated points counter ───────────────────────────────────────────────────

function AnimatedCounter({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(0);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const id = setInterval(() => {
      current += step;
      if (current >= target) { setValue(target); clearInterval(id); }
      else setValue(current);
    }, 35);
    return () => clearInterval(id);
  }, [target]);

  return <span>+{value.toLocaleString('pt-BR')} pontos</span>;
}

// ─── Local question types ──────────────────────────────────────────────────────

interface Alternative { letter: string; text: string }
interface QuizQuestion {
  id: string;
  statement: string;
  context?: string;
  alternatives: Alternative[];
  correct_option: string;
}

// ─── Questões fixas de onboarding ─────────────────────────────────────────────

const ONBOARDING_QUESTIONS: QuizQuestion[] = [
  {
    id: 'onboarding_q1',
    statement: 'Qual é o maior planeta do Sistema Solar?',
    alternatives: [
      { letter: 'A', text: 'Saturno' },
      { letter: 'B', text: 'Júpiter' },
      { letter: 'C', text: 'Urano' },
      { letter: 'D', text: 'Netuno' },
    ],
    correct_option: 'B',
  },
  {
    id: 'onboarding_q2',
    statement: 'Em que ano o Brasil proclamou sua independência de Portugal?',
    alternatives: [
      { letter: 'A', text: '1808' },
      { letter: 'B', text: '1815' },
      { letter: 'C', text: '1822' },
      { letter: 'D', text: '1889' },
    ],
    correct_option: 'C',
  },
  {
    id: 'onboarding_q3',
    statement: 'Qual elemento químico possui o símbolo "Fe" na tabela periódica?',
    alternatives: [
      { letter: 'A', text: 'Flúor' },
      { letter: 'B', text: 'Fósforo' },
      { letter: 'C', text: 'Ferro' },
      { letter: 'D', text: 'Frâncio' },
    ],
    correct_option: 'C',
  },
  {
    id: 'onboarding_q4',
    statement: 'Quantos ossos tem o corpo humano adulto?',
    alternatives: [
      { letter: 'A', text: '186' },
      { letter: 'B', text: '206' },
      { letter: 'C', text: '226' },
      { letter: 'D', text: '246' },
    ],
    correct_option: 'B',
  },
  {
    id: 'onboarding_q5',
    statement: 'Em que ano exatamente foi fundada a cidade de Tenochtitlan, capital do Império Asteca — que hoje corresponde à Cidade do México?',
    alternatives: [
      { letter: 'A', text: '1235' },
      { letter: 'B', text: '1325' },
      { letter: 'C', text: '1410' },
      { letter: 'D', text: '1487' },
    ],
    correct_option: 'B',
  },
];

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  firstName: string;
  organizationName: string;
  /** Called when the user clicks "Ver meu ranking →" in the celebration screen. */
  onComplete: (result: DiagnosticResult) => void;
  /** Provided by the parent (from usePartnerGamification hook). */
  submitDiagnostic: (score: number, questionIds: string[]) => Promise<DiagnosticResult>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Phase = 'welcome' | 'quiz' | 'celebration';

export function OnboardingDiagnosticModal({ firstName, organizationName, onComplete, submitDiagnostic }: Props) {
  const shouldReduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('welcome');

  // ── Quiz state
  const [questions, setQuestions]     = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex]           = useState(0);
  const [score, setScore]             = useState(0);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [feedback, setFeedback]           = useState<'correct' | 'wrong' | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // ── Celebration state
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  // Load static questions on mount
  useEffect(() => {
    setQuestions(ONBOARDING_QUESTIONS);
    setQuestionIds(ONBOARDING_QUESTIONS.map((q) => q.id));
  }, []);

  // Handle answer selection
  const handleAnswer = useCallback(
    async (letter: string) => {
      if (feedback !== null) return;

      const currentQ = questions[qIndex];
      const isCorrect = letter === currentQ.correct_option;
      const newScore = isCorrect ? score + 1 : score;

      setSelectedLetter(letter);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) setScore(newScore);

      await new Promise<void>((r) => setTimeout(r, 900));
      setFeedback(null);
      setSelectedLetter(null);

      const isLast = qIndex === questions.length - 1;
      if (isLast) {
        try {
          const apiResult = await submitDiagnostic(newScore, questionIds);
          setResult(apiResult);
        } catch {
          // Fallback: compute locally so celebration always shows
          const { title, points } = resolveLocal(newScore);
          setResult({ title, points_awarded: points } as DiagnosticResult);
        }
        setPhase('celebration');
      } else {
        setQIndex((i) => i + 1);
      }
    },
    [feedback, questions, qIndex, score, questionIds, submitDiagnostic],
  );

  // ── Animation helpers
  const fadeIn  = shouldReduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const slideIn = shouldReduce
    ? {}
    : {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        exit:    { opacity: 0, x: -32 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  const currentQ = questions[qIndex];
  const titleInfo = result ? TITLE_META[result.title] : null;

  const res = result as DiagnosticResult & { monthly_points_after?: number; current_monthly_points?: number } | null;
  const totalNeeded = (res?.monthly_points_after ?? 0) || (res?.current_monthly_points ?? 0) + 1;
  const earned = res?.current_monthly_points ?? 0;
  const prizePct = totalNeeded > 0 ? Math.min(100, Math.round((earned / (earned + (result?.points_awarded ?? 1))) * 100)) : 10;

  return (
    // Intentionally no pointer events on the backdrop — modal is blocking
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 overflow-y-auto py-6"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
      }}
    >
      <AnimatePresence mode="wait">

        {/* ── Phase 1: Welcome ────────────────────────────────────────────── */}
        {phase === 'welcome' && (
          <motion.div key="welcome" className="flex w-full max-w-sm flex-col items-center px-4 text-center sm:px-6" {...fadeIn}>
            <p className="mb-8 text-[11px] font-bold uppercase tracking-[0.25em] text-white/30">
              {organizationName}
            </p>

            <p className="mb-2 text-xl font-bold leading-snug text-white/80">
              &ldquo;Redação é o que separa quem passa de quem fica pra próxima.&rdquo;
            </p>
            <p className="mb-10 text-sm text-white/40">
              Vamos descobrir onde você está, {firstName}.
            </p>

            {/* Title showcase */}
            <div className="mb-10 grid grid-cols-3 gap-3 w-full">
              {(Object.entries(TITLE_META) as [GamificationTitle, typeof TITLE_META[GamificationTitle]][]).map(
                ([title, info]) => (
                  <div
                    key={title}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-3"
                  >
                    <info.Icon className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} aria-label={title} />
                    <span className="text-[11px] font-bold text-white">{title}</span>
                    <span className="text-[10px] text-white/40 text-center leading-tight">{info.desc}</span>
                  </div>
                ),
              )}
            </div>

            <button
              onClick={() => setPhase('quiz')}
              className="w-full rounded-xl py-4 text-sm font-extrabold text-white transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 65%, black))',
              }}
            >
              Iniciar diagnóstico — 5 questões
            </button>
          </motion.div>
        )}

        {/* ── Phase 2: Quiz ───────────────────────────────────────────────── */}
        {phase === 'quiz' && (
          <motion.div key="quiz" className="flex w-full max-w-lg flex-col px-2 sm:px-4" {...fadeIn}>
            {/* Progress */}
            <div className="mb-5 px-1">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Diagnóstico</span>
                <span className="text-[11px] font-bold text-white/50">{qIndex + 1} / {questions.length || 5}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((qIndex + 1) / (questions.length || 5)) * 100}%`,
                    background: 'var(--brand-primary)',
                  }}
                />
              </div>
            </div>

            {/* Question card */}
            {currentQ && (
              <AnimatePresence mode="wait">
                <motion.div key={`q-${qIndex}`} {...slideIn}>
                  {/* Statement */}
                  <div className="mb-4 max-h-[min(26dvh,10rem)] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm leading-relaxed text-white/85">{currentQ.statement}</p>
                  </div>

                  {/* Alternatives */}
                  <div className="flex flex-col gap-2.5">
                    {currentQ.alternatives.map((alt) => {
                      const isCorrectAlt = alt.letter === currentQ.correct_option;
                      const isSelected   = alt.letter === selectedLetter;
                      let borderColor = 'border-white/10';
                      let bgColor     = 'bg-white/5';

                      if (feedback !== null) {
                        if (isCorrectAlt) {
                          borderColor = 'border-emerald-500/50';
                          bgColor     = 'bg-emerald-500/15';
                        } else if (isSelected) {
                          borderColor = 'border-red-500/50';
                          bgColor     = 'bg-red-500/15';
                        }
                      }

                      return (
                        <button
                          key={alt.letter}
                          onClick={() => handleAnswer(alt.letter)}
                          disabled={feedback !== null}
                          className={`flex items-start gap-3 rounded-xl border ${borderColor} ${bgColor} p-3 text-left text-sm transition-all active:scale-[0.98] disabled:cursor-default`}
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-white/50">
                            {alt.letter}
                          </span>
                          <span className="flex-1 leading-relaxed text-white/80">{alt.text}</span>
                          {feedback !== null && isCorrectAlt && (
                            <CheckCircle2 className="shrink-0 h-4 w-4 text-emerald-400" aria-label="Resposta correta" />
                          )}
                          {feedback !== null && isSelected && !isCorrectAlt && (
                            <XCircle className="shrink-0 h-4 w-4 text-red-400" aria-label="Resposta errada" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* ── Phase 3: Celebration ────────────────────────────────────────── */}
        {phase === 'celebration' && result && titleInfo && (
          <motion.div
            key="celebration"
            className="relative flex w-full max-w-sm flex-col items-center px-4 text-center sm:px-6"
            {...(shouldReduce
              ? {}
              : { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } })}
          >
            <ConfettiLayer />

            <p className="relative z-20 mb-5 text-[11px] font-bold uppercase tracking-[0.25em] text-white/30">
              {organizationName}
            </p>

            {/* Title badge */}
            <div className="relative z-20 mb-1 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/15 bg-white/5">
              <titleInfo.Icon className="h-12 w-12 text-white" aria-label={result.title} />
            </div>
            <h2 className="relative z-20 mt-3 text-2xl font-extrabold text-white">{result.title}</h2>
            <p className="relative z-20 mt-1 text-sm text-white/40">Título conquistado</p>

            {/* Animated points */}
            <div
              className="relative z-20 my-6 text-4xl font-extrabold tabular-nums"
              style={{ color: 'var(--brand-primary)' }}
            >
              {shouldReduce
                ? `+${result.points_awarded.toLocaleString('pt-BR')} pontos`
                : <AnimatedCounter target={result.points_awarded} />}
            </div>

            {/* Prize progress */}
            <div className="relative z-20 mb-8 w-full rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
                Progresso para o prêmio
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--brand-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${prizePct}%` }}
                  transition={
                    shouldReduce
                      ? { duration: 0 }
                      : { duration: 1.1, delay: 0.5, ease: [0.22, 1, 0.36, 1] as const }
                  }
                />
              </div>
              <p className="mt-1.5 text-[11px] text-white/40">
                Você está no caminho para o prêmio do mês 🏆
              </p>
            </div>

            <button
              onClick={() => onComplete(result)}
              className="relative z-20 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-extrabold text-white transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 65%, black))',
              }}
            >
              Ver meu ranking →
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
