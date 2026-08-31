// Evolução visual da sequência (foguinho) por marcos. Fonte da verdade dos
// estágios no frontend — espelha STREAK_STAGES em
// studytrack-backend/app/utils/streak_utils.py e os `target` das conquistas
// streak_* em achievements_service.py. Ao mexer nos números, alinhe os três.

export interface StreakStage {
  id: number;
  minDays: number;
  name: string;
  /** Cor principal da chama. Estágio 0 usa a cor da marca da org. Nos estágios
   * `rainbow` é só o fallback plano (accent de KPI, badge) — a chama em si é
   * multicolorida. */
  color: string;
  /** Componentes RGB da cor, para rgba() em glow/confete/overlay. */
  glowRgb: string;
  /** Quantidade de fagulhas subindo (0 = nenhuma). */
  particles: number;
  /** Chama ganha um núcleo branco no topo. */
  whiteCore: boolean;
  /** Halo pulsante ao redor da chama. */
  haloPulse: boolean;
  /** Chama arco-íris com hue cíclico (estágio final). */
  rainbow?: boolean;
}

export const STREAK_STAGES: StreakStage[] = [
  { id: 0, minDays: 0, name: 'Faísca', color: 'var(--brand-primary)', glowRgb: '249,115,22', particles: 0, whiteCore: false, haloPulse: false },
  { id: 1, minDays: 7, name: 'Chama', color: '#F97316', glowRgb: '249,115,22', particles: 0, whiteCore: false, haloPulse: false },
  { id: 2, minDays: 30, name: 'Chama Intensa', color: '#EF4444', glowRgb: '239,68,68', particles: 3, whiteCore: false, haloPulse: false },
  { id: 3, minDays: 60, name: 'Fogo Azul', color: '#3B82F6', glowRgb: '59,130,246', particles: 4, whiteCore: true, haloPulse: false },
  { id: 4, minDays: 90, name: 'Fogo Púrpura', color: '#8B5CF6', glowRgb: '139,92,246', particles: 5, whiteCore: true, haloPulse: true },
  { id: 5, minDays: 120, name: 'Fogo Arco-Íris', color: '#EC4899', glowRgb: '236,72,153', particles: 8, whiteCore: true, haloPulse: true, rainbow: true },
];

/** Gradiente CSS do fogo arco-íris — reusado no popup e na barra de progresso. */
export const RAINBOW_GRADIENT = 'linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6)';

const MAX_STAGE = STREAK_STAGES[STREAK_STAGES.length - 1];

export function getStreakStage(streak: number): StreakStage {
  let stage = STREAK_STAGES[0];
  for (const s of STREAK_STAGES) {
    if (streak >= s.minDays) stage = s;
    else break;
  }
  return stage;
}

export function getStreakStageProgress(streak: number): {
  stage: StreakStage;
  next: StreakStage | null;
  daysToNext: number;
  pct: number;
} {
  const stage = getStreakStage(streak);
  const next = STREAK_STAGES[stage.id + 1] ?? null;
  if (!next) return { stage, next: null, daysToNext: 0, pct: 100 };
  const span = next.minDays - stage.minDays;
  const into = streak - stage.minDays;
  return {
    stage,
    next,
    daysToNext: Math.max(0, next.minDays - streak),
    pct: Math.min(100, Math.max(0, Math.round((into / span) * 100))),
  };
}

export function isMaxStreakStage(streak: number): boolean {
  return getStreakStage(streak).id === MAX_STAGE.id;
}

/**
 * Se `newStreak` acabou de cruzar a fronteira de um estágio (o dia em que o
 * aluno "sobe de nível" o fogo), retorna o estágio recém-atingido; senão null.
 * Usado para turbinar o StreakPopup com confete + selo "Novo estágio".
 */
export function crossedStageBoundary(newStreak: number): StreakStage | null {
  if (newStreak <= 0) return null;
  const now = getStreakStage(newStreak);
  const before = getStreakStage(newStreak - 1);
  return now.id > before.id ? now : null;
}
