'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { getSubjects, getTopics } from '@/constants/taxonomy';
import { CheckCircle2, FileText, LayoutList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TestletQuestionForm } from '@/components/assessments/TestletQuestionForm';

interface SavedQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro: string;
  testlet_group_id?: string | null;
  metadata?: {
    testlet_order?: number;
    testlet_total?: number;
    [key: string]: unknown;
  } | null;
}

interface Props {
  onSuccess: (questions: SavedQuestion[]) => void;
  slug: string;
}

type QuestionType = 'traditional' | 'testlet';

export function ManualQuestionForm({ onSuccess, slug }: Props) {
  const [questionType, setQuestionType] = useState<QuestionType>('traditional');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: 'Matemática',
    discipline: '',
    difficulty: 'Médio',
    statement: '',
    context: '',
    alternatives: [
      { letter: 'A', text: '' },
      { letter: 'B', text: '' },
      { letter: 'C', text: '' },
      { letter: 'D', text: '' },
      { letter: 'E', text: '' },
    ],
    correct_alternative: '',
    explanation: '',
  });

  useEffect(() => {
    setForm((prev) => ({ ...prev, discipline: '' }));
  }, [form.subject]);

  async function handleSubmit() {
    if (!form.statement.trim()) {
      toast.error('O enunciado é obrigatório.');
      return;
    }
    if (!form.correct_alternative) {
      toast.error('Selecione a alternativa correta.');
      return;
    }
    if (form.alternatives.some((alt) => !alt.text.trim())) {
      toast.error('Preencha todas as alternativas.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          ...form,
          alternatives: form.alternatives.map((alt) => ({
            ...alt,
            isCorrect: alt.letter === form.correct_alternative,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar questão.');
      onSuccess([data.question]);
      toast.success('Questão manual adicionada ao pool.');
      setForm({
        subject: 'Matemática',
        discipline: '',
        difficulty: 'Médio',
        statement: '',
        context: '',
        alternatives: [
          { letter: 'A', text: '' },
          { letter: 'B', text: '' },
          { letter: 'C', text: '' },
          { letter: 'D', text: '' },
          { letter: 'E', text: '' },
        ],
        correct_alternative: '',
        explanation: '',
      });
    } catch (error) {
      void reportError('PartnerManualQuestionFormError', String(error), { slug });
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a questão manual.');
    } finally {
      setLoading(false);
    }
  }

  const subjects = getSubjects();
  const topics = getTopics(form.subject);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setQuestionType('traditional')}
          className={`rounded-3xl border p-5 text-left transition ${questionType === 'traditional' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
        >
          <FileText className="h-5 w-5" />
          <h3 className="mt-3 text-base font-bold">Questão Tradicional</h3>
          <p className={`mt-1 text-sm ${questionType === 'traditional' ? 'text-slate-200' : 'text-slate-500'}`}>Uma única questão com enunciado, 5 alternativas e gabarito.</p>
        </button>
        <button
          type="button"
          onClick={() => setQuestionType('testlet')}
          className={`rounded-3xl border p-5 text-left transition ${questionType === 'testlet' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
        >
          <LayoutList className="h-5 w-5" />
          <h3 className="mt-3 text-base font-bold">Questão Testlet</h3>
          <p className={`mt-1 text-sm ${questionType === 'testlet' ? 'text-slate-200' : 'text-slate-500'}`}>Um texto-base compartilhado com múltiplas perguntas relacionadas.</p>
        </button>
      </div>

      {questionType === 'testlet' ? (
        <div className="mt-5">
          <TestletQuestionForm slug={slug} onSuccess={onSuccess} />
        </div>
      ) : (
        <>
          <div className="mt-5 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Criar do zero</h3>
              <p className="mt-1 text-sm text-slate-500">Preencha o item completo e adicione direto ao pool do simulado.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <select value={form.subject} onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
              {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={form.discipline} onChange={(e) => setForm((prev) => ({ ...prev, discipline: e.target.value }))} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
              <option value="">Selecione o tópico</option>
              {topics.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={form.difficulty} onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
              <option value="Fácil">Fácil</option>
              <option value="Médio">Médio</option>
              <option value="Difícil">Difícil</option>
            </select>
          </div>
          <div className="mt-4 space-y-4">
            <textarea value={form.context} onChange={(e) => setForm((prev) => ({ ...prev, context: e.target.value }))} placeholder="Contexto opcional" className="min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
            <textarea value={form.statement} onChange={(e) => setForm((prev) => ({ ...prev, statement: e.target.value }))} placeholder="Enunciado da questão" className="min-h-28 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
            <div className="space-y-3">
              {form.alternatives.map((alt, index) => (
                <div key={alt.letter} className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, correct_alternative: alt.letter }))}
                    className={`h-11 w-11 rounded-2xl border text-sm font-bold ${form.correct_alternative === alt.letter ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-700'}`}
                  >
                    {alt.letter}
                  </button>
                  <input
                    value={alt.text}
                    onChange={(e) => {
                      const alternatives = [...form.alternatives];
                      alternatives[index].text = e.target.value;
                      setForm((prev) => ({ ...prev, alternatives }));
                    }}
                    placeholder={`Alternativa ${alt.letter}`}
                    className="h-11 flex-1 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
              ))}
            </div>
            <textarea value={form.explanation} onChange={(e) => setForm((prev) => ({ ...prev, explanation: e.target.value }))} placeholder="Explicação do gabarito" className="min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]" />
            <div className="sticky bottom-0 -mx-6 mt-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">Quando terminar, a questão será salva e entra imediatamente no pool à esquerda.</p>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Adicionar questão ao simulado
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
