// Cliente do Cronograma Inteligente (backend Flask: /api/student/cronograma/*).
// Toda regra de agenda/SRS vive no backend — aqui só busca, exibe e envia ações.

import { createClient } from '@/lib/supabase/client';

export type Area = 'matematica' | 'natureza' | 'humanas' | 'linguagens' | 'geral';

export interface NodeView {
  node_id: string;
  code: string;
  topic: string;
  subject: string;
  area: Area;
  area_label: string;
  q_subject: string | null;
  q_discipline: string | null;
  difficulty: number;
}

export interface PlanItem extends NodeView {
  id: string;
  kind: 'study' | 'review';
  date: string;
  minutes: number;
  status: 'pending' | 'done' | 'skipped';
  pinned: boolean;
  source: 'planner' | 'manual' | 'agent' | 'chip';
  projected: boolean;
  position: number;
  review_due_on: string | null;
  depends_on_late: string[];
  /** Conteúdo dividido em partes (dia curto): parte `part` de `parts`. 0/0 = inteiro. */
  part?: number;
  parts?: number;
}

export interface ProjectedItem extends NodeView {
  kind: 'study' | 'review';
  date: string;
  minutes: number;
  projected: true;
  part?: number;
  parts?: number;
}

export type BlockKind = 'simulado' | 'redacao';

/** Tempo reservado na semana para simulado/redação (fora do conteúdo). */
export interface DayBlock {
  kind: BlockKind;
  label: string;
  minutes: number;
}

/** Rotina além da semana fixa (study_plans.schedule_rules). */
export interface ScheduleRules {
  /** Escala que repete a cada N dias (12x36…): minutos de cada dia do ciclo, a partir de `start`. */
  cycle?: { start: string; minutes: number[] };
  /** Rotina com data: vale de `from` até `until` (ou sem fim). */
  periods?: { from: string; until: string | null; capacity: Record<string, number> }[];
  blocks?: { kind: BlockKind; weekday: number; minutes: number }[];
}

export interface DayInfo {
  date: string;
  minutes: number;
  capacity: number;
  ratio: number;
  level: 'green' | 'yellow' | 'red';
  blocked: boolean;
  /** Dia da semana marcado como "só revisão" na rotina. */
  review_only?: boolean;
  /** Simulado/redação reservados neste dia (já descontados de `capacity`). */
  blocks?: DayBlock[];
}

export interface PlanSummary {
  id: string;
  exam_date: string;
  capacity: Record<string, number>;
  /** Dias da semana (0=seg … 6=dom) só de revisão. */
  review_weekdays?: number[];
  schedule_rules?: ScheduleRules;
  subject_weights: Record<string, number>;
  version: number;
}

export interface CronogramaView {
  plan: PlanSummary;
  today: string;
  range: { start: string; days: number };
  days: DayInfo[];
  items: PlanItem[];
  projection: ProjectedItem[];
}

export interface CronogramaStatus {
  enabled: boolean;
  has_plan?: boolean;
  plan?: PlanSummary | null;
  defaults?: { exam_date: string; days_per_week: number; hours_per_day: number };
}

export interface Insights {
  days_to_exam: number;
  weeks_to_exam: number;
  studied: number;
  total: number;
  coverage_pct: number;
  pace: 'adiantado' | 'atrasado' | 'no_ritmo';
  pace_delta: number;
  ideal_studied: number;
  left_out: number;
  left_out_by_area: { area: Area; label: string; count: number }[];
  by_area: { area: Area; label: string; total: number; studied: number; pct: number }[];
  streak_days: number;
  retention_pct: number | null;
  reviews_due_today: number;
  brake_today: boolean;
  weekly_minutes: number;
}

export interface DiffEntry {
  id?: string;
  node_id: string;
  kind: 'study' | 'review';
  from?: string;
  to?: string;
  minutes?: number;
  topic?: string;
  subject?: string;
  area?: Area;
}

