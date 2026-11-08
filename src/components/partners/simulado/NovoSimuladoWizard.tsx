'use client'

import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, ChevronDown, Clock, GraduationCap, Layers,
  Navigation, Play, Shield, SlidersHorizontal, Target,
} from 'lucide-react'
import type { ContestQuota } from '@/app/partners/[slug]/simulados/ContestQuotaBuilder'
import { WizardStepper, type WizardStepperStep } from '@/components/partners/simulado/WizardStepper'
import { WizardSidebar } from '@/components/partners/simulado/WizardSidebar'
import { MateriasComposicaoStep } from '@/components/partners/simulado/MateriasComposicaoStep'
import {
  ConcursoConfigStep, ConcursoResumoStep, ConcursoTemasStep, useConcursoFacets,
} from '@/components/partners/simulado/ConcursoSteps'
import {
  type Composicao, composicaoDistinctSubjects, composicaoDistinctTopics, composicaoTotalQty,
} from '@/lib/simuladoComposicao'

type PresetBank = 'ENEM' | 'UFU' | 'UEG' | 'UFG' | 'UNESP'
const PRESET_BANKS: readonly PresetBank[] = ['ENEM', 'UFU', 'UEG', 'UFG', 'UNESP']
const SIMULADO_MAX_QTY = 180
const QTY_PRESETS = [10, 15, 30, 45, 90, 180]

const GLOBAL_STEPS: WizardStepperStep[] = [
  { key: 'formato', label: 'Formato' },
  { key: 'configuracao', label: 'Configuração' },
  { key: 'revisao', label: 'Revisão' },
]
const CONCURSO_LOCAL_STEPS: WizardStepperStep[] = [
  { key: 'concursoConfig', label: 'Configuração' },
  { key: 'concursoTemas', label: 'Disciplinas e temas' },
  { key: 'concursoResumo', label: 'Resumo' },
]
const CONFIG_LOCAL_STEPS: WizardStepperStep[] = [
  { key: 'configBanca', label: 'Banca' },
  { key: 'configQty', label: 'Quantidade' },
  { key: 'configAno', label: 'Ano' },
  { key: 'configDificuldade', label: 'Dificuldade' },
]

interface BankOption { value: string; label: string }
interface PresetFormatOption { value: string; label: string; emoji: string; qty: number }
interface DifficultyOption { value: string; label: string }
interface ConcursoSelection { bank: string; role: string; quotas: ContestQuota[]; includeAnswered: boolean }
type WizardStepKey =
  | 'formato' | 'configuracao' | 'configBanca' | 'configQty' | 'configAno' | 'configDificuldade' | 'materiasComposicao'
  | 'concursoConfig' | 'concursoTemas' | 'concursoResumo' | 'revisao'

export interface NovoSimuladoWizardProps {
  slug: string
  apiUrl: string
  concursosEnabled: boolean
  brandTextColor: string
  accessToken: string | null
  onClose: () => void

  // Navegação do wizard é controlada pelo componente pai (page.tsx) para
  // sobreviver a remounts e pra ser reaproveitável pelo fluxo de "refazer
  // simulado" (que já abre direto em 'configuracao').
  wizardStep: WizardStepKey
  setWizardStep: (step: WizardStepKey) => void
  simuladoFormat: 'vestibular' | 'concurso'
  setSimuladoFormat: (format: 'vestibular' | 'concurso') => void
  concursoSelection: ConcursoSelection | null
  setConcursoSelection: (selection: ConcursoSelection | null) => void

  mode: 'custom' | 'preset'
  setMode: (mode: 'custom' | 'preset') => void
  bank: string
  setBank: (bank: string) => void
  bankOptions: readonly BankOption[]
  year: string
  setYear: (year: string) => void
  years: string[]
  difficulty: string
  setDifficulty: (difficulty: string) => void
  difficulties: DifficultyOption[]
  qty: number
  setQty: (qty: number) => void
  composicao: Composicao
  setComposicao: (c: Composicao) => void
  includeAnswered: boolean
  setIncludeAnswered: (v: boolean) => void
  customEffectiveMax: number
  loadingCustomCount: boolean
  availableCustomCount: number | null

