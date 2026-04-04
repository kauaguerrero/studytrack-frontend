'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useOrg } from '@/contexts/OrgContext';
import { CalendarDays, Eye, FileText, Plus } from 'lucide-react';

interface Essay {
  id: string;
  status: 'pending' | 'corrected' | 'seen';
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  text_preview: string;
  theme: string | null;
}

type Filter = 'all' | 'pending' | 'corrected' | 'seen';
type SortBy = 'date' | 'score';
type SortOption = 'date' | 'score_best' | 'score_worst';

interface RawEssay {
  id: string;
  status: Essay['status'];
  submitted_at: string;
  corrected_at: string | null;
  total_score: number | null;
  text?: string;
  text_preview?: string;
  theme?: string | null;
  essay_theme?: string | null;
  tema?: string | null;
  topic?: string | null;
  title?: string | null;
}

interface EssaysApiResponse {
  items?: RawEssay[];
  credits?: {
    plan_name?: string | null;
    limit?: number | null;
    period?: 'week' | 'month' | null;
    used?: number | null;
    remaining?: number | null;
  } | null;
}

function formatDateBR(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function getScoreColorClass(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score >= 700) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 500) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function pickEssayTheme(row: RawEssay): string | null {
  const candidates = [row.theme, row.essay_theme, row.tema, row.topic, row.title];
  const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return found ? found.trim() : null;
}

export default function StudentRedacoesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { org } = useOrg();

  const [essays, setEssays] = useState<Essay[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulsingIds, setPulsingIds] = useState<string[]>([]);
  const [credits, setCredits] = useState<EssaysApiResponse['credits']>(null);

  useEffect(() => {
    let mounted = true;

    async function loadEssays() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (mounted) {
            setError('Sessão expirada. Faça login novamente.');
            setLoading(false);
          }
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const res = await fetch(
          `${apiUrl}/api/partners/${slug}/essays?status=all&page=1&limit=200`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          },
        );

        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status}`);
        }

        const payload: RawEssay[] | EssaysApiResponse = await res.json();
        const items = Array.isArray(payload) ? payload : (payload.items || []);
        const creditsPayload = Array.isArray(payload) ? null : (payload.credits || null);

        const mapped: Essay[] = items.map((row) => {
          const rawText = String(row.text || row.text_preview || '');
          const preview = rawText.length > 120 ? `${rawText.slice(0, 120)}...` : rawText;
          return {
            id: String(row.id),
            status: row.status,
            submitted_at: String(row.submitted_at),
            corrected_at: row.corrected_at ? String(row.corrected_at) : null,
            total_score: typeof row.total_score === 'number' ? row.total_score : null,
            text_preview: preview,
            theme: pickEssayTheme(row),
          };
        });

        if (!mounted) return;

        setEssays(mapped);
        setCredits(creditsPayload);

        const correctedIds = mapped.filter((e) => e.status === 'corrected').map((e) => e.id);
        setPulsingIds(correctedIds);

        if (correctedIds.length > 0) {
          setTimeout(() => {
            if (mounted) setPulsingIds([]);
          }, 3000);
        }
      } catch {
        if (mounted) {
          setError('Não foi possível carregar suas redações.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadEssays();

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (sortOption === 'date') {
      setSortBy('date');
      return;
    }
    setSortBy('score');
  }, [sortOption]);

  const filteredAndSorted = useMemo(() => {
    let data = [...essays];

    if (filter === 'pending') {
      data = data.filter((e) => e.status === 'pending');
    } else if (filter === 'corrected') {
      data = data.filter((e) => e.status === 'corrected' || e.status === 'seen');
    } else if (filter === 'seen') {
      data = data.filter((e) => e.status === 'seen');
    }

    if (sortBy === 'date') {
      data.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      return data;
    }

    if (sortOption === 'score_worst') {
      data.sort((a, b) => (a.total_score ?? 10_000) - (b.total_score ?? 10_000));
      return data;
    }

    data.sort((a, b) => (b.total_score ?? -1) - (a.total_score ?? -1));
    return data;
  }, [essays, filter, sortBy, sortOption]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Minhas Redações</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Acompanhe envios, correções e notas em um só lugar.</p>
          </div>

          <Link
            href={`/partners/${slug}/student/redacoes/nova`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-105"
            style={{ backgroundColor: org.brand_primary || 'var(--brand-primary)' }}
          >
            <Plus className="h-4 w-4" />
            Nova Redação
          </Link>
        </header>

        {credits && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p>
              Plano: <span className="font-semibold text-slate-900 dark:text-slate-100">{credits.plan_name || 'Customizado'}</span> •
              Créditos: <span className="font-semibold text-slate-900 dark:text-slate-100"> {credits.remaining ?? '∞'} / {credits.limit ?? '∞'}</span>
              {' '}{credits.period === 'week' ? 'na semana' : 'no mês'}
            </p>
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Filtro</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendente</option>
              <option value="corrected">Corrigida</option>
              <option value="seen">Vista</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Ordenação</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="date">Mais recente</option>
              <option value="score_best">Melhor nota</option>
              <option value="score_worst">Pior nota</option>
            </select>
          </label>
        </section>

        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">{error}</div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <FileText className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nenhuma redação encontrada</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Envie sua primeira redação para começar a receber correções.</p>
            <Link
              href={`/partners/${slug}/student/redacoes/nova`}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Enviar primeira redação
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAndSorted.map((essay) => {
              const isCorrected = essay.status === 'corrected';
              const isSeen = essay.status === 'seen';
              const showScore = isCorrected || isSeen;
              const scoreClass = getScoreColorClass(essay.total_score);

              return (
                <article
                  key={essay.id}
                  className={cn(
                    'rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900',
                    isCorrected
                      ? pulsingIds.includes(essay.id)
                        ? 'animate-pulse border-emerald-500/60 ring-2 ring-emerald-500/45'
                        : 'border-emerald-500/45 ring-2 ring-emerald-500/35'
                      : 'border-slate-200 dark:border-slate-800',
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
                          essay.status === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
                          essay.status === 'corrected' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
                          essay.status === 'seen' && 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
                        )}
                      >
                        {essay.status === 'pending' && 'Aguardando correção'}
                        {essay.status === 'corrected' && 'Corrigida ✓'}
                        {essay.status === 'seen' && 'Vista'}
                      </span>

                      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <CalendarDays className="h-4 w-4" />
                        Enviada em {formatDateBR(essay.submitted_at)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">Tema:</span> {essay.theme || 'Não informado'}
                      </p>

                      {showScore && (
                        <>
                          <p className={cn('text-3xl font-extrabold tracking-tight', scoreClass)}>
                            {essay.total_score ?? '-'} / 1000
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Corrigida em {formatDateBR(essay.corrected_at)}</p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{essay.text_preview}</p>
                      <Link
                        href={`/partners/${slug}/student/redacoes/${essay.id}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--brand-primary)] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:text-white sm:w-auto"
                      >
                        <Eye className="h-4 w-4" />
                        {showScore ? 'Ver correção' : 'Ver redação'}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
