'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, MapPin } from 'lucide-react';
import { WizardStepper, type WizardStepperStep } from '@/components/partners/simulado/WizardStepper';
import { WizardSidebar } from '@/components/partners/simulado/WizardSidebar';
import { DateTimeField } from '@/components/partners/simulado/DateTimeField';
import { DurationTimerField } from '@/components/partners/simulado/DurationTimerField';
import { useFounderConcursoFacets } from '@/hooks/useFounderConcursoFacets';
import { CUSTOM_SUBJECTS } from '@/lib/simuladoSubjects';
import {
  BANK_LABELS, DIFFICULTY_LABELS, FORMATS_BY_BANK, resolveQty, isQtyLocked,
  buildDistributionHintLines, WEIGHT_KEYS_BY_BANK, UEG_GROUP_PRESETS, UEG_GROUP_COURSES,
  formatLabel, formatCargoLabel, type FounderSimuladoFormState,
} from '@/lib/simuladoFounderForm';

type StepKey =
  | 'titulo' | 'banca' | 'formato' | 'quantidade' | 'dificuldade' | 'pesos'
  | 'regras' | 'local' | 'detalhes' | 'agendamento';

// "Todas" vira o próprio "" do form.subject (nenhum filtro de matéria) —
// mesma lista usada pelo MateriasComposicaoStep do aluno, pra não ter uma
// segunda fonte de verdade de quais matérias existem no banco vestibular.
const VESTIBULAR_SUBJECTS = CUSTOM_SUBJECTS.filter((s) => s.value !== 'Todas');

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

interface Props {
  slug: string;
  form: FounderSimuladoFormState;
  setForm: (updater: (f: FounderSimuladoFormState) => FounderSimuladoFormState) => void;
  // Modalidade já foi decidida na Etapa 1 do seletor de tipo (fora deste
  // componente) — chega aqui só como leitura, nunca reeditável. Local é a
  // única parte dessa decisão que ainda tem um campo de texto pra preencher.
  modality: 'online' | 'hybrid' | 'printed';
  locationName: string;
  setLocationName: (v: string) => void;
  locationAddress: string;
  setLocationAddress: (v: string) => void;
  // Vestibular/Concurso também já foi decidido antes deste wizard (Etapa 1
  // do seletor, anterior até à modalidade) — só muda o que a etapa "Banca"
  // pergunta e de onde vem o catálogo de matérias.
  simuladoFormat: 'vestibular' | 'concurso';
  brandTextColor: string;
  onClose: () => void;
  // Dispara o mesmo handleGeneratePreview/showReviewApproval que já existe no
  // componente pai — a etapa de Revisão em si não é deste wizard, é o modal
  // de revisão/aprovação que o founder já usa pra editar e pra Personalizado.
  onReviewAndCreate: () => void;
}

