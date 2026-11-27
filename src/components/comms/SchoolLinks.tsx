'use client';

// Gestor: links que aparecem no menu do aluno (fase 9). Ao salvar, o backend
// checa se o site aceita abrir dentro do portal (iframe); se não aceitar, o
// aluno abre em nova aba.

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, Link2, Loader2, Plus, RefreshCw, Trash2, XCircle, HelpCircle } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { commsFetch, type MenuLink } from '@/lib/org-comms';
import { PageShell } from '@/components/partners/PageShell';

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

export function EmbedBadge({ link }: { link: Pick<MenuLink, 'embeddable' | 'embed_reason'> }) {
  if (link.embeddable === true) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Abre dentro do portal</span>;
  }
  if (link.embeddable === false) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600" title={link.embed_reason ?? undefined}><XCircle className="h-3.5 w-3.5" /> Abre em nova aba</span>;
  }
  // Checado, mas o site não respondeu (erro 404, fora do ar): mostrar o motivo, não "Não checado".
  if (link.embed_reason) {
    const code = /erro (\d{3})/.exec(link.embed_reason)?.[1];
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600" title={link.embed_reason}><XCircle className="h-3.5 w-3.5" /> {code ? `Fora do ar: erro ${code}` : link.embed_reason}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><HelpCircle className="h-3.5 w-3.5" /> Não checado: abre em nova aba</span>;
}

export function SchoolLinks() {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug);
  const [links, setLinks] = useState<MenuLink[] | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [vis, setVis] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLinks((await commsFetch<{ links: MenuLink[] }>(slug, '/menu-links')).links); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setLinks([]); }
  }, [slug]);
  useEffect(() => { void load(); }, [load]);

  async function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); } finally { setBusy(null); }
  }

  const add = () => run('add', async () => {
    await commsFetch(slug, '/menu-links', { method: 'POST', body: JSON.stringify({
      title, url: url.trim(), position: links?.length ?? 0, visible_class_ids: vis.length ? vis : null }) });
    setTitle(''); setUrl(''); setVis([]);
  }, 'Link adicionado.');

  return (
    <PageShell
      variant={'founder'}
      kicker="Comunicação"
      icon={Link2}
      title="Links no menu do aluno"
      description="Plurall, Drive, formulários… Checamos se o site deixa abrir dentro do portal; se não deixar, o aluno abre numa nova aba."
    >

      <section className="mt-5 space-y-3 partner-elevated-card rounded-[20px] bg-white p-5 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr]">
          <input aria-label="Nome do link" className={input} placeholder="Nome no menu" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input aria-label="Endereço" className={input} placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <ClassVisibilityPicker classes={classes} value={vis} onChange={setVis} />
        <div className="flex justify-end">
          <button type="button" disabled={busy === 'add' || !title.trim() || !url.trim()} onClick={() => void add()}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
          </button>
        </div>
      </section>

      <ul className="mt-5 space-y-2">
        {links === null ? <li className="text-sm text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…</li>
          : links.length === 0 ? <li className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">Nenhum link ainda.</li>
          : links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
              <div className="min-w-0">
                <p className={`text-sm font-bold ${l.active === false ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{l.title}</p>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-slate-500 hover:underline">{l.url}</a>
                <EmbedBadge link={l} />
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Checar de novo" title="Checar de novo" disabled={busy === l.id}
                  onClick={() => void run(l.id, () => commsFetch(slug, `/menu-links/${l.id}/check`, { method: 'POST' }), 'Checagem refeita.')}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><RefreshCw className={`h-4 w-4 ${busy === l.id ? 'animate-spin' : ''}`} /></button>
                <button type="button" className="rounded-full px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10"
                  onClick={() => void run(`t-${l.id}`, () => commsFetch(slug, `/menu-links/${l.id}`, { method: 'PATCH', body: JSON.stringify({ active: l.active === false }) }))}>
                  {l.active === false ? 'Mostrar' : 'Esconder'}
                </button>
                <a href={l.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir" className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><ExternalLink className="h-4 w-4" /></a>
                <button type="button" aria-label="Apagar link" onClick={() => { if (window.confirm(`Apagar "${l.title}"?`)) void run(`d-${l.id}`, () => commsFetch(slug, `/menu-links/${l.id}`, { method: 'DELETE' })); }}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
      </ul>
    </PageShell>
  );
}

/** Aluno: abre o link dentro do portal (iframe) quando o site deixa; sempre com "abrir em nova aba". */
export function StudentLinkViewer({ linkId }: { linkId: string }) {
  const { org } = useOrg();
  const [links, setLinks] = useState<MenuLink[] | null>(null);
  const [frameFailed, setFrameFailed] = useState(false);
  useEffect(() => {
    commsFetch<{ links: MenuLink[] }>(org.slug, '/my-links').then((r) => setLinks(r.links)).catch(() => setLinks([]));
  }, [org.slug]);

  if (links === null) return <div className="p-6 text-sm text-slate-500"><Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…</div>;
  const link = links.find((l) => l.id === linkId);
  if (!link) return <p className="p-6 text-sm text-slate-600 dark:text-slate-300">Link não encontrado.</p>;
  const embed = link.embeddable === true && !frameFailed;

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between gap-2 pb-3">
        <h1 className="truncate text-lg font-black text-slate-900 dark:text-white">{link.title}</h1>
        <a href={link.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
          Abrir em nova aba <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {embed ? (
        <iframe title={link.title} src={link.url} className="w-full flex-1 rounded-2xl border border-slate-200 bg-white dark:border-white/10"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          referrerPolicy="no-referrer" onError={() => setFrameFailed(true)} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15">
          <p className="text-sm font-semibold text-slate-700 dark:text-white/80">Este site não deixa abrir dentro do portal.</p>
          <p className="mt-1 text-xs text-slate-500">{link.embed_reason ?? 'Use o botão para abrir numa nova aba.'}</p>
        </div>
      )}
    </div>
  );
}
