'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';
import { useOrg } from '@/contexts/OrgContext';
import { EssayRewardPopup } from '@/components/partners/gamification/EssayRewardPopup';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EssayRewardState {
  points_awarded: number;
  new_monthly_points: number;
  rank_position: number | null;
  points_to_top3: number | null;
  shield_awarded?: boolean;
}

interface SupportItem {
  type: 'text' | 'image' | 'link';
  content: string;
  label?: string;
}

interface EssayPrompt {
  id: string;
  title: string;
  description: string | null;
  support_items: SupportItem[];
  is_active?: boolean;
}

export default function NovaRedacaoPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const promptId = searchParams.get('prompt_id');
  const router = useRouter();
  const { org } = useOrg();

  const [theme, setTheme] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditStatus, setCreditStatus] = useState<{
    plan_name?: string | null;
    limit?: number | null;
    period?: 'week' | 'month' | null;
    used?: number | null;
    remaining?: number | null;
  } | null>(null);
  const [rewardState, setRewardState] = useState<EssayRewardState | null>(null);
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<EssayPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  const charCount = text.trim().length;
  const isValidLength = charCount >= 100 && charCount <= 5000;
  const isThemeValid = theme.trim().length >= 3;
  const noCreditsLeft = !!(creditStatus && (creditStatus.limit || 0) > 0 && (creditStatus.remaining || 0) <= 0);

  const counterClass = useMemo(() => {
    if (charCount >= 4500) return 'text-amber-600 dark:text-amber-300';
    if (charCount >= 200 && charCount <= 5000) return 'text-emerald-600 dark:text-emerald-300';
    return 'text-slate-500 dark:text-slate-400';
  }, [charCount]);

  useEffect(() => {
    let mounted = true;

    async function loadCredits() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const apiUrl = getApiBaseUrl();
        const res = await fetch(`${apiUrl}/api/partners/${slug}/essays?status=all&page=1&limit=1`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (mounted && data?.credits) setCreditStatus(data.credits);
      } catch {
        // silencioso
      }
    }

    void loadCredits();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    setPromptLoading(true);
    fetch(`/api/partners/${slug}/essay-prompts`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const allPrompts = Array.isArray(data?.prompts) ? data.prompts as EssayPrompt[] : [];
        const activePrompts = allPrompts.filter((p) => p.is_active !== false);
        setAvailablePrompts(activePrompts);
        if (!promptId) return;
        const found = activePrompts.find((p: EssayPrompt) => p.id === promptId);
        if (found) {
          setPrompt(found);
          setSelectedPromptId(found.id);
          setTheme(found.title);
        }
      })
      .catch(() => {})
      .finally(() => setPromptLoading(false));
    return () => {
      mounted = false;
    };
  }, [promptId, slug]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isThemeValid) {
      toast.error('Informe um tema com pelo menos 3 caracteres.');
      return;
    }
    if (!isValidLength || submitting) return;
    if (noCreditsLeft) {
      toast.error('Você não possui créditos de redação disponíveis neste período.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/partners/${slug}/essays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          theme,
          text,
          ...(selectedPromptId ? { prompt_id: selectedPromptId } : {}),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Não foi possível enviar a redação.');
      }

      const nextCredits = data?.credits;
      if (nextCredits) setCreditStatus(nextCredits);

      const reward = data?.gamification;
      if (reward?.shield_awarded) {
        sessionStorage.setItem('shield_earned_pending', '1');
      }
      if (reward?.points_awarded && reward?.new_monthly_points !== undefined) {
        setRewardState({
          points_awarded: reward.points_awarded,
          new_monthly_points: reward.new_monthly_points,
          rank_position: reward.rank_position ?? null,
          points_to_top3: reward.points_to_top3 ?? null,
          shield_awarded: reward.shield_awarded,
        });
      } else {
        toast.success('Redação enviada! Você será notificado quando o professor corrigir.');
        router.push(`/partners/${slug}/student/redacoes`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar redação.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-2">
          <Link
            href={`/partners/${slug}/student/redacoes`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Nova Redação</h1>
        </header>

        <form id="essay-create-form" onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          {creditStatus && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              Plano: <span className="font-semibold">{creditStatus.plan_name || 'Customizado'}</span> • Créditos:
              <span className="font-semibold"> {creditStatus.remaining ?? '∞'} / {creditStatus.limit ?? '∞'}</span>
              {' '}{creditStatus.period === 'week' ? 'na semana' : 'no mês'}
            </div>
          )}

          {promptLoading && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              Carregando coletânea...
            </div>
          )}

          {!promptLoading && availablePrompts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tema opcional da coletânea
              </p>
              <select
                value={selectedPromptId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setSelectedPromptId(nextId);
                  if (!nextId) {
                    setPrompt(null);
                    setTheme('');
                    return;
                  }
                  const chosen = availablePrompts.find((p) => p.id === nextId) || null;
                  setPrompt(chosen);
                  setTheme(chosen?.title || '');
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Sem coletânea (tema livre)</option>
                {availablePrompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {prompt && (
            <div className="rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                />
                <p className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: 'var(--brand-primary)' }}>
                  Coletânea
                </p>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {prompt.title}
              </h2>
              {prompt.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {prompt.description}
                </p>
              )}
              {prompt.support_items.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-[var(--brand-primary)]/10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Textos de apoio
                  </p>
                  {prompt.support_items.map((item, i) => (
                    <div key={i}>
                      {item.label && (
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {item.label}
                        </p>
                      )}
                      {item.type === 'text' && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </p>
                      )}
                      {item.type === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.content}
                          alt={item.label || `Apoio ${i + 1}`}
                          className="rounded-xl max-w-full border border-slate-200 dark:border-slate-700"
                        />
                      )}
                      {item.type === 'link' && (
                        <a
                          href={item.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-2"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          {item.label || item.content}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tema da Redação</label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Digite o tema da redação"
              readOnly={!!prompt}
              required
              className={cn(
                'h-11 border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus-visible:ring-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
                prompt ? 'bg-slate-50 dark:bg-slate-800 cursor-default' : '',
              )}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Esse tema será exibido para o professor na correção.</p>
          </div>

          <div className="flex items-center justify-end">
            <span className={`text-sm font-medium ${counterClass}`}>
              {charCount} / 5000 caracteres
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva ou cole sua redação aqui. Mínimo 100 caracteres."
            className="min-h-[380px] w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-[var(--brand-primary)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sua redação será enviada para correção pelo professor. Você será notificado quando estiver pronta.
            </p>

            <button
              type="submit"
              disabled={!isValidLength || !isThemeValid || submitting || noCreditsLeft}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              style={{ backgroundColor: org.brand_primary || 'var(--brand-primary)' }}
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Enviando...' : 'Enviar Redação'}
            </button>
          </div>
        </form>
        </div>
      </div>

      <AnimatePresence>
        {rewardState && (
          <EssayRewardPopup
            pointsAwarded={rewardState.points_awarded}
            newMonthlyPoints={rewardState.new_monthly_points}
            rankPosition={rewardState.rank_position}
            pointsToTop3={rewardState.points_to_top3}
            onDismiss={() => {
              setRewardState(null);
              router.push(`/partners/${slug}/student/redacoes`);
            }}
            onContinue={() => {
              setRewardState(null);
              router.push(`/partners/${slug}/student/redacoes`);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
