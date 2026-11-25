'use client';

// Lista mágica da semana: 10 questões inéditas dos temas em que o aluno mais
// errou ultimamente (e, sem erro recente, dos de nível mais baixo). Resolve no
// mesmo motor do simulado; acertar esfria o tema.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
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
  if (!list) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Montando a sua lista…</div>;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--brand-ink, var(--brand-primary))' }}>
        Lista mágica · {weekLabel(list.week_start)}
      </p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
        <Sparkles className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} /> Suas {list.total_questions || 10} questões da semana
      </h1>

      {list.status === 'empty' ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-white/70">
          Ainda não há temas para montar a sua lista. Responda algumas questões no banco ou num simulado: a lista usa os seus erros para escolher o que treinar.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/65">
            Questões que você nunca fez, dos temas em que você mais precisa treinar agora. Acertar aqui conta no seu nível e esfria o tema.
          </p>
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {list.topics.map((t) => (
              <li key={`${t.subject}|${t.discipline}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{t.discipline}</span>
                  <span className="block text-xs text-slate-500 dark:text-white/50">{t.subject} · {REASON_LABEL[t.reason]}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700 dark:text-white/80">{t.qty} {t.qty === 1 ? 'questão' : 'questões'}</span>
              </li>
            ))}
          </ul>

          {list.status === 'done' ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Lista feita{list.score != null ? `: ${list.score} de ${list.total}` : ''}. A próxima chega na segunda.
              </p>
              {list.session_id && (
                <Link href={`/partners/${slug}/student/simulado/${list.session_id}/revisao`} className="mt-2 inline-block text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
                  Revisar as questões →
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-start gap-2">
              <button type="button" onClick={() => void start()} disabled={starting}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--brand-primary)' }}>
                {starting && <Loader2 className="h-4 w-4 animate-spin" />}
                {list.status === 'in_progress' ? 'Continuar a lista' : 'Começar a lista'}
              </button>
              {conflict && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Você tem outro simulado em andamento. Termine ou descarte em{' '}
                  <Link href={`/partners/${slug}/student/simulado`} className="font-bold underline">Simulados</Link> e volte aqui.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
