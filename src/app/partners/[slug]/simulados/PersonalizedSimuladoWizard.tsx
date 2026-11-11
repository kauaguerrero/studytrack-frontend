'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandButton,
} from '@/components/partners/founder-ui';
import {
  ArrowLeft, ArrowRight, BookOpen, Eye, FileText, Layers, MapPin, PenTool, Sparkles, Trash2,
} from 'lucide-react';
import { WizardStepper, type WizardStepperStep } from '@/components/partners/simulado/WizardStepper';
import { DateTimeField } from '@/components/partners/simulado/DateTimeField';
import { formatDateTime } from '@/lib/simuladoFounderForm';
import { QuestionBankExplorer, type QuestionBankExplorerHandle } from '@/components/assessments/QuestionBankExplorer';
import { AiQuestionChat } from '@/components/assessments/AiQuestionChat';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';
import { ContestQuotaBuilder } from './ContestQuotaBuilder';
import SimuladoPreviewModal from '@/components/partners/simulados/SimuladoPreviewModal';
import { downloadBlobResponse } from '@/lib/download-blob';
import type { SelectedQuestion } from '@/types/simulado-preview';
import { toCustomQuestionSnapshot, deriveContextAndStatement } from '@/types/simulado-preview';

type Method = 'bank' | 'ai' | 'manual' | 'quotas';
type Step = 'montagem' | 'detalhes' | 'revisao';

interface PoolCandidate {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro?: string | null;
  context?: string | null;
  images?: unknown;
  alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>;
  correct_alternative?: string | null;
  testlet_group_id?: string | null;
  metadata?: {
    testlet_order?: number;
    testlet_total?: number;
    [key: string]: unknown;
  } | null;
}

interface Props {
  slug: string;
  onClose: () => void;
  onCreated: () => void;
  // Modalidade já foi decidida na Etapa 1 do seletor de tipo, fora deste
  // componente — chega aqui só como leitura (nunca reeditável). Local é a
  // única parte dessa decisão que ainda precisa de um campo pra preencher,
  // e vive localmente aqui (não precisa ser compartilhado com o resto da
  // tela de simulados).
  modality: 'online' | 'hybrid' | 'printed';
  // Vestibular/Concurso também já foi decidido antes deste wizard (mesma
  // Etapa 1) — usado só para travar o tipo de banca dentro da aba "Banco de
  // Questões" (QuestionBankExplorer), que antes deixava trocar livremente
  // entre vestibular/concurso mesmo já tendo essa decisão tomada.
  simuladoFormat: 'vestibular' | 'concurso';
  onCreatedPrinted?: (printedExamId: string) => void;
}

const methodTabs: Array<{
  id: Method;
  title: string;
  icon: typeof BookOpen;
}> = [
  { id: 'bank', title: 'Banco de questões', icon: BookOpen },
  { id: 'ai', title: 'Criação com IA', icon: Sparkles },
  { id: 'manual', title: 'Do zero', icon: PenTool },
  { id: 'quotas', title: 'Composição por matérias e assuntos', icon: Layers },
];

