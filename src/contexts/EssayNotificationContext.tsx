'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type EssayNotificationContextValue = {
  hasPendingCorrection: boolean;
  refresh: () => Promise<void>;
};

const EssayNotificationContext = createContext<EssayNotificationContextValue>({
  hasPendingCorrection: false,
  refresh: async () => {},
});

export function EssayNotificationProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [hasPendingCorrection, setHasPendingCorrection] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setHasPendingCorrection(false);
        return;
      }

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/partners/${slug}/essays?status=all&page=1&limit=200`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        setHasPendingCorrection(false);
        return;
      }

      const payload = await res.json();
      const essays = Array.isArray(payload) ? payload : (payload.items || []);
      const hasPending = essays.some((e: { status?: string }) => e.status === 'corrected');
      setHasPendingCorrection(hasPending);
    } catch {
      setHasPendingCorrection(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ hasPendingCorrection, refresh }),
    [hasPendingCorrection, refresh],
  );

  return (
    <EssayNotificationContext.Provider value={value}>
      {children}
    </EssayNotificationContext.Provider>
  );
}

export function useEssayNotification() {
  return useContext(EssayNotificationContext);
}
