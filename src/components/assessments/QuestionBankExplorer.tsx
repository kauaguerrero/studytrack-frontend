'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { TAXONOMY } from '@/constants/taxonomy';
import { CheckCircle2, Loader2, PlusCircle, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface QuestionItem {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  context?: string | null;
  alternatives_intro?: string | null;
  alternatives?: Array<{ letter: string; text: string }>;
  correct_alternative?: string | null;
  explanation?: string | null;
  ai_reasoning?: { thought?: string } | null;
  metadata?: Record<string, unknown> | null;
}

interface Props {
  onSelectQuestion: (question: QuestionItem) => void;
  selectedIds: string[];
  slug: string;
}

export function QuestionBankExplorer({ onSelectQuestion, selectedIds, slug }: Props) {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [discipline, setDiscipline] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [preview, setPreview] = useState<QuestionItem | null>(null);
  const [varyingId, setVaryingId] = useState<string | null>(null);

  const subjects = Object.keys(TAXONOMY);
  const disciplines = subject !== 'all' ? [...(TAXONOMY[subject as keyof typeof TAXONOMY] ?? [])] : [];

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  async function fetchQuestions(reset = false) {
    setLoading(true);
    try {
      const token = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: String(currentPage),
        per_page: '10',
        query,
        subject,
        discipline,
        difficulty,
      });
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao buscar questões.');
      setQuestions((prev) => (reset ? (data.data || []) : [...prev, ...(data.data || [])]));
      setCount(data.count || 0);
      setPage(reset ? 2 : currentPage + 1);
    } catch (error) {
      void reportError('PartnerQuestionBankExplorerError', String(error), { slug });
      toast.error('Não foi possível carregar o banco de questões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setDiscipline('all');
  }, [subject]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchQuestions(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [slug, query, subject, discipline, difficulty]);

  async function handleGenerateVariation(question: QuestionItem) {
    setVaryingId(question.id);
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
          topic: question.discipline || question.subject,
          difficulty: question.difficulty || 'Médio',
          source_question: question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar variação.');
      setPreview({
        ...data.question,
        source_question: { id: question.id },
        is_ai_generated: true,
      } as QuestionItem);
    } catch (error) {
      void reportError('PartnerQuestionVariationError', String(error), { question_id: question.id, slug });
      toast.error('Não foi possível gerar a variação por IA.');
    } finally {
      setVaryingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por enunciado ou disciplina"
              className="h-11 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[var(--brand-primary)]"
            />
          </label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
            <option value="all">Todas as matérias</option>
            {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
            <option value="all">Qualquer dificuldade</option>
            <option value="Fácil">Fácil</option>
            <option value="Médio">Médio</option>
            <option value="Difícil">Difícil</option>
          </select>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
            disabled={subject === 'all'}
            className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)] disabled:bg-slate-100"
          >
            <option value="all">{subject === 'all' ? 'Selecione a matéria para filtrar tópicos' : 'Todos os tópicos'}</option>
            {disciplines.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="flex items-center justify-end text-sm font-medium text-slate-500">{count} questões</div>
        </div>
      </div>

      {preview && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Sparkles className="h-4 w-4" />
            Preview da variação gerada por IA
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-4">
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{preview.subject}</span>
              {preview.discipline && <span className="rounded-full bg-slate-100 px-2.5 py-1">{preview.discipline}</span>}
              {preview.difficulty && <span className="rounded-full bg-slate-100 px-2.5 py-1">{preview.difficulty}</span>}
            </div>
            {preview.context && <QuestionRichText text={preview.context} className="text-sm text-slate-600" />}
            <QuestionRichText text={preview.alternatives_intro || ''} className="text-sm font-medium text-slate-900" />
            <div className="space-y-2 text-sm text-slate-700">
              {(preview.alternatives || []).map((alt) => (
                <div key={alt.letter} className="rounded-xl border border-slate-200 px-3 py-2">
                  <strong>{alt.letter}.</strong> {alt.text}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onSelectQuestion(preview)}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <PlusCircle className="h-4 w-4" />
                Adicionar ao pool
              </button>
              <button type="button" onClick={() => setPreview(null)} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">
                Fechar preview
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question) => {
          const isSelected = selectedIds.includes(question.id);
          return (
            <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{question.subject}</span>
                {question.discipline && <span className="rounded-full bg-slate-100 px-2.5 py-1">{question.discipline}</span>}
                {question.difficulty && <span className="rounded-full bg-slate-100 px-2.5 py-1">{question.difficulty}</span>}
              </div>
              {question.context && <QuestionRichText text={question.context} className="mb-3 text-sm text-slate-600" />}
              <QuestionRichText text={question.alternatives_intro || ''} className="text-sm font-medium text-slate-900" />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSelected}
                  onClick={() => onSelectQuestion(question)}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  style={{ backgroundColor: isSelected ? undefined : 'var(--brand-primary)' }}
                >
                  {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  {isSelected ? 'Adicionada' : 'Adicionar'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerateVariation(question)}
                  disabled={varyingId === question.id}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  {varyingId === question.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Gerar variação via IA
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {questions.length < count && (
        <div className="flex justify-center">
          <button type="button" onClick={() => void fetchQuestions(false)} disabled={loading} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {loading ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}

      {loading && questions.length === 0 && (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando questões...
        </div>
      )}
    </div>
  );
}
