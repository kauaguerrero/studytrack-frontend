'use client';

/**
 * Meus erros — temas onde o aluno errou, do mais quente para o mais frio.
 *
 * Fonte: GET /api/student/analytics/my-errors (learning.topic_stats no backend,
 * sobre todas as tentativas: banco, simulado, prova impressa…). Errar esquenta
 * o tema; acertar depois esfria. Cada tema lista as questões erradas que ainda
 * não foram acertadas, com atalho para refazer no banco de questões.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Flame, RotateCcw, SlidersHorizontal, Snowflake, Thermometer } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import { useOrg } from '@/contexts/OrgContext';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { EmptyState, HeroStat, StudentPage, primaryBtn } from '@/components/partners/PageShell';

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

/**
 * Escala FIXA de temperatura (não relativa à lista): `heat` do backend ≈ número de
 * erros recentes (cada erro vale 1 hoje e perde metade a cada 30 dias; acertar
 * depois do último erro desconta). Com 5 ou mais o termômetro está no máximo.
 */
const HEAT_FULL = 5;
const heatPos = (heat: number) => Math.min(1, Math.max(0.04, heat / HEAT_FULL));

const HEAT_LEVELS = [
  { label: 'Quente', short: 'Quente', color: '#ef4444', icon: Flame, hint: 'Revise primeiro', min: 3,
    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { label: 'Morno', short: 'Morno', color: '#f59e0b', icon: Thermometer, hint: 'Vale uma passada', min: 1.25,
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { label: 'Esfriando', short: 'Frio', color: '#38bdf8', icon: Snowflake, hint: 'Quase dominado', min: 0,
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
] as const;
type HeatLevel = (typeof HEAT_LEVELS)[number];

function heatLevel(heat: number): HeatLevel {
  return HEAT_LEVELS.find((l) => heat >= l.min) ?? HEAT_LEVELS[2];
}

const ACC_RANGES = [
  { id: 'low', label: 'Até 40%', test: (a: number) => a < 40 },
  { id: 'mid', label: '40% a 70%', test: (a: number) => a >= 40 && a < 70 },
  { id: 'high', label: '70% ou mais', test: (a: number) => a >= 70 },
] as const;
const RECENCY = [
  { id: '7', label: 'Últimos 7 dias', days: 7 },
  { id: '30', label: 'Últimos 30 dias', days: 30 },
  { id: '90', label: 'Últimos 3 meses', days: 90 },
] as const;

interface Filters {
  temps: string[];
  subjects: string[];
  acc: 'all' | (typeof ACC_RANGES)[number]['id'];
  recency: 'all' | (typeof RECENCY)[number]['id'];
  onlyRedo: boolean;
  sort: 'heat' | 'acc' | 'recent' | 'redo';
}
const EMPTY_FILTERS: Filters = { temps: [], subjects: [], acc: 'all', recency: 'all', onlyRedo: false, sort: 'heat' };

function FilterGroup({ id, title, open, setOpen, count, children }: {
  id: string; title: string; open: string[]; setOpen: (v: string[]) => void; count: number; children: React.ReactNode;
}) {
  const isOpen = open.includes(id);
  return (
    <div className="py-2.5">
      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? open.filter((x) => x !== id) : [...open, id])}
        className="flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {title}
          {count > 0 && <span className="rounded-full px-1.5 text-[10px] font-black text-white" style={{ background: 'var(--brand-primary)' }}>{count}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="mt-2.5 flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
}

function Chip({ on, onClick, color, children }: { on: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${on ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/10'}`}
      style={on ? { background: color ?? 'var(--brand-primary)' } : undefined}>
      {children}
    </button>
  );
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
  const [f, setF] = useState<Filters>(EMPTY_FILTERS);
  const [openGroups, setOpenGroups] = useState<string[]>(['temp', 'subject']);
  const toggle = (k: 'temps' | 'subjects', v: string) =>
    setF((cur) => ({ ...cur, [k]: cur[k].includes(v) ? cur[k].filter((x) => x !== v) : [...cur[k], v] }));
  const activeCount = f.temps.length + f.subjects.length + (f.acc !== 'all' ? 1 : 0) + (f.recency !== 'all' ? 1 : 0) + (f.onlyRedo ? 1 : 0);

  // posição de cada tema na lista completa (o "#1" não muda ao filtrar)
  const rank = useMemo(() => new Map((topics ?? []).map((t, i) => [`${t.subject}||${t.discipline}`, i + 1])), [topics]);
  const subjects = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of topics ?? []) m.set(t.subject, (m.get(t.subject) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
  }, [topics]);
  const visible = useMemo(() => {
    const now = Date.now();
    const accOf = (t: ErrorTopic) => (t.answers ? (t.correct / t.answers) * 100 : 100);
    const rng = ACC_RANGES.find((r) => r.id === f.acc);
    const rec = RECENCY.find((r) => r.id === f.recency);
    const out = (topics ?? []).filter((t) =>
      (!f.temps.length || f.temps.includes(heatLevel(t.heat).label))
      && (!f.subjects.length || f.subjects.includes(t.subject))
      && (!rng || rng.test(accOf(t)))
      && (!rec || (t.last_error_at != null && now - new Date(t.last_error_at).getTime() <= rec.days * 864e5))
      && (!f.onlyRedo || t.questions.length > 0));
    if (f.sort === 'acc') out.sort((a, b) => accOf(a) - accOf(b));
    else if (f.sort === 'recent') out.sort((a, b) => (b.last_error_at ?? '').localeCompare(a.last_error_at ?? ''));
    else if (f.sort === 'redo') out.sort((a, b) => b.questions.length - a.questions.length);
    return out; // 'heat': ordem do backend (temperatura)
  }, [topics, f]);

  return (
    <StudentPage
      kicker="Estudar"
      icon={Flame}
      title="Meus erros"
      aside={topics && topics.length > 0 ? <>
        <HeroStat label="Temas" value={topics.length} hint="com erro" />
        <HeroStat label="Mais quente" value={topics[0].discipline} hint={topics[0].subject} className="hidden sm:block" />
        <HeroStat label="Refazer" value={topics.reduce((a, t) => a + t.questions.length, 0)} hint="questões" />
      </> : undefined}
      description="Banco, simulados e provas juntos: errar esquenta o tema, acertar depois esfria."
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
        <EmptyState
          icon={Snowflake}
          tone="emerald"
          title="Tudo frio por aqui"
          description="Os temas em que você erra esquentam e aparecem aqui, do mais quente para o mais frio. Errou? Revise. Acertou depois? O tema esfria sozinho."
          steps={['Resolva questões no banco ou faça um simulado', 'Cada erro esquenta o tema dele', 'Clique em Praticar para refazer só o que você errou']}
          action={<Link href={bank} className={primaryBtn}>Ir para o banco de questões <ArrowRight size={16} /></Link>}
          preview={<HeatPreview />}
        />
      )}

      {topics && topics.length > 0 && (
        <>
          {/* Termômetro: quantos temas em cada faixa (clicar filtra) */}
          <div className="grid grid-cols-3 gap-3">
            {HEAT_LEVELS.map((lv) => {
              const n = topics.filter((t) => heatLevel(t.heat).label === lv.label).length;
              const LvIcon = lv.icon;
              const on = f.temps.includes(lv.label);
              return (
                <button key={lv.label} type="button" aria-pressed={on} onClick={() => toggle('temps', lv.label)}
                  className={`partner-elevated-card relative overflow-hidden rounded-[20px] bg-white p-4 text-left transition hover:-translate-y-0.5 dark:bg-slate-900 ${on ? 'ring-2' : ''}`}
                  style={on ? { ['--tw-ring-color' as string]: lv.color } : undefined}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: lv.color }} />
                  <div className="flex items-center gap-2">
                    <LvIcon className="h-4 w-4 shrink-0" style={{ color: lv.color }} />
                    <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-500 sm:text-[11px] sm:tracking-[0.12em] dark:text-slate-400"><span className="sm:hidden">{lv.short}</span><span className="hidden sm:inline">{lv.label}</span></p>
                  </div>
                  <p className="font-display mt-1 text-[28px] font-black leading-none text-slate-900 dark:text-white">{n}</p>
                  <p className="mt-1 hidden text-[11.5px] text-slate-500 sm:block dark:text-slate-400">{lv.hint}</p>
                </button>
              );
            })}
          </div>

          {/* Filtros: temperatura e matéria abertos por padrão; os outros recolhidos */}
          <section className="partner-elevated-card rounded-[20px] bg-white p-4 sm:p-5 dark:bg-slate-900" aria-label="Filtros">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-white">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" /> Filtros
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {visible.length} de {topics.length} temas
                </span>
                {activeCount > 0 && (
                  <button type="button" onClick={() => setF(EMPTY_FILTERS)} className="text-[12px] font-bold text-slate-500 underline-offset-4 hover:underline dark:text-slate-300">Limpar</button>
                )}
              </p>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                Ordenar
                <select aria-label="Ordenar" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as Filters['sort'] })}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <option value="heat">Mais quente</option>
                  <option value="acc">Menor acerto</option>
                  <option value="recent">Erro mais recente</option>
                  <option value="redo">Mais para refazer</option>
                </select>
              </label>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
              <FilterGroup id="temp" title="Temperatura" open={openGroups} setOpen={setOpenGroups} count={f.temps.length}>
                {HEAT_LEVELS.map((lv) => (
                  <Chip key={lv.label} on={f.temps.includes(lv.label)} onClick={() => toggle('temps', lv.label)} color={lv.color}>
                    <lv.icon className="h-3.5 w-3.5" /> {lv.label}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup id="subject" title="Matéria" open={openGroups} setOpen={setOpenGroups} count={f.subjects.length}>
                {subjects.map(([s, n]) => (
                  <Chip key={s} on={f.subjects.includes(s)} onClick={() => toggle('subjects', s)}>
                    {s} <span className="opacity-60">{n}</span>
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup id="acc" title="Acerto" open={openGroups} setOpen={setOpenGroups} count={f.acc === 'all' ? 0 : 1}>
                {ACC_RANGES.map((r) => (
                  <Chip key={r.id} on={f.acc === r.id} onClick={() => setF({ ...f, acc: f.acc === r.id ? 'all' : r.id })}>{r.label}</Chip>
                ))}
              </FilterGroup>
              <FilterGroup id="recency" title="Último erro" open={openGroups} setOpen={setOpenGroups} count={f.recency === 'all' ? 0 : 1}>
                {RECENCY.map((r) => (
                  <Chip key={r.id} on={f.recency === r.id} onClick={() => setF({ ...f, recency: f.recency === r.id ? 'all' : r.id })}>{r.label}</Chip>
                ))}
              </FilterGroup>
              <FilterGroup id="redo" title="Questões para refazer" open={openGroups} setOpen={setOpenGroups} count={f.onlyRedo ? 1 : 0}>
                <Chip on={f.onlyRedo} onClick={() => setF({ ...f, onlyRedo: !f.onlyRedo })}>Só temas com questões para refazer</Chip>
              </FilterGroup>
            </div>
          </section>

          {visible.length === 0 ? (
            <div className="partner-elevated-card rounded-[20px] bg-white px-6 py-10 text-center dark:bg-slate-900">
              <p className="font-display text-[17px] font-black text-slate-900 dark:text-white">Nenhum tema com esses filtros</p>
              <button type="button" onClick={() => setF(EMPTY_FILTERS)} className={`${primaryBtn} mt-4`}>Limpar filtros</button>
            </div>
          ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {visible.map((t) => {
              const key = `${t.subject}||${t.discipline}`;
              const lv = heatLevel(t.heat);
              const pos = heatPos(t.heat);
              const recent = Math.max(1, Math.round(t.heat));
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
                          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">#{rank.get(key)} · {t.subject}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${lv.badge}`}><lv.icon className="h-3 w-3" />{lv.label}</span>
                        </div>
                        <p className="font-display mt-1 text-[17px] font-black leading-snug text-slate-900 dark:text-white">{t.discipline}</p>
                      </div>
                      {acc != null && (
                        <div className="shrink-0 text-right">
                          <p className="font-display text-[22px] font-black leading-none" style={{ color: acc < 40 ? '#ef4444' : acc < 70 ? '#f59e0b' : '#10b981' }}>{acc}%</p>
                          <p className="text-[10.5px] font-semibold text-slate-400">de acerto</p>
                        </div>
                      )}
                    </div>

                    {/* Termômetro do tema: escala fixa frio → quente; o marcador mostra onde o tema está */}
                    <div className="mt-4" title="A temperatura sobe a cada erro recente e baixa quando você acerta o tema de novo. Erros antigos pesam menos.">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Temperatura</span>
                        <span style={{ color: lv.color }}>≈ {recent} {recent === 1 ? 'erro recente pesando' : 'erros recentes pesando'}</span>
                      </div>
                      <div className="relative mt-1.5 h-2 rounded-full" role="img" aria-label={`Temperatura: ${lv.label}`}
                        style={{ background: 'linear-gradient(90deg, #38bdf8 0%, #38bdf8 20%, #f59e0b 50%, #ef4444 80%, #ef4444 100%)', opacity: 0.9 }}>
                        <div className="absolute inset-y-0 right-0 rounded-r-full bg-slate-100/85 dark:bg-slate-800/85" style={{ left: `${pos * 100}%` }} />
                        <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-md dark:border-slate-900"
                          style={{ left: `${pos * 100}%`, background: lv.color }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        <span>Frio</span><span>Morno</span><span>Quente</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {t.correct} de {t.answers} certas
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
          )}
        </>
      )}
    </StudentPage>
  );
}

/** Prévia decorativa do estado vazio: três temas com a barra de temperatura. */
function HeatPreview() {
  const rows = [
    { s: 'Física', d: 'Cinemática', r: 0.92, c: '#ef4444', l: 'Quente' },
    { s: 'Química', d: 'Soluções', r: 0.55, c: '#f59e0b', l: 'Morno' },
    { s: 'História', d: 'Era Vargas', r: 0.22, c: '#38bdf8', l: 'Esfriando' },
  ];
  return (
    <div className="mx-auto max-w-[400px] space-y-2.5">
      {rows.map((t) => (
        <div key={t.d} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 pl-5 shadow-sm dark:border-white/10 dark:bg-slate-800">
          <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.c }} />
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-black text-slate-900 dark:text-white">{t.d}</p>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: t.c }}>{t.l}</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{t.s}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div className="h-full rounded-full" style={{ width: `${t.r * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #f59e0b, #ef4444)', backgroundSize: `${100 / t.r}% 100%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