// Coluna direita fixa (desktop): resumo agregado do pool + atalhos de
// teclado — layout de referência pedido pelo founder. A lista removível de
// questões fica abaixo (não está no mock, mas é funcionalidade que já
// existia e não pode sumir).
function BuilderSidebar({
  pool, onRemove, accentColor, showBankShortcuts,
}: {
  pool: SelectedQuestion[];
  onRemove: (id: string) => void;
  accentColor: string;
  showBankShortcuts: boolean;
}) {
  const subjects = [...new Set(pool.map((q) => q.subject))];
  const topics = [...new Set(pool.map((q) => q.discipline).filter((v): v is string => Boolean(v)))];

  return (
    <aside className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
      <ElevatedCard accentColor={accentColor} className="p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Qtd de questões</p>
        </div>
        <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{pool.length}</p>
      </ElevatedCard>
      <ElevatedCard accentColor={accentColor} className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Assuntos</p>
        <p className="mt-1 text-sm text-slate-700 dark:text-white/70">{subjects.length ? subjects.join(', ') : '—'}</p>
      </ElevatedCard>
      <ElevatedCard accentColor={accentColor} className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Tópicos</p>
        <p className="mt-1 text-sm text-slate-700 dark:text-white/70">{topics.length ? topics.join(', ') : '—'}</p>
      </ElevatedCard>
      {showBankShortcuts && (
        <ElevatedCard accentColor={accentColor} className="p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Atalhos</p>
          <dl className="space-y-1.5 text-xs text-slate-600 dark:text-white/60">
            {[['←', 'volta'], ['→', 'próxima'], ['Enter', 'adiciona']].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] dark:border-white/15 dark:bg-white/5">{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </dl>
        </ElevatedCard>
      )}
      <ElevatedCard accentColor={accentColor} className="p-4">
        <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Questões selecionadas</p>
        <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
          {pool.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 dark:border-white/15 dark:text-white/40">
              Nenhuma questão adicionada ainda.
            </div>
          )}
          {pool.map((question) => (
            <div key={question.id} className={`rounded-2xl bg-slate-50 p-3 dark:bg-white/5 ${question.testletGroupId ? 'border-l-4 border-amber-300 dark:border-amber-400/60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">{question.subject}</div>
                  <div className="text-xs text-slate-700 dark:text-white/60">{question.alternatives_intro.slice(0, 50)}{question.alternatives_intro.length > 50 ? '...' : ''}</div>
                </div>
                <button type="button" onClick={() => onRemove(question.id)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-white hover:text-red-500 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ElevatedCard>
    </aside>
  );
}

export default function PersonalizedSimuladoWizard({ slug, onClose, onCreated, modality, simuladoFormat, onCreatedPrinted }: Props) {
  const { org } = useOrg();
  const brandText = readableBrandText(org.brand_primary, 'var(--brand-primary)');
  const onBrand = onBrandText(org.brand_primary);
  const printedMode = modality === 'printed';
  const [method, setMethod] = useState<Method>('bank');
  const [step, setStep] = useState<Step>('montagem');
  const [pool, setPool] = useState<SelectedQuestion[]>([]);
  const [contest, setContest] = useState<{ bank: string; role: string } | null>(null);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const invalidScheduleEnd = Boolean(startsAt && endsAt && endsAt <= startsAt);
  const [timeLimitMins, setTimeLimitMins] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloadingPreviewPdf, setDownloadingPreviewPdf] = useState(false);
  const bankRef = useRef<QuestionBankExplorerHandle>(null);

  const steps: WizardStepperStep[] = [
    { key: 'montagem', label: 'Questões' },
    { key: 'detalhes', label: 'Detalhes' },
    { key: 'revisao', label: 'Revisão' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  function addToPool(question: PoolCandidate) {
    const { context, statement } = deriveContextAndStatement(question.context, question.alternatives_intro);
    const normalized: SelectedQuestion = {
      id: question.id,
      subject: question.subject,
      discipline: question.discipline,
      difficulty: question.difficulty,
      alternatives_intro: statement,
      context,
      images: question.images,
      alternatives: question.alternatives,
      correct_alternative: question.correct_alternative,
      testletGroupId: question.testlet_group_id || undefined,
      testletPosition: typeof question.metadata?.testlet_order === 'number' ? question.metadata.testlet_order + 1 : undefined,
      testletTotal: typeof question.metadata?.testlet_total === 'number' ? question.metadata.testlet_total : undefined,
      metadata: question.metadata,
    };
    setPool((prev) => (prev.some((item) => item.id === normalized.id) ? prev : [...prev, normalized]));
  }

  function addManyToPool(questions: PoolCandidate[]) {
    questions.forEach(addToPool);
  }

  function removeFromPool(id: string) {
    setPool((prev) => prev.filter((question) => question.id !== id));
  }

  // Atalhos de teclado reais só fazem sentido na aba "Banco de Questões"
  // (navegação questão-a-questão) — ignora quando o foco está num campo de
  // texto (ex.: a busca do próprio explorador) pra não atrapalhar digitação.
  useEffect(() => {
    if (step !== 'montagem' || method !== 'bank') return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); bankRef.current?.goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); bankRef.current?.goNext(); }
      else if (e.key === 'Enter') { e.preventDefault(); bankRef.current?.addCurrent(); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, method]);

  async function handleDownloadPdfPreview() {
    if (pool.length === 0) return;
    setDownloadingPreviewPdf(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/printed-exams/preview.pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          title: title.trim() || 'Prévia',
          question_ids: pool.map((q) => q.id),
          custom_questions: pool.map(toCustomQuestionSnapshot),
          bank: contest?.bank || 'CUSTOM',
          time_limit_secs: timeLimitMins ? Number(timeLimitMins) * 60 : null,
        }),
      });
      if (!res.ok) {
        toast.error('Erro ao gerar PDF de prévia');
        return;
      }
      await downloadBlobResponse(res, 'preview_prova.pdf');
    } catch {
      toast.error('Erro ao gerar PDF de prévia');
    } finally {
      setDownloadingPreviewPdf(false);
    }
  }

  async function handleCreate() {
    if (invalidScheduleEnd) {
      toast.error('O fim deve ser depois do início.');
      return;
    }
    if (pool.length < 5) {
      toast.error('Selecione pelo menos 5 questões.');
      return;
    }
    if (!title.trim() || (!printedMode && !startsAt)) {
      toast.error(printedMode ? 'Título é obrigatório.' : 'Título e data de início são obrigatórios.');
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      };

      if (printedMode) {
        // A API vincula a prova impressa ao simulado para correção e métricas.
        const res = await fetch(`${api}/api/partners/${slug}/printed-exams`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: title.trim(),
            question_ids: pool.map((q) => q.id),
            starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
            ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
            location_name: locationName.trim() || null,
            location_address: locationAddress.trim() || null,
            config: {
              format: 'custom',
              bank: contest?.bank || 'CUSTOM',
              question_type: contest ? 'concurso' : 'vestibular',
              role: contest?.role || null,
              qty: pool.length,
              time_limit_secs: timeLimitMins ? Number(timeLimitMins) * 60 : null,
              allow_retry: false,
              custom_questions: pool.map((question) => ({
                id: question.id,
                subject: question.subject,
                discipline: question.discipline,
                difficulty: question.difficulty,
                alternatives_intro: question.alternatives_intro,
                context: question.context,
                images: question.images,
                alternatives: question.alternatives,
                correct_alternative: question.correct_alternative,
              })),
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao criar prova impressa.');
        toast.success('Prova impressa criada. Faça o download dos PDFs.');
        onCreatedPrinted?.(data.printed_exam_id);
        onClose();
      } else {
        // Fluxo online/híbrido — modality e local (quando híbrido) SEMPRE vão
        // no payload: antes desta correção, este branch nunca enviava
        // `modality`, e o backend defaultava para "online" — Híbrido escolhido
        // na Etapa 1 virava Online silenciosamente (achado de auditoria).
        const hasLocation = modality !== 'online';
        const body = {
          title: title.trim(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
          modality,
          location_name: hasLocation ? (locationName.trim() || null) : null,
          location_address: hasLocation ? (locationAddress.trim() || null) : null,
          config: {
            format: 'custom',
            bank: contest?.bank || 'CUSTOM',
            question_type: contest ? 'concurso' : undefined,
            role: contest?.role || undefined,
            time_limit_secs: timeLimitMins ? Number(timeLimitMins) * 60 : undefined,
            allow_retry: false,
            custom_questions: pool.map((question) => ({
              id: question.id,
              subject: question.subject,
              discipline: question.discipline,
              difficulty: question.difficulty,
              alternatives_intro: question.alternatives_intro,
              context: question.context,
              images: question.images,
              alternatives: question.alternatives,
              correct_alternative: question.correct_alternative,
            })),
          },
          custom_question_ids: pool.map((question) => question.id),
        };
        const res = await fetch(`${api}/api/partners/${slug}/scheduled-simulados`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha ao criar simulado.');
        toast.success('Simulado personalizado criado.');
        onCreated();
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o simulado.');
    } finally {
      setCreating(false);
    }
  }

  const modalityLabel = modality === 'printed' ? 'Impresso' : modality === 'hybrid' ? 'Híbrido' : 'Online';
  const methodLabel = methodTabs.find((m) => m.id === method)?.title ?? '—';
  const visibleTabs = methodTabs.filter((item) => item.id !== 'quotas' || Boolean(org.permissions?.concursos_enabled));

  const toolContent = useMemo(() => {
    if (method === 'quotas') {
      return (
        <ContestQuotaBuilder
          slug={slug}
          brandTextColor={onBrand}
          onExit={() => setMethod('bank')}
          onGenerated={(questions, bank, role) => {
            setPool([]);
            addManyToPool(questions);
            setContest({ bank, role });
            setStep('detalhes');
          }}
        />
      );
    }
    if (method === 'bank') {
      return <QuestionBankExplorer ref={bankRef} slug={slug} selectedIds={pool.map((item) => item.id)} onSelectQuestion={addToPool} lockedQuestionType={simuladoFormat} />;
    }
    if (method === 'ai') {
      return <AiQuestionChat slug={slug} onQuestionSaved={addToPool} />;
    }
    if (method === 'manual') {
      return <ManualQuestionForm slug={slug} onSuccess={addManyToPool} />;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, pool, slug]);

  function handleAdvanceFromDetalhes() {
    if (!title.trim() || (!printedMode && !startsAt)) {
      toast.error(printedMode ? 'Título é obrigatório.' : 'Título e data de início são obrigatórios.');
      return;
    }
    if (invalidScheduleEnd) {
      toast.error('O fim deve ser depois do início.');
      return;
    }
    setStep('revisao');
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col p-4 md:p-6">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={onClose}
              aria-label="Cancelar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={14} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white lg:text-xl">Novo Simulado — Personalizado</h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50 lg:text-sm">Monte o simulado selecionando questões do banco, usando IA, criando do zero ou por composição.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={pool.length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              <Eye className="h-4 w-4" />
              Ver preview
            </button>
            {step === 'montagem' && (
              <button
                type="button"
                onClick={() => setStep('detalhes')}
                disabled={pool.length < 5 || (method === 'quotas')}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: org.brand_primary, color: onBrand }}
              >
                Próxima etapa <ArrowRight size={16} />
              </button>
            )}
            {step === 'detalhes' && (
              <button
                type="button"
                onClick={handleAdvanceFromDetalhes}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all"
                style={{ background: org.brand_primary, color: onBrand }}
              >
                Próxima etapa <ArrowRight size={16} />
              </button>
            )}
            {step === 'revisao' && (
              <BrandButton onClick={() => void handleCreate()} disabled={creating} hex={org.brand_primary}>
                {creating ? 'Criando...' : printedMode ? 'Gerar prova impressa' : 'Criar Simulado'}
              </BrandButton>
            )}
          </div>
        </header>

        <div className="mb-4">
          <WizardStepper steps={steps} currentIndex={currentIndex} brandTextColor={onBrand} />
        </div>

        <div className="flex-1 space-y-4">
          {step === 'montagem' && (
            <>
              <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-white/5">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = method === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMethod(tab.id)}
                      className="flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                      style={active ? { background: `color-mix(in srgb, ${org.brand_primary} 14%, white)`, color: brandText } : undefined}
                    >
                      <span className={`inline-flex items-center gap-2 ${active ? '' : 'text-slate-500 dark:text-white/50'}`}>
                        <Icon className="h-4 w-4" />
                        {tab.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <RevealGroup className="min-w-0 space-y-4">
                  <RevealItem>{toolContent}</RevealItem>
                </RevealGroup>
                <BuilderSidebar
                  pool={pool}
                  onRemove={removeFromPool}
                  accentColor={org.brand_primary}
                  showBankShortcuts={method === 'bank'}
                />
              </div>
            </>
          )}

          {step === 'detalhes' && (
            <ElevatedCard accentColor={org.brand_primary} className="mx-auto max-w-2xl p-4 md:p-6">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Detalhes do simulado</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">{pool.length} questões selecionadas, mesmo caderno pra toda a turma.</p>
              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Simulado Personalizado — Semana 4"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>

                {modality !== 'online' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">
                        <MapPin className="mr-1 inline h-3 w-3" />Local
                      </label>
                      <input
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        placeholder="Ex: Sala 3 — Bloco B"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Endereço (opcional)</label>
                      <input
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {!printedMode && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <DateTimeField
                      label="Data de início"
                      value={startsAt}
                      onChange={setStartsAt}
                      labelClassName="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40"
                      inputClassName="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <DateTimeField
                      label="Data de fim"
                      hint="(opcional)"
                      value={endsAt}
                      minDateTime={startsAt}
                      onChange={setEndsAt}
                      labelClassName="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40"
                      inputClassName="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Limite de tempo (min, opcional)</label>
                  <input
                    type="number"
                    min={0}
                    value={timeLimitMins}
                    onChange={(e) => setTimeLimitMins(e.target.value)}
                    placeholder="Minutos"
                    className="h-11 w-full max-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setStep('montagem')}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                >
                  Voltar
                </button>
              </div>
            </ElevatedCard>
          )}

          {step === 'revisao' && (
            <ElevatedCard accentColor={org.brand_primary} className="mx-auto max-w-2xl p-4 md:p-6">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Revisão do simulado</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">Confira os detalhes antes de publicar.</p>
              <dl className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
                {[
                  { label: 'Modalidade', value: modalityLabel },
                  { label: 'Método', value: methodLabel },
                  { label: 'Questões', value: String(pool.length) },
                  ...(modality !== 'online' ? [{ label: 'Local', value: locationName.trim() || '—' }] : []),
                  ...(!printedMode ? [{ label: 'Início', value: startsAt ? formatDateTime(startsAt) : '—' }, { label: 'Fim', value: endsAt ? formatDateTime(endsAt) : '—' }] : []),
                  { label: 'Tempo limite', value: timeLimitMins ? `${timeLimitMins} min` : 'Sem limite' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <dt className="text-slate-500 dark:text-white/50">{row.label}</dt>
                    <dd className="text-right font-semibold text-slate-800 dark:text-white/80">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/15 dark:text-white/70"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver simulado
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadPdfPreview()}
                  disabled={downloadingPreviewPdf}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-white/15 dark:text-white/70"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {downloadingPreviewPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                </button>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setStep('detalhes')}
                  className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                >
                  Voltar
                </button>
              </div>
            </ElevatedCard>
          )}
        </div>
      </div>

      {showPreview && (
        <SimuladoPreviewModal
          questions={pool}
          brandPrimary={org.brand_primary}
          onBrand={onBrand}
          timeLimitMins={timeLimitMins}
          onClose={() => setShowPreview(false)}
          headerExtra={
            <button
              type="button"
              onClick={() => void handleDownloadPdfPreview()}
              disabled={downloadingPreviewPdf}
              className="text-xs font-bold uppercase px-3 py-2 rounded-lg cursor-pointer min-h-[44px] transition-colors text-slate-500 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              {downloadingPreviewPdf ? 'Gerando PDF...' : 'Baixar PDF'}
            </button>
          }
        />
      )}
    </div>
  );
}
