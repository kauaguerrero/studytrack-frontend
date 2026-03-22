'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Announcement {
  id: string;
  title: string;
  body: string;
  target_plan: string;
  created_at: string;
}

const ICONS = ['🎉', '✨', '🚀', '🌟', '💡'];

function pickIcon(id: string) {
  const idx = id.charCodeAt(0) % ICONS.length;
  return ICONS[idx];
}

export function AnnouncementModal() {
  const pathname = usePathname();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [visible, setVisible] = useState(false);
  const [marking, setMarking] = useState(false);
  const supabase = createClient();

  const shouldShow =
    !pathname?.includes('/onboarding') && !pathname?.includes('/admin');

  const fetchUnread = useCallback(async () => {
    if (!shouldShow) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/student/announcements/unread`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const items: Announcement[] = json.announcements ?? [];
      if (items.length > 0) {
        setQueue(items);
        setVisible(true);
      }
    } catch {
      // silencia — não bloqueia o portal
    }
  }, [shouldShow]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  async function handleConfirm() {
    const current = queue[0];
    if (!current || marking) return;
    setMarking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
        await fetch(`${apiUrl}/api/student/announcements/${current.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {
      // falha silenciosa — o usuário não deve ser bloqueado
    } finally {
      setMarking(false);
      const next = queue.slice(1);
      setQueue(next);
      if (next.length === 0) setVisible(false);
    }
  }

  if (!visible || queue.length === 0) return null;

  const current = queue[0];
  const icon = pickIcon(current.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleConfirm}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
          {/* Topo gradiente */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500" />

          <div className="p-6">
            {/* Ícone */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center text-3xl">
                {icon}
              </div>
            </div>

            {/* Contador se tiver mais de um */}
            {queue.length > 1 && (
              <p className="text-center text-xs text-zinc-500 mb-2">
                {queue.length} novidades · esta é a 1ª
              </p>
            )}

            {/* Título */}
            <h2 className="text-center text-lg font-bold text-white mb-3 leading-snug">
              {current.title}
            </h2>

            {/* Corpo */}
            <p className="text-center text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {current.body}
            </p>

            {/* Botão */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleConfirm}
                disabled={marking}
                className="px-8 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all disabled:opacity-60 shadow-lg shadow-indigo-900/40"
              >
                {marking ? 'Aguarde...' : 'Entendi! 🚀'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
