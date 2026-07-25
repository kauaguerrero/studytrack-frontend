'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type EssayNotificationContextValue = {
  hasPendingCorrection: boolean;
  assignedSecondCorrectionCount: number;
  refresh: () => Promise<void>;
};

const EssayNotificationContext = createContext<EssayNotificationContextValue>({
  hasPendingCorrection: false,
  assignedSecondCorrectionCount: 0,
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
  const [assignedSecondCorrectionCount, setAssignedSecondCorrectionCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setHasPendingCorrection(false);
        setAssignedSecondCorrectionCount(0);
        return;
      }

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/partners/${slug}/essays?status=all&page=1&limit=200`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        setHasPendingCorrection(false);
        setAssignedSecondCorrectionCount(0);
        return;
      }

      const payload = await res.json();
      const essays = Array.isArray(payload) ? payload : (payload.items || []);
      const hasPending = essays.some((e: { status?: string; seen_at?: string | null }) =>
        (e.status === 'corrected' || e.status === 'second_corrected') && !e.seen_at,
      );
      setHasPendingCorrection(hasPending);

      const userId = session.user?.id;
      const secondCount = userId
        ? essays.filter((e: { status?: string; second_corrector_id?: string }) =>
            e.status === 'awaiting_second' && e.second_corrector_id === userId,
          ).length
        : 0;
      setAssignedSecondCorrectionCount(secondCount);
    } catch {
      setHasPendingCorrection(false);
      setAssignedSecondCorrectionCount(0);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ hasPendingCorrection, assignedSecondCorrectionCount, refresh }),
    [hasPendingCorrection, assignedSecondCorrectionCount, refresh],
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
