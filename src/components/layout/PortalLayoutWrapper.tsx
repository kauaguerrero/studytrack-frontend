"use client";

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { PortalRoleProvider } from '@/contexts/PortalRoleContext';
import { UserRole } from '@/types/roles';

interface PortalLayoutWrapperProps {
  children: ReactNode;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
}

export function PortalLayoutWrapper({ children, role, fullName, avatarUrl }: PortalLayoutWrapperProps) {
  const pathname = usePathname();
  const isOnboardingRoute = pathname?.includes('/portal/onboarding');
  const resolvedRole: UserRole =
    pathname.startsWith('/portal/secretariat') ? 'secretariat' :
    pathname.startsWith('/portal/teacher') ? 'teacher' :
    pathname.startsWith('/portal/manager') ? 'manager' :
    pathname.startsWith('/portal/student') ? 'student' :
    role;

  // Se for rota de onboarding, não renderiza sidebar
  if (isOnboardingRoute) {
    return (
      <PortalRoleProvider role={role}>
        <div className="min-h-screen w-full bg-background text-foreground">
          {children}
        </div>
      </PortalRoleProvider>
    );
  }

  return (
    <PortalRoleProvider role={role}>
    <div className="flex h-screen w-full bg-[#F0F4F8] dark:bg-background text-slate-900 dark:text-foreground">
      <PortalSidebar role={resolvedRole} fullName={fullName} avatarUrl={avatarUrl} />

      <main className="flex-1 overflow-y-auto h-full relative flex flex-col">
        {/* Header Mobile */}
        <header className="bg-card h-16 border-b border-border flex items-center justify-between px-6 md:hidden flex-shrink-0 sticky top-0 z-30">
            <span className="font-bold text-foreground text-lg">StudyTrack</span>
            <div className="text-xs font-bold bg-muted text-muted-foreground px-3 py-1 rounded-full uppercase tracking-wide">
                {resolvedRole === 'manager' ? 'Gestão' : resolvedRole === 'teacher' ? 'Docente' : resolvedRole === 'secretariat' ? 'Secretaria' : 'Aluno'}
            </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
    </PortalRoleProvider>
  );
}
