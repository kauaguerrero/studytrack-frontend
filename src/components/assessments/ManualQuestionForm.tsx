'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { CheckCircle2, FileText, LayoutList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TestletQuestionForm } from '@/components/assessments/TestletQuestionForm';
import { QuestionEditableFields, emptyEditableQuestion, type EditableQuestionValue } from '@/components/assessments/QuestionEditableFields';
import { PublicPrivateDialog } from '@/components/assessments/PublicPrivateDialog';

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
  const [showPublicPrivate, setShowPublicPrivate] = useState(false);
  const [form, setForm] = useState<EditableQuestionValue>(emptyEditableQuestion());

  function validate(): string | null {
    if (!form.statement.trim()) return 'O enunciado é obrigatório.';
    if (!form.discipline) return 'Selecione o tópico/assunto da matéria.';
    if (!form.correct_alternative) return 'Selecione a alternativa correta.';
    if (form.alternatives.some((alt) => !alt.text.trim())) return 'Preencha todas as alternativas.';
    return null;
  }

  function handleAddClick() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setShowPublicPrivate(true);
  }

  async function handleSubmit(isPublic: boolean) {
    setShowPublicPrivate(false);
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
          subject: form.subject,
          discipline: form.discipline,
          difficulty: form.difficulty,
          statement: form.statement,
          context: form.context,
          images: form.images,
          explanation: form.explanation,
          is_public: isPublic,
          alternatives: form.alternatives.map((alt) => ({
            ...alt,
            isCorrect: alt.letter === form.correct_alternative,
          })),
          correct_alternative: form.correct_alternative,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar questão.');
      onSuccess([data.question]);
      toast.success('Questão manual adicionada ao pool.');
      setForm(emptyEditableQuestion());
    } catch (error) {
      void reportError('PartnerManualQuestionFormError', String(error), { slug });
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a questão manual.');
    } finally {
      setLoading(false);
    }
  }

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
          <div className="mt-4">
            <QuestionEditableFields value={form} onChange={setForm} slug={slug} />
            <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">Quando terminar, a questão será salva e entra imediatamente no pool à esquerda.</p>
                <button
                  type="button"
                  onClick={handleAddClick}
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

      <PublicPrivateDialog
        open={showPublicPrivate}
        onClose={() => setShowPublicPrivate(false)}
        onChoose={(isPublic) => void handleSubmit(isPublic)}
      />
    </div>
  );
}
