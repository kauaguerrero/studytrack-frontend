'use client';

import { createContext, useContext, ReactNode } from 'react';

// Interface espelhada para garantir desacoplamento e sucesso no build
export interface OrgBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
  brand_accent: string;
  plan_tier?: string;
  max_students?: number;
  invite_code?: string | null;
  permissions?: any;
}

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