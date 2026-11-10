'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export type FounderConcursoFacet = { bank: string | null; role: string | null; subject: string | null; discipline: string | null; count?: number };

// Catálogo de bancas/cargos/matérias/assuntos de concurso, do lado do founder
// (`/api/partners/{slug}/assessment/questions/facets`, autenticado como o
// próprio founder) — usado por qualquer tela de criação de simulado que
// precise montar um seletor de banca/cargo de concurso (NovoSimuladoAleatorioWizard,
// ContestQuotaBuilder). Não confundir com o `useConcursoFacets` do aluno
// (ConcursoSteps.tsx), que bate no proxy `/api/proxy/questions/facets`.
export function useFounderConcursoFacets(slug: string, enabled = true) {
  const [facets, setFacets] = useState<FounderConcursoFacet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    // `enabled=false` é usado quando o módulo de concurso não está ativo
    // pra essa org, ou o founder ainda nem escolheu "Concurso" — chamar o
    // endpoint ali dá 403 (permissão `concursos_enabled`) e mostra um toast
    // de erro sem motivo nenhum pro founder ver. Não chama setState aqui:
    // o `loading` exposto já é derivado de `enabled` no retorno do hook.
    if (!enabled) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError(false);
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/facets?question_type=concurso`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFacets(data.data || []);
      } catch {
        if (!controller.signal.aborted) { setError(true); toast.error('Não foi possível carregar o catálogo de concursos.'); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [api, slug, attempt, enabled]);

  return { facets, loading: enabled && loading, error, retry: () => setAttempt((n) => n + 1) };
}
