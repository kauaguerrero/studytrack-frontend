'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Acompanha uma media query CSS. No SSR (e na hidratação) retorna `false` —
 * use só para decisões de layout que toleram trocar após montar.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