export interface Proposal {
  request_id: string;
  status: 'proposed' | 'failed';
  reply: string;
  /** Pergunta de sim/não: o front mostra botões (Sim = confirmar, Não = descartar). */
  question?: string | null;
  diff: ProposalDiff;
  warnings: { item_id?: string; code: string; message: string }[];
  errors: { op: string | null; message: string }[];
  quota: { allowed: boolean; remaining: number; retry_after_seconds?: number } | null;
  preview_items: PlanItem[];
  /** Tempos da prévia que o aluno pode mudar sem passar pela IA (POST /agent/<id>/adjust). */
  editable?: EditableTime[];
  /** Dia mais cheio da rotina, referência do aviso "passou do programado". */
  routine_max_minutes?: number;
}

export interface EditableTime {
  index: number;
  op: 'set_day_capacity' | 'set_weekday_capacity' | 'set_review_day';
  label: string;
  minutes: number;
  routine_minutes: number;
  date?: string;
  weekday?: number;
}

/** 90 → "1h30", 120 → "2h", 45 → "45min". */
export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h${String(r).padStart(2, '0')}`;
  return h ? `${h}h` : `${r}min`;
}

export interface NextItem extends NodeView {
  id: string;
  kind: 'study' | 'review';
  date: string;
  minutes: number;
  overdue: boolean;
  today_total: number;
  today_done: number;
}

export interface NextResponse {
  enabled: boolean;
  has_plan?: boolean;
  next?: (NextItem & { done_today?: undefined; done_for_now?: undefined })
    | { done_today: true; next: NextItem }
    | { done_for_now: true }
    | null;
}

export interface QuizQuestion {
  id: string;
  title: string | null;
  context: string | null;
  alternatives_intro: string | null;
  alternatives: { letter: string; text: string; file?: string | null }[];
  images: string[] | null;
  exam_year: number | null;
  bank: string | null;
}

export interface QuizResponse extends NodeView {
  item_id: string;
  basis: 'node' | 'mixed' | 'discipline' | 'self';
  questions: QuizQuestion[];
}

export interface ReviewResult {
  grade: 'again' | 'hard' | 'good' | 'easy';
  grade_source: 'quiz' | 'self';
  accuracy: number | null;
  next_due_on: string | null;
  interval_days: number;
  results: { question_id: string; is_correct: boolean; correct_option: string | null; explanation?: string | null }[];
}

export class CronogramaApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const API = (process.env.NEXT_PUBLIC_API_URL || 'https://studytrack-backend.fly.dev').replace(/\/$/, '');

export async function cronogramaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new CronogramaApiError('Sessão expirada. Faça login novamente.', 401);
  let res: Response;
  try {
    res = await fetch(`${API}/api/student/cronograma${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers || {}),
      },
    });
  } catch {
    // Sem isso o aluno via "Failed to fetch" (TypeError cru do navegador) no toast.
    throw new CronogramaApiError('Sem conexão com o servidor. Verifique sua internet e tente de novo.', 0, 'network');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* corpo vazio */ }
  if (!res.ok) {
    const d = (data || {}) as { error?: string; code?: string; detail?: string };
    // `detail` só vem do backend fora de produção (diagnóstico local).
    const msg = (d.error || 'Não foi possível falar com o cronograma.') + (d.detail ? ` (${d.detail})` : '');
    throw new CronogramaApiError(msg, res.status, d.code);
  }
  return data as T;
}

// ─── Datas (sempre em string AAAA-MM-DD, sem fuso) ───────────────────────────

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Segunda-feira da semana de `s`. */
export function weekStart(s: string): string {
  const d = parseISODate(s);
  const wd = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - wd);
  return toISODate(d);
}

export const WEEKDAY_SHORT = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
export const WEEKDAY_LONG = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
  'setembro', 'outubro', 'novembro', 'dezembro'];

export function weekdayIndex(s: string): number {
  return (parseISODate(s).getDay() + 6) % 7;
}

