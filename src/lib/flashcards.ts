'use client';

// Flashcards (plano Cenas, fase 7) — cliente das rotas Flask
// /api/partners/<slug>/flashcard-decks (escola) e /flashcards (aluno).

import { classesFetch } from '@/lib/org-classes';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: { grade: Grade; label: string; hint: string }[] = [
  { grade: 'again', label: 'Errei', hint: 'volta amanhã' },
  { grade: 'hard', label: 'Difícil', hint: 'volta logo' },
  { grade: 'good', label: 'Bom', hint: 'volta em alguns dias' },
  { grade: 'easy', label: 'Fácil', hint: 'demora mais a voltar' },
];

export interface CardDraft { front: string; back: string }
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | null;
export const REVIEW_LABELS: Record<'pending' | 'approved' | 'rejected', string> = {
  pending: 'Aguardando aprovação',
  approved: 'Aprovado: sua turma vê',
  rejected: 'Recusado',
};
export interface Card extends CardDraft {
  id: string; deck_id: string; position: number; is_new?: boolean;
  review_status?: ReviewStatus; review_note?: string | null;
}

export interface ReviewGroup {
  deck: { id: string; title: string; subject: string | null; shared: boolean };
  author: { id: string; name: string | null; classes: string[] };
  cards: { id: string; front: string; back: string; updated_at: string }[];
}

export interface Deck {
  id: string;
  org_id: string;
  owner_user_id: string | null;
  title: string;
  subject: string | null;
  discipline: string | null;
  visible_class_ids: string[] | null;
  card_count?: number;
}

export interface StudentDeck {
  id: string;
  title: string;
  subject: string | null;
  discipline: string | null;
  mine: boolean;
  source: 'school' | 'class' | 'mine';
  pending?: number;
  shared?: boolean;
  card_count: number;
  due: number;
  new: number;
  today: number;
}

export interface StudySession {
  deck: { id: string; title: string; mine: boolean };
  cards: Card[];
}

export const fcFetch = classesFetch;

/** Planilha frente;verso → cartões (lidos no backend, não grava). */
export async function parseCardsCsv(slug: string, path: '/flashcard-decks/parse-csv' | '/flashcards/parse-csv', file: File): Promise<CardDraft[]> {
  const { data: { session } } = await createClient().auth.getSession();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/api/partners/${slug}${path}`, {
    method: 'POST', body: form, headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || 'Não foi possível ler a planilha.');
  return (body as { cards: CardDraft[] }).cards;
}

export function cleanDrafts(cards: CardDraft[]): CardDraft[] {
  return cards.map((c) => ({ front: c.front.trim(), back: c.back.trim() })).filter((c) => c.front || c.back);
}

export function draftsProblem(cards: CardDraft[]): string | null {
  const k = cards.findIndex((c) => !c.front.trim() || !c.back.trim());
  return k >= 0 ? `Cartão ${k + 1}: falta a ${cards[k].front.trim() ? 'resposta (verso)' : 'pergunta (frente)'}.` : null;
}
