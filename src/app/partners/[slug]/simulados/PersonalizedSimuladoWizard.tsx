'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useOrg } from '@/contexts/OrgContext';
import { readableBrandText, onBrandText } from '@/lib/brand-color';
import {
  RevealGroup, RevealItem, ElevatedCard, BrandButton, MiniBar,
} from '@/components/partners/founder-ui';
import { ArrowRight, Database, Eye, FileText, PenTool, Sparkles, Trash2, X } from 'lucide-react';
import { QuestionBankExplorer } from '@/components/assessments/QuestionBankExplorer';
import { AiQuestionFactory } from '@/components/assessments/AiQuestionFactory';
import { ManualQuestionForm } from '@/components/assessments/ManualQuestionForm';
import SimuladoPreviewModal from '@/components/partners/simulados/SimuladoPreviewModal';
import { downloadBlobResponse } from '@/lib/download-blob';
import type { SelectedQuestion } from '@/types/simulado-preview';
import { toCustomQuestionSnapshot, deriveContextAndStatement } from '@/types/simulado-preview';

type Method = 'bank' | 'ai' | 'manual' | null;

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
  const [downloadingPreviewPdf, setDownloadingPreviewPdf] = useState(false);

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
                        onClick={() => setShowPreview(true)}
                        disabled={pool.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                      >
                        <Eye className="h-4 w-4" />
                        Ver simulado
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadPdfPreview()}
                        disabled={pool.length === 0 || downloadingPreviewPdf}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
                      >
                        <FileText className="h-4 w-4" />
                        {downloadingPreviewPdf ? 'Gerando PDF...' : 'Baixar PDF'}
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
