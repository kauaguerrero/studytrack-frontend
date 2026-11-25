'use client';

// Simulado por gabarito (plano Cenas, fase 5) — cliente das rotas Flask
// /api/partners/<slug>/answer-key-simulados.

import { classesFetch } from '@/lib/org-classes';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';

export const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;
export type Option = (typeof OPTIONS)[number];

/** Matérias como no banco de questões (mesma grafia do backend). */
export const SUBJECT_SUGGESTIONS = [
  'Língua Portuguesa', 'Literatura', 'Inglês', 'Espanhol', 'Arte', 'Educação Física',
  'História', 'Geografia', 'Filosofia', 'Sociologia',
  'Biologia', 'Física', 'Química', 'Matemática',
];

export interface KeyItemDraft {
  number: number;
  correct_option: Option | null;
  subject: string;
  discipline: string;
  annulled: boolean;
}

export interface KeyItem extends Omit<KeyItemDraft, 'discipline'> {
  id?: string;
  discipline: string | null;
  area?: string;
}

export interface ItemStat {
  number: number;
  correct_option: Option | null;
  subject: string;
  discipline: string | null;
  annulled: boolean;
  answered: number;
  correct: number;
  blank: number;
  options: Record<Option, number>;
  correct_pct: number | null;
}

export interface AreaResult { correct: number; total: number; percentage: number; label?: string }

export interface StudentResult {
  user_id: string;
  full_name: string | null;
  email: string | null;
  score: number;
  total: number;
  percentage: number;
  results_by_area: Record<string, AreaResult>;
  completed_at: string | null;
}

export interface AnswerKeySimulado {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: 'scheduled' | 'active' | 'ended';
  config: { qty?: number; reveal?: 'after_submit' | 'after_end'; bank?: string };
}

export interface ResultsResponse {
  simulado: AnswerKeySimulado;
  students: StudentResult[];
  items: ItemStat[];
}

export interface GradedItem {
  number: number;
  marked: Option | null;
  correct_option: Option | null;
  is_correct: boolean | null;
  annulled: boolean;
  subject: string;
  discipline: string | null;
}

export interface Graded {
  score: number;
  total: number;
  percentage: number;
  results_by_subject: Record<string, AreaResult>;
  results_by_area: Record<string, AreaResult>;
  items: GradedItem[];
}

export interface SheetResponse {
  simulado: { id: string; title: string; starts_at: string; ends_at: string | null; status: AnswerKeySimulado['status']; qty: number; reveal: 'after_submit' | 'after_end' };
  items: { number: number; subject: string; discipline: string | null; annulled: boolean }[];
  submission: { session_id: string; answers: Record<string, Option>; completed_at: string; score: number; total: number } | null;
  result: Graded | null;
}

export function emptyItems(n: number, from: KeyItemDraft[] = []): KeyItemDraft[] {
  return Array.from({ length: n }, (_, k) => from[k] ?? { number: k + 1, correct_option: null, subject: '', discipline: '', annulled: false });
}

export function toPayload(items: KeyItemDraft[]) {
  return items.map((i) => ({
    number: i.number, correct_option: i.correct_option,
    subject: i.subject.trim(), discipline: i.discipline.trim() || null, annulled: i.annulled,
  }));
}

/** Primeira pendência do gabarito (para o botão salvar dizer o que falta). */
export function draftProblem(items: KeyItemDraft[]): string | null {
  if (!items.length) return 'Informe quantas questões a prova tem.';
  for (const i of items) {
    if (!i.annulled && !i.correct_option) return `Questão ${i.number}: falta a resposta certa.`;
    if (!i.subject.trim()) return `Questão ${i.number}: falta a matéria.`;
  }
  return null;
}

/** "ABCDE…" colado → letras nas questões, na ordem (espaços e números ignorados). */
export function applyLetters(items: KeyItemDraft[], text: string): KeyItemDraft[] {
  const letters = text.toUpperCase().replace(/[^A-E*]/g, '').split('');
  return items.map((i, k) => (k < letters.length
    ? (letters[k] === '*' ? { ...i, annulled: true, correct_option: null } : { ...i, correct_option: letters[k] as Option, annulled: false })
    : i));
}

export function answerKeyFetch<T>(slug: string, path: string, init?: RequestInit) {
  return classesFetch<T>(slug, `/answer-key-simulados${path}`, init);
}

/** Planilha (CSV `;` ou `,`) → itens, lidos no backend. */
export async function parseAnswerKeyCsv(slug: string, file: File): Promise<KeyItem[]> {
  const { data: { session } } = await createClient().auth.getSession();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/partners/${slug}/answer-key-simulados/parse-csv`, {
    method: 'POST', body: form, headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Não foi possível ler a planilha.');
  return (body as { items: KeyItem[] }).items;
}
