'use client';

import { ReactNode, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  BookOpen,
  FileText,
  BarChart3,
  Home,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed?: boolean;
}

function NavItem({ href, icon: Icon, label, collapsed }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  const linkEl = (
    <Link
      href={href}
      style={isActive ? { backgroundColor: 'var(--brand-primary)' } : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{label}</TooltipContent>
      </Tooltip>
    );
  }
  return linkEl;
}

interface PartnerLayoutProps {
  children: ReactNode;
  /** 'founder' mostra nav de gestão; 'student' mostra nav de estudo */
  variant?: 'founder' | 'student';
}

export function PartnerLayout({ children, variant = 'founder' }: PartnerLayoutProps) {
  const { org, userProfile } = useOrg();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const founderNavItems = [
    { href: `/partners/${org.slug}/dashboard`,      icon: LayoutDashboard, label: 'Dashboard' },
    { href: `/partners/${org.slug}/alunos`,          icon: Users,           label: 'Alunos' },
    { href: `/partners/${org.slug}/alunos/convidar`, icon: UserPlus,        label: 'Adicionar Alunos' },
    { href: `/partners/${org.slug}/configuracoes`,   icon: Settings,        label: 'Configurações' },
  ];

  const studentNavItems = [
    { href: `/partners/${org.slug}/student/dashboard`,         icon: Home,      label: 'Início' },
    { href: `/partners/${org.slug}/student/banco-de-questoes`, icon: BookOpen,  label: 'Questões' },
    { href: `/partners/${org.slug}/student/simulado`,          icon: FileText,  label: 'Simulados' },
    { href: `/partners/${org.slug}/student/desempenho`,        icon: BarChart3, label: 'Meu Desempenho' },
    { href: `/partners/${org.slug}/student/perfil`,            icon: User,      label: 'Perfil' },
  ];

  const navItems = variant === 'student' ? studentNavItems : founderNavItems;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setIsHovered(true), 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setIsHovered(false);
  };

  const collapsed = !isHovered;

  const SidebarContent = ({ collapsed: c = false }: { collapsed?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Logo + org name */}
      <div className={cn('flex items-center gap-3 border-b dark:border-slate-800 px-4 py-4', c && 'justify-center px-2')}>
        {org.logo_url ? (
          <Image
            src={org.logo_url}
            alt={org.name}
            width={32}
            height={32}
            className="rounded-md object-contain shrink-0"
          />
        ) : (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <GraduationCap className="h-4 w-4" />
          </div>
        )}
        {!c && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {org.name}
            </p>
            <p className="text-xs text-slate-500">
              {variant === 'student' ? 'Portal do Aluno' : 'Portal Parceiro'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-1 py-4', c ? 'px-2' : 'px-3')}>
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={c} />
        ))}
      </nav>

      {/* User footer */}
      <div className={cn('border-t dark:border-slate-800 py-3', c ? 'px-2' : 'px-3')}>
        <div className={cn('flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2', c && 'justify-center px-2')}>
          <div
            className="w-9 h-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {userProfile.avatarUrl ? (
              <Image
                src={userProfile.avatarUrl}
                alt="Avatar"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              userProfile.fullName.charAt(0).toUpperCase()
            )}
          </div>
          {!c && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {userProfile.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  {variant === 'student' ? 'Aluno' : 'Founder'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={handleSignOut}
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'hidden md:flex md:flex-col shrink-0 border-r dark:border-slate-800 bg-white dark:bg-slate-900 transition-[width] duration-300 ease-in-out overflow-hidden',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {org.name}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
