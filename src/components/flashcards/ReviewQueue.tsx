'use client';

// Fila de aprovação dos baralhos de alunos: nome/matéria, cartões e pedidos de
// inclusão em turma nova (aluno mudou de turma: a antiga segue vendo o que já
// foi aprovado). Aprovado, a turma do aluno passa a ver (só o que foi aprovado).

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Users, X } from 'lucide-react';
import { fcFetch, type ReviewGroup } from '@/lib/flashcards';

type Target = { card_ids?: string[]; title_deck_ids?: string[]; share_ids?: string[] };

export function pendingTotal(groups: ReviewGroup[]): number {
  return groups.reduce((a, g) => a + g.cards.length + g.share_requests.length + (g.title_pending ? 1 : 0), 0);
}

export function ReviewQueue({ slug, onChange }: { slug: string; onChange?: (pending: number) => void }) {
  const [groups, setGroups] = useState<ReviewGroup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<{ key: string; target: Target } | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fcFetch<{ groups: ReviewGroup[] }>(slug, '/flashcard-reviews');
      setGroups(r.groups);
      onChange?.(pendingTotal(r.groups));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setGroups([]); }
  }, [slug, onChange]);
  useEffect(() => { void load(); }, [load]);

  const decide = async (target: Target, action: 'approve' | 'reject', why?: string) => {
    setBusy(true);
    try {
      await fcFetch(slug, '/flashcard-reviews', { method: 'POST', body: JSON.stringify({ ...target, action, note: why || undefined }) });
      toast.success(action === 'approve' ? 'Aprovado.' : 'Recusado.');
      setRejecting(null);
      setNote('');
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  };

  const actions = (key: string, label: string, target: Target) => (
    <span className="flex shrink-0 gap-1">
      <button type="button" aria-label={`Aprovar: ${label}`} disabled={busy} onClick={() => void decide(target, 'approve')}
        className="rounded-lg border border-emerald-200 p-1.5 text-emerald-600 disabled:opacity-50 dark:border-emerald-500/30"><Check className="h-4 w-4" /></button>
      <button type="button" aria-label={`Recusar: ${label}`} disabled={busy} onClick={() => { setRejecting({ key, target }); setNote(''); }}
        className="rounded-lg border border-red-200 p-1.5 text-red-500 disabled:opacity-50 dark:border-red-500/30"><X className="h-4 w-4" /></button>
    </span>
  );

  const rejectForm = (key: string) => rejecting?.key === key && (
    <div className="mt-2 flex flex-wrap gap-2">
      <input aria-label="Motivo da recusa" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo (opcional, o aluno vê)"
        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
      <button type="button" disabled={busy} onClick={() => void decide(rejecting.target, 'reject', note)}
        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Recusar</button>
      <button type="button" onClick={() => setRejecting(null)} className="text-xs font-semibold text-slate-400">Cancelar</button>
    </div>
  );

  if (!groups) return <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (!groups.length) {
    return <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nada aguardando aprovação.</p>;
  }

  return (
    <div className="mt-5 space-y-4">
      {groups.map((g) => {
        const all: Target = {
          card_ids: g.cards.map((c) => c.id),
          title_deck_ids: g.title_pending ? [g.deck.id] : [],
          share_ids: g.share_requests.map((s) => s.id),
        };
        const n = all.card_ids!.length + all.title_deck_ids!.length + all.share_ids!.length;
        const titleKey = `t:${g.deck.id}`;
        return (
          <section key={g.deck.id} className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{g.deck.published_title ?? g.deck.title}</p>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {g.author.name ?? 'Aluno'} · {g.author.classes.length ? g.author.classes.join(', ') : 'sem turma (aprovado vai para a escola toda)'}
                </p>
              </div>
              {n > 1 && (
                <button type="button" disabled={busy} onClick={() => void decide(all, 'approve')}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
                  Aprovar tudo ({n})
                </button>
              )}
            </header>
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {g.title_pending && (
                <li className="px-4 py-3 text-sm" data-testid="title-review">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {g.deck.published_title ? 'Novo nome do baralho' : 'Nome do baralho'}
                      </span>
                      <b className="text-slate-900 dark:text-white">{g.deck.title}</b>
                      {g.deck.subject && <span className="text-slate-500 dark:text-white/55"> · {g.deck.subject}</span>}
                      {g.deck.published_title && (
                        <span className="block text-xs text-slate-500 dark:text-white/50">
                          Hoje a turma vê: {g.deck.published_title}{g.deck.published_subject ? ` · ${g.deck.published_subject}` : ''}
                        </span>
                      )}
                    </span>
                    {actions(titleKey, `nome ${g.deck.title}`, { title_deck_ids: [g.deck.id] })}
                  </div>
                  {rejectForm(titleKey)}
                </li>
              )}
              {g.share_requests.map((s) => (
                <li key={s.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-start gap-2">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span>
                        <b className="text-slate-900 dark:text-white">Incluir na turma {s.class_name}</b>
                        <span className="block text-xs text-slate-500 dark:text-white/55">
                          O aluno mudou de turma. {g.approved_cards} {g.approved_cards === 1 ? 'cartão aprovado' : 'cartões aprovados'} passariam a aparecer lá também.
                        </span>
                      </span>
                    </span>
                    {actions(`s:${s.id}`, `incluir na turma ${s.class_name}`, { share_ids: [s.id] })}
                  </div>
                  {rejectForm(`s:${s.id}`)}
                </li>
              ))}
              {g.cards.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <b className="whitespace-pre-wrap text-slate-900 dark:text-white">{c.front}</b>
                      <span className="block whitespace-pre-wrap text-slate-600 dark:text-white/65">{c.back}</span>
                    </span>
                    {actions(`c:${c.id}`, c.front, { card_ids: [c.id] })}
                  </div>
                  {rejectForm(`c:${c.id}`)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
