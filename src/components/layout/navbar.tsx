'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Zap, LogOut, Menu, X } from 'lucide-react';
import { SidebarContent } from '@/components/layout/PortalSidebar';

export type UserRole = 'student' | 'teacher' | 'manager';

interface DashboardNavbarProps {
  firstName: string;
  fullName: string;
  userRole: UserRole;
  avatarUrl?: string;
}

export function DashboardNavbar({
  firstName,
  fullName,
  userRole,
  avatarUrl,
}: DashboardNavbarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const inPortal =
    pathname?.startsWith('/portal') && !pathname?.includes('/portal/onboarding');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`sticky top-0 z-40 px-4 pt-4 pb-2 transition-all duration-300 ${isMobileMenuOpen ? 'z-50' : ''}`}
        aria-label="Menu principal"
      >
        <div
          className={`
          max-w-6xl mx-auto bg-white/80 dark:bg-card/80 backdrop-blur-xl border border-white/50 dark:border-border
          rounded-2xl px-5 py-3 flex justify-between items-center transition-all
          ${scrolled ? 'shadow-md border-slate-200/50 dark:border-border' : 'shadow-sm'}
        `}
        >
          <div className="flex items-center gap-3">
            {/* Hambúrguer apenas fora do portal (dentro do portal o layout usa header + bottom nav) */}
            {!inPortal && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden min-w-[44px] min-h-[44px] p-2 -ml-2 flex items-center justify-center text-foreground hover:bg-muted rounded-xl transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Abrir menu de navegação"
              >
                <Menu size={22} aria-hidden />
              </button>
            )}

            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
              <Zap size={18} className="fill-white" />
            </div>
            <div className="hidden min-[350px]:block">
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                StudyTrack
              </h1>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-xs font-bold text-foreground bg-muted px-3 py-1 rounded-full border border-border">
                Olá, {firstName} <span aria-hidden>👋</span>
              </span>
            </div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500 dark:hover:text-red-400 rounded-xl text-muted-foreground transition-all active:scale-95 border border-transparent hover:border-red-100 dark:hover:border-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                aria-label="Sair do sistema"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer — apenas fora do portal (dentro do portal o layout usa Sheet + Bottom Nav) */}
      {!inPortal && (
        <>
          <div
            className={`fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white dark:bg-card shadow-2xl transform transition-transform duration-300 ease-out md:hidden flex flex-col will-change-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
            role="dialog"
            aria-label="Menu de navegação"
          >
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 min-w-[44px] min-h-[44px] p-2 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-muted rounded-full transition-colors z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Fechar menu"
            >
              <X size={20} aria-hidden />
            </button>
            <div className="h-full overflow-hidden pt-2 flex-1">
              <SidebarContent
                role={userRole}
                fullName={fullName}
                avatarUrl={avatarUrl}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
