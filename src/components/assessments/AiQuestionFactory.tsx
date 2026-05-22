'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SavedQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro: string;
}

interface GeneratedQuestion extends SavedQuestion {
  context?: string | null;
  alternatives?: Array<{ letter: string; text: string; isCorrect?: boolean }>;
  correct_alternative?: string | null;
  explanation?: string | null;
  metadata?: Record<string, unknown> | null;
  source_question?: Record<string, unknown> | null;
  is_ai_generated?: boolean;
}

interface Props {
  onQuestionSaved: (question: SavedQuestion) => void;
  slug: string;
}

export function AiQuestionFactory({ onQuestionSaved, slug }: Props) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [instructions, setInstructions] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<GeneratedQuestion | null>(null);

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic,
          difficulty,
          instructions: instructions.trim() || undefined,
          context: context.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar questão.');
      setPreview({ ...data.question, is_ai_generated: true });
    } catch (error) {
      void reportError('PartnerAiQuestionFactoryError', String(error), { slug, topic });
      toast.error('Não foi possível gerar a questão com IA.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    try {
      const token = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_data: preview,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar questão.');
      onQuestionSaved(data.question);
      setPreview(null);
      setTopic('');
      setInstructions('');
      setContext('');
      toast.success('Questão adicionada ao pool.');
    } catch (error) {
      void reportError('PartnerAiQuestionSaveError', String(error), { slug });
      toast.error('Não foi possível salvar a questão gerada.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Criar com IA</h3>
        <p className="mt-1 text-sm text-slate-500">Descreva o tema, ajuste o nível de dificuldade e revise antes de adicionar ao simulado.</p>
        <div className="mt-4 space-y-4">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: questão sobre análise combinatória em contexto de probabilidade"
            className="min-h-32 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
              <option value="Fácil">Fácil</option>
              <option value="Médio">Médio</option>
              <option value="Difícil">Difícil</option>
            </select>
            <input
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instruções extras para a IA"
              className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contexto opcional para incorporar ao item"
            className="min-h-24 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)]"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !topic.trim()}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            style={{ backgroundColor: loading || !topic.trim() ? undefined : 'var(--brand-primary)' }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar questão
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{preview.subject}</span>
            {preview.discipline && <span className="rounded-full bg-slate-100 px-2.5 py-1">{preview.discipline}</span>}
            {preview.difficulty && <span className="rounded-full bg-slate-100 px-2.5 py-1">{preview.difficulty}</span>}
          </div>
          {preview.context && <QuestionRichText text={preview.context} className="mb-3 text-sm text-slate-600" />}
          <QuestionRichText text={preview.alternatives_intro} className="text-sm font-medium text-slate-900" />
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {(preview.alternatives || []).map((alt) => (
              <div key={alt.letter} className="rounded-xl border border-slate-200 px-3 py-2">
                <strong>{alt.letter}.</strong> {alt.text}
              </div>
            ))}
          </div>
          {preview.explanation && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <strong>Explicação:</strong> {preview.explanation}
            </div>
          )}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Adicionar ao Simulado
            </button>
            <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
