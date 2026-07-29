'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { OrgTypewriterTagline } from '@/lib/org-typewriter-tagline';
import type { OrgApprovedPhoto } from '@/lib/org-approved-photos';

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
  permissions?: Record<string, boolean>;
  typewriter_tagline?: OrgTypewriterTagline | null;
  approved_student_photos?: OrgApprovedPhoto[] | null;
  hasAssociates?: boolean;
}

interface UserProfile {
  fullName: string;
  avatarUrl: string | null;
  role: string;
  isTestAccount?: boolean;
  themePreference?: 'light' | 'dark' | 'system' | null;
  mustChangePassword?: boolean;
  associatePermissions?: { can_correct: boolean; can_import: boolean; can_view_students: boolean };
  /** Usados só pelo nudge "Complete seu perfil" da sidebar do aluno. */
  username?: string | null;
  birthDate?: string | null;
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
