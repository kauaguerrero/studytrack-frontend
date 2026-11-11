'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandButton, MiniBar,
} from '@/components/partners/founder-ui';
import { ArrowLeft, ArrowRight, Database, Eye, FileText, MapPin, PenTool, Sparkles, Trash2 } from 'lucide-react';
import { WizardStepper, type WizardStepperStep } from '@/components/partners/simulado/WizardStepper';
import { DateTimeField } from '@/components/partners/simulado/DateTimeField';
import { formatDateTime } from '@/lib/simuladoFounderForm';
import { QuestionBankExplorer } from '@/components/assessments/QuestionBankExplorer';
import { AiQuestionFactory } from '@/components/assessments/AiQuestionFactory';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';
import { ContestQuotaBuilder } from './ContestQuotaBuilder';
import SimuladoPreviewModal from '@/components/partners/simulados/SimuladoPreviewModal';
import { downloadBlobResponse } from '@/lib/download-blob';
import type { SelectedQuestion } from '@/types/simulado-preview';
import { toCustomQuestionSnapshot, deriveContextAndStatement } from '@/types/simulado-preview';

type Method = 'bank' | 'ai' | 'manual' | 'quotas' | null;
type Step = 'metodo' | 'montagem' | 'detalhes' | 'revisao';

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
  // Etapa 1) — usado só para travar o tipo de banca dentro do método "Banco
  // de Questões" (QuestionBankExplorer), que antes deixava trocar livremente
  // entre vestibular/concurso mesmo já tendo essa decisão tomada.
  simuladoFormat: 'vestibular' | 'concurso';
  onCreatedPrinted?: (printedExamId: string) => void;
}

const methodCards: Array<{
  id: Exclude<Method, null>;
  title: string;
  description: string;
  icon: typeof Database;
}> = [
  { id: 'bank', title: 'Banco de Questões', description: 'Busque itens verificados e monte o pool manualmente.', icon: Database },
  { id: 'ai', title: 'Gerar com IA', description: 'Descreva o tema e revise a questão antes de salvar.', icon: Sparkles },
  { id: 'manual', title: 'Criar do Zero', description: 'Escreva enunciado, alternativas e gabarito manualmente.', icon: PenTool },
  { id: 'quotas', title: 'Composição por matérias e assuntos', description: 'Combine matérias e quantidades para selecionar questões verificadas.', icon: Database },
];

