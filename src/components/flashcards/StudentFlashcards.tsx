'use client';

// Flashcards do aluno: baralhos da escola (pela turma) e os próprios, com o que
// há para hoje; estudar; criar/editar baralho próprio.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Layers, Loader2, Pencil, Play, Plus, Sparkles } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { CardsEditor } from '@/components/flashcards/CardsEditor';
import { StudyDeck } from '@/components/flashcards/StudyDeck';
import { REVIEW_LABELS, cleanDrafts, draftsProblem, fcFetch, type Card, type CardDraft, type StudentDeck } from '@/lib/flashcards';
import { EmptyState, HeroStat, StudentPage, pageCard, primaryBtn } from '@/components/partners/PageShell';

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
  if (editing) return (
    <StudentPage kicker="Flashcards" icon={Layers} title={editing === 'new' ? 'Novo baralho' : 'Editar baralho'}
      description="Frente com a pergunta, verso com a resposta. Dá para colar uma planilha (CSV).">
      <div className={`${pageCard} p-5 sm:p-6`}>
        <OwnDeckEditor slug={slug} deckId={editing === 'new' ? null : editing} onDone={() => { setEditing(null); void load(); }} />
      </div>
    </StudentPage>
  );
  if (!decks) return (
    <StudentPage kicker="Estudar" icon={Layers} title="Flashcards">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-[20px] bg-white dark:bg-white/5" />)}
      </div>
    </StudentPage>
  );

  const todayTotal = decks.reduce((a, d) => a + d.today, 0);
  const firstDue = decks.find((d) => d.today > 0);
  return (
    <StudentPage
      kicker="Estudar"
      icon={Layers}
      title="Flashcards"
      description={decks.length === 0 ? 'Cartões de pergunta e resposta que voltam no dia certo para você não esquecer.'
        : todayTotal ? `${todayTotal} ${todayTotal === 1 ? 'cartão' : 'cartões'} para hoje. Uns 20 minutos por dia já fazem diferença.` : 'Tudo em dia por hoje. Amanhã tem mais.'}
      aside={decks.length > 0 ? <HeroStat label="Para hoje" value={todayTotal} hint={todayTotal === 1 ? 'cartão' : 'cartões'} /> : undefined}
      actions={decks.length > 0 ? (
        <button type="button" onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-[13px] font-bold text-white backdrop-blur hover:bg-white/20">
          <Plus className="h-4 w-4" /> Novo baralho
        </button>
      ) : undefined}
    >
      {decks.length === 0 ? (
        <EmptyState
          icon={Layers}
          tone="violet"
          title="Monte seu primeiro baralho"
          description="Flashcard é o jeito mais rápido de fixar fórmula, data e conceito. Cada cartão volta no dia em que você estaria para esquecer."
          steps={['Crie um baralho com a matéria que mais te pega', 'Escreva a pergunta na frente e a resposta no verso', 'Volte todo dia: os cartões do dia aparecem aqui']}
          action={<button type="button" onClick={() => setEditing('new')} className={primaryBtn}><Plus className="h-4 w-4" /> Criar meu baralho</button>}
          secondary={<span className="text-[12.5px] text-slate-500 dark:text-slate-400">Os baralhos da escola também aparecem aqui.</span>}
          preview={<FlashcardPreview />}
        />
      ) : (
        <>
          {firstDue && (
            <div className={`${pageCard} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Sparkles className="h-6 w-6" /></div>
                <div>
                  <p className="font-display text-[17px] font-black text-slate-900 dark:text-white">{todayTotal} {todayTotal === 1 ? 'cartão espera' : 'cartões esperam'} por você</p>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">Comece por <b className="text-slate-700 dark:text-slate-200">{firstDue.title}</b>: {firstDue.today} para hoje.</p>
                </div>
              </div>
              <button type="button" onClick={() => setStudying(firstDue.id)} className={primaryBtn}><Play className="h-4 w-4" fill="currentColor" strokeWidth={0} /> Estudar agora</button>
            </div>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {decks.map((d) => {
              const seen = Math.max(0, d.card_count - d.new);
              const pct = d.card_count ? Math.round((seen / d.card_count) * 100) : 0;
              const color = d.mine ? '#8b5cf6' : 'var(--brand-primary)';
              return (
                <li key={d.id} className={`${pageCard} group flex flex-col p-5`}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
                  <div aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-20 w-16 rotate-12 rounded-xl border border-slate-200/80 bg-slate-50 transition-transform group-hover:rotate-[18deg] dark:border-white/10 dark:bg-white/5" />
                  <div className="relative min-w-0 pr-10">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {SOURCE_LABEL[d.source] ?? (d.mine ? 'Meu baralho' : 'Da escola')}
                    </span>
                    <p className="font-display mt-2 line-clamp-2 text-[17px] font-black leading-snug text-slate-900 dark:text-white">{d.title}</p>
                    <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{d.subject ? `${d.subject} · ` : ''}{d.card_count} {d.card_count === 1 ? 'cartão' : 'cartões'}</p>
                  </div>
                  {d.mine && (
                    <button type="button" aria-label={`Editar ${d.title}`} onClick={() => setEditing(d.id)}
                      className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-slate-400 shadow-sm hover:text-slate-700 dark:bg-slate-800 dark:hover:text-white">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                      <span>{seen} de {d.card_count} já vistos</span><span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                  {d.mine && (!!d.pending || d.title_status === 'pending' || d.title_status === 'rejected') && (
                    <p className="mt-3 text-[12px]">
                      {!!d.pending && <span className="block text-amber-600 dark:text-amber-400">{d.pending} aguardando aprovação</span>}
                      {d.title_status === 'pending' && <span className="block text-amber-600 dark:text-amber-400">Nome aguardando aprovação</span>}
                      {d.title_status === 'rejected' && <span className="block text-red-600 dark:text-red-400">Nome recusado{d.title_note ? `: ${d.title_note}` : ''}</span>}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">{d.due} para revisar · {d.new} novos</span>
                    <button type="button" onClick={() => setStudying(d.id)} disabled={!d.today}
                      className="shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-bold text-white transition-transform hover:scale-[1.03] disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:scale-100 dark:disabled:bg-white/10 dark:disabled:text-slate-400"
                      style={d.today ? { background: 'var(--brand-primary)' } : undefined}>
                      {d.today ? `Estudar ${d.today}` : 'Em dia ✓'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </StudentPage>
  );
}

/** Prévia decorativa do estado vazio: um cartão de frente e outro de verso. */
function FlashcardPreview() {
  return (
    <div className="relative mx-auto h-[250px] max-w-[380px]">
      <div className="absolute left-6 top-10 h-44 w-[78%] -rotate-6 rounded-[22px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Verso</p>
        <p className="font-display mt-3 text-[21px] font-black text-slate-700 dark:text-slate-200">x = (−b ± √Δ) / 2a</p>
      </div>
      <div className="absolute right-2 top-0 h-44 w-[78%] rotate-3 rounded-[22px] border border-violet-200 bg-white p-5 shadow-lg dark:border-violet-500/30 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-500">Matemática · Frente</p>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">hoje</span>
        </div>
        <p className="font-display mt-3 text-[19px] font-black leading-snug text-slate-900 dark:text-white">Qual é a fórmula de Bhaskara?</p>
        <div className="mt-5 flex gap-1.5">
          {['Errei', 'Difícil', 'Bom', 'Fácil'].map((l, i) => (
            <span key={l} className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${i === 2 ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{l}</span>
          ))}
        </div>
      </div>
    </div>
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
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <button type="button" onClick={onDone} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">← Voltar aos baralhos</button>
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
