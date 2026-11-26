'use client';

// Lista mágica da semana: 10 questões inéditas dos temas em que o aluno mais
// errou ultimamente (e, sem erro recente, dos de nível mais baixo). Resolve no
// mesmo motor do simulado; acertar esfria o tema.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Flame, Loader2, Play, Sparkles, TrendingUp, Wand2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { EmptyState, HeroStat, StudentPage, primaryBtn } from '@/components/partners/PageShell';
import { MagicListFetchError, REASON_LABEL, magicListFetch, weekLabel, type MagicList } from '@/lib/lista-magica';

export function ListaMagica() {
  const { org } = useOrg();
  const slug = org.slug;
  const router = useRouter();
  const [list, setList] = useState<MagicList | null>(null);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await magicListFetch<{ enabled: boolean; list?: MagicList }>('');
      setList(r.list ?? null);
      if (!r.enabled) setFailed(true);
    } catch (e) {
      setFailed(true);
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const go = (sessionId: string) => router.push(`/partners/${slug}/student/simulado?resume=${sessionId}`);

  const start = async () => {
    setStarting(true);
    setConflict(false);
    try {
      const r = await magicListFetch<{ session_id: string }>('/start', { method: 'POST' });
      go(r.session_id);
    } catch (e) {
      if (e instanceof MagicListFetchError && e.body.code === 'active_session') setConflict(true);
      else if (e instanceof MagicListFetchError && e.body.code === 'done') void load();
      else toast.error(e instanceof Error ? e.message : 'Erro ao começar.');
    } finally { setStarting(false); }
  };

  if (failed && !list) return <p className="p-6 text-sm text-slate-500">Lista mágica indisponível.</p>;
  if (!list) return (
    <StudentPage kicker="Lista mágica" icon={Sparkles} title="Suas questões da semana" description="Montando a sua lista…">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-[20px] bg-white dark:bg-white/5" />)}
      </div>
    </StudentPage>
  );

  const total = list.total_questions || 10;
  const done = list.status === 'done';
  const pct = done && list.score != null && list.total ? Math.round((list.score / list.total) * 100) : null;
  const statusLabel = { ready: 'Pronta', in_progress: 'Em andamento', done: 'Feita', empty: 'Sem temas' }[list.status];

  const cta = !done && list.status !== 'empty' && (
    <button type="button" onClick={() => void start()} disabled={starting}
      className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-[14px] font-black text-slate-900 shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60">
      {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />}
      {list.status === 'in_progress' ? 'Continuar a lista' : 'Começar a lista'}
    </button>
  );

  return (
    <StudentPage
      kicker={`Lista mágica · ${weekLabel(list.week_start)}`}
      icon={Sparkles}
      title={`Suas ${total} questões da semana`}
      description="Questões inéditas dos temas em que você mais precisa treinar. Acertar esfria o tema."
      actions={cta || undefined}
      aside={list.status === 'empty' ? undefined : <>
        <HeroStat label="Situação" value={statusLabel} hint={done && list.score != null ? `${list.score} de ${list.total} certas` : 'nova toda segunda'} />
        <HeroStat label="Temas" value={list.topics.length} hint={`${total} questões`} />
      </>}
    >
      {conflict && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Você tem outro simulado em andamento. Termine ou descarte em{' '}
          <Link href={`/partners/${slug}/student/simulado`} className="font-bold underline">Simulados</Link> e volte aqui.
        </p>
      )}

      {done && (
        <div className="partner-elevated-card relative overflow-hidden rounded-[24px] bg-white p-5 sm:p-6 dark:bg-slate-900">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-2xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            {pct != null && (
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" className="stroke-slate-100 dark:stroke-white/10" />
                  <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3.5" strokeLinecap="round" stroke="#10b981"
                    strokeDasharray={`${(pct / 100) * 97.4} 97.4`} />
                </svg>
                <span className="font-display absolute inset-0 flex items-center justify-center text-xl font-black text-slate-900 dark:text-white">{pct}%</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-black text-slate-900 dark:text-white">Lista da semana feita! 🎉</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {list.score != null ? `Você acertou ${list.score} de ${list.total}. ` : ''}Os temas que você acertou esfriaram. A próxima lista chega na segunda.
              </p>
              {list.session_id && (
                <Link href={`/partners/${slug}/student/simulado/${list.session_id}/revisao`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-sm" style={{ background: 'var(--brand-primary)' }}>
                  Revisar as questões <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {list.status === 'empty' ? (
        <EmptyState
          icon={Wand2}
          tone="violet"
          title="Sua lista começa com as suas respostas"
          description="Toda segunda a lista mágica escolhe 10 questões que você nunca fez, dos temas em que você mais errou. Para isso ela precisa conhecer você."
          steps={['Responda umas 15 questões no banco ou faça um simulado', 'Na segunda, sua lista aparece aqui pronta', 'Acertou? O tema esfria e sai da lista']}
          action={<Link href={`/partners/${slug}/student/banco-de-questoes`} className={primaryBtn}>Responder questões agora <ArrowRight className="h-4 w-4" /></Link>}
          secondary={<Link href={`/partners/${slug}/student/simulado`} className="text-[13px] font-bold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300">ou fazer um simulado</Link>}
          preview={<MagicListPreview />}
        />
      ) : (
        <section>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">O que vai cair na sua lista</p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.topics.map((t) => (
              <li key={`${t.subject}|${t.discipline}`} className="partner-elevated-card relative overflow-hidden rounded-[20px] bg-white p-4 dark:bg-slate-900">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: t.reason === 'erro_recente' ? 'rgba(239,68,68,0.12)' : 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}>
                    {t.reason === 'erro_recente'
                      ? <Flame className="h-5 w-5 text-red-500" />
                      : <TrendingUp className="h-5 w-5" style={{ color: 'var(--brand-ink, var(--brand-primary))' }} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{t.subject}</p>
                    <p className="font-display truncate text-[15.5px] font-black text-slate-900 dark:text-white" title={t.discipline}>{t.discipline}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Porque {REASON_LABEL[t.reason]}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5" aria-label={`${t.qty} ${t.qty === 1 ? 'questão' : 'questões'}`}>
                  {Array.from({ length: t.qty }, (_, i) => (
                    <span key={i} className="h-2 flex-1 rounded-full" style={{ background: 'var(--brand-primary)', opacity: done ? 0.35 : 0.85 }} />
                  ))}
                  <span className="ml-1 shrink-0 text-[12px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{t.qty}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </StudentPage>
  );
}

/** Prévia decorativa do estado vazio: como a lista fica quando há temas. */
function MagicListPreview() {
  const rows = [
    { s: 'Matemática', d: 'Função do 2º grau', q: 4, hot: true },
    { s: 'Química', d: 'Estequiometria', q: 3, hot: true },
    { s: 'Biologia', d: 'Genética', q: 3, hot: false },
  ];
  return (
    <div className="mx-auto max-w-[400px] space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.d} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-slate-800"
          style={{ transform: `translateX(${i * 14}px)` }}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${r.hot ? 'bg-red-50 text-red-500 dark:bg-red-500/15' : 'bg-violet-50 text-violet-500 dark:bg-violet-500/15'}`}>
            {r.hot ? <Flame className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{r.s}</p>
            <p className="truncate text-[13.5px] font-black text-slate-900 dark:text-white">{r.d}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: r.q }, (_, k) => <span key={k} className="h-2 w-2 rounded-full bg-violet-400" />)}
          </div>
        </div>
      ))}
    </div>
  );
}
