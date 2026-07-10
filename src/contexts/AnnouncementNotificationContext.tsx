'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AnnouncementNotificationContextValue = {
  hasUnread: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Chame quando o feed for aberto/lido — zera o sino sem esperar novo fetch. */
  clearUnread: () => void;
};

const AnnouncementNotificationContext = createContext<AnnouncementNotificationContextValue>({
  hasUnread: false,
  unreadCount: 0,
  refresh: async () => {},
  clearUnread: () => {},
});

export function AnnouncementNotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setUnreadCount(0);
        return;
      }

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/student/announcements/unread`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });

      if (!res.ok) {
        setUnreadCount(0);
        return;
      }

      const payload = await res.json();
      const items = Array.isArray(payload?.announcements) ? payload.announcements : [];
      setUnreadCount(items.length);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const value = useMemo(
    () => ({ hasUnread: unreadCount > 0, unreadCount, refresh, clearUnread }),
    [unreadCount, refresh, clearUnread],
  );

  return (
    <AnnouncementNotificationContext.Provider value={value}>
      {children}
    </AnnouncementNotificationContext.Provider>
  );
}

export function useAnnouncementNotification() {
  return useContext(AnnouncementNotificationContext);
}