export function NovoSimuladoAleatorioWizard({
  slug, form, setForm, modality, locationName, setLocationName, locationAddress, setLocationAddress,
  simuladoFormat, brandTextColor, onClose, onReviewAndCreate,
}: Props) {
  const [wizardStep, setWizardStep] = useState<StepKey>('titulo');
  const isConcurso = simuladoFormat === 'concurso';
  const { facets, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useFounderConcursoFacets(slug, isConcurso);

  const concursoBanks = unique(facets.map((f) => f.bank));
  const concursoRoles = unique(facets.filter((f) => !form.bank || f.bank === form.bank).map((f) => f.role));
  const concursoCurrentFacets = facets.filter((f) => (!form.bank || f.bank === form.bank) && (!form.role || f.role === form.role));
  const concursoSubjects = unique(concursoCurrentFacets.map((f) => f.subject));

  const steps: WizardStepperStep[] = [
    { key: 'titulo', label: 'Título' },
    { key: 'banca', label: isConcurso ? 'Banca e cargo' : 'Banca' },
    ...((FORMATS_BY_BANK[form.bank]?.length ?? 0) > 1 ? [{ key: 'formato', label: 'Formato' }] : []),
    { key: 'quantidade', label: 'Quantidade' },
    { key: 'dificuldade', label: 'Dificuldade' },
    ...(WEIGHT_KEYS_BY_BANK[form.bank]?.length ? [{ key: 'pesos', label: 'Pesos' }] : []),
    { key: 'regras', label: 'Regras' },
    ...(modality !== 'online' ? [{ key: 'local', label: 'Local' }] : []),
    { key: 'detalhes', label: 'Detalhes' },
    { key: 'agendamento', label: 'Agendamento' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === wizardStep);

  function goTo(delta: number) {
    const next = steps[currentIndex + delta];
    if (next) setWizardStep(next.key as StepKey);
  }

  // `form` já chega com defaults sensatos (bank: 'ENEM', difficulty: 'misto',
  // qty: 10) pra que os próprios controles tenham um valor pra exibir — mas
  // isso não significa que o founder já "escolheu" aquilo. O resumo lateral
  // só deve revelar um campo depois que o founder passou pela tela dele;
  // antes disso, mostra "—" em vez do default que ainda não foi confirmado.
  function reached(key: StepKey): boolean {
    const idx = steps.findIndex((s) => s.key === key);
    return idx !== -1 && currentIndex >= idx;
  }

  const distributionHint = form.format === 'completo' ? buildDistributionHintLines(form.bank, form.qty) : null;

  const summaryRows = [
    { label: 'Modalidade', value: modality === 'printed' ? 'Impresso' : modality === 'hybrid' ? 'Híbrido' : 'Online' },
    { label: 'Origem', value: isConcurso ? 'Concurso' : 'Vestibular' },
    { label: 'Banca', value: reached('banca') ? (isConcurso ? (form.bank || '—') : (BANK_LABELS[form.bank] ?? form.bank)) : '—' },
    ...(isConcurso
      ? [{ label: 'Cargo', value: reached('banca') ? (form.role ? formatCargoLabel(form.role) : 'Todos os cargos') : '—' }]
      : []),
    ...((FORMATS_BY_BANK[form.bank]?.length ?? 0) > 1
      ? [{ label: 'Formato', value: reached('formato') ? formatLabel(form.bank, form.format) : '—' }]
      : []),
    { label: 'Dificuldade', value: reached('dificuldade') ? (DIFFICULTY_LABELS[form.difficulty] ?? form.difficulty) : '—' },
  ];

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  const selectCls = `${inputCls} cursor-pointer appearance-none pr-10`;
  const labelCls = 'mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';
  const ringStyle = { ['--tw-ring-color' as string]: 'var(--brand-primary)' };
  const invalidScheduleEnd = Boolean(form.starts_at && form.ends_at && form.ends_at <= form.starts_at);
  // Online/híbrido exige fim e duração (sem isso o simulado fica disponível
  // pra sempre e o encerramento automático de sessões vencidas não tem como
  // calcular o prazo — ver simulado_auto_finish_service.py no backend).
  // Impresso é isento — é aplicado presencialmente.
  const missingMandatorySchedule = modality !== 'printed' && (!form.ends_at || !form.time_limit_secs);

  function canAdvance(): boolean {
    if (wizardStep === 'titulo') return form.title.trim().length > 0;
    if (wizardStep === 'banca' && isConcurso) return form.bank.trim().length > 0;
    return true;
  }

  function handleFinalAdvance() {
    if (!form.title.trim()) return;
    if (modality !== 'printed' && !form.starts_at) return;
    if (invalidScheduleEnd) return;
    if (missingMandatorySchedule) return;
    onReviewAndCreate();
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-[#080808] md:px-8 md:py-6">
      <div className="mx-auto flex max-w-5xl flex-col">
        <header className="mb-4 flex items-start gap-3">
          <button
            onClick={onClose}
            aria-label="Cancelar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 lg:text-xl">Novo Simulado — Aleatório</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 lg:text-sm">
              O sistema seleciona as questões automaticamente a partir do que você escolher aqui.
            </p>
          </div>
        </header>

        <div className="mb-3">
          <WizardStepper steps={steps} currentIndex={currentIndex} brandTextColor={brandTextColor} />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:gap-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">

              {wizardStep === 'titulo' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Título do simulado</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Dê um nome para identificar este simulado na lista da turma.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Título</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Ex: Simulado de Linguagens — Semana 3"
                      className={inputCls}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 'banca' && isConcurso && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Banca e cargo</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a banca e o cargo do concurso.</p>
                  </div>
                  {catalogLoading && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Carregando bancas e cargos disponíveis...</p>}
                  {catalogError && (
                    <div role="alert" className="rounded-xl border border-amber-300 p-3 text-sm text-amber-800 dark:text-amber-300">
                      Não foi possível carregar as opções. <button type="button" onClick={retryCatalog} className="font-bold underline">Tentar novamente</button>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Banca</label>
                    <div className="relative">
                      <select
                        aria-label="Banca do concurso"
                        value={form.bank}
                        onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value, role: '', subject: '' }))}
                        className={selectCls}
                        style={ringStyle}
                      >
                        <option value="">Selecione a banca</option>
                        {concursoBanks.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Cargo</label>
                    <div className="relative">
                      <select
                        aria-label="Cargo do concurso"
                        value={form.role}
                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, subject: '' }))}
                        className={selectCls}
                        style={ringStyle}
                      >
                        <option value="">Todos os cargos</option>
                        {concursoRoles.map((v) => <option key={v} value={v}>{formatCargoLabel(v)}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'banca' && !isConcurso && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Banca</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a banca das questões do simulado.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Banca</label>
                    <div className="relative">
                      <select
                        value={form.bank}
                        onChange={(e) => {
                          const bank = e.target.value;
                          const formats = FORMATS_BY_BANK[bank] ?? ['custom'];
                          const fmt = formats.includes(form.format) ? form.format : 'custom';
                          const fixed = resolveQty(bank, fmt);
                          setForm((f) => ({ ...f, bank, format: fmt, qty: fixed ?? f.qty }));
                        }}
                        className={selectCls}
                        style={ringStyle}
                      >
                        {Object.entries(BANK_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'formato' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Formato</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Personalizado distribui pela matéria que você escolher depois; os demais seguem a distribuição oficial da banca.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Formato</label>
                    <div className="relative">
                      <select
                        value={form.format}
                        onChange={(e) => {
                          const fmt = e.target.value;
                          const fixed = resolveQty(form.bank, fmt);
                          setForm((f) => ({ ...f, format: fmt, qty: fixed ?? f.qty }));
                        }}
                        className={selectCls}
                        style={ringStyle}
                      >
                        {(FORMATS_BY_BANK[form.bank] ?? ['custom']).map((k) => (
                          <option key={k} value={k}>{formatLabel(form.bank, k)}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'quantidade' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Quantidade de questões</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha quantas questões o simulado vai ter.</p>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Questões
                      {isQtyLocked(form.bank, form.format) && (
                        <span className="ml-1 normal-case font-normal text-slate-400">(fixo pela banca)</span>
                      )}
                      {!isQtyLocked(form.bank, form.format) && resolveQty(form.bank, form.format) !== null && (
                        <span className="ml-1 normal-case font-normal text-slate-400">(proporcional à prova oficial)</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min={5} max={180}
                      value={form.qty}
                      readOnly={isQtyLocked(form.bank, form.format)}
                      onChange={(e) => {
                        if (isQtyLocked(form.bank, form.format)) return;
                        setForm((f) => ({ ...f, qty: Number(e.target.value) }));
                      }}
                      className={`${inputCls} w-32 ${isQtyLocked(form.bank, form.format) ? 'cursor-not-allowed opacity-60' : ''}`}
                      style={ringStyle}
                    />
                  </div>
                  {distributionHint && (
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Distribuição estimada do completo ({form.bank}) para {form.qty} questões
                      </p>
                      <div className="mt-2 space-y-1">
                        {distributionHint.map((line) => (
                          <p key={line} className="text-xs text-slate-600 dark:text-slate-300">• {line}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 'dificuldade' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Dificuldade</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha o nível de dificuldade das questões.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={form.difficulty === k}
                        onClick={() => setForm((f) => ({ ...f, difficulty: k }))}
                        className={`min-h-11 cursor-pointer rounded-xl border-2 p-2.5 text-xs font-bold transition-all ${
                          form.difficulty === k
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 'pesos' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Pesos por área/matéria (opcional)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Só afeta o cálculo de nota estimada — pode avançar sem preencher.</p>
                  </div>
                  {form.bank === 'UEG' && (
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Grupo de Pesos UEG</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {(['I', 'II', 'III'] as const).map((grp) => (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, ueg_weight_group: grp, weights: UEG_GROUP_PRESETS[grp] }))}
                            className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                              form.ueg_weight_group === grp
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <p className="font-bold">Grupo {grp}</p>
                            <p className="mt-1 text-[10px] leading-relaxed opacity-80">{UEG_GROUP_COURSES[grp]}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(WEIGHT_KEYS_BY_BANK[form.bank] ?? []).map((key) => (
                      <label key={key} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                        <p className="break-words text-xs font-semibold text-slate-600 dark:text-slate-300">{key}</p>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={form.weights?.[key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({ ...f, weights: { ...(f.weights || {}), [key]: val === '' ? 0 : Number(val) } }));
                          }}
                          placeholder="Ex: 2.5"
                          className={`${inputCls} mt-1`}
                        />
                      </label>
                    ))}
                  </div>
                  {Object.keys(form.weights || {}).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, weights: {}, ueg_weight_group: null }))}
                      className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      Limpar pesos
                    </button>
                  )}
                </div>
              )}

              {wizardStep === 'regras' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Regras de aplicação</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Defina como o simulado se comporta pra turma.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Permitir refazer simulado</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Quando desativado, o aluno só poderá concluir este simulado uma vez.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(form.allow_retry)}
                        onClick={() => setForm((f) => ({ ...f, allow_retry: !f.allow_retry }))}
                        className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.allow_retry ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.allow_retry ? 'translate-x-8' : 'translate-x-1.5'}`} />
                      </button>
                    </div>
                  </div>
                  {/* Não tem efeito pra Impresso (handleSaveImpresso sempre usa a
                      lista fixa do preview) — nem aparece nesse caso, pra não
                      mostrar um controle que não muda nada. Pra Híbrido, o
                      backend exige same_for_all_students=true, por isso trava. */}
                  {modality !== 'printed' && (
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Mesmo simulado para toda a turma</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Ativado: todos recebem o mesmo conjunto de questões. Desativado: cada aluno recebe um conjunto próprio.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(form.same_for_all_students)}
                          disabled={modality === 'hybrid'}
                          onClick={() => setForm((f) => ({ ...f, same_for_all_students: !f.same_for_all_students }))}
                          className={`relative inline-flex h-11 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none ${form.same_for_all_students ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} disabled:opacity-60`}
                        >
                          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.same_for_all_students ? 'translate-x-8' : 'translate-x-1.5'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 'local' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Local</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {modality === 'hybrid'
                        ? 'Onde os alunos que optarem por fazer presencialmente vão encontrar a prova.'
                        : 'Onde a prova impressa será aplicada (opcional, só informativo).'}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <label className={labelCls}><MapPin className="mr-1 inline h-3 w-3" />Local</label>
                      <input
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Ex: Sala 3 — Bloco B"
                        className={inputCls}
                        style={ringStyle}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Endereço (opcional)</label>
                      <input
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123"
                        className={inputCls}
                        style={ringStyle}
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 'detalhes' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Detalhes (opcional)</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Instruções pra turma e, se o formato for Personalizado, a matéria.</p>
                  </div>
                  {form.format === 'custom' && isConcurso && (
                    <div>
                      <label className={labelCls}>Matéria (opcional)</label>
                      <div className="relative">
                        <select
                          aria-label="Matéria do concurso"
                          value={form.subject}
                          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                          className={selectCls}
                          style={ringStyle}
                        >
                          <option value="">Todas as matérias</option>
                          {concursoSubjects.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  )}
                  {form.format === 'custom' && !isConcurso && (
                    <div>
                      <label className={labelCls}>Matéria</label>
                      <div className="relative">
                        <select
                          aria-label="Matéria"
                          value={form.subject}
                          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                          className={selectCls}
                          style={ringStyle}
                        >
                          <option value="">Todas as Matérias</option>
                          {VESTIBULAR_SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Instruções do Simulado</label>
                    <textarea
                      value={form.instructions ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                      placeholder="Ex: Foque em gestão de tempo. Pule questões longas e retorne no final."
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      style={ringStyle}
                    />
                  </div>
                </div>
              )}

              {wizardStep === 'agendamento' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Agendamento</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {modality === 'printed'
                        ? 'Tempo limite e datas são opcionais pra prova impressa.'
                        : 'Defina quando o simulado abre, quando fecha e por quanto tempo cada aluno tem pra responder.'}
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>
                      Duração da prova
                      {modality === 'printed' && <span className="ml-1 normal-case font-normal text-slate-400">(opcional)</span>}
                    </label>
                    <DurationTimerField
                      label="Duração da prova"
                      value={form.time_limit_secs}
                      onChange={(secs) => setForm((f) => ({ ...f, time_limit_secs: secs }))}
                      labelClassName="sr-only"
                      inputClassName={inputCls}
                      ringStyle={ringStyle}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DateTimeField
                      label="Início"
                      hint={modality === 'printed' ? '(opcional)' : undefined}
                      value={form.starts_at}
                      onChange={(v) => setForm((f) => ({ ...f, starts_at: v }))}
                      labelClassName={labelCls}
                      inputClassName={inputCls}
                      ringStyle={ringStyle}
                    />
                    <DateTimeField
                      label="Fim"
                      hint={modality === 'printed' ? '(opcional)' : undefined}
                      value={form.ends_at}
                      minDateTime={form.starts_at}
                      onChange={(v) => setForm((f) => ({ ...f, ends_at: v }))}
                      labelClassName={labelCls}
                      inputClassName={inputCls}
                      ringStyle={ringStyle}
                    />
                  </div>
                  {modality !== 'printed' && !form.starts_at && (
                    <p role="status" className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Data de início é obrigatória pra simulados online/híbridos.
                    </p>
                  )}
                  {missingMandatorySchedule && form.starts_at && (
                    <p role="status" className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Data de encerramento e duração da prova são obrigatórias pra simulados online/híbridos.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:flex-row">
              {currentIndex === 0 ? (
                <button
                  onClick={onClose}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              ) : (
                <button
                  onClick={() => goTo(-1)}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Voltar
                </button>
              )}
              {currentIndex === steps.length - 1 ? (
                <button
                  onClick={handleFinalAdvance}
                  disabled={!form.title.trim() || (modality !== 'printed' && !form.starts_at) || invalidScheduleEnd || missingMandatorySchedule}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                >
                  Avançar: Revisão <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => goTo(1)}
                  disabled={!canAdvance()}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'var(--brand-primary)', color: brandTextColor }}
                >
                  Avançar <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>

          <WizardSidebar rows={summaryRows} totalLabel="Total de questões" totalValue={reached('quantidade') ? String(form.qty) : '—'} />
        </div>
      </div>
    </div>
  );
}

export default NovoSimuladoAleatorioWizard;
