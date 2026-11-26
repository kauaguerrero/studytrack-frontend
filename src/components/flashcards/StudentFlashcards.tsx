'use client';

// Flashcards do aluno: baralhos da escola (pela turma) e os próprios, com o que
// há para hoje; estudar; criar/editar baralho próprio.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Layers, Loader2, Pencil, Plus } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { CardsEditor } from '@/components/flashcards/CardsEditor';
import { StudyDeck } from '@/components/flashcards/StudyDeck';
import { REVIEW_LABELS, cleanDrafts, draftsProblem, fcFetch, type Card, type CardDraft, type StudentDeck } from '@/lib/flashcards';
import { HeroStat, PageShell } from '@/components/partners/PageShell';

const SOURCE_LABEL = { school: 'Da escola', class: 'Da turma', mine: 'Meu baralho' } as const;

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function StudentFlashcards() {
  const { org } = useOrg();
  const slug = org.slug;
  const [decks, setDecks] = useState<StudentDeck[] | null>(null);
  const [studying, setStudying] = useState<string | null>(null);
  const [editing, setEditing] = useState<'new' | string | null>(null);

  const load = useCallback(async () => {
    try { setDecks((await fcFetch<{ decks: StudentDeck[] }>(slug, '/flashcards')).decks); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setDecks([]); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);
  const exitStudy = useCallback(() => { setStudying(null); void load(); }, [load]);

  if (studying) return <div className="px-4 py-6 sm:py-8"><StudyDeck slug={slug} deckId={studying} onExit={exitStudy} /></div>;
  if (editing) return <div className="px-4 py-6 sm:py-8"><OwnDeckEditor slug={slug} deckId={editing === 'new' ? null : editing} onDone={() => { setEditing(null); void load(); }} /></div>;
  if (!decks) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const todayTotal = decks.reduce((a, d) => a + d.today, 0);
  return (
    <PageShell
      variant={'student'}
      kicker="Estudar"
      icon={Layers}
      title="Flashcards"
      aside={<>
        <HeroStat label="Para hoje" value={todayTotal} hint={todayTotal === 1 ? 'cartão' : 'cartões'} />
        <HeroStat label="Baralhos" value={decks.length} hint="seus e da escola" />
      </>}
      description={<>{todayTotal ? `${todayTotal} ${todayTotal === 1 ? 'cartão' : 'cartões'} para hoje.` : 'Nada para hoje: tudo em dia.'} Uns 20 minutos por dia já fazem diferença.</>}
      actions={<>
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-bold text-white backdrop-blur hover:bg-white/20">
          <Plus className="h-4 w-4" /> Meu baralho
        </button>
      </>}
    >
      {decks.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum baralho ainda. Crie o seu ou aguarde os da escola.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {decks.map((d) => (
            <li key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{d.title}</p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    {SOURCE_LABEL[d.source] ?? (d.mine ? 'Meu baralho' : 'Da escola')}{d.subject ? ` · ${d.subject}` : ''} · {d.card_count} cartões
                  </p>
                </div>
                {d.mine && (
                  <button type="button" aria-label={`Editar ${d.title}`} onClick={() => setEditing(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/50">
                  {d.due} para revisar · {d.new} novos
                  {d.mine && !!d.pending && <span className="block text-amber-600 dark:text-amber-400">{d.pending} aguardando aprovação</span>}
                  {d.mine && d.title_status === 'pending' && <span className="block text-amber-600 dark:text-amber-400">Nome aguardando aprovação</span>}
                  {d.mine && d.title_status === 'rejected' && <span className="block text-red-600 dark:text-red-400">Nome recusado{d.title_note ? `: ${d.title_note}` : ''}</span>}
                </span>
                <button type="button" onClick={() => setStudying(d.id)} disabled={!d.today}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40" style={{ background: 'var(--brand-primary)' }}>
                  {d.today ? `Estudar ${d.today}` : 'Em dia'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function OwnDeckEditor({ slug, deckId, onDone }: { slug: string; deckId: string | null; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [existing, setExisting] = useState<Card[]>([]);
  const [drafts, setDrafts] = useState<CardDraft[]>([{ front: '', back: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!deckId) return;
    fcFetch<{ deck: { title: string; subject: string | null }; cards: Card[] }>(slug, `/flashcards/decks/${deckId}/cards`)
      .then((r) => { setTitle(r.deck.title); setSubject(r.deck.subject ?? ''); setExisting(r.cards); setDrafts([]); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'));
  }, [slug, deckId]);

  const save = async () => {
    const cards = cleanDrafts(drafts);
    const p = !title.trim() ? 'Dê um nome ao baralho.' : draftsProblem(cards);
    if (p) { toast.error(p); return; }
    setSaving(true);
    try {
      if (!deckId) {
        await fcFetch(slug, '/flashcards/decks', { method: 'POST', body: JSON.stringify({ title, subject, cards }) });
      } else {
        await fcFetch(slug, `/flashcards/decks/${deckId}`, { method: 'PATCH', body: JSON.stringify({ title, subject }) });
        if (cards.length) await fcFetch(slug, `/flashcards/decks/${deckId}/cards`, { method: 'POST', body: JSON.stringify({ cards }) });
      }
      toast.success('Baralho salvo.');
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setSaving(false); }
  };

  const removeCard = async (id: string) => {
    try {
      await fcFetch(slug, `/flashcards/decks/${deckId}/cards/${id}`, { method: 'DELETE' });
      setExisting((c) => c.filter((x) => x.id !== id));
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao remover.'); }
  };

  const archive = async () => {
    if (!deckId || !window.confirm('Apagar este baralho?')) return;
    try { await fcFetch(slug, `/flashcards/decks/${deckId}`, { method: 'DELETE' }); onDone(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao apagar.'); }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <button type="button" onClick={onDone} className="text-xs font-semibold text-slate-500 hover:text-slate-700">← Baralhos</button>
      <h1 className="text-xl font-black text-slate-900 dark:text-white">{deckId ? 'Editar baralho' : 'Novo baralho'}</h1>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/5 dark:text-white/65">
        O nome do baralho e os cartões ficam só com você até a coordenação aprovar. Aprovados, passam a aparecer para a sua turma.
        Se você mudar o nome ou o texto de um cartão aprovado, ele volta para aprovação (a turma segue vendo a versão aprovada do nome).
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input aria-label="Nome do baralho" className={inputCls} placeholder="Nome (ex.: Fórmulas de Física)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Matéria" className={inputCls} placeholder="Matéria (opcional)" value={subject} maxLength={80} onChange={(e) => setSubject(e.target.value)} />
      </div>
      {existing.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
          {existing.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0">
                <b className="text-slate-900 dark:text-white">{c.front}</b>
                <span className="block text-slate-500 dark:text-white/55">{c.back}</span>
                {c.review_status && (
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    c.review_status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : c.review_status === 'rejected' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                    {REVIEW_LABELS[c.review_status]}{c.review_status === 'rejected' && c.review_note ? `: ${c.review_note}` : ''}
                  </span>
                )}
              </span>
              <button type="button" onClick={() => void removeCard(c.id)} className="shrink-0 text-xs font-semibold text-slate-400 hover:text-red-500">Remover</button>
            </li>
          ))}
        </ul>
      )}
      <CardsEditor slug={slug} csvPath="/flashcards/parse-csv" cards={drafts} onChange={setDrafts} />
      <div className="flex items-center justify-between">
        {deckId ? <button type="button" onClick={() => void archive()} className="text-xs font-semibold text-red-500">Apagar baralho</button> : <span />}
        <button type="button" onClick={() => void save()} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
        </button>
      </div>
    </div>
  );
}
