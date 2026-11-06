import type { DayInfo, PlanItem, Proposal, Insights, CronogramaView } from '@/lib/cronograma';
import { addDays } from '@/lib/cronograma';

export const TODAY = '2026-11-11'; // quarta
export const MONDAY = '2026-11-09';

let seq = 0;
export function item(over: Partial<PlanItem> = {}): PlanItem {
  seq += 1;
  return {
    id: `it-${seq}`, node_id: `n-${seq}`, code: `C${seq}`, topic: `Tópico ${seq}`, subject: 'Funções',
    area: 'matematica', area_label: 'Matemática', q_subject: 'Matemática', q_discipline: 'Funções',
    difficulty: 2, kind: 'study', date: TODAY, minutes: 45, status: 'pending', pinned: false,
    source: 'planner', projected: false, position: seq, review_due_on: null, depends_on_late: [],
    ...over,
  };
}

export function week(start = MONDAY, over: Partial<DayInfo> = {}): DayInfo[] {
  return Array.from({ length: 7 }, (_, k) => ({
    date: addDays(start, k), minutes: 60, capacity: k < 5 ? 120 : 0, ratio: 0.5,
    level: 'green' as const, blocked: false, ...over,
  }));
}

export function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    request_id: 'req-1', status: 'proposed', reply: 'Tirei a quinta.',
    diff: { moved: [], added: [], removed: [] }, warnings: [], errors: [], quota: null, preview_items: [],
    ...over,
  };
}

export function insights(over: Partial<Insights> = {}): Insights {
  return {
    days_to_exam: 361, weeks_to_exam: 51, studied: 12, total: 100, coverage_pct: 12, pace: 'no_ritmo',
    pace_delta: 0, ideal_studied: 12, left_out: 0, left_out_by_area: [],
    by_area: [
      { area: 'matematica', label: 'Matemática', total: 25, studied: 5, pct: 20 },
      { area: 'natureza', label: 'Natureza', total: 25, studied: 3, pct: 12 },
      { area: 'humanas', label: 'Humanas', total: 25, studied: 2, pct: 8 },
      { area: 'linguagens', label: 'Linguagens', total: 25, studied: 2, pct: 8 },
      { area: 'geral', label: 'Geral', total: 0, studied: 0, pct: 0 },
    ],
    streak_days: 3, retention_pct: 80, reviews_due_today: 0, brake_today: false, weekly_minutes: 600,
    ...over,
  };
}

export function view(start = MONDAY, items: PlanItem[] = [], over: Partial<CronogramaView> = {}): CronogramaView {
  return {
    plan: { id: 'p1', exam_date: '2027-11-07', capacity: {}, subject_weights: {}, version: 7 },
    today: TODAY, range: { start, days: 7 }, days: week(start), items, projection: [], ...over,
  };
}
