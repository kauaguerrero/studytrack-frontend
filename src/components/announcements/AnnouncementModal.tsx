'use client';

import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Bell as BellIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAnnouncementIcon } from '@/lib/announcement-icons';
import { useAnnouncementNotification } from '@/contexts/AnnouncementNotificationContext';

interface Announcement {
  id: string;
  title: string;
  body: string;
  icon: string;
  target_plan: string;
  created_at: string;
  is_read: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Quebra o corpo em linhas não-vazias — cada linha vira um item da lista de novidades. */
function splitBullets(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

function AnnouncementRow({
  announcement,
  defaultOpen,
}: {
  announcement: Announcement;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = useMemo(() => getAnnouncementIcon(announcement.icon), [announcement.icon]);
  const bullets = splitBullets(announcement.body);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-800/50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30">
          {createElement(Icon, { className: 'h-4 w-4 text-violet-300' })}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-white">{announcement.title}</p>
            {!announcement.is_read && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
            )}
          </div>
          <p className="text-[11px] text-zinc-500">{formatDate(announcement.created_at)}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800 px-4 py-3.5">
              {bullets.length > 1 ? (
                <ul className="space-y-1.5">
                  {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-300">{announcement.body}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AnnouncementFeedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { clearUnread } = useAnnouncementNotification();

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/student/announcements`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const items: Announcement[] = json.announcements ?? [];
      setAnnouncements(items);

      // Abrir o feed = ler tudo. Marca cada não-lido e zera o sino imediatamente.
      const unread = items.filter((a) => !a.is_read);
      if (unread.length > 0) {
        clearUnread();
        await Promise.all(
          unread.map((a) =>
            fetch(`${apiUrl}/api/student/announcements/${a.id}/read`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${session.access_token}` },
            }).catch(() => {}),
          ),
        );
      }
    } catch {
      // silencia — feed de novidades não deve travar o portal
    } finally {
      setLoading(false);
    }
  }, [clearUnread]);

  useEffect(() => {
    if (isOpen) void fetchFeed();
  }, [isOpen, fetchFeed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-end justify-center sm:items-center"
        >
          <div
            className="absolute inset-0 bg-black/70"
            style={{ backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-zinc-950 border border-zinc-800 shadow-2xl sm:max-h-[80vh] sm:rounded-3xl"
          >
            <div className="h-1 w-full shrink-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />

            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <BellIcon className="h-4 w-4 text-violet-400" />
                <h2 className="text-base font-bold text-white">Novidades</h2>
              </div>
              <button onClick={onClose} className="text-zinc-500 transition-colors hover:text-zinc-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-2xl bg-zinc-900" />
                ))
              ) : announcements.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900">
                    <BellIcon className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-400">Nada por aqui ainda</p>
                  <p className="mt-1 text-xs text-zinc-500">Quando lançarmos novidades, elas aparecem aqui.</p>
                </div>
              ) : (
                announcements.map((a, i) => (
                  <AnnouncementRow key={a.id} announcement={a} defaultOpen={i === 0} />
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
