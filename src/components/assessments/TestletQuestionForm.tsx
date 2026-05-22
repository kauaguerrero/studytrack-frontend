'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { getSubjects, getTopics } from '@/constants/taxonomy';
import { ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface TestletQuestion {
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
  slug: string;
  onSuccess: (questions: TestletQuestion[]) => void;
}

interface SubItem {
  alternatives_intro: string;
  alternatives: { letter: string; text: string }[];
  correct_alternative: string;
  explanation: string;
}

function emptyItem(): SubItem {
  return {
    alternatives_intro: '',
    alternatives: [
      { letter: 'A', text: '' },
      { letter: 'B', text: '' },
      { letter: 'C', text: '' },
      { letter: 'D', text: '' },
      { letter: 'E', text: '' },
    ],
    correct_alternative: '',
    explanation: '',
  };
}

export function TestletQuestionForm({ slug, onSuccess }: Props) {
  const [subject, setSubject] = useState('Linguagens');
  const [discipline, setDiscipline] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [context, setContext] = useState('');
  const [contextImageUrl, setContextImageUrl] = useState('');
  const [items, setItems] = useState<SubItem[]>([emptyItem(), emptyItem()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDiscipline('');
  }, [subject]);

  const subjects = getSubjects();
  const topics = getTopics(subject);

  const isInvalid = !(
    (context.trim() || contextImageUrl.trim()) &&
    items.every(
      (item) =>
        item.alternatives_intro.trim() &&
        item.correct_alternative &&
        item.alternatives.every((alt) => alt.text.trim()),
    )
  );

  function updateItem(index: number, next: Partial<SubItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...next } : item)));
  }

  function addItem() {
    setItems((prev) => (prev.length >= 10 ? prev : [...prev, emptyItem()]));
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit() {
    if (isInvalid) {
      toast.error('Preencha o contexto e todas as sub-questões antes de salvar.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/testlet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          subject,
          discipline: discipline || undefined,
          difficulty,
          context: context.trim(),
          context_image_url: contextImageUrl.trim() || undefined,
          items: items.map((item) => ({
            ...item,
            alternatives: item.alternatives.map((alt) => ({
              ...alt,
              isCorrect: alt.letter === item.correct_alternative,
            })),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar testlet.');
      const savedQuestions = Array.isArray(data.questions) ? data.questions : [];
      onSuccess(savedQuestions);
      toast.success(`Testlet criado! ${savedQuestions.length} questões adicionadas ao seu simulado.`);
      setContext('');
      setContextImageUrl('');
      setItems([emptyItem(), emptyItem()]);
    } catch (error) {
      void reportError('PartnerTestletQuestionFormError', String(error), { slug });
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o testlet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
          {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
          <option value="">Selecione o tópico</option>
          {topics.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
          <option value="Fácil">Fácil</option>
          <option value="Médio">Médio</option>
          <option value="Difícil">Difícil</option>
        </select>
      </div>

      <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50/70 p-5">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Texto-base</div>
        <p className="mt-1 text-sm font-medium text-blue-900">TEXTO-BASE (compartilhado por todas as perguntas)</p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Cole o texto, trecho literário, dado estatístico, etc..."
          className="mt-4 min-h-32 w-full rounded-3xl border border-blue-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
        />
        <div className="mt-4">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ImageIcon className="h-4 w-4" />
            URL da imagem (opcional)
          </label>
          <input
            value={contextImageUrl}
            onChange={(e) => setContextImageUrl(e.target.value)}
            placeholder="https://..."
            className="h-11 w-full rounded-2xl border border-blue-200 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
          />
          {contextImageUrl.trim() && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
              <img src={contextImageUrl} alt="Prévia do contexto" className="max-h-60 w-auto max-w-full rounded-xl object-contain" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">PERGUNTAS DO TESTLET ({items.length}/10)</h3>
          <span className="text-xs font-medium text-slate-500">Mínimo 2, máximo 10 perguntas por testlet</span>
        </div>

        <div className="mt-4 space-y-4">
          {items.map((item, index) => (
            <div key={`testlet-item-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-bold text-slate-900">Pergunta {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 2}
                  className="rounded-xl border border-slate-300 p-2 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <textarea
                  value={item.alternatives_intro}
                  onChange={(e) => updateItem(index, { alternatives_intro: e.target.value })}
                  placeholder={`Enunciado da pergunta ${index + 1}`}
                  className="min-h-28 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                />

                <div className="grid gap-3">
                  {item.alternatives.map((alt, altIndex) => (
                    <input
                      key={`${alt.letter}-${index}`}
                      value={alt.text}
                      onChange={(e) => {
                        const nextAlternatives = [...item.alternatives];
                        nextAlternatives[altIndex] = { ...alt, text: e.target.value };
                        updateItem(index, { alternatives: nextAlternatives });
                      }}
                      placeholder={`Alternativa ${alt.letter}`}
                      className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                    />
                  ))}
                </div>

                <select
                  value={item.correct_alternative}
                  onChange={(e) => updateItem(index, { correct_alternative: e.target.value })}
                  className="h-11 w-full rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                >
                  <option value="">Alternativa correta</option>
                  {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                    <option key={letter} value={letter}>{letter}</option>
                  ))}
                </select>

                <textarea
                  value={item.explanation}
                  onChange={(e) => updateItem(index, { explanation: e.target.value })}
                  placeholder="Explicação/Gabarito"
                  className="min-h-24 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={addItem}
            disabled={items.length >= 10}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Adicionar Pergunta
          </button>
          <span className="text-xs text-slate-500">Mínimo 2, máximo 10 perguntas por testlet</span>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">Salve o conjunto inteiro e adicione todos os itens do testlet ao pool do simulado.</p>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || isInvalid}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
            style={{ backgroundColor: loading || isInvalid ? undefined : 'var(--brand-primary)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Salvar Testlet e Adicionar ao Simulado
          </button>
        </div>
      </div>
    </div>
  );
}
