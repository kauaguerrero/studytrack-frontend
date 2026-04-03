'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetcher } from '@/lib/api-fetcher';
import type {
  DiagnosticResult,
  MonthlySummary,
  PartnerRankingResponse,
  PopupState,
  StreakDecayResult,
} from '@/types/gamification';

export interface ShieldResult {
  shield_used: boolean;
  streak_preserved?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePartnerGamification() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const [ranking, setRanking] = useState<PartnerRankingResponse | null>(null);
  const [shieldResult, setShieldResult] = useState<ShieldResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keeps the token available for imperative calls without triggering re-renders.
  // Populated once on mount after getSession().
  const tokenRef = useRef<string | null>(null);

  // ── Fetch summary ──────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async (token: string) => {
    const data = await apiFetcher<MonthlySummary>(
      `${API_BASE}/api/partner/gamification/summary`,
      { headers: buildHeaders(token) },
    );
    setSummary(data);
  }, []);

  // ── Fetch popup state ──────────────────────────────────────────────────────

  const fetchPopupState = useCallback(async (token: string) => {
    const data = await apiFetcher<PopupState>(
      `${API_BASE}/api/partner/gamification/popup-state`,
      { headers: buildHeaders(token) },
    );
    // Não deixa um segundo fetch (Strict Mode) sobrescrever um popup real com 'none'.
    // O backend marca last_popup_seen_at na primeira chamada; a segunda retorna 'none',
    // mas o popup já estava visível — não deve sumir sem ação do usuário.
    setPopupState((prev) => {
      if (prev && prev.type !== 'none' && data.type === 'none') return prev;
      return data;
    });
  }, []);

  // ── Shield: consume available shield on dashboard load ────────────────────

  const useShield = useCallback(async (): Promise<ShieldResult | null> => {
    const token = tokenRef.current;
    if (!token) return null;
    try {
      const result = await apiFetcher<ShieldResult>(
        `${API_BASE}/api/partner/gamification/shield/use`,
        { method: 'POST', headers: buildHeaders(token) },
      );
      setShieldResult(result);
      return result;
    } catch {
      return null;
    }
  }, []);

  // ── Mount: get token → fetch summary + popup + shield in parallel ──────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          if (!cancelled) setError('Sessão expirada. Faça login novamente.');
          return;
        }

        tokenRef.current = token;

        await Promise.all([
          fetchSummary(token),
          fetchPopupState(token),
        ]);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : 'Erro ao carregar dados de gamificação.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [fetchSummary, fetchPopupState]);

  // ── Refresh summary (após mutações que alteram pontos) ────────────────────

  const refreshSummary = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    await fetchSummary(token);
  }, [fetchSummary]);

  // ── Lazy: fetch ranking ────────────────────────────────────────────────────

  const refreshRanking = useCallback(async (limit = 50) => {
    const token = tokenRef.current;
    if (!token) return;

    try {
      const data = await apiFetcher<PartnerRankingResponse>(
        `${API_BASE}/api/partner/gamification/ranking?limit=${Math.min(limit, 100)}`,
        { headers: buildHeaders(token) },
      );
      setRanking(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Erro ao carregar ranking.',
      );
    }
  }, []);

  // ── Mutation: submit diagnostic ────────────────────────────────────────────

  const submitDiagnostic = useCallback(
    async (score: number, questionIds: string[]): Promise<DiagnosticResult> => {
      const token = tokenRef.current;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const result = await apiFetcher<DiagnosticResult>(
        `${API_BASE}/api/partner/gamification/diagnostic/complete`,
        {
          method: 'POST',
          headers: buildHeaders(token),
          body: JSON.stringify({ score, question_ids: questionIds }),
        },
      );

      // Refresh summary so monthly_points reflects the new points
      await fetchSummary(token);

      return result;
    },
    [fetchSummary],
  );

  // ── Mutation: apply streak broken decay ───────────────────────────────────

  const applyStreakDecay = useCallback(async (): Promise<StreakDecayResult | null> => {
    const token = tokenRef.current;
    if (!token) {
      console.error('[applyStreakDecay] token ausente');
      return null;
    }
    try {
      const result = await apiFetcher<StreakDecayResult>(
        `${API_BASE}/api/partner/gamification/streak/broken`,
        { method: 'POST', headers: buildHeaders(token) },
      );
      console.log('[applyStreakDecay] resultado:', result);
      return result;
    } catch (e) {
      console.error('[applyStreakDecay] erro:', e);
      return null;
    }
  }, []);

  // ── Local: dismiss popup ───────────────────────────────────────────────────

  const dismissPopup = useCallback(() => {
    setPopupState((prev) => (prev ? { ...prev, type: 'none' } : null));
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    summary,
    popupState,
    ranking,
    shieldResult,
    isLoading,
    error,
    submitDiagnostic,
    refreshSummary,
    refreshRanking,
    dismissPopup,
    useShield,
    applyStreakDecay,
  };
}
