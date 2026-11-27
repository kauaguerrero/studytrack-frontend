'use client';

// Coordenação: baralhos da escola (criar, importar planilha, segmentar por turma,
// editar e arquivar cartões).

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Layers, Loader2, Pencil, Plus } from 'lucide-react';
import { ReviewQueue } from '@/components/flashcards/ReviewQueue';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { CardsEditor } from '@/components/flashcards/CardsEditor';
import { cleanDrafts, draftsProblem, fcFetch, type Card, type CardDraft, type Deck } from '@/lib/flashcards';
import { PageShell } from '@/components/partners/PageShell';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function SchoolFlashcards() {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug);
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [editing, setEditing] = useState<'new' | Deck | null>(null);
  const [tab, setTab] = useState<'decks' | 'reviews'>('decks');
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fcFetch<{ decks: Deck[]; pending_reviews?: number }>(slug, '/flashcard-decks');
      setDecks(r.decks);
      setPending(r.pending_reviews ?? 0);
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setDecks([]); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  if (editing) {
    return (
      <div className="px-4 py-6 sm:py-8">
        <DeckEditor slug={slug} deck={editing === 'new' ? null : editing} classes={classes}
          onDone={() => { setEditing(null); void load(); }} />
      </div>
    );
  }
  if (!decks) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const className = (ids: string[] | null) =>
    !ids?.length ? 'Todos os alunos' : ids.map((id) => classes.find((c) => c.id === id)?.name ?? 'turma').join(', ');

  return (
    <PageShell
      variant={'founder'}
      kicker="Ensino"
      icon={Layers}
      title="Flashcards"
      description="Baralhos que os alunos revisam com repetição espaçada. Importe uma planilha com as colunas frente; verso."
      actions={<>
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'var(--brand-primary)' }}>
          <Plus className="h-4 w-4" /> Novo baralho
        </button>
      </>}
    >
      <div className="mt-5 flex gap-2" role="tablist">
        {([['decks', 'Baralhos da escola'], ['reviews', `Aprovar baralhos dos alunos${pending ? ` (${pending})` : ''}`]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 text-slate-600 dark:border-white/10 dark:text-white/70'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'reviews' ? (
        <ReviewQueue slug={slug} onChange={setPending} />
      ) : decks.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum baralho ainda.</p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
          {decks.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{d.title}</p>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  {d.card_count ?? 0} {(d.card_count ?? 0) === 1 ? 'cartão' : 'cartões'}{d.subject ? ` · ${d.subject}` : ''} · {className(d.visible_class_ids)}
                </p>
              </div>
              <button type="button" aria-label={`Editar ${d.title}`} onClick={() => setEditing(d)}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function DeckEditor({ slug, deck, classes, onDone }: {
  slug: string; deck: Deck | null; classes: ReturnType<typeof useOrgClasses>['classes']; onDone: () => void;
}) {
  const [title, setTitle] = useState(deck?.title ?? '');
  const [subject, setSubject] = useState(deck?.subject ?? '');
  const [visible, setVisible] = useState<string[]>(deck?.visible_class_ids ?? []);
  const [existing, setExisting] = useState<Card[]>([]);
  const [drafts, setDrafts] = useState<CardDraft[]>(deck ? [] : [{ front: '', back: '' }]);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [saving, setSaving] = useState(false);
  const base = deck ? `/flashcard-decks/${deck.id}` : '';

  useEffect(() => {
    if (!deck) return;
    fcFetch<{ cards: Card[] }>(slug, `/flashcard-decks/${deck.id}/cards`)
      .then((r) => setExisting(r.cards))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'));
  }, [slug, deck]);

  const save = async () => {
    const cards = cleanDrafts(drafts);
    const p = !title.trim() ? 'Dê um nome ao baralho.' : draftsProblem(cards);
    if (p) { toast.error(p); return; }
    setSaving(true);
    try {
      const meta = { title, subject, visible_class_ids: visible.length ? visible : null };
      if (!deck) {
        await fcFetch(slug, '/flashcard-decks', { method: 'POST', body: JSON.stringify({ ...meta, cards }) });
      } else {
        await fcFetch(slug, base, { method: 'PATCH', body: JSON.stringify(meta) });
        if (cards.length) await fcFetch(slug, `${base}/cards`, { method: 'POST', body: JSON.stringify({ cards }) });
      }
      toast.success('Baralho salvo.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setSaving(false); }
  };

  const saveCard = async () => {
    if (!editCard) return;
    try {
      const r = await fcFetch<{ card: Card }>(slug, `${base}/cards/${editCard.id}`, {
        method: 'PATCH', body: JSON.stringify({ front: editCard.front, back: editCard.back }),
      });
      setExisting((c) => c.map((x) => (x.id === r.card.id ? { ...x, ...r.card } : x)));
      setEditCard(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); }
  };

  const removeCard = async (id: string) => {
    try { await fcFetch(slug, `${base}/cards/${id}`, { method: 'DELETE' }); setExisting((c) => c.filter((x) => x.id !== id)); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao remover.'); }
  };

  const archive = async () => {
    if (!deck || !window.confirm('Arquivar este baralho? Os alunos deixam de vê-lo.')) return;
    try { await fcFetch(slug, base, { method: 'DELETE' }); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao arquivar.'); }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <button type="button" onClick={onDone} className="text-xs font-semibold text-slate-500 hover:text-slate-700">← Baralhos</button>
      <h1 className="text-xl font-black text-slate-900 dark:text-white">{deck ? 'Editar baralho' : 'Novo baralho'}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <input aria-label="Nome do baralho" className={inputCls} placeholder="Nome (ex.: Funções orgânicas)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Matéria" className={inputCls} placeholder="Matéria (opcional)" value={subject} maxLength={80} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <ClassVisibilityPicker classes={classes} value={visible} onChange={setVisible} />
      {existing.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
          {existing.map((c) => (
            <li key={c.id} className="px-3 py-2 text-sm">
              {editCard?.id === c.id ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <textarea aria-label="Frente" rows={2} className={inputCls} value={editCard.front} onChange={(e) => setEditCard({ ...editCard, front: e.target.value })} />
                  <textarea aria-label="Verso" rows={2} className={inputCls} value={editCard.back} onChange={(e) => setEditCard({ ...editCard, back: e.target.value })} />
                  <div className="flex gap-2 sm:flex-col">
                    <button type="button" onClick={() => void saveCard()} className="text-xs font-bold text-emerald-600">Salvar</button>
                    <button type="button" onClick={() => setEditCard(null)} className="text-xs font-semibold text-slate-400">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0"><b className="text-slate-900 dark:text-white">{c.front}</b><span className="block text-slate-500 dark:text-white/55">{c.back}</span></span>
                  <span className="flex shrink-0 gap-3">
                    <button type="button" onClick={() => setEditCard(c)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Editar</button>
                    <button type="button" onClick={() => void removeCard(c.id)} className="text-xs font-semibold text-slate-400 hover:text-red-500">Remover</button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <CardsEditor slug={slug} csvPath="/flashcard-decks/parse-csv" cards={drafts} onChange={setDrafts} />
      <div className="flex items-center justify-between">
        {deck ? <button type="button" onClick={() => void archive()} className="text-xs font-semibold text-red-500">Arquivar baralho</button> : <span />}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
}
