'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { OrgBranding } from '@/app/partners/[slug]/layout';

interface UserProfile {
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

interface OrgContextValue {
  org: OrgBranding;
  userProfile: UserProfile;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({
  org,
  userProfile,
  children,
}: {
  org: OrgBranding;
  userProfile: UserProfile;
  children: ReactNode;
}) {
  return (
    <OrgContext.Provider value={{ org, userProfile }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg deve ser usado dentro do PartnersLayout');
  return ctx;
}
