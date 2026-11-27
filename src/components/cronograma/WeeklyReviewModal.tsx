'use client';

// Revisão da semana (dia de revisão da rotina ou o padrão da turma): 4 caminhos.
// 1. Top 3 erros (temas mais quentes de "Meus erros") → praticar no banco.
// 2. Revisar o último simulado.  3. Rever a redação corrigida.  4. Outro tema à escolha.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, Flame, Loader2, PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { cronogramaFetch, formatDayMonth } from '@/lib/cronograma';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

interface HotTopic { subject: string; discipline: string; correct: number; answers: number }

const option = 'group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-[1px] hover:shadow-md dark:border-white/10 dark:bg-slate-900';

type Choice = 'top_errors' | 'simulado' | 'redacao' | 'outro';

export function WeeklyReviewModal({ slug, date, onClose }: { slug: string; date: string | null; onClose: () => void }) {
  const themeRoot = useStudentThemeRoot();
  const [topics, setTopics] = useState<HotTopic[] | null>(null);

  // Escolher um caminho conclui o card (decisão de 2026-11-27). Não segura a navegação:
  // se falhar, o card só continua aberto no quadro.
  const choose = (choice: Choice) => {
    if (!date) return;
    void cronogramaFetch('/weekly-review', {
      method: 'POST', keepalive: true, body: JSON.stringify({ date, choice }),
    }).catch(() => undefined);
  };

  useEffect(() => {
    if (!date || topics) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/student/analytics/my-errors`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, cache: 'no-store', signal: controller.signal,
        });
        const data = res.ok ? ((await res.json()) as { topics?: HotTopic[] }) : {};
        setTopics((data.topics ?? []).slice(0, 3));
      } catch {
        if (!controller.signal.aborted) setTopics([]);
      }
    })();
    return () => controller.abort();
  }, [date, topics]);

  const bank = `/partners/${slug}/student/banco-de-questoes`;
  const practice = (t: HotTopic) => `${bank}?${new URLSearchParams({ subject: t.subject, topic: t.discipline }).toString()}`;

  return (
    <Dialog open={!!date} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {date && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-[18px] text-slate-900 dark:text-white">Revisão da semana · {formatDayMonth(date)}</DialogTitle>
              <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
                Escolha por onde começar. As revisões agendadas do dia continuam no quadro.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2.5">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-400/25 dark:bg-rose-500/10">
                <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-rose-800 dark:text-rose-200">
                  <Flame className="h-4 w-4" /> Seus 3 temas com mais erros
                </p>
                {topics === null ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                ) : topics.length === 0 ? (
                  <p className="text-[12px] text-slate-600 dark:text-white/60">Nenhum erro recente. Ótimo sinal!</p>
                ) : (
                  <ul className="space-y-1.5">
                    {topics.map((t) => (
                      <li key={`${t.subject}|${t.discipline}`}>
                        <Link href={practice(t)} onClick={() => choose('top_errors')} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-[12.5px] hover:shadow-sm dark:bg-slate-900">
                          <span className="min-w-0 truncate font-semibold text-slate-800 dark:text-white/85">{t.discipline}</span>
                          <span className="shrink-0 text-[11px] text-slate-500 dark:text-white/50">{t.correct}/{t.answers} · refazer →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/partners/${slug}/student/meus-erros`} onClick={() => choose('top_errors')} className="mt-2 inline-block text-[12px] font-bold text-rose-700 hover:underline dark:text-rose-300">
                  Ver todos em Meus erros
                </Link>
              </div>
              <Link href={`/partners/${slug}/student/simulado/historico`} onClick={() => choose('simulado')} className={option}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15"><ClipboardCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-300" /></span>
                <span><span className="block text-[13.5px] font-bold text-slate-900 dark:text-white">Revisar um simulado</span>
                  <span className="block text-[12px] text-slate-500 dark:text-white/55">Volte nas questões que você errou.</span></span>
              </Link>
              <Link href={`/partners/${slug}/student/redacoes`} onClick={() => choose('redacao')} className={option}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15"><PenLine className="h-4.5 w-4.5 text-amber-600 dark:text-amber-300" /></span>
                <span><span className="block text-[13.5px] font-bold text-slate-900 dark:text-white">Rever a redação corrigida</span>
                  <span className="block text-[12px] text-slate-500 dark:text-white/55">Leia os comentários da correção.</span></span>
              </Link>
              <Link href={bank} onClick={() => choose('outro')} className={option}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15"><BookOpen className="h-4.5 w-4.5 text-blue-600 dark:text-blue-300" /></span>
                <span><span className="block text-[13.5px] font-bold text-slate-900 dark:text-white">Outro tema</span>
                  <span className="block text-[12px] text-slate-500 dark:text-white/55">Escolha no banco de questões.</span></span>
              </Link>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
