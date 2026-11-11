'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { QuestionRichText } from '@/components/questions/QuestionRichText';
import { useOrg } from '@/contexts/OrgContext';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, PlusCircle, Search, Sparkles } from 'lucide-react';
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
  // Quando informado, trava o tipo de banca (ex.: já decidido em uma etapa
  // anterior do wizard de simulado) — some o seletor "Modalidade" e nunca
  // deixa o founder trocar entre vestibular/concurso dentro do explorador.
  lockedQuestionType?: 'vestibular' | 'concurso';
}

interface Facet { bank: string | null; subject: string | null; discipline: string | null; role: string | null; institution: string | null; area: string | null; region: string | null }

export function QuestionBankExplorer({ onSelectQuestion, selectedIds, slug, lockedQuestionType }: Props) {
  const { org } = useOrg();
  const concursosEnabled = Boolean(org.permissions?.concursos_enabled);
  const [questionType, setQuestionType] = useState<string>(lockedQuestionType ?? 'vestibular');
  const [role, setRole] = useState('all');
  const [institution, setInstitution] = useState('all');
  const [area, setArea] = useState('all');
  const [region, setRegion] = useState('all');
  const [facets, setFacets] = useState<Facet[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [bank, setBank] = useState('all');
  const [discipline, setDiscipline] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [preview, setPreview] = useState<QuestionItem | null>(null);
  const [varyingId, setVaryingId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const scoped = facets.filter((item) => (role === 'all' || item.role === role) && (bank === 'all' || item.bank === bank) && (institution === 'all' || item.institution === institution) && (area === 'all' || item.area === area) && (region === 'all' || item.region === region));
  const unique = (values: Array<string | null>) => [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const subjects = unique(scoped.map((item) => item.subject));
  const disciplines = unique(scoped.filter((item) => item.subject === subject).map((item) => item.discipline));
  const banks = unique(facets.filter((item) => role === 'all' || item.role === role).map((item) => item.bank));
  const roles = unique(facets.map((item) => item.role));
  const roleFacets = facets.filter((item) => role === 'all' || item.role === role);

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
        bank,
        discipline,
        difficulty,
        question_type: questionType,
        role,
        institution,
        area,
        region,
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
      setIndex(0);
      void fetchQuestions(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [slug, query, subject, bank, discipline, difficulty, questionType, role, institution, area, region]);

  useEffect(() => {
    let cancelled = false;
    setFacets([]);
    void (async () => {
      try {
        const token = await getToken();
        const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/facets?question_type=${questionType}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Falha ao carregar filtros.');
        const data = await res.json();
        if (!cancelled) setFacets(data.data || []);
      } catch {
        if (!cancelled) toast.error('Não foi possível carregar os filtros.');
      }
    })();
    return () => { cancelled = true; };
  }, [slug, questionType]);

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

  async function handleNext() {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      return;
    }
    if (questions.length < count) {
      await fetchQuestions(false);
      setIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const current = questions[index];
  const isLast = index >= questions.length - 1 && questions.length >= count;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {concursosEnabled && <div className="mb-3 grid gap-3 md:grid-cols-2">
          {lockedQuestionType ? (
            <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
              {lockedQuestionType === 'concurso' ? 'Concursos' : 'Vestibular'}
            </div>
          ) : (
            <select aria-label="Modalidade" value={questionType} onChange={(e) => { setQuestionType(e.target.value); setRole('all'); setBank('all'); setSubject('all'); setDiscipline('all'); setInstitution('all'); setArea('all'); setRegion('all'); }} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm">
              <option value="vestibular">Vestibular</option><option value="concurso">Concursos</option>
            </select>
          )}
          {questionType === 'concurso' && <select aria-label="Cargo" value={role} onChange={(e) => { setRole(e.target.value); setBank('all'); setSubject('all'); setInstitution('all'); setArea('all'); setRegion('all'); }} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm">
            <option value="all">Todos os cargos</option>{roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>}
        </div>}
        {questionType === 'concurso' && <div className="mb-3 grid gap-3 md:grid-cols-3">
          {([
            ['Instituição', institution, setInstitution, unique(roleFacets.map((item) => item.institution))],
            ['Área', area, setArea, unique(roleFacets.map((item) => item.area))],
            ['Região', region, setRegion, unique(roleFacets.map((item) => item.region))],
          ] as const).map(([label, value, setter, options]) => options.length > 0 && <select key={label} aria-label={label} value={value} onChange={(e) => { setter(e.target.value); setSubject('all'); }} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm"><option value="all">{label}: todas</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>)}
        </div>}
        <div className="grid gap-3 md:grid-cols-5">
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
          <select value={bank} onChange={(e) => { setBank(e.target.value); setSubject('all'); }} className="h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[var(--brand-primary)]">
            <option value="all">Todas as bancas</option>
            {banks.map((item) => <option key={item} value={item}>{item}</option>)}
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

      {loading && questions.length === 0 && (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Carregando questões...
        </div>
      )}

      {!loading && count === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Nenhuma questão encontrada com esses filtros.
        </div>
      )}

      {current && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 w-full bg-slate-100">
            <div
              className="h-full transition-all duration-200"
              style={{ width: `${count ? ((index + 1) / count) * 100 : 0}%`, backgroundColor: 'var(--brand-primary)' }}
            />
          </div>
          <div className="p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-white">{current.subject}</span>
                {current.discipline && <span className="rounded-full bg-slate-100 px-2.5 py-1">{current.discipline}</span>}
                {current.difficulty && <span className="rounded-full bg-slate-100 px-2.5 py-1">{current.difficulty}</span>}
              </div>
              <span className="text-xs font-semibold text-slate-400">Questão {index + 1} de {count}</span>
            </div>

            {current.context && <QuestionRichText text={current.context} className="mb-3 text-sm text-slate-600" />}
            <QuestionRichText text={current.alternatives_intro || ''} className="text-base font-medium text-slate-900" />

            {current.alternatives && current.alternatives.length > 0 && (
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {current.alternatives.map((alt) => (
                  <div key={alt.letter} className="rounded-xl border border-slate-200 px-3 py-2.5">
                    <strong>{alt.letter}.</strong> {alt.text}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={selectedIds.includes(current.id)}
                onClick={() => { onSelectQuestion(current); void handleNext(); }}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                style={{ backgroundColor: selectedIds.includes(current.id) ? undefined : 'var(--brand-primary)' }}
              >
                {selectedIds.includes(current.id) ? <CheckCircle2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                {selectedIds.includes(current.id) ? 'Adicionada' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateVariation(current)}
                disabled={varyingId === current.id}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {varyingId === current.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar variação via IA
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
            <button
              type="button"
              onClick={handlePrev}
              disabled={index === 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => void handleNext()}
              disabled={isLast || loading}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Próxima'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
