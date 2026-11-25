'use client';

// Cartão-resposta do simulado por gabarito: o aluno fez a prova fora do app
// (papel, PDF) e marca aqui A–E. Envio único; nota na hora. O gabarito aparece
// depois do envio (ou só no fim do prazo, se a escola escolheu assim).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, Loader2, XCircle } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { OPTIONS, answerKeyFetch, type Option, type SheetResponse } from '@/lib/answer-key';

const DRAFT_KEY = (id: string) => `gabarito-rascunho:${id}`;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export default function StudentGabaritoPage() {
  return (
    <ModuleGuard permKey="simulados_enabled">
      <Sheet />
    </ModuleGuard>
  );
}

function Sheet() {
  const { org } = useOrg();
  const slug = org.slug;
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SheetResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Option>>({});
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await answerKeyFetch<SheetResponse>(slug, `/${id}/sheet`);
      setData(d);
      if (d.submission) setAnswers(d.submission.answers);
      else {
        // Rascunho local: fechar a aba não perde o que já foi marcado.
        try { const raw = localStorage.getItem(DRAFT_KEY(id)); if (raw) setAnswers(JSON.parse(raw)); } catch { /* sem storage */ }
      }
    } catch (e) {
      setFailed(true);
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar.');
    }
  }, [slug, id]);
  useEffect(() => { void load(); }, [load]);

  const mark = (n: number, o: Option) => {
    if (data?.submission) return;
    setAnswers((a) => {
      const next = { ...a };
      if (next[String(n)] === o) delete next[String(n)]; else next[String(n)] = o;
      try { localStorage.setItem(DRAFT_KEY(id), JSON.stringify(next)); } catch { /* sem storage */ }
      return next;
    });
  };

  const send = async () => {
    setSending(true);
    try {
      const d = await answerKeyFetch<SheetResponse>(slug, `/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
      setData(d);
      setConfirming(false);
      try { localStorage.removeItem(DRAFT_KEY(id)); } catch { /* sem storage */ }
      toast.success(d.result ? `Enviado! Você acertou ${d.result.score} de ${d.result.total}.` : 'Enviado! O gabarito sai no fim do prazo.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar.');
    } finally { setSending(false); }
  };

  const graded = useMemo(() => new Map((data?.result?.items ?? []).map((i) => [i.number, i])), [data]);

  if (failed) return <p className="p-6 text-sm text-slate-500">Simulado não encontrado.</p>;
  if (!data) return <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const sim = data.simulado;
  const submitted = !!data.submission;
  const open = sim.status === 'active' && !submitted;
  const blank = data.items.filter((i) => !i.annulled && !answers[String(i.number)]).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <Link href={`/partners/${slug}/student/simulado`} className="mb-2 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
        <ChevronLeft size={14} /> Simulados
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{sim.title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {sim.qty} questões · {sim.status === 'scheduled' ? `abre em ${fmt(sim.starts_at)}` : sim.ends_at ? `envio até ${fmt(sim.ends_at)}` : 'cartão-resposta'}
      </p>

      {submitted && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          {data.result ? (
            <>
              <p className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                {data.result.score}/{data.result.total} <span className="text-base font-bold text-slate-500">· {data.result.percentage}%</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(data.result.results_by_subject).map(([s, r]) => (
                  <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {s}: {r.correct}/{r.total}
                  </span>
                ))}
              </div>
              <Link href={`/partners/${slug}/student/meus-erros`} className="mt-3 inline-block text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
                Ver os temas que mais errei →
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Respostas enviadas em {fmt(data.submission!.completed_at)}. O gabarito e a sua nota aparecem quando o prazo terminar.
            </p>
          )}
        </div>
      )}

      {sim.status === 'scheduled' ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          O cartão-resposta abre em {fmt(sim.starts_at)}.
        </p>
      ) : (
        <ol className="mt-5 grid gap-1.5 sm:grid-cols-2">
          {data.items.map((i) => {
            const g = graded.get(i.number);
            const mine = answers[String(i.number)];
            return (
              <li key={i.number} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${
                g && !g.annulled ? (g.is_correct ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10')
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
                <span className="w-7 shrink-0 text-right text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">{i.number}</span>
                {i.annulled ? (
                  <span className="text-xs font-semibold text-slate-400">anulada</span>
                ) : (
                  <div className="flex gap-1" role="radiogroup" aria-label={`Questão ${i.number}`}>
                    {OPTIONS.map((o) => {
                      const isMine = mine === o;
                      const isRight = g?.correct_option === o;
                      return (
                        <button key={o} type="button" role="radio" aria-checked={isMine} disabled={!open}
                          onClick={() => mark(i.number, o)}
                          className={`h-8 w-8 rounded-full text-xs font-bold transition ${
                            isMine ? 'text-white' : isRight ? 'ring-2 ring-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                          style={isMine ? { background: g ? (g.is_correct ? '#10b981' : '#f43f5e') : 'var(--brand-primary)' } : undefined}>
                          {o}
                        </button>
                      );
                    })}
                  </div>
                )}
                {g && !g.annulled && (g.is_correct
                  ? <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" aria-label="certa" />
                  : <XCircle className="ml-auto h-4 w-4 shrink-0 text-rose-500" aria-label={g.marked ? 'errada' : 'em branco'} />)}
                {!g && <span className="ml-auto truncate text-[11px] text-slate-400" title={i.discipline ?? i.subject}>{i.subject}</span>}
              </li>
            );
          })}
        </ol>
      )}

      {open && (
        <div className="sticky bottom-0 mt-5 flex flex-col gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {blank ? `${blank} em branco (contam como erro).` : 'Todas marcadas.'} Você só pode enviar uma vez.
          </p>
          {confirming ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirming(false)} disabled={sending}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Voltar</button>
              <button type="button" onClick={() => void send()} disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
                {sending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar envio
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
              Enviar respostas
            </button>
          )}
        </div>
      )}
      {sim.status === 'ended' && !submitted && (
        <p className="mt-5 text-sm text-slate-500">O prazo terminou e você não enviou. O gabarito está acima para conferir.</p>
      )}
    </div>
  );
}
