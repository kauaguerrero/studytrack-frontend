'use client';

// Gestor: integração com o Galileu (financeiro). Liga/desliga por escola, cola a
// chave da API (o servidor testa antes de salvar e guarda cifrada) e vincula
// cada aluno ao cadastro do Galileu — automático por e-mail ou manual.

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Link2, Loader2, Plug, Search, Trash2, Unlink, XCircle } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import {
  integrationsFetch, type GalileuStatus, type GalileuStudent, type LinkOverview, type LinkRow,
} from '@/lib/integrations';
import { PageShell } from '@/components/partners/PageShell';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5';
const btn = 'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold disabled:opacity-50';
const btnPrimary = `${btn} bg-slate-900 text-white dark:bg-white dark:text-slate-900`;
const btnGhost = `${btn} border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10`;
const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white';

export function GalileuSettings() {
  const { org } = useOrg();
  const slug = org.slug;
  const base = '/integrations/galileu';
  const [st, setSt] = useState<GalileuStatus | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [links, setLinks] = useState<LinkOverview | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linking, setLinking] = useState<LinkRow | null>(null);

  const run = async <T,>(tag: string, fn: () => Promise<T>, ok?: string): Promise<T | undefined> => {
    setBusy(tag);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg({ ok: true, text: ok });
      return r;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro.' });
    } finally {
      setBusy(null);
    }
  };

  const loadStatus = useCallback(async () => {
    try { setSt(await integrationsFetch<GalileuStatus>(slug, base)); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Erro ao carregar.' }); }
  }, [slug]);
  const loadLinks = useCallback(async () => {
    setLinksError(null);
    try { setLinks(await integrationsFetch<LinkOverview>(slug, `${base}/links`)); }
    catch (e) { setLinksError(e instanceof Error ? e.message : 'Erro ao carregar os alunos.'); }
  }, [slug]);
  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => { if (st?.configured) void loadLinks(); }, [st?.configured, loadLinks]);

  const saveKey = async () => {
    const r = await run('key', () => integrationsFetch<GalileuStatus>(slug, `${base}/key`, { method: 'PUT', body: JSON.stringify({ key }) }),
      'Chave testada e salva.');
    if (r) { setSt(r); setKey(''); }
  };
  const removeKey = async () => {
    if (!window.confirm('Apagar a chave e desligar o financeiro para os alunos?')) return;
    const r = await run('del', () => integrationsFetch<GalileuStatus>(slug, `${base}/key`, { method: 'DELETE' }), 'Chave apagada.');
    if (r) setSt(r);
  };
  const toggle = async (enabled: boolean) => {
    const r = await run('toggle', () => integrationsFetch<GalileuStatus>(slug, `${base}/enabled`, { method: 'POST', body: JSON.stringify({ enabled }) }),
      enabled ? 'Financeiro ligado: os alunos vinculados já veem as parcelas.' : 'Financeiro desligado.');
    if (r) setSt(r);
  };
  const test = async () => {
    const r = await run('test', () => integrationsFetch<GalileuStatus>(slug, `${base}/test`, { method: 'POST' }));
    if (r) { setSt(r); setMsg(r.ok ? { ok: true, text: 'Conexão com o Galileu ok.' } : { ok: false, text: r.error || 'Falhou.' }); }
  };
  const autoLink = async () => {
    const r = await run('auto', () => integrationsFetch<{ linked_now: number; without_match: number }>(slug, `${base}/links/auto`, { method: 'POST' }));
    if (r) {
      setMsg({ ok: true, text: `${r.linked_now} aluno(s) vinculado(s) pelo e-mail. ${r.without_match} sem correspondência — vincule à mão.` });
      void loadLinks();
    }
  };
  const unlink = async (row: LinkRow) => {
    const r = await run(`un-${row.user_id}`, () => integrationsFetch(slug, `${base}/links/${row.user_id}`, { method: 'DELETE' }));
    if (r) void loadLinks();
  };

  return (
    <PageShell
      variant={'founder'}
      kicker="Escola"
      icon={Plug}
      title="Integrações"
      description="Conecte sistemas que a escola já usa. Nada é alterado neles: a StudyTrack só lê."
    >

      {msg && (
        <p role="status" className={`mt-4 rounded-xl p-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'}`}>{msg.text}</p>
      )}

      <section className={`${card} mt-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Galileu — financeiro</h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-white/55">
              O aluno vê as próprias parcelas (pagas, em aberto e vencidas) com o link do boleto e o WhatsApp do financeiro.
            </p>
          </div>
          {st && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
              <input type="checkbox" role="switch" aria-label="Ligar financeiro para os alunos" className="h-5 w-9 accent-emerald-600"
                checked={st.enabled} disabled={!st.configured || busy === 'toggle'} onChange={(e) => void toggle(e.target.checked)} />
              {st.enabled ? 'Ligado' : 'Desligado'}
            </label>
          )}
        </div>

        {!st ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-white/70">
              <KeyRound className="h-4 w-4" />
              {st.key_source === 'org' && <>Chave salva (termina em <b>{st.key_last4}</b>).</>}
              {st.key_source === 'env' && <>Usando a chave configurada no servidor. Cole a chave da escola para assumir.</>}
              {st.key_source === 'invalid' && <span className="text-red-600 dark:text-red-300">A chave salva não pode mais ser lida — cole de novo.</span>}
              {st.key_source === null && <>Nenhuma chave cadastrada.</>}
              {st.last_check_at && (
                <span className="inline-flex items-center gap-1 text-xs">
                  {st.last_check_ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                  último teste {new Date(st.last_check_at).toLocaleString('pt-BR')}
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <input type="password" autoComplete="off" aria-label="Chave da API do Galileu" placeholder="Cole aqui a chave da API do Galileu"
                className={`${input} min-w-[240px] flex-1`} value={key} onChange={(e) => setKey(e.target.value)} />
              <button type="button" className={btnPrimary} disabled={key.trim().length < 10 || busy === 'key'} onClick={() => void saveKey()}>
                {busy === 'key' && <Loader2 className="h-4 w-4 animate-spin" />} Testar e salvar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {st.configured && <button type="button" className={btnGhost} disabled={busy === 'test'} onClick={() => void test()}>Testar conexão</button>}
              {st.key_source === 'org' && (
                <button type="button" className={btnGhost} disabled={busy === 'del'} onClick={() => void removeKey()}><Trash2 className="h-4 w-4" /> Apagar chave</button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-white/40">A chave fica cifrada no servidor e nunca aparece de novo nesta tela.</p>
          </div>
        )}
      </section>

      {st?.configured && (
        <section className={`${card} mt-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Alunos vinculados</h2>
              <p className="text-sm text-slate-500 dark:text-white/55">
                {links ? `${links.linked} de ${links.total} alunos ligados ao cadastro do Galileu.` : 'Cada aluno precisa estar ligado ao cadastro dele no Galileu.'}
              </p>
            </div>
            <button type="button" className={btnPrimary} disabled={busy === 'auto'} onClick={() => void autoLink()}>
              {busy === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Vincular pelo e-mail
            </button>
          </div>
          {linksError && <p className="mt-3 text-sm text-red-600 dark:text-red-300">{linksError}</p>}
          {!links ? (
            !linksError && <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
              {links.students.map((row) => (
                <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.name || row.email || 'Aluno'}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-white/50">
                      {row.link
                        ? <>Galileu: {row.link.galileu?.nome ?? `#${row.link.external_student_id}`} · {row.link.matched_by === 'email' ? 'pelo e-mail' : 'manual'}</>
                        : <>Sem vínculo · {row.email}</>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={btnGhost} onClick={() => setLinking(row)}>{row.link ? 'Trocar' : 'Vincular'}</button>
                    {row.link && (
                      <button type="button" aria-label={`Desvincular ${row.name ?? ''}`} className={btnGhost} disabled={busy === `un-${row.user_id}`} onClick={() => void unlink(row)}>
                        <Unlink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {linking && (
        <LinkDialog slug={slug} row={linking} onClose={() => setLinking(null)}
          onLinked={() => { setLinking(null); setMsg({ ok: true, text: 'Aluno vinculado.' }); void loadLinks(); }} />
      )}
    </PageShell>
  );
}

function LinkDialog({ slug, row, onClose, onLinked }: { slug: string; row: LinkRow; onClose: () => void; onLinked: () => void }) {
  const [q, setQ] = useState(row.name ?? '');
  const [results, setResults] = useState<GalileuStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true); setError(null);
    try {
      const r = await integrationsFetch<{ results: GalileuStudent[] }>(slug, `/integrations/galileu/search?q=${encodeURIComponent(q.trim())}`);
      setResults(r.results);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro na busca.'); }
    finally { setBusy(false); }
  };
  const pick = async (s: GalileuStudent) => {
    setBusy(true); setError(null);
    try {
      await integrationsFetch(slug, `/integrations/galileu/links/${row.user_id}`, { method: 'PUT', body: JSON.stringify({ external_student_id: s.id_aluno }) });
      onLinked();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao vincular.'); setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Vincular ao Galileu" className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-black text-slate-900 dark:text-white">Vincular {row.name || row.email}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-white/55">Busque no Galileu por nome, e-mail, RM ou CPF.</p>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <input aria-label="Buscar no Galileu" className={input} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button type="submit" className={btnPrimary} disabled={busy || q.trim().length < 3}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{error}</p>}
        {results && (
          results.length === 0 ? <p className="mt-3 text-sm text-slate-500">Ninguém encontrado.</p> : (
            <ul className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto dark:divide-white/10">
              {results.map((s) => (
                <li key={s.id_aluno}>
                  <button type="button" disabled={busy} onClick={() => void pick(s)} className="w-full rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/10">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{s.nome}</span>
                    <span className="block text-xs text-slate-500 dark:text-white/50">{[s.email, s.rm && `RM ${s.rm}`, s.cpf].filter(Boolean).join(' · ') || `#${s.id_aluno}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
        <div className="mt-4 flex justify-end"><button type="button" className={btnGhost} onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}
