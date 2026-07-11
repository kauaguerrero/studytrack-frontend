'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandButton, MiniBar,
} from '@/components/partners/founder-ui';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import {
  extractAlternativeImageUrls,
  extractDetachedQuestionImageUrls,
} from '@/components/questions/rendering';
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Eye, PenTool, Sparkles, Timer, Trash2, X } from 'lucide-react';
import { QuestionBankExplorer } from '@/components/assessments/QuestionBankExplorer';
import { AiQuestionFactory } from '@/components/assessments/AiQuestionFactory';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';

type Method = 'bank' | 'ai' | 'manual' | null;

interface SelectedQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro: string;
  context?: string | null;
  images?: unknown;
  alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>;
  correct_alternative?: string | null;
  testletGroupId?: string;
  testletPosition?: number;
  testletTotal?: number;
}

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
  printedMode?: boolean;
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
];

export default function PersonalizedSimuladoWizard({ slug, onClose, onCreated, printedMode, onCreatedPrinted }: Props) {
  const { org } = useOrg();
  const brandText = readableBrandText(org.brand_primary, 'var(--brand-primary)');
  const onBrand = onBrandText(org.brand_primary);
  const [method, setMethod] = useState<Method>(null);
  const [step, setStep] = useState<'pool' | 'config'>('pool');
  const [pool, setPool] = useState<SelectedQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [timeLimitMins, setTimeLimitMins] = useState('');
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  function addToPool(question: PoolCandidate) {
    const normalized: SelectedQuestion = {
      id: question.id,
      subject: question.subject,
      discipline: question.discipline,
      difficulty: question.difficulty,
      alternatives_intro: question.alternatives_intro || 'Questão sem enunciado disponível',
      context: question.context,
      images: question.images,
      alternatives: question.alternatives,
      correct_alternative: question.correct_alternative,
      testletGroupId: question.testlet_group_id || undefined,
      testletPosition: typeof question.metadata?.testlet_order === 'number' ? question.metadata.testlet_order + 1 : undefined,
      testletTotal: typeof question.metadata?.testlet_total === 'number' ? question.metadata.testlet_total : undefined,
    };
    setPool((prev) => (prev.some((item) => item.id === normalized.id) ? prev : [...prev, normalized]));
  }

  function addManyToPool(questions: PoolCandidate[]) {
    questions.forEach(addToPool);
  }

  function removeFromPool(id: string) {
    setPool((prev) => prev.filter((question) => question.id !== id));
  }

  const currentPreviewQuestion = pool[previewIndex] ?? null;
  const previewGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string | null; items: SelectedQuestion[] }> = [];
    pool.forEach((question) => {
      if (question.testletGroupId) {
        const last = groups[groups.length - 1];
        if (last && last.key === question.testletGroupId) {
          last.items.push(question);
        } else {
          groups.push({
            key: question.testletGroupId,
            label: `T${groups.filter((group) => group.label).length + 1}`,
            items: [question],
          });
        }
      } else {
        groups.push({
          key: question.id,
          label: null,
          items: [question],
        });
      }
    });
    return groups;
  }, [pool]);
  const previewGroupIndex = useMemo(() => {
    return Math.max(0, previewGroups.findIndex((group) => group.items.some((item) => item.id === currentPreviewQuestion?.id)));
  }, [currentPreviewQuestion?.id, previewGroups]);
  const currentPreviewGroup = previewGroups[previewGroupIndex] ?? null;
  const isPreviewTestlet = Boolean(currentPreviewGroup?.label && currentPreviewGroup.items.length > 1);
  const previewContextQuestion = currentPreviewGroup?.items[0] ?? null;

  async function handleCreate() {
    if (pool.length < 5) {
      toast.error('Selecione pelo menos 5 questões.');
      return;
    }
    if (!title.trim() || !startsAt) {
      toast.error('Título e data de início são obrigatórios.');
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
        // Fluxo impresso: cria prova impressa com os IDs selecionados
        const res = await fetch(`${api}/api/partners/${slug}/printed-exams`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: title.trim(),
            question_ids: pool.map((q) => q.id),
            config: {
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
        // Fluxo online — comportamento original inalterado
        const body = {
          title: title.trim(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
          config: {
            format: 'custom',
            bank: 'CUSTOM',
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

  const content = useMemo(() => {
    if (method === 'bank') {
      return <QuestionBankExplorer slug={slug} selectedIds={pool.map((item) => item.id)} onSelectQuestion={addToPool} />;
    }
    if (method === 'ai') {
      return <AiQuestionFactory slug={slug} onQuestionSaved={addToPool} />;
    }
    if (method === 'manual') {
      return <ManualQuestionForm slug={slug} onSuccess={addManyToPool} />;
    }
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {methodCards.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => setMethod(item.id)} className="text-left">
              <ElevatedCard accentColor={org.brand_primary} className="h-full p-6 transition-transform duration-200 hover:-translate-y-0.5">
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
    );
  }, [method, pool, slug, org.brand_primary, brandText]);

  return (
    <div className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-[2px]">
      <div className="flex h-[100dvh] w-full overflow-hidden">
        <div className="grid h-full w-full min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-slate-50 dark:bg-slate-950 xl:grid-cols-[320px_minmax(0,1fr)] xl:grid-rows-1 2xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col overflow-hidden border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 xl:border-b-0 xl:border-r">
            <div className="flex items-start justify-between border-b border-slate-200 p-4 dark:border-white/10 md:p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: brandText }}>Novo fluxo</p>
                <h2 className="font-display mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Simulado Personalizado</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/50 xl:max-w-[24ch]">Monte o pool manualmente e avance para a configuração final do simulado na etapa seguinte.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="shrink-0 grid gap-3 p-4 sm:grid-cols-3 md:p-5 xl:grid-cols-1">
              {methodCards.map((item) => {
                const Icon = item.icon;
                const active = method === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id)}
                    className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-all"
                    style={active
                      ? { background: org.brand_primary, color: onBrand, boxShadow: `0 8px 20px -8px ${org.brand_primary}` }
                      : undefined}
                  >
                    <Icon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${active ? '' : 'text-slate-500 dark:text-white/50'}`}
                      style={active ? { color: onBrand } : undefined}
                    />
                    <div className={active ? '' : 'text-slate-700 dark:text-white/70'}>
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className={`mt-1 text-xs ${active ? 'opacity-85' : 'text-slate-500 dark:text-white/40'}`}>{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid min-h-0 gap-4 border-t border-slate-200 p-4 dark:border-white/10 md:p-5 xl:flex-1 xl:grid-cols-1 xl:overflow-hidden">
              <section className="min-h-0 xl:flex xl:min-h-0 xl:flex-col">
                <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Questões selecionadas</div>
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1 md:max-h-52 xl:max-h-none xl:flex-1">
                  {pool.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-white/40">Nenhuma questão adicionada ainda.</div>}
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
              </section>
            </div>
          </aside>

          <main className="min-h-0 min-w-0 overflow-y-auto p-4 md:p-6">
            <RevealGroup className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-4">
              <RevealItem>
                <ElevatedCard accentColor={org.brand_primary} className="sticky top-0 z-20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${step === 'pool' ? '' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40'}`}
                          style={step === 'pool' ? { background: org.brand_primary, color: onBrand } : undefined}
                        >
                          Etapa 1
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${step === 'config' ? '' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40'}`}
                          style={step === 'config' ? { background: org.brand_primary, color: onBrand } : undefined}
                        >
                          Etapa 2
                        </span>
                      </div>
                      <h3 className="font-display mt-3 text-lg font-bold text-slate-900 dark:text-white">Monte o caderno antes de publicar</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
                        {pool.length} questões selecionadas. O mínimo para avançar é 5.
                      </p>
                      <div className="mt-2 max-w-xs">
                        <MiniBar pct={Math.min(100, (pool.length / 5) * 100)} color={pool.length >= 5 ? '#10b981' : org.brand_primary} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIndex(0);
                          setShowPreview(true);
                        }}
                        disabled={pool.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                      >
                        <Eye className="h-4 w-4" />
                        Ver simulado
                      </button>
                      <BrandButton
                        onClick={() => setStep('config')}
                        disabled={pool.length < 5}
                        hex={org.brand_primary}
                      >
                        Próxima etapa
                        <ArrowRight className="h-4 w-4" />
                      </BrandButton>
                    </div>
                  </div>
                </ElevatedCard>
              </RevealItem>

              <RevealItem>{content}</RevealItem>
            </RevealGroup>
          </main>
        </div>
      </div>

      {step === 'config' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]">
          <ElevatedCard accentColor={org.brand_primary} className="w-full max-w-3xl shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10 md:px-6 md:py-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: brandText }}>
                  Etapa 2
                </p>
                <h3 className="font-display mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Configuração do Simulado</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-white/50">Defina os dados finais para publicar esse simulado personalizado para a turma.</p>
              </div>
              <button type="button" onClick={() => setStep('pool')} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Título</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Simulado Personalizado — Semana 4"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Data de início</label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Data de fim</label>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Resumo</div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-white/60">{pool.length} questões selecionadas, mesmo caderno para toda a turma.</div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/40">Limite de tempo</label>
                  <input
                    type="number"
                    min={0}
                    value={timeLimitMins}
                    onChange={(e) => setTimeLimitMins(e.target.value)}
                    placeholder="Minutos"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between md:px-6">
              <button type="button" onClick={() => setStep('pool')} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5">
                Voltar para questões
              </button>
              <BrandButton
                onClick={() => void handleCreate()}
                disabled={creating || !title.trim() || !startsAt || pool.length < 5}
                hex={org.brand_primary}
              >
                {creating ? 'Criando...' : 'Criar Simulado'}
              </BrandButton>
            </div>
          </ElevatedCard>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[120] bg-[#F5F5F7] flex flex-col">
          <div className="shrink-0">
            <div className="bg-white border-b border-slate-100 px-4 py-2 shadow-sm flex justify-between items-center gap-3">
              <div className="shrink-0 flex flex-col items-start gap-0.5">
                <div className="text-xs sm:text-sm font-extrabold text-slate-500 tabular-nums leading-none">
                  {Math.min(previewGroupIndex + 1, Math.max(previewGroups.length, 1))}
                  <span className="text-slate-300"> / {previewGroups.length}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 tabular-nums leading-none">
                  <Timer className="w-3 h-3" />
                  preview do aluno
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center font-mono font-black tabular-nums px-3 py-1.5 rounded-xl border-2 bg-slate-50 text-slate-700 border-slate-200">
                  <span className="text-[10px] font-semibold uppercase tracking-wide leading-none mb-0.5 opacity-60">
                    {timeLimitMins ? 'Tempo' : 'Livre'}
                  </span>
                  <span className="text-base sm:text-lg leading-none">
                    {timeLimitMins ? `${timeLimitMins}:00` : '--:--'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-xs font-bold uppercase px-3 py-2 rounded-lg cursor-pointer min-h-[44px] transition-colors text-red-500 hover:bg-red-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="h-1 bg-slate-200">
              <div
                className="h-1 transition-all duration-300 ease-out"
                style={{
                  width: `${previewGroups.length > 0 ? ((previewGroupIndex + 1) / previewGroups.length) * 100 : 0}%`,
                  background: org.brand_primary,
                }}
              />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto overscroll-y-contain">
            <div className="max-w-3xl mx-auto w-full px-4 py-6">
              {!currentPreviewQuestion || !currentPreviewGroup ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                  Adicione questões ao pool para visualizar o simulado.
                </div>
              ) : (
                <>
                  <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: org.brand_primary, color: onBrand }}>
                          {previewContextQuestion?.subject}
                        </span>
                        {previewContextQuestion?.difficulty && (
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                            {previewContextQuestion.difficulty}
                          </span>
                        )}
                        {previewContextQuestion?.discipline && (
                          <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                            {previewContextQuestion.discipline}
                          </span>
                        )}
                        {isPreviewTestlet && (
                          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                            Testlet ({currentPreviewGroup.items.length} itens)
                          </span>
                        )}
                      </div>
                    </div>

                    {isPreviewTestlet && (
                      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-800">
                        Leia o texto a seguir para responder as próximas {currentPreviewGroup.items.length} questões
                      </div>
                    )}

                    {previewContextQuestion?.context && (
                      <QuestionRichText
                        text={previewContextQuestion.context}
                        className="prose prose-slate max-w-none mb-5 text-slate-600 border-l-4 pl-4 text-sm leading-relaxed"
                        style={{ borderColor: org.brand_primary }}
                      />
                    )}

                    {(() => {
                      const supportImages = extractDetachedQuestionImageUrls(
                        previewContextQuestion?.images,
                        previewContextQuestion?.context,
                        previewContextQuestion?.alternatives_intro,
                      );
                      if (supportImages.length === 0) return null;
                      return (
                        <div className="mb-5">
                          {supportImages.map((img, i) => (
                            <div key={`${previewContextQuestion?.id || 'group'}-img-${i}`} className="mb-5 flex justify-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <img src={img} alt="Imagem de apoio da questão" className="max-h-40 md:max-h-52 w-auto max-w-full object-contain rounded-lg" />
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="space-y-6">
                      {currentPreviewGroup.items.map((question, index) => (
                        <div key={question.id} className={`rounded-2xl border p-5 ${isPreviewTestlet ? 'border-slate-200 bg-slate-50/70' : 'border-transparent bg-transparent p-0'}`}>
                          {isPreviewTestlet && (
                            <div className="mb-4">
                              <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                                Testlet {index + 1}/{currentPreviewGroup.items.length}
                              </span>
                            </div>
                          )}

                          <QuestionRichText
                            text={question.alternatives_intro}
                            className="prose prose-slate max-w-none text-base md:text-lg text-slate-900 font-medium mb-7 leading-relaxed"
                          />

                          <div className="space-y-3">
                            {(question.alternatives || []).map((alt) => {
                              const alternativeImages = extractAlternativeImageUrls(alt);
                              return (
                                <div key={`${question.id}-${alt.letter}`} className="w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start bg-white border-slate-200">
                                  <span className="w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-extrabold shrink-0 transition-colors bg-slate-50 text-slate-500 border-slate-200">
                                    {alt.letter}
                                  </span>
                                  <div className="flex-1 pt-1">
                                    {alternativeImages.length > 0 && (
                                      <div className="mb-2">
                                        {alternativeImages.map((imageUrl, imageIndex) => (
                                          <img
                                            key={`${question.id}-${alt.letter}-img-${imageIndex}`}
                                            src={imageUrl}
                                            alt={`Alternativa ${alt.letter}`}
                                            className={`max-h-32 md:max-h-36 rounded-lg border border-slate-200 object-contain bg-white ${imageIndex > 0 ? 'mt-2' : ''}`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    {alt.text ? (
                                      <QuestionRichText text={alt.text} className="text-sm leading-snug text-slate-700" />
                                    ) : alternativeImages.length === 0 ? (
                                      <span className="text-sm italic text-slate-400">
                                        Conteúdo da alternativa indisponível.
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-5">
                    {previewGroups.map((group, i) => (
                      <button
                        key={group.key}
                        type="button"
                        onClick={() => {
                          const firstQuestion = group.items[0];
                          const poolIndex = pool.findIndex((item) => item.id === firstQuestion.id);
                          if (poolIndex >= 0) setPreviewIndex(poolIndex);
                        }}
                        className={`min-w-8 rounded-full px-3 h-8 text-xs font-extrabold transition-all cursor-pointer ${
                          i === previewGroupIndex ? 'scale-110 shadow-sm' : 'bg-slate-200 text-slate-600'
                        }`}
                        style={i === previewGroupIndex ? { background: org.brand_primary, color: onBrand } : {}}
                      >
                        {group.label ?? i + 1}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </main>

          <div className="shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-100 p-4">
            <div className="max-w-3xl mx-auto w-full flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const prevGroup = previewGroups[previewGroupIndex - 1];
                  if (!prevGroup) return;
                  const poolIndex = pool.findIndex((item) => item.id === prevGroup.items[0].id);
                  if (poolIndex >= 0) setPreviewIndex(poolIndex);
                }}
                disabled={previewGroupIndex === 0}
                className="flex-1 px-4 py-3 text-slate-500 disabled:opacity-30 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
              </button>

              {previewGroupIndex < previewGroups.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    const nextGroup = previewGroups[previewGroupIndex + 1];
                    if (!nextGroup) return;
                    const poolIndex = pool.findIndex((item) => item.id === nextGroup.items[0].id);
                    if (poolIndex >= 0) setPreviewIndex(poolIndex);
                  }}
                  className="flex-[1.35] px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
                  style={{ background: org.brand_primary, color: onBrand }}
                >
                  {isPreviewTestlet ? 'Próximo bloco' : 'Próxima'} <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="flex-[1.35] bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors cursor-pointer min-h-[44px]"
                >
                  Fechar preview <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
