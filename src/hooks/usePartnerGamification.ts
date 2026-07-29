'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetcher } from '@/lib/api-fetcher';
import { getApiBaseUrl } from '@/lib/api-base';
import type {
  MonthlySummary,
  MonthlyCheckInResult,
  MonthlyCheckInStatus,
  MonthlyCheckInAnswerInput,
  PartnerRankingResponse,
  PopupState,
  StreakDecayResult,
  TitlesHistoryResponse,
  TitlesJourneyResponse,
} from '@/types/gamification';

export interface ShieldResult {
  shield_used: boolean;
  streak_preserved?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

type CacheEntry<T> = {
  value?: T;
  promise?: Promise<T>;
  expiresAt: number;
};

const requestCache = new Map<string, CacheEntry<unknown>>();

function getCachedRequest<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key) as CacheEntry<T> | undefined;

  if (cached?.value !== undefined && cached.expiresAt > now) {
    return Promise.resolve(cached.value);
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = fetcher()
    .then((value) => {
      requestCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      requestCache.delete(key);
      throw error;
    });

  requestCache.set(key, {
    value: cached?.value,
    expiresAt: cached?.expiresAt ?? 0,
    promise,
  });

  return promise;
}

function invalidateCache(prefixes: string[]) {
  for (const key of requestCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      requestCache.delete(key);
    }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchPartnerGamificationCheckInStatusCached(token: string) {
  const apiBase = getApiBaseUrl();
  return getCachedRequest<MonthlyCheckInStatus>(
    `partner-gamification:checkin:${apiBase}:${token}`,
    15_000,
    () => apiFetcher<MonthlyCheckInStatus>(
      `${apiBase}/api/partner/gamification/check-in/status`,
      { headers: buildHeaders(token) },
    ),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UsePartnerGamificationOptions {
  fetchPopupStateOnMount?: boolean;
}

export function usePartnerGamification(
  options: UsePartnerGamificationOptions = {},
) {
  const { fetchPopupStateOnMount = true } = options;
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [popupState, setPopupState] = useState<PopupState | null>(null);
  const [ranking, setRanking] = useState<PartnerRankingResponse | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<MonthlyCheckInStatus | null>(null);
  const [titlesJourney, setTitlesJourney] = useState<TitlesJourneyResponse | null>(null);
  const [titlesHistory, setTitlesHistory] = useState<TitlesHistoryResponse | null>(null);
  const [shieldResult, setShieldResult] = useState<ShieldResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keeps the token available for imperative calls without triggering re-renders.
  // Populated once on mount after getSession().
  const tokenRef = useRef<string | null>(null);

  // ── Fetch summary ──────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async (token: string) => {
    const apiBase = getApiBaseUrl();
    const data = await getCachedRequest<MonthlySummary>(
      `partner-gamification:summary:${apiBase}:${token}`,
      15_000,
      () => apiFetcher<MonthlySummary>(
        `${apiBase}/api/partner/gamification/summary`,
        { headers: buildHeaders(token) },
      ),
    );
    setSummary(data);
    return data;
  }, []);

  // ── Fetch popup state ──────────────────────────────────────────────────────

  const fetchPopupState = useCallback(async (token: string) => {
    const apiBase = getApiBaseUrl();
    const data = await getCachedRequest<PopupState>(
      `partner-gamification:popup:${apiBase}:${token}`,
      500,
      () => apiFetcher<PopupState>(
        `${apiBase}/api/partner/gamification/popup-state`,
        { headers: buildHeaders(token) },
      ),
    );
    // Não deixa um segundo fetch (Strict Mode) sobrescrever um popup real com 'none'.
    // O backend marca last_popup_seen_at na primeira chamada; a segunda retorna 'none',
    // mas o popup já estava visível — não deve sumir sem ação do usuário.
    setPopupState((prev) => {
      if (prev && prev.type !== 'none' && data.type === 'none') return prev;
      return data;
    });
  }, []);

  const fetchCheckInStatus = useCallback(async (token: string) => {
    const data = await fetchPartnerGamificationCheckInStatusCached(token);
    setCheckInStatus(data);
    return data;
  }, []);

  const fetchTitlesJourney = useCallback(async (token: string) => {
    const apiBase = getApiBaseUrl();
    const data = await getCachedRequest<TitlesJourneyResponse>(
      `partner-gamification:titles-journey:${apiBase}:${token}`,
      20_000,
      () => apiFetcher<TitlesJourneyResponse>(
        `${apiBase}/api/partner/gamification/titles/journey`,
        { headers: buildHeaders(token) },
      ),
    );
    setTitlesJourney(data);
    return data;
  }, []);

  const fetchTitlesHistory = useCallback(async (token: string) => {
    const apiBase = getApiBaseUrl();
    const data = await getCachedRequest<TitlesHistoryResponse>(
      `partner-gamification:titles-history:${apiBase}:${token}`,
      30_000,
      () => apiFetcher<TitlesHistoryResponse>(
        `${apiBase}/api/partner/gamification/titles/history`,
        { headers: buildHeaders(token) },
      ),
    );
    setTitlesHistory(data);
    return data;
  }, []);

  // ── Shield: consume available shield on dashboard load ────────────────────

  const useShield = useCallback(async (): Promise<ShieldResult | null> => {
    const token = tokenRef.current;
    if (!token) return null;
    const apiBase = getApiBaseUrl();
    try {
      const result = await apiFetcher<ShieldResult>(
        `${apiBase}/api/partner/gamification/shield/use`,
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

        const tasks: Promise<unknown>[] = [fetchSummary(token)];

        if (fetchPopupStateOnMount) {
          tasks.push(fetchPopupState(token));
        }

        await Promise.all(tasks);
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
  }, [fetchPopupStateOnMount, fetchSummary, fetchPopupState]);

  // ── Refresh summary (após mutações que alteram pontos) ────────────────────

  const refreshSummary = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    await fetchSummary(token);
  }, [fetchSummary]);

  const refreshCheckInStatus = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return null;
    return fetchCheckInStatus(token);
  }, [fetchCheckInStatus]);

  const refreshTitlesJourney = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return null;
    return fetchTitlesJourney(token);
  }, [fetchTitlesJourney]);

  const refreshTitlesHistory = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return null;
    return fetchTitlesHistory(token);
  }, [fetchTitlesHistory]);

  // ── Lazy: fetch ranking ────────────────────────────────────────────────────

  const refreshRanking = useCallback(async (limit = 50, orgId?: string): Promise<PartnerRankingResponse | null> => {
    const token = tokenRef.current;
    if (!token) return null;
    const apiBase = getApiBaseUrl();
    const params = new URLSearchParams({ limit: String(Math.min(limit, 100)) });
    if (orgId) params.set('org_id', orgId);

    try {
      const data = await apiFetcher<PartnerRankingResponse>(
        `${apiBase}/api/partner/gamification/ranking?${params.toString()}`,
        { headers: buildHeaders(token) },
      );
      setRanking(data);
      return data;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Erro ao carregar ranking.',
      );
      return null;
    }
  }, []);

  const submitMonthlyCheckIn = useCallback(
    async (answers: MonthlyCheckInAnswerInput[]): Promise<MonthlyCheckInResult> => {
      const token = tokenRef.current;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');
      const apiBase = getApiBaseUrl();

      const result = await apiFetcher<MonthlyCheckInResult>(
        `${apiBase}/api/partner/gamification/check-in/complete`,
        {
          method: 'POST',
          headers: buildHeaders(token),
          body: JSON.stringify({ answers }),
        },
      );

      invalidateCache([
        `partner-gamification:summary:${apiBase}:${token}`,
        `partner-gamification:checkin:${apiBase}:${token}`,
        `partner-gamification:titles-journey:${apiBase}:${token}`,
        `partner-gamification:titles-history:${apiBase}:${token}`,
        `partner-gamification:popup:${apiBase}:${token}`,
      ]);

      await Promise.allSettled([
        fetchSummary(token),
        fetchCheckInStatus(token),
        fetchTitlesJourney(token),
      ]);

      return result;
    },
    [fetchCheckInStatus, fetchSummary, fetchTitlesJourney],
  );

  // ── Mutation: apply streak broken decay ───────────────────────────────────

  const applyStreakDecay = useCallback(async (): Promise<StreakDecayResult | null> => {
    const token = tokenRef.current;
    if (!token) {
      console.error('[applyStreakDecay] token ausente');
      return null;
    }
    const apiBase = getApiBaseUrl();
    try {
      const result = await apiFetcher<StreakDecayResult>(
        `${apiBase}/api/partner/gamification/streak/broken`,
        { method: 'POST', headers: buildHeaders(token) },
      );
      invalidateCache([
        `partner-gamification:summary:${apiBase}:${token}`,
        `partner-gamification:popup:${apiBase}:${token}`,
      ]);
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
    checkInStatus,
    titlesJourney,
    titlesHistory,
    shieldResult,
    isLoading,
    error,
    submitMonthlyCheckIn,
    refreshSummary,
    refreshRanking,
    refreshCheckInStatus,
    refreshTitlesJourney,
    refreshTitlesHistory,
    dismissPopup,
    useShield,
    applyStreakDecay,
  };
}