export default function PersonalizedSimuladoWizard({ slug, onClose, onCreated, modality, simuladoFormat, onCreatedPrinted }: Props) {
  const { org } = useOrg();
  const brandText = readableBrandText(org.brand_primary, 'var(--brand-primary)');
  const onBrand = onBrandText(org.brand_primary);
  const printedMode = modality === 'printed';
  const [method, setMethod] = useState<Method>(null);
  const [step, setStep] = useState<Step>('metodo');
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

  const steps: WizardStepperStep[] = [
    { key: 'metodo', label: 'Método' },
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
  const methodLabel = methodCards.find((m) => m.id === method)?.title ?? '—';

  const toolContent = useMemo(() => {
    if (method === 'quotas') {
      return (
        <ContestQuotaBuilder
          slug={slug}
          brandTextColor={onBrand}
          onExit={() => setStep('metodo')}
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
      return <QuestionBankExplorer slug={slug} selectedIds={pool.map((item) => item.id)} onSelectQuestion={addToPool} lockedQuestionType={simuladoFormat} />;
    }
    if (method === 'ai') {
      return <AiQuestionFactory slug={slug} onQuestionSaved={addToPool} />;
    }
    if (method === 'manual') {
      return <ManualQuestionForm slug={slug} onSuccess={addManyToPool} />;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, pool, slug]);

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
        <header className="mb-4 flex items-start gap-3">
          <button
            onClick={onClose}
            aria-label="Cancelar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white lg:text-xl">Novo Simulado — Personalizado</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50 lg:text-sm">Monte o pool de questões e configure a publicação pra turma.</p>
          </div>
        </header>

        <div className="mb-4">
          <WizardStepper steps={steps} currentIndex={currentIndex} brandTextColor={onBrand} />
        </div>

        <div className="flex-1 space-y-4">
          {step === 'metodo' && (
            <ElevatedCard accentColor={org.brand_primary} className="p-4 md:p-6">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Como você quer montar as questões?</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                {pool.length > 0 ? `${pool.length} questões já selecionadas — trocar de método não as descarta.` : 'Escolha uma ferramenta pra montar o pool deste simulado.'}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {methodCards.filter((item) => item.id !== 'quotas' || Boolean(org.permissions?.concursos_enabled)).map((item) => {
                  const Icon = item.icon;
                  const active = method === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setMethod(item.id); setContest(null); setStep('montagem'); }}
                      className="text-left"
                    >
                      <ElevatedCard
                        accentColor={org.brand_primary}
                        className={`h-full p-6 transition-transform duration-200 hover:-translate-y-0.5 ${active ? 'ring-2' : ''}`}
                      >
                        <div
                          className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
                          style={{ background: `color-mix(in srgb, ${org.brand_primary} 16%, white)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: brandText }} />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/50">{item.description}</p>
                      </ElevatedCard>
                    </button>
                  );
                })}
              </div>
            </ElevatedCard>
          )}

          {step === 'montagem' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <RevealGroup className="min-w-0 space-y-4">
                <RevealItem>
                  <ElevatedCard accentColor={org.brand_primary} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/40">Método: {methodLabel}</p>
                        <p className="mt-1 text-sm text-slate-700 dark:text-white/70">
                          {pool.length} questões selecionadas
                          {pool.length > 0 && ` · ${new Set(pool.map((q) => q.subject)).size} matérias`}. O mínimo pra avançar é 5.
                        </p>
                        <div className="mt-2 max-w-xs">
                          <MiniBar pct={Math.min(100, (pool.length / 5) * 100)} color={pool.length >= 5 ? '#10b981' : org.brand_primary} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPreview(true)}
                          disabled={pool.length === 0}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                        >
                          <Eye className="h-4 w-4" />
                          Ver simulado
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadPdfPreview()}
                          disabled={pool.length === 0 || downloadingPreviewPdf}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                        >
                          <FileText className="h-4 w-4" />
                          {downloadingPreviewPdf ? 'Gerando PDF...' : 'Baixar PDF'}
                        </button>
                      </div>
                    </div>
                  </ElevatedCard>
                </RevealItem>
                <RevealItem>{toolContent}</RevealItem>
              </RevealGroup>

              <aside className="min-w-0 space-y-3">
                <ElevatedCard accentColor={org.brand_primary} className="p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Questões selecionadas</p>
                  <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                    {pool.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-white/40">
                        Nenhuma questão adicionada ainda.
                      </div>
                    )}
                    {pool.map((question) => (
                      <div key={question.id} className={`rounded-2xl bg-slate-50 p-3 dark:bg-white/5 ${question.testletGroupId ? 'border-l-4 border-amber-300 dark:border-amber-400/60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="mb-1 inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-white/10 dark:text-white/70">{question.subject}</div>
                            {question.testletGroupId && question.testletTotal ? (
                              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Testlet ({question.testletTotal} itens) • Item {question.testletPosition}
                              </div>
                            ) : null}
                            <div className="text-sm text-slate-700 dark:text-white/60">{question.alternatives_intro.slice(0, 60)}{question.alternatives_intro.length > 60 ? '...' : ''}</div>
                          </div>
                          <button type="button" onClick={() => removeFromPool(question.id)} className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-red-500 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ElevatedCard>
              </aside>
            </div>
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
            </ElevatedCard>
          )}
        </div>

        {!(method === 'quotas' && step === 'montagem') && (
        <div className="sticky bottom-0 mt-4 flex flex-col-reverse gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-900 sm:flex-row">
          {step === 'metodo' ? (
            <button
              onClick={onClose}
              className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
          ) : (
            <button
              onClick={() => setStep(step === 'montagem' ? 'metodo' : step === 'detalhes' ? 'montagem' : 'detalhes')}
              className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
            >
              Voltar
            </button>
          )}
          {step === 'metodo' && (
            <p className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-xs font-semibold text-slate-400 dark:border-white/15 dark:text-white/40">
              Escolha uma ferramenta acima pra continuar
            </p>
          )}
          {step === 'montagem' && (
            <button
              onClick={() => setStep('detalhes')}
              disabled={pool.length < 5}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: org.brand_primary, color: onBrand }}
            >
              Avançar <ArrowRight size={16} />
            </button>
          )}
          {step === 'detalhes' && (
            <button
              onClick={() => {
                if (!title.trim() || (!printedMode && !startsAt)) {
                  toast.error(printedMode ? 'Título é obrigatório.' : 'Título e data de início são obrigatórios.');
                  return;
                }
                if (invalidScheduleEnd) {
                  toast.error('O fim deve ser depois do início.');
                  return;
                }
                setStep('revisao');
              }}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
              style={{ background: org.brand_primary, color: onBrand }}
            >
              Avançar: Revisão <ArrowRight size={16} />
            </button>
          )}
          {step === 'revisao' && (
            <BrandButton onClick={() => void handleCreate()} disabled={creating} hex={org.brand_primary} className="flex-1 justify-center">
              {creating ? 'Criando...' : printedMode ? 'Gerar prova impressa' : 'Criar Simulado'}
            </BrandButton>
          )}
        </div>
        )}
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
