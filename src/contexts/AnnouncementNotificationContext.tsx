'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ImportantAnnouncement } from '@/components/comms/ImportantAnnouncementPopup';

type AnnouncementNotificationContextValue = {
  hasUnread: boolean;
  unreadCount: number;
  refresh: () => Promise<void>;
  /** Chame quando o feed for aberto/lido — zera o sino sem esperar novo fetch. */
  clearUnread: () => void;
  /** Avisos importantes ainda sem "Entendi" (vêm na mesma leitura do sino). */
  importantPending: ImportantAnnouncement[];
  acknowledge: (id: string) => Promise<void>;
};

const AnnouncementNotificationContext = createContext<AnnouncementNotificationContextValue>({
  hasUnread: false,
  unreadCount: 0,
  refresh: async () => {},
  clearUnread: () => {},
  importantPending: [],
  acknowledge: async () => {},
});

export function AnnouncementNotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [importantPending, setImportantPending] = useState<ImportantAnnouncement[]>([]);

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
      setImportantPending(Array.isArray(payload?.important_pending) ? payload.important_pending : []);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  const acknowledge = useCallback(async (id: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const res = await fetch(`${api}/api/student/announcements/${id}/ack`, {
      method: 'POST', headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    if (!res.ok) throw new Error('Não foi possível confirmar o aviso.');
    setImportantPending((list) => list.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({ hasUnread: unreadCount > 0, unreadCount, refresh, clearUnread, importantPending, acknowledge }),
    [unreadCount, refresh, clearUnread, importantPending, acknowledge],
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
