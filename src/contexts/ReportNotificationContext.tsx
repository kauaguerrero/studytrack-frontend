'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ReportNotificationContextValue = {
  hasUnseenResolved: boolean;
  refresh: () => Promise<void>;
};

const ReportNotificationContext = createContext<ReportNotificationContextValue>({
  hasUnseenResolved: false,
  refresh: async () => {},
});

export function ReportNotificationProvider({ children }: { children: ReactNode }) {
  const [hasUnseenResolved, setHasUnseenResolved] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setHasUnseenResolved(false);
        return;
      }
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/questions/reports/unseen-count`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setHasUnseenResolved(false);
        return;
      }
      const payload = await res.json() as { count?: number };
      setHasUnseenResolved((payload.count ?? 0) > 0);
    } catch {
      setHasUnseenResolved(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ hasUnseenResolved, refresh }), [hasUnseenResolved, refresh]);

  return (
    <ReportNotificationContext.Provider value={value}>
      {children}
    </ReportNotificationContext.Provider>
  );
}

export function useReportNotification() {
  return useContext(ReportNotificationContext);
}
