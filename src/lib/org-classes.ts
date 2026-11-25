'use client';

// Turmas da org (plano Cenas, fase 2) — cliente das rotas Flask
// /api/partners/<slug>/classes e /subjects.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';

export type ClassGoal = 'ENEM' | 'MED' | 'CONCURSO';

export interface OrgClass {
  id: string;
  org_id: string;
  name: string;
  goal: ClassGoal;
  exam_date: string | null;
  default_review_weekdays: number[];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

export interface ClassMember {
  user_id: string;
  joined_at: string;
  full_name: string | null;
  email: string | null;
}

export const CLASS_GOAL_LABELS: Record<ClassGoal, string> = {
  ENEM: 'ENEM / vestibular',
  MED: 'Medicina',
  CONCURSO: 'Concurso',
};

export async function classesFetch<T = unknown>(slug: string, path: string, init: RequestInit = {}): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${getApiBaseUrl()}/api/partners/${slug}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || 'Não foi possível concluir a operação.');
  }
  return body as T;
}

/** Turmas ativas (gestor recebe todas com contagem; aluno, só a própria). */
export function useOrgClasses(slug: string, { includeArchived = false, enabled = true } = {}) {
  const [classes, setClasses] = useState<OrgClass[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const qs = includeArchived ? '?include_archived=1' : '';
      const data = await classesFetch<{ classes: OrgClass[] }>(slug, `/classes${qs}`);
      setClasses(data.classes ?? []);
    } catch (e) {
      // Antes da migration de turmas a rota pode falhar: trata como "sem turmas".
      setClasses([]);
      setError(e instanceof Error ? e.message : 'Erro ao carregar turmas.');
    } finally {
      setLoading(false);
    }
  }, [slug, includeArchived, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { classes, loading, error, reload };
}

/** Corpo para o backend: lista vazia = todas as turmas (null). */
export function visibleClassIdsPayload(ids: string[]): string[] | null {
  return ids.length ? ids : null;
}
