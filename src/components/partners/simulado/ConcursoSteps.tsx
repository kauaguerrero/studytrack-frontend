'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { ContestQuota } from '@/app/partners/[slug]/simulados/ContestQuotaBuilder'
import { Switch } from '@/components/ui/switch'

export type ConcursoFacet = { bank: string | null; role: string | null; subject: string | null; discipline: string | null; count?: number }

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

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

interface ConcursoStepSharedProps {
  bank: string
  setBank: (bank: string) => void
  role: string
  setRole: (role: string) => void
  rows: ContestQuota[]
  setRows: (rows: ContestQuota[]) => void
  facets: ConcursoFacet[]
  catalogLoading: boolean
  catalogError: boolean
  onRetryCatalog: () => void
}

function availableFor(facets: ConcursoFacet[], bank: string, role: string, row: ContestQuota): number {
  const current = facets.filter((f) => (!bank || f.bank === bank) && (!role || f.role === role))
  return current
    .filter((f) => f.subject && row.subjects.includes(f.subject) && (!(row.topics || []).length || Boolean(f.discipline && row.topics?.includes(f.discipline))))
    .reduce((sum, f) => sum + (f.count ?? 1), 0)
}

interface ConcursoConfigStepProps extends ConcursoStepSharedProps {
  includeAnswered: boolean
  setIncludeAnswered: (value: boolean) => void
}

