'use client';

/**
 * Fila de popups fullscreen da área do aluno — garante que só UM popup
 * "de fila" fica visível por vez, em qualquer página, via um único
 * `currentPopup` central (computado aqui, consumido por StudentThemeShell,
 * DashboardClient, simulado/page.tsx etc. via usePopupQueue()).
 *
 * Contrato de z-index (auditado em 29/07/2026 — não quebre isso sem revisar
 * de novo todos os popups fullscreen do app):
 *   z-[9999]  ForcePasswordChangeModal — único, bloqueante, fora da fila.
 *             Nada mais pode usar esse z.
 *   z-[9500]  TODO popup registrado em QueuePopup['kind'] (StreakPopup,
 *             ShieldPopup, MonthEndScreen, AchievementUnlockedPopup, etc.,
 *             incluindo OnboardingDiagnosticModal). Novo kind → novo popup
 *             component → sempre z-[9500], nunca outro valor. A mutual
 *             exclusion do currentPopup já impede dois popups de fila
 *             aparecerem juntos; usar um z diferente aqui não protege nada
 *             a mais e só cria risco de um deles ficar "engolido" por algo
 *             fora da fila.
 *   z-[9000]  Modais abertos por ação do aluno (sino de novidades, "ver
 *             mais atividades", convite de push/instalação) — abaixo da
 *             fila de propósito: se um popup de fila abrir, ele sempre
 *             vence.
 *   z-50      Primitivas genéricas (Dialog/Sheet do shadcn) — nunca competem
 *             com nada acima.
 *
 * Exceção fora da fila: EssayRewardPopup (redacoes/nova/page.tsx) usa estado
 * local em vez do currentPopup compartilhado. Hoje isso é seguro porque
 * nenhum popup com routeScope:'any' é renderizado a partir de um componente
 * global (StudentThemeShell) — se isso mudar no futuro, EssayRewardPopup
 * precisa migrar pra fila também, senão os dois podem aparecer ao mesmo
 * tempo na página de redação.
 */

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
        is_anonymous?: boolean;
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
      kind: 'report_bounty_reward';
      points: number;
      reportCount: number;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'simulado_reward';
      pointsAwarded: number;
      newMonthlyPoints: number;
      rankPosition: number | null;
      pointsToTop3: number | null;
      slug: string;
    })
  | (QueuePopupBase & {
      kind: 'achievement_unlocked';
      title: string;
      description: string;
      icon: string;
      difficulty: string;
      difficultyLabel: string;
      chancePct: number;
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
  shield_earned: 50,
  question_session_reward: 60,
  simulado_reward: 60,
  report_bounty_reward: 60,
  achievement_unlocked: 65,
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

    queuedPopupsRef.current = [...queuedPopupsRef.current, queueItem];
    setQueuedPopups(queuedPopupsRef.current);
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
