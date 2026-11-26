'use client';

/**
 * Meus erros — temas onde o aluno errou, do mais quente para o mais frio.
 *
 * Fonte: GET /api/student/analytics/my-errors (learning.topic_stats no backend,
 * sobre todas as tentativas: banco, simulado, prova impressa…). Errar esquenta
 * o tema; acertar depois esfria. Cada tema lista as questões erradas que ainda
 * não foram acertadas, com atalho para refazer no banco de questões.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Loader2, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudentPage } from '@/components/partners/PageShell';

interface ErrorQuestion {
  id: string;
  year: number | null;
  snippet: string;
}

interface ErrorTopic {
  subject: string;
  discipline: string;
  answers: number;
  correct: number;
  accuracy: number | null;
  mastery: number | null;
  temperature: number;
  heat: number;
  last_error_at: string | null;
  questions: ErrorQuestion[];
}

function heatLabel(heat: number, maxHeat: number): { label: string; className: string } {
  const r = maxHeat > 0 ? heat / maxHeat : 0;
  if (r >= 0.66) return { label: 'Quente', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' };
  if (r >= 0.33) return { label: 'Morno', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' };
  return { label: 'Esfriando', className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' });
  } catch {
    return '';
  }
}

export default function MeusErrosPage() {
  return (
    <ModuleGuard permKey="banco_questoes_enabled">
      <MeusErros />
    </ModuleGuard>
  );
}

function MeusErros() {
  const { org } = useOrg();
  const [topics, setTopics] = useState<ErrorTopic[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${apiUrl}/api/student/analytics/my-errors`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { topics?: ErrorTopic[] };
        setTopics(data.topics ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(true);
        void reportError('MyErrorsLoadError', String(err));
      }
    })();
    return () => controller.abort();
  }, []);

  const bank = `/partners/${org.slug}/student/banco-de-questoes`;
  const maxHeat = Math.max(0, ...(topics ?? []).map((t) => t.heat));

  return (
    <StudentPage
      kicker="Estudar"
      icon={Flame}
      title="Meus erros"
      description="Os temas em que você mais errou recentemente, somando banco de questões, simulados e provas. Errar esquenta o tema; acertar depois esfria."
    >

      {topics === null && !error && (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={18} /> Carregando…
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Não foi possível carregar seus erros agora. Tente de novo em instantes.
        </p>
      )}

      {topics && topics.length === 0 && (
        <div className="rounded-xl border border-slate-200 p-8 text-center dark:border-slate-800">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Nenhum erro recente por aqui.</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Resolva questões e simulados: os temas que você errar aparecem nesta lista.
          </p>
          <Link href={bank} className="mt-4 inline-flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
            Ir para o banco de questões <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {topics && topics.length > 0 && (
        <ul className="space-y-3">
          {topics.map((t) => {
            const key = `${t.subject}||${t.discipline}`;
            const badge = heatLabel(t.heat, maxHeat);
            const isOpen = open === key;
            const practice = `${bank}?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.discipline)}`;
            return (
              <li key={key} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : key)}
                  className="flex w-full items-start gap-3 p-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.subject}</p>
                    <p className="truncate font-bold text-slate-900 dark:text-slate-100">{t.discipline}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {t.correct}/{t.answers} acertos
                      {t.last_error_at ? ` · último erro em ${formatDate(t.last_error_at)}` : ''}
                      {t.questions.length > 0 ? ` · ${t.questions.length} para refazer` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                    <Link
                      href={practice}
                      className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-white"
                      style={{ background: 'var(--brand-primary)' }}
                    >
                      <RotateCcw size={15} /> Praticar este tema
                    </Link>
                    {t.questions.length === 0 ? (
                      <p className="text-sm text-slate-600 dark:text-slate-400">Os erros deste tema vieram de itens sem questão no banco.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {t.questions.map((q) => (
                          <li key={q.id}>
                            <Link href={`${bank}?question_id=${q.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-80">
                              <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                                {q.year ? <span className="mr-1 font-semibold">{q.year} ·</span> : null}
                                <span className="line-clamp-2">{q.snippet || 'Questão'}</span>
                              </span>
                              <ArrowRight size={15} className="shrink-0 text-slate-400" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StudentPage>
  );
}