export function ConcursoConfigStep({
  bank, setBank, role, setRole, rows, setRows, facets, catalogLoading, catalogError, onRetryCatalog,
  includeAnswered, setIncludeAnswered,
}: ConcursoConfigStepProps) {
  const current = facets.filter((f) => (!bank || f.bank === bank) && (!role || f.role === role))
  const subjects = unique(current.map((f) => f.subject))

  function update(index: number, value: Partial<ContestQuota>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...value } : r)))
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Simulado de concurso</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Configure o concurso, organize os grupos de disciplinas e defina a quantidade de questões.</p>
      </div>

      {catalogLoading && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Carregando bancas e matérias disponíveis...</p>}
      {catalogError && (
        <div role="alert" className="rounded-xl border border-amber-300 p-3 text-sm text-amber-800 dark:text-amber-300">
          Não foi possível carregar as opções. <button type="button" onClick={onRetryCatalog} className="font-bold underline">Tentar novamente</button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banca</label>
          <select
            aria-label="Banca"
            value={bank}
            onChange={(e) => { setBank(e.target.value); setRole(''); setRows([{ subjects: [], topic: '', qty: 10 }]) }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Selecione a banca</option>
            {unique(facets.map((f) => f.bank)).map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cargo</label>
          <select
            aria-label="Cargo"
            value={role}
            onChange={(e) => { setRole(e.target.value); setRows([{ subjects: [], topic: '', qty: 10 }]) }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Todos os cargos</option>
            {unique(facets.filter((f) => !bank || f.bank === bank).map((f) => f.role)).map((v) => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Incluir questões já respondidas</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Desligado: só entram questões que você ainda não respondeu.</p>
        </div>
        <Switch
          checked={includeAnswered}
          onCheckedChange={setIncludeAnswered}
          aria-label="Incluir questões já respondidas"
          style={{ ['--switch-checked' as string]: 'var(--brand-primary)' }}
        />
      </div>

      {rows.map((row, index) => (
        <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <strong className="text-sm text-slate-900 dark:text-slate-100">Grupo {index + 1}</strong>
            {rows.length > 1 && (
              <button type="button" onClick={() => setRows(rows.filter((_, i) => i !== index))} className="flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                <Trash2 size={13} /> Remover
              </button>
            )}
          </div>
          {!bank && <p className="text-sm text-slate-500 dark:text-slate-400">Selecione uma banca para ver as disciplinas disponíveis.</p>}
          {bank && subjects.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma disciplina disponível para esta seleção.</p>}
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <label key={subject} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 has-[:checked]:border-[var(--brand-primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] dark:border-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={row.subjects.includes(subject)}
                  onChange={(e) => update(index, { subjects: e.target.checked ? [...row.subjects, subject] : row.subjects.filter((s) => s !== subject), topic: '', topics: [] })}
                  className="accent-[var(--brand-primary)]"
                />
                {subject}
              </label>
            ))}
          </div>
          {row.subjects.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Disponíveis neste grupo: {availableFor(facets, bank, role, row)}.</p>
          )}
          <div className="flex items-center gap-3">
            <label htmlFor={`quota-${index}`} className="text-sm text-slate-600 dark:text-slate-300">Quantidade de questões</label>
            <input
              id={`quota-${index}`}
              aria-label={`Quantidade do grupo ${index + 1}`}
              type="number"
              min={1}
              max={180}
              value={row.qty}
              onChange={(e) => update(index, { qty: Number(e.target.value) })}
              className="w-24 rounded-xl border border-slate-200 p-2 text-center text-sm font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows([...rows, { subjects: [], topic: '', qty: 10 }])}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-3 text-sm font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
      >
        <Plus size={16} /> Adicionar grupo
      </button>
    </div>
  )
}

export function ConcursoTemasStep({ bank, role, rows, setRows, facets }: ConcursoStepSharedProps) {
  const current = facets.filter((f) => (!bank || f.bank === bank) && (!role || f.role === role))

  function update(index: number, value: Partial<ContestQuota>) {
    setRows(rows.map((r, i) => (i === index ? { ...r, ...value } : r)))
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Disciplinas e temas do concurso</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Refine a seleção escolhendo, por disciplina, os temas do edital (opcional).</p>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="space-y-2 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <strong className="text-sm text-slate-900 dark:text-slate-100">Grupo {index + 1} <span className="font-normal text-slate-500 dark:text-slate-400">· {row.subjects.join(', ') || 'sem disciplinas'}</span></strong>
          {row.subjects.length === 1 ? (
            <div>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Temas de {row.subjects[0]} (sem seleção: todos)</p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {unique(current.filter((f) => f.subject === row.subjects[0]).map((f) => f.discipline)).map((topic) => (
                  <label key={topic} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 has-[:checked]:border-[var(--brand-primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] dark:border-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={(row.topics || []).includes(topic)}
                      onChange={(e) => update(index, { topics: e.target.checked ? [...(row.topics || []), topic] : (row.topics || []).filter((t) => t !== topic) })}
                      className="accent-[var(--brand-primary)]"
                    />
                    {topic}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Refino por tema só está disponível para grupos com uma única disciplina.
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export function ConcursoResumoStep({ bank, role, rows, facets }: ConcursoStepSharedProps) {
  const totalConfigured = rows.reduce((sum, r) => sum + (Number.isFinite(r.qty) ? r.qty : 0), 0)
  const current = facets.filter((f) => (!bank || f.bank === bank) && (!role || f.role === role))
  const overQuota = rows.filter((row) => row.qty > availableFor(facets, bank, role, row))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Resumo do simulado de concurso</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Confira as configurações e a distribuição de questões antes de continuar.</p>
      </div>

      {overQuota.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          A quantidade de alguns grupos supera a disponibilidade real de questões. Volte à etapa anterior e ajuste.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Disciplinas</th>
              <th className="px-3 py-2 text-right">Questões</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="px-3 py-2 font-semibold text-slate-800 dark:text-slate-200">Grupo {index + 1}</td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{row.subjects.join(', ') || '—'}</td>
                <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200">{row.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl p-4 text-center" style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total de questões</p>
        <p className="text-3xl font-extrabold" style={{ color: 'var(--brand-primary)' }}>{totalConfigured}</p>
      </div>
      {current.length === 0 && bank && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Catálogo de disciplinas não carregado — a validação de disponibilidade pode estar incompleta.</p>
      )}
    </div>
  )
}