export function formatDayMonth(s: string): string {
  const d = parseISODate(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Cores por área (tons fixos, legíveis no claro e no escuro) ──────────────

export const AREA_STYLE: Record<Area, { dot: string; chip: string; label: string }> = {
  matematica: { dot: '#2563eb', chip: 'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200', label: 'Matemática' },
  natureza:   { dot: '#059669', chip: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', label: 'Natureza' },
  humanas:    { dot: '#d97706', chip: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', label: 'Humanas' },
  linguagens: { dot: '#9333ea', chip: 'bg-purple-50 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200', label: 'Linguagens' },
  geral:      { dot: '#64748b', chip: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70', label: 'Geral' },
};

export const LOAD_STYLE: Record<DayInfo['level'], { bar: string; text: string; label: string }> = {
  green:  { bar: '#10b981', text: 'text-emerald-700 dark:text-emerald-300', label: 'Tranquilo' },
  yellow: { bar: '#f59e0b', text: 'text-amber-700 dark:text-amber-300', label: 'Cheio' },
  red:    { bar: '#ef4444', text: 'text-red-700 dark:text-red-300', label: 'Pesado' },
};

/** Links do CTA: banco de questões filtrado ou simulado pré-montado. */
export function studyLinks(slug: string, node: Pick<NodeView, 'q_subject' | 'q_discipline' | 'subject'>, itemId?: string) {
  const subject = node.q_subject || node.subject;
  const p = new URLSearchParams({ subject });
  if (node.q_discipline) p.set('topic', node.q_discipline);
  // plan_item liga o banco ao card: barra de progresso e conclusão ao bater a meta.
  if (itemId) p.set('plan_item', itemId);
  const s = new URLSearchParams({ cronograma: '1', subject, qty: '10' });
  if (node.q_discipline) s.set('topic', node.q_discipline);
  if (itemId) s.set('plan_item', itemId);
  return {
    bank: `/partners/${slug}/student/banco-de-questoes?${p.toString()}`,
    simulado: `/partners/${slug}/student/simulado?${s.toString()}`,
  };
}

/** Lê o deep-link do simulado (?cronograma=1&subject=X&topic=Y&qty=N) — par de `studyLinks`. */
export function parseSimuladoDeepLink(search: string): { subject: string; topic: string | null; qty: number; planItem: string | null } | null {
  const p = new URLSearchParams(search);
  if (p.get('cronograma') !== '1') return null;
  const subject = p.get('subject');
  if (!subject) return null;
  const qty = Math.max(5, Math.min(30, Number(p.get('qty')) || 10));
  return { subject, topic: p.get('topic') || null, qty, planItem: p.get('plan_item') || null };
}

// ─── Sessão de estudo pelo banco de questões ────────────────────────────────

export interface StudyProgress {
  item_id: string;
  goal: number;
  answered: number;
  status: 'pending' | 'done' | 'skipped';
  just_completed: boolean;
  topic: string | null;
  subject: string | null;
  discipline: string | null;
  /** Só com o conteúdo concluído; null quando não há respostas para resumir. */
  stats?: { correct: number; total: number; avg_seconds: number | null } | null;
}

/** "45s", "1min 12s", "3min". */
export function formatAnswerTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}min ${s % 60}s` : `${m}min`;
}

const studyKey = (itemId: string) => `cronograma:study-start:${itemId}`;

/** Quando o aluno começou a estudar este card (guardado no navegador: sair e
 *  voltar ao banco não zera a contagem). Só respostas a partir daqui contam. */
export function studySessionStart(itemId: string): string {
  const now = new Date().toISOString();
  try {
    const saved = localStorage.getItem(studyKey(itemId));
    if (saved && !Number.isNaN(Date.parse(saved))) return saved;
    localStorage.setItem(studyKey(itemId), now);
  } catch { /* storage bloqueado: conta a partir de agora */ }
  return now;
}

export function clearStudySession(itemId: string): void {
  try { localStorage.removeItem(studyKey(itemId)); } catch { /* ignora */ }
}

export interface ProposalDiff {
  moved: DiffEntry[];
  added: DiffEntry[];
  removed: DiffEntry[];
}

/** Resposta sem prévia pode vir sem as listas do diff: a tela sempre recebe as três. */
export function withCompleteDiff(p: Proposal): Proposal {
  return { ...p, diff: { moved: p.diff?.moved ?? [], added: p.diff?.added ?? [], removed: p.diff?.removed ?? [] } };
}
