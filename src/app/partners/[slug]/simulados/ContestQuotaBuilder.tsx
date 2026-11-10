'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { WizardStepper, type WizardStepperStep } from '@/components/partners/simulado/WizardStepper';
import { MateriasComposicaoStep } from '@/components/partners/simulado/MateriasComposicaoStep';
import { useFounderConcursoFacets } from '@/hooks/useFounderConcursoFacets';
import { formatCargoLabel } from '@/lib/simuladoFounderForm';
import {
  type Composicao, composicaoSlotId, composicaoToApiCompositions, composicaoTotalQty,
} from '@/lib/simuladoComposicao';

type Candidate = { id: string; subject: string; discipline?: string | null; difficulty?: string | null; alternatives_intro?: string | null; context?: string | null; images?: unknown; alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>; correct_alternative?: string | null; testlet_group_id?: string | null; metadata?: { testlet_order?: number; testlet_total?: number; [key: string]: unknown } | null };

const QTY_PRESETS = [10, 15, 30, 45, 90, 180];
const MAX_QTY = 180;

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Mini-fluxo de 3 telas (Banca/Cargo → Quantidade → Composição), mesmo
// mecanismo de disponibilidade/redistribuição já validado no wizard do aluno
// (MateriasComposicaoStep) — substitui a checagem antiga (só avisava em
// texto quando a quota excedia a disponibilidade, sem travar).
export function ContestQuotaBuilder({
  slug, onGenerated, onExit, brandTextColor = '#ffffff',
}: { slug: string; onGenerated?: (questions: Candidate[], bank: string, role: string) => void; onExit?: () => void; brandTextColor?: string }) {
  const [step, setStep] = useState<'bancaCargo' | 'quantidade' | 'composicao'>('bancaCargo');
  const [bank, setBank] = useState('');
  const [role, setRole] = useState('');
  const [qty, setQty] = useState(10);
  const [composicao, setComposicao] = useState<Composicao>([]);
  const [includeAnswered, setIncludeAnswered] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { facets, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useFounderConcursoFacets(slug);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

  const steps: WizardStepperStep[] = [
    { key: 'bancaCargo', label: 'Banca' },
    { key: 'quantidade', label: 'Quantidade' },
    { key: 'composicao', label: 'Matérias e assuntos' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  const currentFacets = facets.filter((f) => (!bank || f.bank === bank) && (!role || f.role === role));
  const subjectValues = unique(currentFacets.map((f) => f.subject));
  const subjectsOptions = subjectValues.map((value) => ({ value, label: value }));
  const topicsBySubject: Record<string, { name: string; count: number }[]> = {};
  subjectValues.forEach((subject) => {
    const counts = new Map<string, number>();
    currentFacets.filter((f) => f.subject === subject && f.discipline).forEach((f) => {
      const key = f.discipline as string;
      counts.set(key, (counts.get(key) ?? 0) + (f.count ?? 1));
    });
    topicsBySubject[subject] = [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  });
  const availabilityBySlot = useMemo(() => {
    const map: Record<string, number> = {};
    subjectValues.forEach((subject) => {
      const subjectTotal = currentFacets.filter((f) => f.subject === subject).reduce((sum, f) => sum + (f.count ?? 1), 0);
      map[composicaoSlotId(subject)] = subjectTotal;
      (topicsBySubject[subject] ?? []).forEach((t) => {
        map[composicaoSlotId(subject, t.name)] = t.count;
      });
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFacets, subjectValues]);

  async function generate() {
    setGenerating(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/compose`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank, role: role || null, compositions: composicaoToApiCompositions(composicao, includeAnswered) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na composição.');
      onGenerated?.(data.questions, bank, role);
      toast.success('Questões selecionadas. Confira o simulado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na composição.');
    } finally {
      setGenerating(false);
    }
  }

  const inputCls = 'w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 pr-10 text-sm font-semibold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  const labelCls = 'mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400';

  return (
    <div className="space-y-4">
      <WizardStepper steps={steps} currentIndex={currentIndex} brandTextColor={brandTextColor} />

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        {catalogLoading && <p role="status" className="text-sm text-slate-500">Carregando bancas e matérias disponíveis...</p>}
        {catalogError && (
          <div role="alert" className="rounded-xl border border-amber-300 p-3 text-sm text-amber-800 dark:text-amber-300">
            Não foi possível carregar as opções. <button type="button" onClick={retryCatalog} className="font-bold underline">Tentar novamente</button>
          </div>
        )}

        {step === 'bancaCargo' && !catalogLoading && !catalogError && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Banca e cargo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Escolha a banca e o cargo do concurso.</p>
            </div>
            <div>
              <label className={labelCls}>Banca</label>
              <div className="relative">
                <select
                  aria-label="Banca"
                  value={bank}
                  onChange={(e) => { setBank(e.target.value); setRole(''); setComposicao([]); }}
                  className={inputCls}
                >
                  <option value="">Selecione a banca</option>
                  {unique(facets.map((f) => f.bank)).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Cargo</label>
              <div className="relative">
                <select
                  aria-label="Cargo"
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setComposicao([]); }}
                  className={inputCls}
                >
                  <option value="">Todos os cargos</option>
                  {unique(facets.filter((f) => !bank || f.bank === bank).map((f) => f.role)).map((v) => <option key={v} value={v}>{formatCargoLabel(v)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {step === 'quantidade' && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Quantidade de questões</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Na próxima etapa você escolhe matérias e assuntos — o sistema distribui essas questões entre eles.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {QTY_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  aria-pressed={qty === val}
                  onClick={() => setQty(val)}
                  className={`cursor-pointer rounded-xl border-2 p-2.5 text-sm font-bold transition-all ${
                    qty === val
                      ? 'border-transparent'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                  style={qty === val ? { background: 'var(--brand-primary, #4f46e5)', color: brandTextColor } : undefined}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ou defina um valor:</span>
              <input
                type="number"
                aria-label="Quantidade de questões"
                min={1}
                max={MAX_QTY}
                value={qty}
                onChange={(e) => {
                  const raw = parseInt(e.target.value, 10);
                  setQty(Number.isNaN(raw) ? 1 : Math.min(Math.max(raw, 1), MAX_QTY));
                }}
                className="w-24 rounded-xl border border-slate-200 bg-white p-2 text-center text-sm font-bold text-slate-700 outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">Max: {MAX_QTY}</span>
            </div>
          </div>
        )}

        {step === 'composicao' && (
          <MateriasComposicaoStep
            apiUrl={api}
            accessToken={null}
            bank={bank || 'Todas'}
            year="Todos"
            difficultyLabel={null}
            qty={qty}
            composicao={composicao}
            setComposicao={setComposicao}
            includeAnswered={includeAnswered}
            setIncludeAnswered={setIncludeAnswered}
            subjects={subjectsOptions}
            topicsBySubject={topicsBySubject}
            availabilityBySlot={availabilityBySlot}
          />
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            if (step === 'bancaCargo') {
              onExit?.();
              return;
            }
            setStep(step === 'quantidade' ? 'bancaCargo' : 'quantidade');
          }}
          disabled={step === 'bancaCargo' && !onExit}
          className="min-h-11 cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
          Voltar
        </button>
        {step === 'bancaCargo' && (
          <button
            type="button"
            onClick={() => setStep('quantidade')}
            disabled={!bank}
            style={{ background: 'var(--brand-primary, #4f46e5)', color: brandTextColor }}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            Avançar <ArrowRight size={16} />
          </button>
        )}
        {step === 'quantidade' && (
          <button
            type="button"
            onClick={() => setStep('composicao')}
            style={{ background: 'var(--brand-primary, #4f46e5)', color: brandTextColor }}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
          >
            Avançar: Selecionar matérias e assuntos <ArrowRight size={16} />
          </button>
        )}
        {step === 'composicao' && (
          <button
            type="button"
            disabled={generating || composicaoTotalQty(composicao) !== qty}
            onClick={() => void generate()}
            style={{ background: 'var(--brand-primary, #4f46e5)', color: brandTextColor }}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? 'Selecionando...' : 'Selecionar questões'}
          </button>
        )}
      </div>
    </div>
  );
}
