'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetcher } from '@/lib/api-fetcher';
import type {
  DiagnosticResult,
  MonthlySummary,
  PartnerRankingResponse,
  PopupState,
} from '@/types/gamification';

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
    setPopupState(data);
  }, []);

  // ── Mount: get token → fetch summary + popup in parallel ──────────────────

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

        await Promise.all([fetchSummary(token), fetchPopupState(token)]);
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

  // ── Local: dismiss popup ───────────────────────────────────────────────────

  const dismissPopup = useCallback(() => {
    setPopupState((prev) => (prev ? { ...prev, type: 'none' } : null));
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    summary,
    popupState,
    ranking,
    isLoading,
    error,
    submitDiagnostic,
    refreshRanking,
    dismissPopup,
  };
}
