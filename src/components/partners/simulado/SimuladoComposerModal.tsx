'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, Loader2, Plus, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { CUSTOM_SUBJECTS } from '@/lib/simuladoSubjects'

export interface SimuladoComposition {
  id: string
  subject: string
  topic: string | null
  qty: number
  includeAnswered: boolean
}

interface Topic { name: string; count: number }

interface SimuladoComposerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCompositions: SimuladoComposition[]
  onSave: (compositions: SimuladoComposition[]) => void
  apiUrl: string
  accessToken: string | null
  bank: string
  year: string
  difficultyLabel: string | null
  brandTextColor: string
}

const QTY_PRESETS = [5, 10, 15, 30, 45, 90, 180]
const BUILDER_SUBJECTS = CUSTOM_SUBJECTS.filter((s) => s.value !== 'Todas')
const SIMULADO_MAX_QTY = 180

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `comp-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function compositionLabel(c: Pick<SimuladoComposition, 'subject' | 'topic'>) {
  return c.topic ? `${c.subject} · ${c.topic}` : c.subject
}

export function SimuladoComposerModal({
  open, onOpenChange, initialCompositions, onSave,
  apiUrl, accessToken, bank, year, difficultyLabel, brandTextColor,
}: SimuladoComposerModalProps) {
  const [draft, setDraft] = useState<SimuladoComposition[]>(initialCompositions)
  const [mode, setMode] = useState<'grid' | 'builder'>('grid')

  // Builder fields
  const [builderSubject, setBuilderSubject] = useState('')
  const [builderTopic, setBuilderTopic] = useState<string | null>(null)
  const [includeAnswered, setIncludeAnswered] = useState(false)
  const [qty, setQty] = useState(10)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [availableCount, setAvailableCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)

  const resetBuilder = () => {
    setBuilderSubject('')
    setBuilderTopic(null)
    setIncludeAnswered(false)
    setQty(10)
    setTopics([])
    setAvailableCount(null)
  }

  useEffect(() => {
    if (!open) return
    setDraft(initialCompositions)
    setMode('grid')
    resetBuilder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // ── Fetch topics for the chosen subject (cascata) ──
  useEffect(() => {
    if (!open || mode !== 'builder' || !builderSubject) { setTopics([]); return }
    const controller = new AbortController()
    const fetchTopics = async () => {
      setLoadingTopics(true)
      try {
        const params = new URLSearchParams({ subject: builderSubject })
        if (bank !== 'Todas') params.append('bank', bank)
        const res = await fetch(`${apiUrl}/api/questions/topics?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) { setTopics([]); return }
        const data = await res.json()
        setTopics(Array.isArray(data) ? data : [])
      } catch {
        if (!controller.signal.aborted) setTopics([])
      } finally {
        if (!controller.signal.aborted) setLoadingTopics(false)
      }
    }
    fetchTopics()
    return () => controller.abort()
  }, [open, mode, builderSubject, bank, apiUrl])

  // ── Fetch live availability count for subject + topic + global filters ──
  useEffect(() => {
    if (!open || mode !== 'builder' || !builderSubject || !accessToken) { setAvailableCount(null); return }
    const controller = new AbortController()
    const fetchCount = async () => {
      setLoadingCount(true)
      try {
        const params = new URLSearchParams({
          page: '1', limit: '1', tab: includeAnswered ? 'all' : 'todo', subject: builderSubject,
        })
        if (builderTopic) params.append('topic', builderTopic)
        if (bank !== 'Todas') params.append('bank', bank)
        if (year !== 'Todos') params.append('year', year)
        if (difficultyLabel) params.append('difficulty', difficultyLabel)

        const res = await fetch(`/api/proxy/questions/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })
        if (!res.ok) { setAvailableCount(null); return }
        const data = await res.json()
        setAvailableCount(typeof data?.total === 'number' ? data.total : null)
      } catch {
        if (!controller.signal.aborted) setAvailableCount(null)
      } finally {
        if (!controller.signal.aborted) setLoadingCount(false)
      }
    }
    fetchCount()
    return () => controller.abort()
  }, [open, mode, builderSubject, builderTopic, includeAnswered, bank, year, difficultyLabel, accessToken])

  const openBuilder = () => { resetBuilder(); setMode('builder') }

  const removeComposition = (id: string) => setDraft((prev) => prev.filter((c) => c.id !== id))

  const saveComposition = (overrideQty?: number) => {
    if (!builderSubject) return
    const finalQty = Math.max(1, overrideQty ?? qty)
    setDraft((prev) => [...prev, {
      id: generateId(), subject: builderSubject, topic: builderTopic, qty: finalQty, includeAnswered,
    }])
    setMode('grid')
  }

  const totalDraftQty = useMemo(() => draft.reduce((sum, c) => sum + c.qty, 0), [draft])
  const remainingBudget = Math.max(0, SIMULADO_MAX_QTY - totalDraftQty)
  const effectiveMax = availableCount != null ? Math.min(availableCount, remainingBudget) : remainingBudget
  const qtyCapped = Math.min(qty, Math.max(1, effectiveMax))

  const addAll = () => {
    if (effectiveMax <= 0) return
    saveComposition(effectiveMax)
  }

  // Nunca deixa a quantidade escolhida passar do que está disponível nem do limite
  // de 180 questões por simulado (somando todas as composições já adicionadas).
  useEffect(() => {
    setQty((prev) => (prev > effectiveMax ? Math.max(1, effectiveMax) : prev))
  }, [effectiveMax])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 dark:border-slate-800 dark:bg-slate-900 sm:h-[92dvh] sm:max-w-2xl sm:rounded-2xl">
        {mode === 'grid' ? (
          <>
            <DialogHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <DialogTitle className="dark:text-slate-100">Personalizar Matérias</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Combine matérias e assuntos específicos no mesmo simulado.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {draft.map((c) => (
                <div key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-sm text-slate-900 dark:text-slate-100">{compositionLabel(c)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.qty} questões{c.includeAnswered ? ' · inclui já respondidas' : ''}
                    </p>
                  </div>
                  <button onClick={() => removeComposition(c.id)}
                    aria-label={`Remover ${compositionLabel(c)}`}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
              ))}

              {remainingBudget > 0 ? (
                <button onClick={openBuilder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-4 text-sm font-bold text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <Plus size={16} /> Adicionar matéria
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  Limite de {SIMULADO_MAX_QTY} questões por simulado atingido. Remova alguma composição pra adicionar outra.
                </p>
              )}

              {draft.length === 0 && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 pt-2">
                  Nenhuma composição adicionada ainda. Sem composições, o simulado usa &quot;Todas as Matérias&quot;.
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:gap-2">
              <button onClick={() => onOpenChange(false)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                Cancelar
              </button>
              <button onClick={() => { onSave(draft); onOpenChange(false) }}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all cursor-pointer"
                style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                Concluir{draft.length > 0 ? ` · ${totalDraftQty} questões` : ''}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <button onClick={() => setMode('grid')}
                className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                <ChevronLeft size={14} /> Voltar
              </button>
              <DialogTitle className="dark:text-slate-100">Nova composição</DialogTitle>
              <DialogDescription className="dark:text-slate-400">Escolha a matéria e, se quiser, um assunto específico.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Matéria</label>
                <div className="relative">
                  <select
                    className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 focus:ring-2 font-semibold text-slate-700 dark:text-slate-200 appearance-none pr-10 cursor-pointer outline-none"
                    style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                    value={builderSubject}
                    onChange={(e) => { setBuilderSubject(e.target.value); setBuilderTopic(null) }}
                  >
                    <option value="" disabled>Selecione uma matéria</option>
                    {BUILDER_SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>

              {builderSubject && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Assunto (opcional)</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 focus:ring-2 font-semibold text-slate-700 dark:text-slate-200 appearance-none pr-10 cursor-pointer outline-none disabled:opacity-60"
                      style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      value={builderTopic ?? ''}
                      disabled={loadingTopics}
                      onChange={(e) => setBuilderTopic(e.target.value || null)}
                    >
                      <option value="">Todos os assuntos</option>
                      {topics.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              )}

              {builderSubject && (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Incluir questões já respondidas</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Desligado: só entram questões que você ainda não respondeu.</p>
                    </div>
                    <Switch checked={includeAnswered} onCheckedChange={setIncludeAnswered}
                      aria-label="Incluir questões já respondidas"
                      style={{ ['--switch-checked' as string]: 'var(--brand-primary)' }} />
                  </div>

                  {loadingCount ? (
                    <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Loader2 size={12} className="animate-spin" /> Verificando questões disponíveis...
                    </p>
                  ) : availableCount == null && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">Não foi possível verificar a disponibilidade.</p>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quantidade</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {QTY_PRESETS.map((val) => {
                        const disabled = val > effectiveMax
                        return (
                          <button key={val} disabled={disabled} onClick={() => setQty(val)}
                            className={`p-2.5 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${qtyCapped === val ? 'text-white border-transparent' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 border-slate-200 dark:border-slate-700'}`}
                            style={qtyCapped === val ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' } : {}}>
                            {val}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ou digite:</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={effectiveMax}
                        value={qtyCapped}
                        disabled={availableCount == null || effectiveMax <= 0}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10)
                          if (Number.isNaN(raw)) { setQty(1); return }
                          setQty(Math.min(Math.max(raw, 1), effectiveMax))
                        }}
                        className="w-24 rounded-xl border border-slate-200 bg-white p-2 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      />
                      <span className="text-xs text-slate-400 dark:text-slate-500">Max: {effectiveMax}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:gap-2">
              <button onClick={() => setMode('grid')}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                Cancelar
              </button>
              <button onClick={addAll} disabled={!builderSubject || availableCount == null || effectiveMax <= 0}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                Adicionar todas{effectiveMax > 0 ? ` (${effectiveMax})` : ''}
              </button>
              <button onClick={() => saveComposition()} disabled={!builderSubject || availableCount == null || effectiveMax <= 0}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'var(--brand-primary)', color: brandTextColor }}>
                Salvar composição
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
