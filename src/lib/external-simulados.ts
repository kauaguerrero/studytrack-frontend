// Simulados externos: o aluno registra só a nota (acertos por área + redação)
// de simulados feitos fora da plataforma. Backend: /api/simulado/external.

export const EXTERNAL_AREAS = [
  { key: 'linguagens', label: 'Linguagens' },
  { key: 'humanas', label: 'Humanas' },
  { key: 'natureza', label: 'Natureza' },
  { key: 'matematica', label: 'Matemática' },
] as const;

export type ExternalArea = (typeof EXTERNAL_AREAS)[number]['key'];

export const ENEM_QUESTIONS_PER_AREA = 45;

export interface ExternalSimulado {
  id: string;
  title: string;
  day1_date: string; // YYYY-MM-DD
  day2_date: string | null;
  is_enem_standard: boolean;
  linguagens_correct: number | null;
  linguagens_total: number | null;
  humanas_correct: number | null;
  humanas_total: number | null;
  natureza_correct: number | null;
  natureza_total: number | null;
  matematica_correct: number | null;
  matematica_total: number | null;
  essay_score: number | null;
  notes?: string | null;
  created_at: string;
}

export interface AreaResult {
  correct: number;
  total: number;
  pct: number;
}

export function areaResult(sim: ExternalSimulado, area: ExternalArea): AreaResult | null {
  const correct = sim[`${area}_correct`];
  const total = sim[`${area}_total`];
  if (correct == null || !total) return null;
  return { correct, total, pct: Math.round((correct / total) * 1000) / 10 };
}

/** Soma só das áreas preenchidas — um simulado só de Matemática vale 12/45, não 12/180. */
export function totalResult(sim: ExternalSimulado): AreaResult | null {
  let correct = 0;
  let total = 0;
  for (const { key } of EXTERNAL_AREAS) {
    const r = areaResult(sim, key);
    if (!r) continue;
    correct += r.correct;
    total += r.total;
  }
  if (!total) return null;
  return { correct, total, pct: Math.round((correct / total) * 1000) / 10 };
}

/** Todas as 4 áreas preenchidas = finalizado; senão o aluno ainda vai completar. */
export function isComplete(sim: ExternalSimulado): boolean {
  return EXTERNAL_AREAS.every(({ key }) => sim[`${key}_correct`] != null);
}

/** "2026-08-16" → "16/08" (ou "16/08/2026" com withYear). Sem new Date(): evita deslocar o dia por fuso. */
export function formatDayBR(isoDate: string | null, withYear = false): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** Mesma escala de cor do histórico de simulados da plataforma. */
export function pctTone(pct: number): 'good' | 'mid' | 'bad' {
  if (pct >= 70) return 'good';
  if (pct >= 45) return 'mid';
  return 'bad';
}

export const PCT_TONE_CLASSES: Record<'good' | 'mid' | 'bad', string> = {
  good: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  mid: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  bad: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};
