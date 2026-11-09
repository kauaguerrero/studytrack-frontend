'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Minus, Plus, Search, X } from 'lucide-react'
import { CUSTOM_SUBJECTS } from '@/lib/simuladoSubjects'
import { Switch } from '@/components/ui/switch'
import {
  type AvailabilityBySlot, type Composicao, type SubjectComposicao,
  composicaoDistinctSubjects, composicaoDistinctTopics,
  composicaoSlotId, composicaoTotalQty, clampSlotQty, redistributeQty, remainingBudget,
} from '@/lib/simuladoComposicao'

interface Topic { name: string; count: number }
interface SubjectOption { value: string; label: string }

interface MateriasComposicaoStepProps {
  apiUrl: string
  accessToken: string | null
  bank: string
  year: string
  difficultyLabel: string | null
  qty: number
  composicao: Composicao
  setComposicao: (c: Composicao) => void
  includeAnswered: boolean
  setIncludeAnswered: (v: boolean) => void
  // Catálogo injetado (ex.: concurso, cujo catálogo de matérias/assuntos já
  // vem todo pré-carregado via facets, escopado por banca/cargo) — quando
  // fornecido, substitui o catálogo fixo de vestibular (CUSTOM_SUBJECTS) e
  // desliga os fetches internos (lazy por matéria + disponibilidade), já
  // que não há nada a buscar: tudo já está em memória.
  subjects?: SubjectOption[]
  topicsBySubject?: Record<string, Topic[]>
  // Teto real de disponibilidade por slot (subject ou subject::topic), já
  // conhecido de antemão (ex.: concurso, vindo do `count` das facets) — só
  // faz sentido junto com `topicsBySubject` injetado. Sem catálogo injetado,
  // a disponibilidade é sempre buscada internamente (vestibular).
  availabilityBySlot?: AvailabilityBySlot
}

