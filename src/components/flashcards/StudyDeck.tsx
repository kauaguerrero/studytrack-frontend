'use client';

// Sessão do dia de um baralho: mostra a frente, "Ver resposta", e o aluno
// escolhe Errei/Difícil/Bom/Fácil (vai para o srs.py). O que errou volta uma
// vez no fim da sessão só para fixar — sem nova nota.

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { GRADES, fcFetch, type Card, type Grade, type StudySession } from '@/lib/flashcards';

export function StudyDeck({ slug, deckId, onExit }: { slug: string; deckId: string; onExit: () => void }) {
  const [session, setSession] = useState<StudySession | null>(null);
  const [queue, setQueue] = useState<(Card & { practice?: boolean })[]>([]);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  useEffect(() => {
    fcFetch<StudySession>(slug, `/flashcards/decks/${deckId}/session`)
      .then((s) => { setSession(s); setQueue(s.cards); })
      .catch((e) => { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); onExit(); });
  }, [slug, deckId, onExit]);

  if (!session) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  const card = queue[0];

  const answer = async (grade: Grade) => {
    if (!card) return;
    if (card.practice) {  // repetição do que errou: não conta de novo
      setQueue((q) => q.slice(1));
      setShown(false);
      return;
    }
    setBusy(true);
    try {
      await fcFetch(slug, `/flashcards/decks/${deckId}/cards/${card.id}/review`, { method: 'POST', body: JSON.stringify({ grade }) });
      setDone((n) => n + 1);
      setQueue((q) => [...q.slice(1), ...(grade === 'again' ? [{ ...card, practice: true }] : [])]);
      setShown(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-white/50">
        <button type="button" onClick={onExit} className="font-semibold hover:text-slate-700">← Baralhos</button>
        <span>{session.deck.title} · {queue.filter((c) => !c.practice).length} restantes</span>
      </div>

      {!card ? (
        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-lg font-black text-emerald-900 dark:text-emerald-200">
            {done ? `Feito por hoje: ${done} ${done === 1 ? 'cartão' : 'cartões'}.` : 'Nada para revisar hoje neste baralho.'}
          </p>
          <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/70">Os cartões voltam no dia certo para você não esquecer.</p>
          <button type="button" onClick={onExit} className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>Voltar</button>
        </div>
      ) : (
        <>
          <div className="mt-4 min-h-[220px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {card.practice ? <span className="inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> de novo, para fixar</span> : card.is_new ? 'Novo' : 'Revisão'}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-lg font-semibold text-slate-900 dark:text-white">{card.front}</p>
            {shown && (
              <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-base text-slate-700 dark:border-white/10 dark:text-white/80" data-testid="card-back">
                {card.back}
              </p>
            )}
          </div>
          {!shown ? (
            <button type="button" onClick={() => setShown(true)}
              className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
              Ver resposta
            </button>
          ) : card.practice ? (
            <button type="button" onClick={() => void answer('good')}
              className="mt-4 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-white/80">
              Próximo
            </button>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g) => (
                <button key={g.grade} type="button" disabled={busy} onClick={() => void answer(g.grade)}
                  className="rounded-xl border border-slate-200 px-2 py-2.5 text-center disabled:opacity-50 dark:border-white/10">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{g.label}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-white/50">{g.hint}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
