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
import { ArrowRight, ChevronDown, Flame, RotateCcw, Snowflake, Thermometer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { HeroStat, StudentPage } from '@/components/partners/PageShell';

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

const HEAT_LEVELS = [
  { label: 'Quente', color: '#ef4444', icon: Flame, hint: 'Revise primeiro' },
  { label: 'Morno', color: '#f59e0b', icon: Thermometer, hint: 'Vale uma passada' },
  { label: 'Esfriando', color: '#38bdf8', icon: Snowflake, hint: 'Quase dominado' },
] as const;

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
      aside={<>
        <HeroStat label="Temas com erro" value={topics === null ? '…' : topics.length} hint="nos últimos meses" />
        <HeroStat label="Mais quente" value={topics?.[0] ? topics[0].discipline : '—'} hint={topics?.[0] ? topics[0].subject : 'Nenhum erro recente'} />
      </>}
      description="Os temas em que você mais errou recentemente, somando banco de questões, simulados e provas. Errar esquenta o tema; acertar depois esfria."
    >

      {topics === null && !error && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-[20px] bg-white dark:bg-white/5" />)}
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          Não foi possível carregar seus erros agora. Tente de novo em instantes.
        </p>
      )}

      {topics && topics.length === 0 && (
        <div className="partner-elevated-card flex flex-col items-center rounded-[24px] bg-white px-6 py-12 text-center dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 dark:bg-emerald-500/10">
            <Snowflake className="h-8 w-8 text-emerald-500" />
          </div>
          <p className="font-display mt-4 text-xl font-black text-slate-900 dark:text-white">Tudo frio por aqui</p>
          <p className="mt-1 max-w-sm text-sm text-slate-600 dark:text-slate-400">
            Nenhum erro recente. Resolva questões e simulados: os temas que você errar aparecem aqui para revisar.
          </p>
          <Link href={bank} className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm" style={{ background: 'var(--brand-primary)' }}>
            Ir para o banco de questões <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {topics && topics.length > 0 && (
        <>
          {/* Termômetro: quantos temas em cada faixa */}
          <div className="grid grid-cols-3 gap-3">
            {HEAT_LEVELS.map((lv) => {
              const n = topics.filter((t) => heatLabel(t.heat, maxHeat).label === lv.label).length;
              const LvIcon = lv.icon;
              return (
                <div key={lv.label} className="partner-elevated-card relative overflow-hidden rounded-[20px] bg-white p-4 dark:bg-slate-900">
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: lv.color }} />
                  <div className="flex items-center gap-2">
                    <LvIcon className="h-4 w-4" style={{ color: lv.color }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{lv.label}</p>
                  </div>
                  <p className="font-display mt-1 text-[28px] font-black leading-none text-slate-900 dark:text-white">{n}</p>
                  <p className="mt-1 hidden text-[11.5px] text-slate-500 sm:block dark:text-slate-400">{lv.hint}</p>
                </div>
              );
            })}
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {topics.map((t, idx) => {
              const key = `${t.subject}||${t.discipline}`;
              const badge = heatLabel(t.heat, maxHeat);
              const lv = HEAT_LEVELS.find((l) => l.label === badge.label) ?? HEAT_LEVELS[2];
              const ratio = maxHeat > 0 ? Math.max(0.06, t.heat / maxHeat) : 0.06;
              const acc = t.answers ? Math.round((t.correct / t.answers) * 100) : null;
              const isOpen = open === key;
              const practice = `${bank}?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.discipline)}`;
              return (
                <li key={key} className={`partner-elevated-card relative overflow-hidden rounded-[20px] bg-white dark:bg-slate-900 ${isOpen ? 'md:col-span-2' : ''}`}>
                  <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: lv.color }} />
                  <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">#{idx + 1} · {t.subject}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${badge.className}`}>{badge.label}</span>
                        </div>
                        <p className="font-display mt-1 text-[17px] font-black leading-snug text-slate-900 dark:text-white">{t.discipline}</p>
                      </div>
                      {acc != null && (
                        <div className="shrink-0 text-right">
                          <p className="font-display text-[22px] font-black leading-none text-slate-900 dark:text-white">{acc}%</p>
                          <p className="text-[10.5px] font-semibold text-slate-400">de acerto</p>
                        </div>
                      )}
                    </div>

                    {/* barra de temperatura (gradiente frio → quente, cortado no nível do tema) */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="img" aria-label={`Temperatura: ${badge.label}`}>
                      <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #ef4444)', backgroundSize: `${100 / ratio}% 100%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t.correct}/{t.answers} acertos
                      {t.last_error_at ? ` · último erro em ${formatDate(t.last_error_at)}` : ''}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link href={practice} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'var(--brand-primary)' }}>
                        <RotateCcw size={14} /> Praticar
                      </Link>
                      {t.questions.length > 0 && (
                        <button type="button" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5">
                          {t.questions.length} para refazer
                          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {t.questions.map((q) => (
                          <li key={q.id}>
                            <Link href={`${bank}?question_id=${q.id}`}
                              className="flex h-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 text-sm transition hover:border-slate-200 hover:bg-white dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10">
                              <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                                {q.year ? <span className="mr-1 font-bold text-slate-900 dark:text-white">{q.year} ·</span> : null}
                                <span className="line-clamp-3">{q.snippet || 'Questão'}</span>
                              </span>
                              <ArrowRight size={15} className="mt-0.5 shrink-0 text-slate-400" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
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
