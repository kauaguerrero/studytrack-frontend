'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getSubjects, getTopics } from '@/constants/taxonomy';
import {
  QuestionEditableFields, emptyEditableQuestion, type EditableQuestionValue,
} from '@/components/assessments/QuestionEditableFields';
import { PublicPrivateDialog } from '@/components/assessments/PublicPrivateDialog';

interface SavedQuestion {
  id: string;
  subject: string;
  discipline?: string | null;
  difficulty?: string | null;
  alternatives_intro: string;
}

interface ChatQuestionItem {
  value: EditableQuestionValue;
  metadata?: Record<string, unknown> | null;
  status: 'ready' | 'saving' | 'saved';
}

interface ChatTurn {
  id: string;
  prompt: string;
  status: 'loading' | 'ready' | 'error';
  items?: ChatQuestionItem[];
  errorMessage?: string;
}

interface Props {
  onQuestionSaved: (question: SavedQuestion) => void;
  slug: string;
}

const QUANTITY_OPTIONS = [1, 3, 5, 10];

// Chat visual sobre o mesmo endpoint de geração que já existia
// (AiQuestionFactory antigo) — cada mensagem do founder é uma geração
// independente (sem memória de conversa no backend). Matéria/assunto/
// quantidade são sugestões opcionais que dão direção à IA (matéria/assunto
// viram um hint determinístico no backend; quantidade pede N questões de
// uma vez só, cada uma abrindo editável antes de ir pro pool).
export function AiQuestionChat({ onQuestionSaved, slug }: Props) {
  const [prompt, setPrompt] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [subjectHint, setSubjectHint] = useState('');
  const [disciplineHint, setDisciplineHint] = useState('');
  const [count, setCount] = useState(1);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [quota, setQuota] = useState<{ limit: number; used: number } | null>(null);
  const [savingTarget, setSavingTarget] = useState<{ turnId: string; index: number } | null>(null);
  const [publicPrivateTarget, setPublicPrivateTarget] = useState<{ turnId: string; index: number } | null>(null);

  const topicOptions = subjectHint ? getTopics(subjectHint) : [];

  async function getToken() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? '';
  }

  function updateTurn(id: string, patch: Partial<ChatTurn>) {
    setTurns((prev) => prev.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }

  function updateItem(turnId: string, index: number, patch: Partial<ChatQuestionItem>) {
    setTurns((prev) => prev.map((turn) => {
      if (turn.id !== turnId || !turn.items) return turn;
      const items = turn.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
      return { ...turn, items };
    }));
  }

  async function handleSend() {
    const text = prompt.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setTurns((prev) => [...prev, { id, prompt: text, status: 'loading' }]);
    setPrompt('');
    try {
      const token = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic: text,
          difficulty,
          count,
          subject: subjectHint || undefined,
          discipline: disciplineHint || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 429 && data.quota_exceeded) {
        setQuota({ limit: data.limit, used: data.used });
        updateTurn(id, { status: 'error', errorMessage: data.error });
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar questão.');
      const generated: Array<Record<string, unknown>> = data.questions || (data.question ? [data.question] : []);
      const items: ChatQuestionItem[] = generated.map((q) => ({
        status: 'ready',
        metadata: (q.metadata as Record<string, unknown> | null) ?? null,
        value: emptyEditableQuestion({
          subject: (q.subject as string) || subjectHint || 'Matemática',
          discipline: (q.discipline as string) || disciplineHint || '',
          difficulty: (q.difficulty as string) || difficulty,
          context: (q.context as string) || '',
          statement: (q.alternatives_intro as string) || '',
          alternatives: ((q.alternatives as Array<{ letter: string; text: string }>) || []).map((alt) => ({ letter: alt.letter, text: alt.text })),
          correct_alternative: (q.correct_alternative as string) || '',
          explanation: (q.explanation as string) || '',
          images: (q.images as string[]) || [],
        }),
      }));
      updateTurn(id, { status: 'ready', items });
    } catch (error) {
      void reportError('PartnerAiQuestionChatError', String(error), { slug, prompt: text });
      updateTurn(id, { status: 'error', errorMessage: 'Não foi possível gerar a questão com IA.' });
    }
  }

  function validateItem(item: ChatQuestionItem): string | null {
    if (!item.value.statement.trim()) return 'O enunciado é obrigatório.';
    if (!item.value.discipline) return 'Selecione o tópico/assunto da matéria.';
    if (!item.value.correct_alternative) return 'Selecione a alternativa correta.';
    if (item.value.alternatives.some((alt) => !alt.text.trim())) return 'Preencha todas as alternativas.';
    return null;
  }

  function handleAddClick(turnId: string, index: number) {
    const turn = turns.find((t) => t.id === turnId);
    const item = turn?.items?.[index];
    if (!item) return;
    const error = validateItem(item);
    if (error) {
      toast.error(error);
      return;
    }
    setPublicPrivateTarget({ turnId, index });
  }

  async function handleSave(turnId: string, index: number, isPublic: boolean) {
    const turn = turns.find((t) => t.id === turnId);
    const item = turn?.items?.[index];
    if (!item) return;
    setPublicPrivateTarget(null);
    setSavingTarget({ turnId, index });
    try {
      const token = await getToken();
      const api = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${api}/api/partners/${slug}/assessment/questions/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          is_public: isPublic,
          question_data: {
            subject: item.value.subject,
            discipline: item.value.discipline,
            difficulty: item.value.difficulty,
            alternatives_intro: item.value.statement,
            context: item.value.context,
            alternatives: item.value.alternatives,
            correct_alternative: item.value.correct_alternative,
            explanation: item.value.explanation,
            images: item.value.images,
            is_ai_generated: true,
            metadata: item.metadata,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar questão.');
      onQuestionSaved(data.question);
      updateItem(turnId, index, { status: 'saved' });
      toast.success('Questão adicionada ao pool.');
    } catch (error) {
      void reportError('PartnerAiQuestionSaveError', String(error), { slug });
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a questão.');
    } finally {
      setSavingTarget(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 overflow-y-auto pb-4">
        {turns.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Descreva a questão que você quer (tema, contexto, nível) e a IA gera rascunhos editáveis. Use as sugestões
            abaixo pra dar uma direção de matéria, assunto e quantidade.
          </div>
        )}
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="ml-auto max-w-[85%] rounded-3xl rounded-tr-sm bg-slate-900 px-4 py-3 text-sm text-white">
              {turn.prompt}
            </div>
            {turn.status === 'loading' && (
              <div className="flex items-center gap-2 rounded-3xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando questão...
              </div>
            )}
            {turn.status === 'error' && (
              <div className="flex items-start gap-2 rounded-3xl rounded-tl-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {turn.errorMessage || 'Não foi possível gerar a questão.'}
              </div>
            )}
            {turn.status === 'ready' && turn.items?.map((item, index) => (
              <div key={index} className="rounded-3xl rounded-tl-sm border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    {(turn.items?.length ?? 1) > 1 ? `Questão ${index + 1} de ${turn.items?.length} — revise e edite` : 'Revise e edite antes de adicionar'}
                  </span>
                </div>
                {item.status === 'saved' ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" /> Adicionada ao pool.
                  </div>
                ) : (
                  <>
                    <QuestionEditableFields
                      value={item.value}
                      onChange={(next) => updateItem(turn.id, index, { value: next })}
                      slug={slug}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddClick(turn.id, index)}
                      disabled={savingTarget?.turnId === turn.id && savingTarget.index === index}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      style={{ backgroundColor: savingTarget?.turnId === turn.id && savingTarget.index === index ? undefined : 'var(--brand-primary)' }}
                    >
                      {savingTarget?.turnId === turn.id && savingTarget.index === index ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Adicionar ao pool
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {quota && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Cota diária de gerações por IA atingida ({quota.used}/{quota.limit}). Tente novamente amanhã.
        </div>
      )}

      <div className="sticky bottom-0 space-y-2 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Sugestões:</span>
          <select
            value={subjectHint}
            onChange={(e) => { setSubjectHint(e.target.value); setDisciplineHint(''); }}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="">Matéria (opcional)</option>
            {getSubjects().map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={disciplineHint}
            onChange={(e) => setDisciplineHint(e.target.value)}
            disabled={!subjectHint}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-[var(--brand-primary)] disabled:bg-slate-100"
          >
            <option value="">Assunto (opcional)</option>
            {topicOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs outline-none focus:border-[var(--brand-primary)]"
          >
            <option value="Fácil">Fácil</option>
            <option value="Médio">Médio</option>
            <option value="Difícil">Difícil</option>
          </select>
          <div className="flex items-center gap-1">
            {QUANTITY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className="h-9 w-9 rounded-xl border text-xs font-bold transition"
                style={count === n
                  ? { background: 'var(--brand-primary)', color: '#fff', borderColor: 'var(--brand-primary)' }
                  : { borderColor: '#cbd5e1', color: '#475569' }}
              >
                {n}
              </button>
            ))}
            <span className="ml-1 text-[11px] text-slate-400">questões por envio</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ex: questão sobre análise combinatória em contexto de probabilidade"
            className="min-h-11 flex-1 resize-none rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)]"
            rows={1}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!prompt.trim() || turns.some((t) => t.status === 'loading')}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            style={{ backgroundColor: !prompt.trim() ? undefined : 'var(--brand-primary)' }}
          >
            <Sparkles className="h-4 w-4" />
            Gerar {count > 1 ? `(${count})` : ''}
          </button>
        </div>
      </div>

      <PublicPrivateDialog
        open={publicPrivateTarget !== null}
        onClose={() => setPublicPrivateTarget(null)}
        onChoose={(isPublic) => publicPrivateTarget && void handleSave(publicPrivateTarget.turnId, publicPrivateTarget.index, isPublic)}
      />
    </div>
  );
}
