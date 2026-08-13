'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  ChevronRight,
  LifeBuoy,
  Radar,
  LogOut,
  User,
  Sparkles,
  ListChecks,
  Flag,
  ScanSearch,
  Github,
  Presentation,
  Bell,
} from 'lucide-react';
import { UserRole } from '@/types/roles';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

// Acento azul-arroxeado da marca StudyTrack — usado só nos ícones e rótulos
// da navegação do admin, mantendo o resto da sidebar no visual padrão (fundo
// branco, bordas neutras) igual às outras roles.
const ADMIN_ACCENT_ICON = 'text-indigo-500 dark:text-indigo-400';
const ADMIN_ACCENT_ICON_ACTIVE = 'text-indigo-600 dark:text-indigo-300';
const ADMIN_ACCENT_TEXT = 'text-indigo-600 dark:text-indigo-300';

const EASE = 'ease-[cubic-bezier(0.16,1,0.3,1)]';

interface PortalSidebarProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  onCloseMobile?: () => void;
  /** Quando true (sidebar desktop colapsada), esconde textos e mostra apenas ícones com tooltip. */
  collapsed?: boolean;
}

export function SidebarContent({
  role,
  fullName,
  avatarUrl,
  onCloseMobile,
  collapsed = false,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const resolvedRole: UserRole =
    role === 'dev'
      ? 'dev'
      : pathname.startsWith('/portal/admin')
        ? 'admin'
        : pathname.startsWith('/portal/dev')
          ? 'dev'
          : role;

  const isAdmin = resolvedRole === 'admin';

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  // Largura animada do rótulo — em vez de sumir de uma vez (mount/unmount),
  // encolhe suavemente junto com a sidebar pra não parecer travado.
  const labelWrapClasses = cn(
    'overflow-hidden whitespace-nowrap transition-all duration-300',
    EASE,
    collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100',
  );

  const renderNavItem = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }) => {
    const active = isActive(href);
    const baseClasses = cn(
      'group flex items-center gap-3 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-300',
      EASE,
      active
        ? isAdmin
          ? `bg-indigo-50/80 dark:bg-indigo-500/15 ${ADMIN_ACCENT_TEXT} shadow-sm`
          : 'bg-blue-50/80 dark:bg-sidebar-accent text-blue-700 dark:text-sidebar-accent-foreground shadow-sm'
        : isAdmin
          ? `${ADMIN_ACCENT_TEXT} hover:bg-indigo-50/60 dark:hover:bg-indigo-500/10`
          : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-sidebar-accent/50 hover:text-slate-900 dark:hover:text-sidebar-foreground',
    );
    const iconClasses = cn(
      'transition-colors shrink-0',
      active
        ? isAdmin ? ADMIN_ACCENT_ICON_ACTIVE : 'text-blue-600 dark:text-sidebar-primary'
        : isAdmin
          ? `${ADMIN_ACCENT_ICON} group-hover:text-indigo-600 dark:group-hover:text-indigo-300`
          : 'text-slate-400 dark:text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-sidebar-foreground',
    );

    const content = (
      <Link
        href={href}
        onClick={onCloseMobile}
        className={
          collapsed
            ? `${baseClasses} justify-center px-0 py-2.5 w-full`
            : `${baseClasses} px-3 py-2.5`
        }
      >
        <Icon size={18} className={iconClasses} />
        <span className={labelWrapClasses}>{label}</span>
        {active && (
          <ChevronRight
            size={14}
            className={cn(
              'ml-auto shrink-0 transition-opacity duration-300',
              isAdmin ? 'text-indigo-400 dark:text-indigo-300' : 'text-blue-400',
              collapsed ? 'opacity-0 w-0' : 'opacity-100',
            )}
          />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  const renderSectionTitle = (children: React.ReactNode) => {
    return (
      <div className={cn('px-3 mt-6 mb-2 overflow-hidden transition-all duration-300', EASE, collapsed ? 'max-h-0 opacity-0 mt-0 mb-0' : 'max-h-8 opacity-100')}>
        <span className={cn(
          'text-[11px] font-bold uppercase tracking-widest leading-none whitespace-nowrap',
          isAdmin ? 'text-indigo-400 dark:text-indigo-400/70' : 'text-slate-400 dark:text-muted-foreground',
        )}>
          {children}
        </span>
      </div>
    );
  };

  const portalHomeHref =
    resolvedRole === 'dev'
          ? '/portal/dev/tasks'
        : resolvedRole === 'admin'
          ? '/portal/admin'
        : '/portal';

  const roleLabel =
    resolvedRole === 'dev'
            ? 'Operação'
          : resolvedRole === 'admin'
            ? 'Admin'
            : 'Portal';

  return (
    <div className="flex flex-col h-full bg-sidebar dark:bg-sidebar text-slate-900 dark:text-sidebar-foreground">
      {/* --- HEADER --- */}
      <div className={cn(collapsed ? 'p-2 pb-2 flex justify-center' : 'p-5 pb-2')}>
        <Link
          href={portalHomeHref}
          onClick={onCloseMobile}
          className={cn(
            'group flex items-center transition-opacity hover:opacity-80',
            collapsed ? 'justify-center' : 'w-fit',
          )}
        >
          <div className="flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Image
              src="/logost-transparente-sombra.png"
              alt="Logo StudyTrack"
              width={40}
              height={40}
              className={cn(collapsed ? 'w-8 h-8' : 'w-10 h-10', 'object-contain')}
              priority
              unoptimized
            />
          </div>
          <div className={cn('ml-1 overflow-hidden transition-all duration-300', EASE, collapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[160px] opacity-100')}>
            <h1 className="font-bold text-lg tracking-tight leading-none whitespace-nowrap text-slate-900 dark:text-sidebar-foreground">
              Study
              <span className={isAdmin ? 'text-indigo-500 dark:text-indigo-400' : 'text-blue-600 dark:text-sidebar-primary'}>
                Track
              </span>
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={cn(
                  'inline-block w-2 h-2 rounded-full shrink-0',
                  isAdmin ? 'bg-indigo-500' : resolvedRole === 'student' ? 'bg-green-500' : 'bg-blue-500',
                )}
              />
              <span className={cn(
                'text-[11px] font-medium capitalize leading-none whitespace-nowrap',
                isAdmin ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-muted-foreground',
              )}>
                {roleLabel}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* --- NAVIGATION --- */}
      <nav
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          collapsed ? 'px-2 pb-4' : 'px-4 pb-4'
        }`}
      >
        {resolvedRole === 'admin' && (
          <div className="space-y-0.5">
            {renderSectionTitle('Visão Geral')}
            {renderNavItem({ href: '/portal/admin', icon: LayoutDashboard, label: 'Dashboard' })}
            {renderNavItem({ href: '/portal/admin/tasks', icon: ListChecks, label: 'Tasks' })}
            {renderNavItem({ href: '/portal/admin/radar-comercial', icon: Radar, label: 'Radar Comercial' })}
            {renderNavItem({ href: '/portal/admin/github', icon: Github, label: 'GitHub' })}
            {renderNavItem({ href: '/portal/admin/apresentacao', icon: Presentation, label: 'Apresentação' })}
            {renderSectionTitle('Conteúdo')}
            {renderNavItem({ href: '/portal/admin/audits', icon: ScanSearch, label: 'Audit Center' })}
            {renderNavItem({ href: '/portal/admin/social-media', icon: Sparkles, label: 'Social Media IA' })}
            {renderNavItem({ href: '/portal/admin/questions', icon: BookOpen, label: 'Curadoria' })}
            {renderNavItem({ href: '/portal/admin/announcements', icon: Bell, label: 'Novidades' })}
            {renderSectionTitle('Reports')}
            {renderNavItem({ href: '/portal/admin/reports', icon: Flag, label: 'Reports' })}
          </div>
        )}

        {resolvedRole === 'dev' && (
          <div className="space-y-0.5">
            {renderSectionTitle('Operação')}
            {renderNavItem({ href: '/portal/dev/tasks', icon: ListChecks, label: 'Tasks' })}
          </div>
        )}

        <div
          className={cn(
            'border-t border-slate-100 dark:border-sidebar-border pt-4 space-y-0.5',
            collapsed ? 'mt-6' : 'mt-8',
          )}
        >
          {(resolvedRole === 'admin' || resolvedRole === 'dev') && (
            renderNavItem({
              href: resolvedRole === 'admin' ? '/portal/admin/profile' : '/portal',
              icon: User,
              label: resolvedRole === 'admin' ? 'Meu Perfil' : 'Portal',
            })
          )}
          {resolvedRole !== 'admin' && resolvedRole !== 'dev' && (
            renderNavItem({
              href: '/portal/support',
              icon: LifeBuoy,
              label: 'Ajuda e Suporte',
            })
          )}
        </div>
      </nav>

      {/* --- USER FOOTER --- */}
      <div className={cn('border-t border-slate-100 dark:border-sidebar-border', collapsed ? 'p-2' : 'p-4')}>
        <div className="rounded-xl border bg-slate-50 dark:bg-sidebar-accent border-slate-100 dark:border-sidebar-border flex items-center gap-3 hover:border-blue-200 dark:hover:border-sidebar-ring hover:bg-blue-50/50 dark:hover:bg-sidebar-accent/80 transition-colors group cursor-default overflow-hidden">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold overflow-hidden shrink-0 text-blue-700 dark:text-sidebar-primary-foreground bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={36}
                height={36}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-sm">{fullName.charAt(0)}</span>
            )}
          </div>
          <div className={cn('flex-1 min-w-0 overflow-hidden transition-all duration-300', EASE, collapsed ? 'max-w-0 opacity-0' : 'max-w-[180px] opacity-100')}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate text-slate-900 dark:text-sidebar-foreground">
                {fullName}
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-destructive font-medium transition-colors mt-0.5 w-full text-left whitespace-nowrap"
              >
                <LogOut size={12} /> Sair da conta
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PortalSidebar(props: PortalSidebarProps) {
  const { isCollapsed } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (!isCollapsed) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsHovered(true), 120);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // Pequeno atraso ao fechar também — evita o "flicker" de abrir/fechar
    // rápido demais quando o mouse só passa de raspão pela borda.
    hoverTimer.current = setTimeout(() => setIsHovered(false), 200);
  };

  const effectiveCollapsed = isCollapsed && !isHovered;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'hidden md:flex flex-col h-full z-0 sticky top-0 border-r border-slate-200 dark:border-sidebar-border shrink-0',
        'transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width]',
        effectiveCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <SidebarContent {...props} collapsed={effectiveCollapsed} />
    </aside>
  );
}
