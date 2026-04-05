'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type {
  DiagnosticResult,
  PartnerRankingResponse,
  PopupState,
  StreakDecayResult,
} from '@/types/gamification';

type PopupRouteScope = 'any' | 'dashboard' | 'simulado';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type QueuePopupBase = {
  id: string;
  priority: number;
  routeScope: PopupRouteScope;
  createdAt: number;
  dedupeKey?: string;
};

export type QueuePopup =
  | (QueuePopupBase & {
      kind: 'onboarding';
      firstName: string;
      organizationName: string;
    })
  | (QueuePopupBase & {
      kind: 'ranking_popup';
      ranking: PartnerRankingResponse;
    })
  | (QueuePopupBase & {
      kind: 'streak';
      streak: number;
    })
  | (QueuePopupBase & {
      kind: 'shield_popup';
      streakPreserved: number;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'contextual';
      popupState: PopupState;
      ranking: PartnerRankingResponse | null;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'top3_entered';
      position: 1 | 2 | 3;
      ranking: PartnerRankingResponse | null;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'streak_broken';
      streakLost: number;
      shieldCount: number;
    })
  | (QueuePopupBase & {
      kind: 'streak_points_lost';
      result: StreakDecayResult;
    })
  | (QueuePopupBase & {
      kind: 'month_end';
      winners: Array<{
        position: 1 | 2 | 3;
        full_name: string;
        monthly_points: number;
      }>;
      organizationName: string;
    })
  | (QueuePopupBase & {
      kind: 'shield_earned';
    })
  | (QueuePopupBase & {
      kind: 'question_session_reward';
      points: number;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'simulado_reward';
      pointsAwarded: number;
      newMonthlyPoints: number;
      rankPosition: number | null;
      pointsToTop3: number | null;
      slug: string;
    });

type EnqueuePopupInput = DistributiveOmit<QueuePopup, 'id' | 'priority' | 'createdAt'> & {
  priority?: number;
};

interface PopupQueueContextValue {
  currentPopup: QueuePopup | null;
  enqueuePopup: (popup: EnqueuePopupInput) => string | null;
  dismissCurrentPopup: () => void;
  dismissPopupById: (id: string) => void;
  holdQueueUntilRouteChange: () => void;
  queuedPopups: QueuePopup[];
}

const POPUP_PRIORITIES: Record<QueuePopup['kind'], number> = {
  onboarding: 10,
  month_end: 15,
  streak_broken: 20,
  shield_popup: 30,
  streak_points_lost: 35,
  ranking_popup: 40,
  shield_earned: 50,
  question_session_reward: 60,
  simulado_reward: 60,
  top3_entered: 70,
  streak: 80,
  contextual: 90,
};

const PopupQueueContext = createContext<PopupQueueContextValue>({
  currentPopup: null,
  enqueuePopup: () => null,
  dismissCurrentPopup: () => {},
  dismissPopupById: () => {},
  holdQueueUntilRouteChange: () => {},
  queuedPopups: [],
});

function routeMatches(scope: PopupRouteScope, pathname: string | null): boolean {
  if (!pathname) return false;
  if (scope === 'any') return true;
  if (scope === 'dashboard') return pathname.includes('/student/dashboard');
  if (scope === 'simulado') {
    return pathname.includes('/student/simulado') && !pathname.includes('/student/simulado/ranking');
  }
  return false;
}

export function PopupQueueProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const sequenceRef = useRef(0);
  const [queuedPopups, setQueuedPopups] = useState<QueuePopup[]>([]);
  const [queueHoldPathname, setQueueHoldPathname] = useState<string | null>(null);
  const queuedPopupsRef = useRef<QueuePopup[]>([]);
  const queueHoldPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    queuedPopupsRef.current = queuedPopups;
  }, [queuedPopups]);

  useEffect(() => {
    queueHoldPathnameRef.current = queueHoldPathname;
  }, [queueHoldPathname]);

  useEffect(() => {
    const handleRouteChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ pathname?: string | null }>;
      const nextPathname = customEvent.detail?.pathname ?? null;
      const holdPath = queueHoldPathnameRef.current;

      if (holdPath && nextPathname && nextPathname !== holdPath) {
        setQueueHoldPathname(null);
      }
    };

    window.addEventListener('student-route-changed', handleRouteChanged);
    return () => {
      window.removeEventListener('student-route-changed', handleRouteChanged);
    };
  }, []);

  const sortedPopups = useMemo(
    () =>
      [...queuedPopups].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt - b.createdAt;
      }),
    [queuedPopups],
  );

  const currentPopup = useMemo(() => {
    const isQueueHeld = queueHoldPathname !== null && pathname === queueHoldPathname;
    if (isQueueHeld) return null;

    return sortedPopups.find((item) => routeMatches(item.routeScope, pathname)) ?? null;
  }, [pathname, queueHoldPathname, sortedPopups]);

  const enqueuePopup = useCallback((popup: EnqueuePopupInput): string | null => {
    const dedupeKey = popup.dedupeKey;
    const existing = dedupeKey
      ? queuedPopupsRef.current.find((item) => item.dedupeKey === dedupeKey)
      : null;

    if (existing) return existing.id;

    const id = `popup-${Date.now()}-${sequenceRef.current++}`;
    const queueItem = {
      ...popup,
      id,
      createdAt: Date.now(),
      priority: popup.priority ?? POPUP_PRIORITIES[popup.kind],
    } as QueuePopup;

    setQueuedPopups((prev) => [...prev, queueItem]);
    return id;
  }, []);

  const dismissPopupById = useCallback((id: string) => {
    const remainingPopups = queuedPopupsRef.current.filter((item) => item.id !== id);
    queuedPopupsRef.current = remainingPopups;
    setQueuedPopups(remainingPopups);
  }, []);

  const dismissCurrentPopup = useCallback(() => {
    if (!currentPopup) return;
    dismissPopupById(currentPopup.id);
  }, [currentPopup, dismissPopupById]);

  const holdQueueUntilRouteChange = useCallback(() => {
    setQueueHoldPathname(pathname);
  }, [pathname]);

  const value = useMemo(
    () => ({
      currentPopup,
      enqueuePopup,
      dismissCurrentPopup,
      dismissPopupById,
      holdQueueUntilRouteChange,
      queuedPopups,
    }),
    [currentPopup, dismissCurrentPopup, dismissPopupById, enqueuePopup, holdQueueUntilRouteChange, queuedPopups],
  );

  return (
    <PopupQueueContext.Provider value={value}>
      {children}
    </PopupQueueContext.Provider>
  );
}

export function usePopupQueue() {
  return useContext(PopupQueueContext);
}

export type { DiagnosticResult };
