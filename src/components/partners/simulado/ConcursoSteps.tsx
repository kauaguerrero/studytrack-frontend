'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export type ConcursoFacet = { bank: string | null; role: string | null; subject: string | null; discipline: string | null; count?: number }

// Catálogo de bancas/cargos/matérias/assuntos de concurso, usado pelo wizard
// de Novo Simulado (tanto no modo Personalizado, que monta a composição a
// partir dele, quanto no modo Blocos por banca, que só precisa da lista de
// bancas/cargos disponíveis).
export function useConcursoFacets(slug: string) {
  const [facets, setFacets] = useState<ConcursoFacet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const fetchFacets = async () => {
      setLoading(true)
      setError(false)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const res = await fetch('/api/proxy/questions/facets?question_type=concurso', {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
          signal: controller.signal,
        })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setFacets(data.data || [])
      } catch {
        if (!controller.signal.aborted) { setError(true); toast.error('Não foi possível carregar o catálogo de concursos.') }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    fetchFacets()
    return () => controller.abort()
  }, [slug, attempt])

  return { facets, loading, error, retry: () => setAttempt((n) => n + 1) }
}
