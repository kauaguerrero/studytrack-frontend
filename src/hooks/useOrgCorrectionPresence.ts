'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface CorrectionPresenceEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  essayId: string;
}

type PresenceMap = Map<string, CorrectionPresenceEntry[]>;

/**
 * Rastreia quais corretores estão com redações abertas para correção em tempo real.
 * Usa um único canal Supabase Realtime por org — uma conexão WebSocket para toda a org.
 *
 * Se `trackingEssayId` for fornecido, anuncia o usuário atual como corrtor ativo nessa redação.
 * A presença é automaticamente removida quando o componente desmonta (WebSocket cai).
 */
export function useOrgCorrectionPresence({
  orgId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl,
  trackingEssayId,
}: {
  orgId: string;
  currentUserId: string | null;
  currentUserName: string;
  currentUserAvatarUrl: string | null;
  trackingEssayId?: string;
}) {
  const [presenceByEssay, setPresenceByEssay] = useState<PresenceMap>(new Map());
  const [synced, setSynced] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!orgId || !currentUserId) return;

    const supabase = createClient();
    const channel = supabase.channel(`essay-corrections:${orgId}`);
    channelRef.current = channel;

    const rebuildMap = () => {
      const raw = channel.presenceState() as Record<
        string,
        Array<{ userId?: string; name?: string; avatarUrl?: string | null; essayId?: string }>
      >;
      const map = new Map<string, CorrectionPresenceEntry[]>();
      for (const entries of Object.values(raw)) {
        for (const entry of entries) {
          if (!entry?.userId || entry.userId === currentUserId || !entry.essayId) continue;
          const list = map.get(entry.essayId) ?? [];
          list.push({
            userId: entry.userId,
            name: entry.name ?? 'Corretor',
            avatarUrl: entry.avatarUrl ?? null,
            essayId: entry.essayId,
          });
          map.set(entry.essayId, list);
        }
      }
      setPresenceByEssay(map);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        rebuildMap();
        setSynced(true);
      })
      .on('presence', { event: 'join' }, () => rebuildMap())
      .on('presence', { event: 'leave' }, () => rebuildMap())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && trackingEssayId) {
          await channel.track({
            userId: currentUserId,
            name: currentUserName,
            avatarUrl: currentUserAvatarUrl,
            essayId: trackingEssayId,
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, currentUserId]);

  // Atualiza o track quando o essay ou dados do usuário mudam
  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !currentUserId || !trackingEssayId) return;
    void channel.track({
      userId: currentUserId,
      name: currentUserName,
      avatarUrl: currentUserAvatarUrl,
      essayId: trackingEssayId,
    });
  }, [trackingEssayId, currentUserId, currentUserName, currentUserAvatarUrl]);

  return { presenceByEssay, synced };
}
