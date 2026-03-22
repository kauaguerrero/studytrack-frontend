'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { PortalHeader } from '@/components/layout/PortalHeader';
import { PortalBottomNav } from '@/components/layout/PortalBottomNav';
import { PortalRoleProvider } from '@/contexts/PortalRoleContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { UserRole } from '@/types/roles';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/layout/PortalSidebar';
import { AnnouncementModal } from '@/components/announcements/AnnouncementModal';

interface PortalLayoutWrapperProps {
  children: ReactNode;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  /** Valor inicial do servidor (cookie) para Zero Layout Shift. */
  initialSidebarCollapsed?: boolean;
}

export function PortalLayoutWrapper({
  children,
  role,
  fullName,
  avatarUrl,
  initialSidebarCollapsed = true,
}: PortalLayoutWrapperProps) {
  const pathname = usePathname();
  const isOnboardingRoute = pathname?.includes('/portal/onboarding');
  const resolvedRole: UserRole = pathname.startsWith('/portal/secretariat')
    ? 'secretariat'
    : pathname.startsWith('/portal/teacher')
      ? 'teacher'
      : pathname.startsWith('/portal/manager')
        ? 'manager'
        : pathname.startsWith('/portal/student')
          ? 'student'
          : role;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isStudent = resolvedRole === 'student';

  if (isOnboardingRoute) {
    return (
      <PortalRoleProvider role={role}>
        <div className="min-h-screen w-full bg-background text-foreground">
          {children}
        </div>
      </PortalRoleProvider>
    );
  }

  const sidebarProps = {
    role: resolvedRole,
    fullName,
    avatarUrl,
  };

  return (
    <PortalRoleProvider role={role}>
      <SidebarProvider initialCollapsed={initialSidebarCollapsed}>
        <div className="flex h-screen w-full bg-[#F0F4F8] dark:bg-background text-slate-900 dark:text-foreground">
          <PortalSidebar {...sidebarProps} />

          <main className="flex-1 overflow-y-auto h-full relative flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out">
            <PortalHeader
              resolvedRole={resolvedRole}
              onOpenMobileMenu={() => setMobileMenuOpen(true)}
            />

            <div className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-150 pb-20 md:pb-8">
              {children}
            </div>

            {/* Bottom Nav — apenas aluno, mobile */}
            {isStudent && (
              <PortalBottomNav onOpenMoreMenu={() => setMobileMenuOpen(true)} />
            )}
          </main>
        </div>

        {/* Mobile Drawer — menu completo (todos os roles) */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent
            side="left"
            overlayClassName="bg-black/40 backdrop-blur-md"
            className="w-72 max-w-[85vw] p-0 bg-card border-r border-border md:hidden overflow-hidden will-change-transform"
          >
            <div className="h-full overflow-y-auto">
              <SidebarContent
                {...sidebarProps}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <AnnouncementModal />
      </SidebarProvider>
    </PortalRoleProvider>
  );
}
