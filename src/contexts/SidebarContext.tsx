'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { setSidebarCollapsedCookie } from '@/lib/sidebar-cookie';

interface SidebarContextValue {
  isCollapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: React.ReactNode;
  /** Valor inicial vindo do servidor (cookie) para evitar layout shift. */
  initialCollapsed: boolean;
}

export function SidebarProvider({ children, initialCollapsed }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsedCookie(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isCollapsed, toggle }),
    [isCollapsed, toggle]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return { isCollapsed: false, toggle: () => {} };
  }
  return ctx;
}
