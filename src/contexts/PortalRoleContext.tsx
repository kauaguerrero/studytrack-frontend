'use client';

import { createContext, useContext, ReactNode } from 'react';
import { UserRole } from '@/types/roles';

interface PortalRoleContextValue {
  role: UserRole;
}

const PortalRoleContext = createContext<PortalRoleContextValue | null>(null);

interface PortalRoleProviderProps {
  role: UserRole;
  children: ReactNode;
}

export function PortalRoleProvider({ role, children }: PortalRoleProviderProps) {
  return (
    <PortalRoleContext.Provider value={{ role }}>
      {children}
    </PortalRoleContext.Provider>
  );
}

export function usePortalRole(): UserRole {
  const ctx = useContext(PortalRoleContext);
  if (!ctx) {
    throw new Error('usePortalRole deve ser usado dentro do PortalLayout (PortalRoleProvider).');
  }
  return ctx.role;
}

/** Retorna a role ou undefined se fora do provider (ex.: loading). */
export function usePortalRoleOptional(): UserRole | undefined {
  const ctx = useContext(PortalRoleContext);
  return ctx?.role;
}
