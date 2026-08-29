'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getApiBaseUrl } from '@/lib/api-base';

export interface EssayWindowStatus {
  enabled: boolean;
  is_open: boolean;
  next_open_at: string | null;
  next_close_at: string | null;
  server_time: string;
}

/**
 * Status da janela semanal de envio de redações de uma org, com countdown até
 * a próxima transição (abertura/fechamento).
 *
 * O countdown local nunca decide sozinho a transição: ele só corrige o clock
 * do navegador (via `server_time`) para a contagem regressiva não divergir do
 * relógio do backend, e ao chegar a zero dispara um refetch autoritativo —
 * quem diz se a janela está aberta é sempre o servidor.
 */
export function useEssayWindowStatus(slug: string) {
  const [status, setStatus] = useState<EssayWindowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const clockSkewMs = useRef(0); // server_time - client_now no momento do fetch

  const fetchStatus = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiUrl = getApiBaseUrl();
      const fetchedAtClient = Date.now();
      const res = await fetch(`${apiUrl}/api/partners/${slug}/essays/submission-window`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const data: EssayWindowStatus = await res.json();
      const serverNowMs = new Date(data.server_time).getTime();
      clockSkewMs.current = serverNowMs - fetchedAtClient;
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Refetch ao voltar o foco/aba visível — cobre laptop suspenso/aba em
  // background, onde o setInterval abaixo pode não ter rodado.
  useEffect(() => {
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') void fetchStatus();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [fetchStatus]);

  // Countdown local (tick de 1s, sem request de rede); ao zerar, refetch real.
  useEffect(() => {
    if (!status?.enabled) {
      setSecondsRemaining(null);
      return;
    }
    const targetIso = status.is_open ? status.next_close_at : status.next_open_at;
    if (!targetIso) {
      setSecondsRemaining(null);
      return;
    }
    const targetMs = new Date(targetIso).getTime();

    const tick = () => {
      const correctedNow = Date.now() + clockSkewMs.current;
      const remaining = Math.max(0, Math.round((targetMs - correctedNow) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        void fetchStatus();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, fetchStatus]);

  return { status, loading, secondsRemaining, refetch: fetchStatus };
}

/** "2d 4h" / "3h 12min" / "38min" / "menos de 1min" */
export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'menos de 1min';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min`;
  return 'menos de 1min';
}