  presetBank: PresetBank
  setPresetBank: (bank: PresetBank) => void
  enemFormat: string
  setEnemFormat: (format: string) => void
  presetFormats: PresetFormatOption[]
  presetLanguage: string
  setPresetLanguage: (language: string) => void
  languagesForConfig: (config: Record<string, unknown> | undefined) => readonly string[]

  onResetFilters: () => void

  loading: boolean
  startStage: number
  startStages: string[]
  startSimulado: (scheduledId?: string, discardActive?: boolean, language?: string, contest?: ConcursoSelection) => void
}

export function NovoSimuladoWizard(props: NovoSimuladoWizardProps) {
  const {
    slug, apiUrl, concursosEnabled, brandTextColor, accessToken, onClose,
    wizardStep, setWizardStep, simuladoFormat, setSimuladoFormat,
    concursoSelection, setConcursoSelection,
    mode, setMode, bank, setBank, bankOptions, year, setYear, years,
    difficulty, setDifficulty, difficulties, qty, setQty,
    composicao, setComposicao, includeAnswered, setIncludeAnswered,
    customEffectiveMax,
    loadingCustomCount, availableCustomCount,
    presetBank, setPresetBank, enemFormat, setEnemFormat, presetFormats,
    presetLanguage, setPresetLanguage, languagesForConfig, onResetFilters,
    loading, startStage, startStages, startSimulado,
  } = props

  // ── Estado em construção do simulado de concurso — só vira `concursoSelection`
  // (em page.tsx) quando o usuário confirma o Resumo e segue pra Revisão.
  const [concursoBank, setConcursoBank] = useState('')
  const [concursoRole, setConcursoRole] = useState('')
  const [concursoRows, setConcursoRows] = useState<ContestQuota[]>([{ subjects: [], topic: '', qty: 10 }])
  const [concursoIncludeAnswered, setConcursoIncludeAnswered] = useState(false)
  const { facets: concursoFacets, loading: concursoCatalogLoading, error: concursoCatalogError, retry: retryConcursoCatalog } = useConcursoFacets(slug)
  const concursoHasOverQuota = concursoRows.some((row) => {
    const current = concursoFacets.filter((f) => (!concursoBank || f.bank === concursoBank) && (!concursoRole || f.role === concursoRole))
    const available = current.filter((f) => f.subject && row.subjects.includes(f.subject) && (!(row.topics || []).length || Boolean(f.discipline && row.topics?.includes(f.discipline)))).reduce((sum, f) => sum + (f.count ?? 1), 0)
    return row.qty > available
  })
  const concursoConfigValid = Boolean(concursoBank) && concursoRows.every((r) => r.subjects.length > 0 && Number.isInteger(r.qty) && r.qty > 0) && concursoRows.reduce((n, r) => n + r.qty, 0) <= SIMULADO_MAX_QTY

  const isConcursoLocalSubflow = wizardStep === 'concursoConfig' || wizardStep === 'concursoTemas' || wizardStep === 'concursoResumo'
  const isConfigLocalSubflow = wizardStep === 'configBanca' || wizardStep === 'configQty' || wizardStep === 'configAno' || wizardStep === 'configDificuldade'
  const isLocalSubflow = wizardStep === 'materiasComposicao' || isConcursoLocalSubflow || isConfigLocalSubflow
  const globalCurrentIndex = GLOBAL_STEPS.findIndex((s) => s.key === (isLocalSubflow ? 'configuracao' : wizardStep))
  const localCurrentIndex = isConcursoLocalSubflow
    ? (wizardStep === 'concursoConfig' ? 0 : wizardStep === 'concursoTemas' ? 1 : 2)
    : isConfigLocalSubflow
      ? (wizardStep === 'configBanca' ? 0 : wizardStep === 'configQty' ? 1 : wizardStep === 'configAno' ? 2 : 3)
      : 0

  function buildSummary(): { rows: { label: string; value: string }[]; total: number } {
    if (simuladoFormat === 'concurso') {
      const total = concursoRows.reduce((sum, q) => sum + (Number.isFinite(q.qty) ? q.qty : 0), 0)
      return {
        rows: [
          { label: 'Formato', value: 'Concurso Público' },
          { label: 'Banca', value: concursoBank || '—' },
          { label: 'Cargo', value: concursoRole || 'Todos os cargos' },
          { label: 'Grupos', value: String(concursoRows.length) },
        ],
        total,
      }
    }
    const rows = [
      { label: 'Formato', value: 'Vestibular / ENEM' },
      { label: 'Tipo', value: mode === 'custom' ? 'Personalizado' : 'Blocos por banca' },
    ]
    let total = 0
    if (mode === 'custom') {
      rows.push({ label: 'Banca', value: bankOptions.find((o) => o.value === bank)?.label ?? bank })
      rows.push({ label: 'Matérias', value: `${composicaoDistinctSubjects(composicao)} distintas` })
      const topicsCount = composicaoDistinctTopics(composicao)
      if (topicsCount > 0) rows.push({ label: 'Assuntos', value: String(topicsCount) })
      total = composicaoTotalQty(composicao)
    } else {
      rows.push({ label: 'Banca do bloco', value: presetBank })
      const format = presetFormats.find((f) => f.value === enemFormat)
      rows.push({ label: 'Área', value: format?.label ?? enemFormat })
      total = format?.qty ?? 0
    }
    rows.push({ label: 'Ano', value: year === 'Todos' ? 'Todos os anos' : year })
    rows.push({ label: 'Dificuldade', value: difficulties.find((d) => d.value === difficulty)?.label ?? difficulty })
    return { rows, total }
  }

  const { rows: summaryRows, total: summaryTotal } = buildSummary()
  const totalMinutes = summaryTotal * 3
  const durationLabel = `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}min`
  function handleFinalStart() {
    if (simuladoFormat === 'concurso' && concursoSelection) {
      startSimulado(undefined, false, undefined, concursoSelection)
    } else {
      startSimulado()
    }
  }

  function goBackFromRevisao() {
    if (simuladoFormat === 'concurso') { setWizardStep('concursoResumo'); return }
    if (mode === 'preset') { setWizardStep('configuracao'); return }
    setWizardStep('materiasComposicao')
  }

  return (
    <section className="relative min-h-screen -m-4 bg-slate-50 px-4 py-4 dark:bg-[#080808] md:-m-8 md:px-8 md:py-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="mx-auto flex max-w-5xl flex-col lg:min-h-0 lg:w-full lg:flex-1">
        <header className="mb-2 flex shrink-0 items-start gap-3">
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 lg:text-xl">
              <Target className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
              Novo Simulado
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 lg:text-sm">
              Configuração poderosa, flexível e guiada para estudar do seu jeito.
            </p>
          </div>
        </header>

        <div className="mb-3 shrink-0">
          {isConcursoLocalSubflow ? (
            <WizardStepper steps={CONCURSO_LOCAL_STEPS} currentIndex={localCurrentIndex} brandTextColor={brandTextColor} />
          ) : isConfigLocalSubflow ? (
            <WizardStepper steps={CONFIG_LOCAL_STEPS} currentIndex={localCurrentIndex} brandTextColor={brandTextColor} />
          ) : (
            <WizardStepper steps={GLOBAL_STEPS} currentIndex={globalCurrentIndex} brandTextColor={brandTextColor} />
          )}
        </div>

        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-5">
          <div className="min-w-0 flex-1 space-y-3 lg:flex lg:min-h-0 lg:flex-col">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
              {wizardStep === 'formato' && (
                <div className="space-y-2">
                  <div>
                    <p className="mb-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">Escolha o formato</p>
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Defina o tipo de simulado que deseja criar.</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Tipo de prova">
                      <FormatCard
                        active={simuladoFormat === 'vestibular'}
                        icon={<GraduationCap size={18} />}
                        title="Vestibular / ENEM"
                        description="ENEM, vestibulares e provas por banca."
                        brandTextColor={brandTextColor}
                        onClick={() => setSimuladoFormat('vestibular')}
                      />
                      {concursosEnabled && (
                        <FormatCard
                          active={simuladoFormat === 'concurso'}
                          icon={<Shield size={18} />}
                          title="Concurso Público"
                          description="Provas de concursos e seleções."
                          brandTextColor={brandTextColor}
                          onClick={() => setSimuladoFormat('concurso')}
                        />
                      )}
                    </div>
                  </div>

                  {simuladoFormat === 'vestibular' && (
                    <div>
                      <p className="mb-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">Como deseja montar?</p>
                      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Escolha banca, matérias, assuntos e quantidade.</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Como montar o simulado">
                        <FormatCard
                          active={mode === 'custom'}
                          icon={<SlidersHorizontal size={18} />}
                          title="Personalizado"
                          description="Escolha banca, matérias, assuntos e quantidade."
                          brandTextColor={brandTextColor}
                          onClick={() => setMode('custom')}
                        />
                        <FormatCard
                          active={mode === 'preset'}
                          icon={<Layers size={18} />}
                          title="Blocos por banca"
                          description="Use a distribuição oficial de uma prova."
                          brandTextColor={brandTextColor}
                          onClick={() => setMode('preset')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 'configBanca' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Banca</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a banca das questões do seu simulado.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banca</label>
                    <div className="relative">
                      <select
                        aria-label="Banca do simulado personalizado"
                        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 pr-10 font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                      >
                        {bankOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'configQty' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Quantidade de questões</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha quantas questões seu simulado vai ter.</p>
                  </div>
                  <div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {QTY_PRESETS.map((val) => {
                        const disabled = val > customEffectiveMax
                        return (
                          <button
                            key={val}
                            type="button"
                            aria-pressed={qty === val}
                            disabled={disabled}
                            onClick={() => setQty(val)}
                            className={`cursor-pointer rounded-xl border-2 p-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                              qty === val
                                ? 'border-transparent text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                            }`}
                            style={qty === val ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: brandTextColor } : undefined}
                          >
                            {val}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ou defina um valor:</span>
                      <input
                        type="number"
                        aria-label="Quantidade de questões"
                        inputMode="numeric"
                        min={1}
                        max={Math.max(1, customEffectiveMax)}
                        value={qty}
                        disabled={loadingCustomCount || customEffectiveMax === 0}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10)
                          if (Number.isNaN(raw)) { setQty(1); return }
                          setQty(Math.min(Math.max(raw, 1), Math.max(1, customEffectiveMax)))
                        }}
                        className="w-24 rounded-xl border border-slate-200 bg-white p-2 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                      />
                      <span className="text-xs text-slate-400 dark:text-slate-500">Max: {customEffectiveMax}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      Na próxima etapa você escolhe matérias e assuntos — o sistema distribui essas questões entre eles.
                    </p>
                    {loadingCustomCount && (
                      <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Verificando disponibilidade real para os filtros selecionados...</p>
                    )}
                    {!loadingCustomCount && availableCustomCount === 0 && (
                      <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-400">Nenhuma questão disponível com esses filtros. Altere a banca, o ano ou a dificuldade.</p>
                    )}
                  </div>
                </div>
              )}

              {wizardStep === 'configAno' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Ano</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Filtre por ano da prova, se quiser.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ano</label>
                    <div className="relative">
                      <select
                        aria-label="Ano das questões"
                        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 pr-10 font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      >
                        {years.map((value) => (
                          <option key={value} value={value}>{value === 'Todos' ? 'Todos os anos' : value}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'configDificuldade' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Dificuldade</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o nível de dificuldade das questões.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dificuldade</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {difficulties.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={difficulty === d.value}
                          onClick={() => setDifficulty(d.value)}
                          className={`min-h-11 cursor-pointer rounded-xl border-2 p-2.5 text-xs font-bold transition-all ${
                            difficulty === d.value
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="min-h-11 text-sm font-semibold text-[var(--brand-primary)] underline-offset-4 hover:underline dark:text-slate-200"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}

              {wizardStep === 'configuracao' && simuladoFormat === 'vestibular' && mode === 'preset' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Configuração por blocos</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a banca, o bloco e a área de conhecimento.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                    Ideal para treinar com a distribuição oficial de uma prova — cada bloco já tem a quantidade de questões por área definida.
                  </div>
                  <div>
                    <div className="mb-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Banca do Bloco</label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_BANKS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={presetBank === option}
                            onClick={() => setPresetBank(option)}
                            className={`min-h-11 cursor-pointer rounded-xl border-2 p-2.5 text-sm font-bold transition-all ${
                              presetBank === option
                                ? 'border-transparent'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                            }`}
                            style={presetBank === option ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: brandTextColor } : undefined}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {presetBank === 'UFU' || presetBank === 'UEG' || presetBank === 'UFG' || presetBank === 'UNESP' ? 'Bloco da Prova' : 'Área de Conhecimento'}
                    </label>
                    <div className="space-y-2">
                      {presetFormats.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          aria-pressed={enemFormat === f.value}
                          onClick={() => setEnemFormat(f.value)}
                          className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 p-3 text-left text-sm font-semibold transition-all ${
                            enemFormat === f.value
                              ? 'border-transparent'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                          }`}
                          style={enemFormat === f.value ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: brandTextColor } : undefined}
                        >
                          <span className="min-w-0 break-words">{f.emoji} {f.label}</span>
                          <span
                            className="text-xs font-normal"
                            style={enemFormat === f.value ? { color: brandTextColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' } : { color: '#94a3b8' }}
                          >
                            {f.qty}q
                          </span>
                        </button>
                      ))}
                    </div>
                    {languagesForConfig({ bank: presetBank, format: enemFormat }).length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Língua estrangeira</p>
                        <div className="flex flex-wrap gap-2">
                          {languagesForConfig({ bank: presetBank, format: enemFormat }).map((lang, index, languages) => (
                            <button
                              key={lang}
                              type="button"
                              aria-pressed={presetLanguage === lang || (!languages.includes(presetLanguage) && index === 0)}
                              onClick={() => setPresetLanguage(lang)}
                              className={`min-h-11 cursor-pointer rounded-xl border-2 px-4 text-sm font-bold ${
                                presetLanguage === lang || (!languages.includes(presetLanguage) && index === 0)
                                  ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-slate-900 dark:text-white'
                                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ano</label>
                    <div className="relative">
                      <select
                        aria-label="Ano das questões"
                        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 pr-10 font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        style={{ ['--tw-ring-color' as string]: 'var(--brand-primary)' }}
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                      >
                        {years.map((value) => (
                          <option key={value} value={value}>{value === 'Todos' ? 'Todos os anos' : value}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dificuldade</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {difficulties.map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          aria-pressed={difficulty === d.value}
                          onClick={() => setDifficulty(d.value)}
                          className={`min-h-11 cursor-pointer rounded-xl border-2 p-2.5 text-xs font-bold transition-all ${
                            difficulty === d.value
                              ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="min-h-11 text-sm font-semibold text-[var(--brand-primary)] underline-offset-4 hover:underline dark:text-slate-200"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}

              {wizardStep === 'concursoConfig' && (
                <ConcursoConfigStep
                  bank={concursoBank}
                  setBank={setConcursoBank}
                  role={concursoRole}
                  setRole={setConcursoRole}
                  rows={concursoRows}
                  setRows={setConcursoRows}
                  facets={concursoFacets}
                  catalogLoading={concursoCatalogLoading}
                  catalogError={concursoCatalogError}
                  onRetryCatalog={retryConcursoCatalog}
                  includeAnswered={concursoIncludeAnswered}
                  setIncludeAnswered={setConcursoIncludeAnswered}
                />
              )}

              {wizardStep === 'concursoTemas' && (
                <ConcursoTemasStep
                  bank={concursoBank}
                  setBank={setConcursoBank}
                  role={concursoRole}
                  setRole={setConcursoRole}
                  rows={concursoRows}
                  setRows={setConcursoRows}
                  facets={concursoFacets}
                  catalogLoading={concursoCatalogLoading}
                  catalogError={concursoCatalogError}
                  onRetryCatalog={retryConcursoCatalog}
                />
              )}

              {wizardStep === 'concursoResumo' && (
                <ConcursoResumoStep
                  bank={concursoBank}
                  setBank={setConcursoBank}
                  role={concursoRole}
                  setRole={setConcursoRole}
                  rows={concursoRows}
                  setRows={setConcursoRows}
                  facets={concursoFacets}
                  catalogLoading={concursoCatalogLoading}
                  catalogError={concursoCatalogError}
                  onRetryCatalog={retryConcursoCatalog}
                />
              )}

              {wizardStep === 'materiasComposicao' && (
                <MateriasComposicaoStep
                  apiUrl={apiUrl}
                  accessToken={accessToken}
                  bank={bank}
                  year={year}
                  difficultyLabel={difficulty !== 'misto' ? (difficulties.find((d) => d.value === difficulty)?.label ?? null) : null}
                  qty={qty}
                  composicao={composicao}
                  setComposicao={setComposicao}
                  includeAnswered={includeAnswered}
                  setIncludeAnswered={setIncludeAnswered}
                />
              )}

              {wizardStep === 'revisao' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Revisão do simulado</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Confira os detalhes da sua configuração antes de iniciar.</p>
                  </div>
                  <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {summaryRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <dt className="text-slate-500 dark:text-slate-400">{row.label}</dt>
                        <dd className="text-right font-semibold text-slate-800 dark:text-slate-200">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total de questões</p>
                    <p className="text-3xl font-extrabold" style={{ color: 'var(--brand-primary)' }}>{summaryTotal}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} /> Duração estimada
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{durationLabel}</p>
                      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Com base em {summaryTotal} questões.</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <Navigation className="h-3.5 w-3.5" style={{ color: 'var(--brand-primary)' }} /> Regras de navegação
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <li>Navegue livremente entre as questões.</li>
                        <li>É possível pular e retornar depois.</li>
                        <li>As respostas são salvas automaticamente.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {wizardStep !== 'formato' && wizardStep !== 'revisao' && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm font-semibold lg:hidden"
                style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)', color: 'var(--brand-primary)' }}
              >
                Total: {summaryTotal} questões
              </div>
            )}

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:flex-row">
              {wizardStep === 'formato' && (
                <>
                  <button
                    onClick={onClose}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setWizardStep(simuladoFormat === 'concurso' ? 'concursoConfig' : mode === 'custom' ? 'configBanca' : 'configuracao')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'configBanca' && (
                <>
                  <button
                    onClick={() => setWizardStep('formato')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('configQty')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'configQty' && (
                <>
                  <button
                    onClick={() => setWizardStep('configBanca')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('configAno')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'configAno' && (
                <>
                  <button
                    onClick={() => setWizardStep('configQty')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('configDificuldade')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'configDificuldade' && (
                <>
                  <button
                    onClick={() => setWizardStep('configAno')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('materiasComposicao')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar: Selecionar matérias e assuntos <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'configuracao' && simuladoFormat === 'vestibular' && mode === 'preset' && (
                <>
                  <button
                    onClick={() => setWizardStep('formato')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('revisao')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar: Revisão <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'concursoConfig' && (
                <>
                  <button
                    onClick={() => setWizardStep('formato')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('concursoTemas')}
                    disabled={!concursoConfigValid}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar: Escolher temas <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'concursoTemas' && (
                <>
                  <button
                    onClick={() => setWizardStep('concursoConfig')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('concursoResumo')}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar: Ver resumo <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'concursoResumo' && (
                <>
                  <button
                    onClick={() => setWizardStep('concursoTemas')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => { setConcursoSelection({ bank: concursoBank, role: concursoRole, quotas: concursoRows, includeAnswered: concursoIncludeAnswered }); setWizardStep('revisao') }}
                    disabled={!concursoConfigValid || concursoHasOverQuota}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Continuar: Revisão <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'materiasComposicao' && (
                <>
                  <button
                    onClick={() => setWizardStep('configDificuldade')}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep('revisao')}
                    disabled={composicaoTotalQty(composicao) !== qty}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    Avançar: Revisão <ArrowRight size={16} />
                  </button>
                </>
              )}

              {wizardStep === 'revisao' && (
                <>
                  <button
                    onClick={goBackFromRevisao}
                    disabled={loading}
                    className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleFinalStart}
                    disabled={loading || !accessToken}
                    className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {startStages[startStage] ?? 'Preparando...'}
                      </>
                    ) : (
                      <>
                        <Play size={16} /> Iniciar Simulado
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {wizardStep !== 'formato' && wizardStep !== 'revisao' && (
            <WizardSidebar
              rows={summaryRows}
              totalLabel="Total de questões"
              totalValue={String(summaryTotal)}
            />
          )}
        </div>
      </div>
    </section>
  )
}

function FormatCard({
  active, icon, title, description, onClick, brandTextColor,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  brandTextColor: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex w-full cursor-pointer items-start gap-2.5 rounded-2xl border-2 p-3 text-left transition-colors ${
        active
          ? 'border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        style={active ? { background: 'var(--brand-primary)', color: brandTextColor } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 pr-6">
        <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{description}</span>
      </span>
      <span
        aria-hidden
        className={`absolute right-3 top-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          active ? 'border-[var(--brand-primary)]' : 'border-slate-300 dark:border-slate-600'
        }`}
      >
        {active && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brand-primary)' }} />}
      </span>
    </button>
  )
}
