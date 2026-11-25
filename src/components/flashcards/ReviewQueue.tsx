'use client';

// Fila de aprovação: cartões criados por alunos. Aprovado, o baralho do aluno
// passa a aparecer para a turma dele (colegas veem só os aprovados).

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, X } from 'lucide-react';
import { fcFetch, type ReviewGroup } from '@/lib/flashcards';

export function ReviewQueue({ slug, onChange }: { slug: string; onChange?: (pending: number) => void }) {
  const [groups, setGroups] = useState<ReviewGroup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fcFetch<{ groups: ReviewGroup[] }>(slug, '/flashcard-reviews');
      setGroups(r.groups);
      onChange?.(r.groups.reduce((a, g) => a + g.cards.length, 0));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setGroups([]); }
  }, [slug, onChange]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (cardIds: string[], action: 'approve' | 'reject', why?: string) => {
    setBusy(true);
    try {
      await fcFetch(slug, '/flashcard-reviews', { method: 'POST', body: JSON.stringify({ card_ids: cardIds, action, note: why || undefined }) });
      toast.success(action === 'approve' ? 'Aprovado: a turma do aluno já vê.' : 'Recusado.');
      setRejecting(null);
      setNote('');
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  };

  if (!groups) return <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (!groups.length) {
    return <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum cartão aguardando aprovação.</p>;
  }

  return (
    <div className="mt-5 space-y-4">
      {groups.map((g) => (
        <section key={g.deck.id} className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{g.deck.title}</p>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {g.author.name ?? 'Aluno'} · {g.author.classes.length ? g.author.classes.join(', ') : 'sem turma (aprovado vai para a escola toda)'}
              </p>
            </div>
            <button type="button" disabled={busy} onClick={() => void decide(g.cards.map((c) => c.id), 'approve')}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
              Aprovar todos ({g.cards.length})
            </button>
          </header>
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {g.cards.map((c) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <b className="whitespace-pre-wrap text-slate-900 dark:text-white">{c.front}</b>
                    <span className="block whitespace-pre-wrap text-slate-600 dark:text-white/65">{c.back}</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Aprovar: ${c.front}`} disabled={busy} onClick={() => void decide([c.id], 'approve')}
                      className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 disabled:opacity-50 dark:border-emerald-500/30"><Check className="h-4 w-4" /></button>
                    <button type="button" aria-label={`Recusar: ${c.front}`} disabled={busy} onClick={() => { setRejecting([c.id]); setNote(''); }}
                      className="rounded-lg border border-red-200 p-1.5 text-red-500 disabled:opacity-50 dark:border-red-500/30"><X className="h-4 w-4" /></button>
                  </span>
                </div>
                {rejecting?.[0] === c.id && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input aria-label="Motivo da recusa" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
                      placeholder="Motivo (opcional, o aluno vê)"
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
                    <button type="button" disabled={busy} onClick={() => void decide(rejecting, 'reject', note)}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Recusar</button>
                    <button type="button" onClick={() => setRejecting(null)} className="text-xs font-semibold text-slate-400">Cancelar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
