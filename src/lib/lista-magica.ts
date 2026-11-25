'use client';

// Lista mágica semanal (plano Cenas, fase 6) — cliente de /api/student/lista-magica.

import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';

export interface MagicTopic {
  subject: string;
  discipline: string;
  qty: number;
  reason: 'erro_recente' | 'nivel_baixo';
  temperature: number;
  mastery: number | null;
}

export interface MagicList {
  id: string | null;
  week_start: string;
  status: 'ready' | 'in_progress' | 'done' | 'empty';
  topics: MagicTopic[];
  total_questions: number;
  session_id: string | null;
  score: number | null;
  total: number | null;
  completed_at: string | null;
}

export class MagicListFetchError extends Error {
  constructor(message: string, public status: number, public body: Record<string, unknown>) { super(message); }
}

export async function magicListFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await createClient().auth.getSession();
  const res = await fetch(`${getApiBaseUrl()}/api/student/lista-magica${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}`, ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new MagicListFetchError((body as { error?: string }).error || 'Erro na lista mágica.', res.status, body);
  return body as T;
}

export const REASON_LABEL: Record<MagicTopic['reason'], string> = {
  erro_recente: 'você errou recentemente',
  nivel_baixo: 'seu nível ainda está baixo',
};

/** Segunda-feira → "semana de 23/11". */
export function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-');
  return `semana de ${d}/${m}`;
}