const VESTIBULAR_SUBJECTS = CUSTOM_SUBJECTS.filter((s) => s.value !== 'Todas')

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function MateriasComposicaoStep({
  apiUrl, accessToken, bank, year, difficultyLabel, qty, composicao, setComposicao, includeAnswered, setIncludeAnswered,
  subjects: subjectsProp, topicsBySubject: topicsBySubjectProp, availabilityBySlot: availabilityBySlotProp,
}: MateriasComposicaoStepProps) {
  const isCatalogInjected = topicsBySubjectProp !== undefined
  const SUBJECTS = subjectsProp ?? VESTIBULAR_SUBJECTS
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fetchedTopicsBySubject, setFetchedTopicsBySubject] = useState<Record<string, Topic[]>>({})
  const [loadingSubjects, setLoadingSubjects] = useState<Set<string>>(new Set())
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [availability, setAvailability] = useState<Record<string, number | null>>({})
  const topicsBySubject = topicsBySubjectProp ?? fetchedTopicsBySubject

  useEffect(() => {
    if (isCatalogInjected || !expanded || fetchedTopicsBySubject[expanded]) return
    const controller = new AbortController()
    const fetchTopics = async () => {
      setLoadingSubjects((prev) => new Set(prev).add(expanded))
      const params = new URLSearchParams({ subject: expanded })
      if (bank !== 'Todas') params.append('bank', bank)
      try {
        const res = await fetch(`${apiUrl}/api/questions/topics?${params.toString()}`, { signal: controller.signal })
        const data = res.ok ? await res.json() : []
        setFetchedTopicsBySubject((prev) => ({ ...prev, [expanded]: Array.isArray(data) ? data : [] }))
      } catch {
        if (!controller.signal.aborted) setFetchedTopicsBySubject((prev) => ({ ...prev, [expanded]: [] }))
      } finally {
        if (!controller.signal.aborted) setLoadingSubjects((prev) => { const next = new Set(prev); next.delete(expanded); return next })
      }
    }
    fetchTopics()
    return () => controller.abort()
  }, [isCatalogInjected, expanded, bank, apiUrl, fetchedTopicsBySubject])

  // Filtros que mudam o universo de questões (banca/ano/dificuldade/já
  // respondidas) invalidam qualquer disponibilidade já em cache — a chave do
  // cache já inclui esses filtros, então trocar um deles naturalmente busca
  // de novo em vez de reaproveitar um teto errado de outro filtro.
  const availabilityFilterKey = `${bank}|${year}|${difficultyLabel ?? ''}|${includeAnswered}`

  useEffect(() => {
    if (isCatalogInjected || !accessToken) return
    const controller = new AbortController()
    const slots = composicao.flatMap((s) => (
      s.mode === 'all'
        ? [{ id: composicaoSlotId(s.subject), subject: s.subject, topic: null as string | null }]
        : s.topics.map((t) => ({ id: composicaoSlotId(s.subject, t.topic), subject: s.subject, topic: t.topic as string | null }))
    ))
    slots.forEach((slot) => {
      const cacheKey = `${availabilityFilterKey}::${slot.id}`
      if (cacheKey in availability) return
      ;(async () => {
        try {
          const params = new URLSearchParams({ page: '1', limit: '1', tab: includeAnswered ? 'all' : 'todo', subject: slot.subject })
          if (slot.topic) params.append('topic', slot.topic)
          if (bank !== 'Todas') params.append('bank', bank)
          if (year !== 'Todos') params.append('year', year)
          if (difficultyLabel) params.append('difficulty', difficultyLabel)
          const res = await fetch(`/api/proxy/questions/?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
          })
          const data = res.ok ? await res.json() : null
          const total = typeof data?.total === 'number' ? data.total : null
          if (!controller.signal.aborted) setAvailability((prev) => ({ ...prev, [cacheKey]: total }))
        } catch {
          if (!controller.signal.aborted) setAvailability((prev) => ({ ...prev, [cacheKey]: null }))
        }
      })()
    })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCatalogInjected, composicao, accessToken, bank, year, difficultyLabel, includeAnswered, availabilityFilterKey])

  const effectiveAvailability: AvailabilityBySlot = isCatalogInjected
    ? (availabilityBySlotProp ?? {})
    : Object.fromEntries(
      Object.entries(availability)
        .filter((entry): entry is [string, number] => entry[0].startsWith(`${availabilityFilterKey}::`) && typeof entry[1] === 'number')
        .map(([key, value]) => [key.slice(availabilityFilterKey.length + 2), value]),
    )

  // Quando a disponibilidade real de um slot chega (vestibular, busca
  // assíncrona) e é menor do que a auto-distribuição já tinha atribuído a
  // ele, refaz a distribuição respeitando o teto — sem isso, o sistema
  // podia "prometer" mais questões de um assunto do que o banco realmente
  // tem, e o erro só aparecia na hora de iniciar o simulado.
  useEffect(() => {
    if (Object.keys(effectiveAvailability).length === 0) return
    const overCap = composicao.some((s) => {
      if (s.mode === 'all') {
        const id = composicaoSlotId(s.subject)
        return !touched.has(id) && effectiveAvailability[id] !== undefined && s.qty > effectiveAvailability[id]
      }
      return s.topics.some((t) => {
        const id = composicaoSlotId(s.subject, t.topic)
        return !touched.has(id) && effectiveAvailability[id] !== undefined && t.qty > effectiveAvailability[id]
      })
    })
    if (overCap) setComposicao(redistributeQty(composicao, qty, touched, effectiveAvailability))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAvailability])

  const filteredSubjects = useMemo(() => {
    if (!query.trim()) return SUBJECTS
    const q = normalize(query)
    return SUBJECTS.filter((s) => {
      if (normalize(s.label).includes(q)) return true
      const topics = topicsBySubject[s.value]
      return topics?.some((t) => normalize(t.name).includes(q)) ?? false
    })
  }, [query, topicsBySubject, SUBJECTS])

  const distributed = composicaoTotalQty(composicao)
  const remaining = remainingBudget(composicao, qty)
  const selectedSubjectCount = composicaoDistinctSubjects(composicao)
  // Modo "all" é um pool sem detalhamento por assunto (um único número, o
  // stepper da matéria) — só conta pra "assuntos" quem foi destacado
  // individualmente (modo "topics", com stepper próprio). Contar o catálogo
  // inteiro de uma matéria em pool não faz sentido: uma matéria com 5
  // questões não pode "ter" 14 assuntos selecionados.
  const selectedTopicCount = composicaoDistinctTopics(composicao)

  function toggleSubject(subject: string) {
    const exists = composicao.some((s) => s.subject === subject)
    let next: Composicao
    if (exists) {
      next = composicao.filter((s) => s.subject !== subject)
      setTouched((prev) => { const t = new Set(prev); t.delete(composicaoSlotId(subject)); return t })
    } else {
      next = [...composicao, { subject, mode: 'all', qty: 0, topics: [] } as SubjectComposicao]
      setExpanded(subject)
    }
    setComposicao(redistributeQty(next, qty, touched, effectiveAvailability))
  }

  // Modo "all" (padrão ao marcar a matéria) não marca nenhum assunto
  // individualmente — representa o pool da matéria inteira, controlado só
  // pelo stepper da matéria. Marcar um assunto específico tira a matéria do
  // modo "all" e passa a tratar como seleção explícita (cada assunto com sua
  // própria quota); desmarcar o último assunto explícito remove a matéria da
  // composição em vez de deixar uma entrada vazia.
  function toggleTopic(subject: string, topicName: string) {
    const current = composicao.find((s) => s.subject === subject)
    const allTopicNames = (topicsBySubject[subject] ?? []).map((t) => t.name)
    const currentlyChecked = !current || current.mode === 'all' ? [] : current.topics.map((t) => t.topic)
    const nextChecked = currentlyChecked.includes(topicName)
      ? currentlyChecked.filter((n) => n !== topicName)
      : [...currentlyChecked, topicName]

    const removedTopics = currentlyChecked.filter((n) => !nextChecked.includes(n))
    let touchedNext = touched
    if (removedTopics.length > 0) {
      touchedNext = new Set(touched)
      removedTopics.forEach((t) => touchedNext.delete(composicaoSlotId(subject, t)))
    }

    if (nextChecked.length === 0) {
      const next = composicao.filter((s) => s.subject !== subject)
      touchedNext = new Set(touchedNext)
      touchedNext.delete(composicaoSlotId(subject))
      setTouched(touchedNext)
      setComposicao(redistributeQty(next, qty, touchedNext, effectiveAvailability))
      return
    }

    const nextEntry: SubjectComposicao = nextChecked.length === allTopicNames.length
      ? { subject, mode: 'all', qty: 0, topics: [] }
      : { subject, mode: 'topics', qty: 0, topics: nextChecked.map((t) => ({ topic: t, qty: 0 })) }

    const next = composicao.some((s) => s.subject === subject)
      ? composicao.map((s) => (s.subject === subject ? nextEntry : s))
      : [...composicao, nextEntry]

    if (touchedNext !== touched) setTouched(touchedNext)
    setComposicao(redistributeQty(next, qty, touchedNext, effectiveAvailability))
  }

  function onStepperChange(id: string, delta: number) {
    const current = flatQtyOf(composicao, id)
    const next = clampSlotQty(composicao, id, current + delta, qty, effectiveAvailability)
    setTouched((prev) => new Set(prev).add(id))
    setComposicao(next)
  }

  function clearSelection() {
    setComposicao([])
    setTouched(new Set())
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Escolha matérias, assuntos e quantidades</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Selecione as matérias e assuntos; o sistema distribui as questões automaticamente e você pode ajustar.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
        <p className="text-sm font-extrabold" style={{ color: 'var(--brand-primary)' }}>
          {distributed} / {qty} questões distribuídas
        </p>
        {distributed < qty && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Faltam {qty - distributed} {qty - distributed === 1 ? 'questão' : 'questões'} — aumente algum assunto ou selecione mais um.
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar matéria ou assunto..."
          aria-label="Buscar matéria ou assunto"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {selectedSubjectCount} {selectedSubjectCount === 1 ? 'matéria' : 'matérias'}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {selectedTopicCount} {selectedTopicCount === 1 ? 'assunto' : 'assuntos'}
        </span>
        {selectedSubjectCount > 0 && (
          <button type="button" onClick={clearSelection} className="ml-auto text-xs font-semibold text-slate-500 underline-offset-4 hover:underline dark:text-slate-400">
            Limpar seleção
          </button>
        )}
      </div>

      <div className="space-y-2">
        {filteredSubjects.map((subject) => {
          const entry = composicao.find((s) => s.subject === subject.value)
          const isSelected = !!entry
          const isExpanded = expanded === subject.value
          const topics = topicsBySubject[subject.value]
          return (
            <div key={subject.value} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSubject(subject.value)}
                  aria-label={subject.label}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : subject.value)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{subject.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isSelected && entry?.mode === 'topics' && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {entry.topics.length} selecionado(s)
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {isSelected && entry?.mode === 'all' && (
                  <Stepper
                    qty={entry.qty}
                    onDecrement={() => onStepperChange(composicaoSlotId(subject.value), -1)}
                    onIncrement={() => onStepperChange(composicaoSlotId(subject.value), 1)}
                    remaining={remaining}
                    availableCap={effectiveAvailability[composicaoSlotId(subject.value)]}
                    disableDecrement={entry.qty === 0}
                  />
                )}
              </div>
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  {loadingSubjects.has(subject.value) ? (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando assuntos...
                    </p>
                  ) : topics && topics.length > 0 ? (
                    <div className="space-y-1.5">
                      {isSelected && entry?.mode === 'all' && (
                        <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">
                          Toda a matéria está incluída. Marque um assunto específico para restringir a composição.
                        </p>
                      )}
                      {topics.map((topic) => {
                        const checked = isSelected && entry?.mode === 'topics' && entry.topics.some((t) => t.topic === topic.name)
                        const topicQty = entry?.mode === 'topics' ? entry.topics.find((t) => t.topic === topic.name)?.qty ?? 0 : 0
                        return (
                          <div key={topic.name} className="flex items-center gap-2">
                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => { if (!isSelected) toggleSubject(subject.value); toggleTopic(subject.value, topic.name) }}
                                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
                              />
                              <span className="truncate">{topic.name}</span>
                            </label>
                            {checked && entry?.mode === 'topics' && (
                              <Stepper
                                qty={topicQty}
                                onDecrement={() => onStepperChange(composicaoSlotId(subject.value, topic.name), -1)}
                                onIncrement={() => onStepperChange(composicaoSlotId(subject.value, topic.name), 1)}
                                remaining={remaining}
                                availableCap={effectiveAvailability[composicaoSlotId(subject.value, topic.name)]}
                                disableDecrement={topicQty === 0}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum assunto específico catalogado para esta matéria.</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
    </div>
  )
}

function flatQtyOf(c: Composicao, id: string): number {
  for (const s of c) {
    if (s.mode === 'all') {
      if (composicaoSlotId(s.subject) === id) return s.qty
    } else {
      const found = s.topics.find((t) => composicaoSlotId(s.subject, t.topic) === id)
      if (found) return found.qty
    }
  }
  return 0
}

function Stepper({
  qty, onDecrement, onIncrement, remaining, availableCap, disableDecrement,
}: { qty: number; onDecrement: () => void; onIncrement: () => void; remaining: number; availableCap?: number; disableDecrement: boolean }) {
  const atCap = availableCap !== undefined && qty >= availableCap
  const disableIncrement = remaining === 0 || atCap
  return (
    <div className="flex shrink-0 flex-col items-end gap-0.5">
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700">
        <button
          type="button"
          onClick={onDecrement}
          disabled={disableDecrement}
          aria-label="Diminuir quantidade"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm font-bold text-slate-800 dark:text-slate-100">{qty}</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={disableIncrement}
          aria-label="Aumentar quantidade"
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <Plus size={14} />
        </button>
      </div>
      {availableCap !== undefined && (
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {availableCap} dispon{availableCap === 1 ? 'ível' : 'íveis'}
        </span>
      )}
    </div>
  )
}
