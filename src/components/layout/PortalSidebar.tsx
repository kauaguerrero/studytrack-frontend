'use client';

import { useEffect, useRef, useState } from 'react';
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
  ListChecks,
  Flag,
  ScanSearch,
  Github,
  Bell,
  Crown,
  FileText,
} from 'lucide-react';
import { UserRole } from '@/types/roles';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

// Acento azul-arroxeado da marca StudyTrack — usado só nos ícones e rótulos
// da navegação do admin, mantendo o resto da sidebar no visual padrão (fundo
// branco, bordas neutras) igual às outras roles.
const ADMIN_ACCENT_ICON = 'text-indigo-500 dark:text-indigo-400';
const ADMIN_ACCENT_ICON_ACTIVE = 'text-indigo-600 dark:text-indigo-300';
const ADMIN_ACCENT_TEXT = 'text-indigo-600 dark:text-indigo-300';

interface PortalSidebarProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  onCloseMobile?: () => void;
  /** Quando true (sidebar desktop colapsada), esconde os textos e mostra só os ícones. */
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
        : role;

  const isAdmin = resolvedRole === 'admin';

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  // A geometria é a mesma recolhida ou aberta: ícones, logo e avatar ficam
  // parados no mesmo x/y e só os rótulos aparecem/somem (opacidade). Nada
  // troca de padding, tamanho ou altura no meio da animação — era isso que
  // dava o "tranco" ao abrir.
  const fade = cn(
    'transition-opacity duration-200',
    collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-75',
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
      // pl fixo centraliza o ícone de 18px nos 56px do item recolhido
      'group flex items-center gap-3 h-11 pl-[19px] pr-3 rounded-lg text-sm font-medium transition-colors duration-150',
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

    return (
      <Link
        href={href}
        onClick={onCloseMobile}
        aria-label={collapsed ? label : undefined}
        className={baseClasses}
      >
        <Icon size={18} className={iconClasses} />
        <span className={cn('min-w-0 flex-1 truncate', fade)}>{label}</span>
        {active && (
          <ChevronRight
            size={14}
            className={cn(
              'shrink-0',
              isAdmin ? 'text-indigo-400 dark:text-indigo-300' : 'text-blue-400',
              fade,
            )}
          />
        )}
      </Link>
    );
  };

  // Altura fixa: recolhida vira um tracinho no lugar do texto, então os
  // itens não sobem/descem quando a sidebar abre.
  const renderSectionTitle = (children: React.ReactNode) => {
    return (
      <div className="relative h-8 mt-3 first:mt-0 flex items-center">
        <span
          aria-hidden
          className={cn(
            'absolute left-[19px] w-[18px] h-px bg-slate-200 dark:bg-sidebar-border transition-opacity duration-200',
            collapsed ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span
          className={cn(
            'pl-3 text-[11px] font-bold uppercase tracking-widest leading-none whitespace-nowrap',
            isAdmin ? 'text-indigo-400 dark:text-indigo-400/70' : 'text-slate-400 dark:text-muted-foreground',
            fade,
          )}
        >
          {children}
        </span>
      </div>
    );
  };

  const portalHomeHref =
    resolvedRole === 'dev'
          ? '/portal/admin/tasks'
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
      <div className="h-[72px] shrink-0 flex items-center pl-[22px] pr-4">
        <Link
          href={portalHomeHref}
          onClick={onCloseMobile}
          className="group flex items-center gap-2 min-w-0 transition-opacity hover:opacity-80"
        >
          <Image
            src="/logost-transparente-sombra.png"
            alt="Logo StudyTrack"
            width={36}
            height={36}
            className="w-9 h-9 shrink-0 object-contain"
            priority
            unoptimized
          />
          <div className={cn('min-w-0 overflow-hidden', fade)}>
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
      <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-3 pb-4">
        {resolvedRole === 'admin' && (
          <div className="space-y-0.5">
            {renderSectionTitle('Visão Geral')}
            {renderNavItem({ href: '/portal/admin', icon: LayoutDashboard, label: 'Dashboard' })}
            {renderNavItem({ href: '/portal/admin/tasks', icon: ListChecks, label: 'Tasks' })}
            {renderNavItem({ href: '/portal/admin/radar-comercial', icon: Radar, label: 'Radar Comercial' })}
            {renderNavItem({ href: '/portal/admin/github', icon: Github, label: 'GitHub' })}
            {renderSectionTitle('Conteúdo')}
            {renderNavItem({ href: '/portal/admin/audits', icon: ScanSearch, label: 'Audit Center' })}
            {renderNavItem({ href: '/portal/admin/questions', icon: BookOpen, label: 'Curadoria' })}
            {renderNavItem({ href: '/portal/admin/announcements', icon: Bell, label: 'Novidades' })}
            {renderNavItem({ href: '/portal/admin/relatorios', icon: FileText, label: 'Relatório Mensal' })}
            {renderSectionTitle('Reports')}
            {renderNavItem({ href: '/portal/admin/reports', icon: Flag, label: 'Reports' })}
            {renderSectionTitle('Ranking')}
            {renderNavItem({ href: '/portal/admin/god-mode', icon: Crown, label: 'God Mode' })}
          </div>
        )}

        {resolvedRole === 'dev' && (
          <div className="space-y-0.5">
            {renderSectionTitle('Operação')}
            {renderNavItem({ href: '/portal/admin/tasks', icon: ListChecks, label: 'Tasks' })}
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-sidebar-border pt-4 mt-6 space-y-0.5">
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
      {/* p-3 + borda + p-2 deixa o avatar de 36px centrado nos 80px recolhidos */}
      <div className="shrink-0 border-t border-slate-100 dark:border-sidebar-border p-3">
        <div
          className={cn(
            'rounded-xl border p-2 flex items-center gap-3 overflow-hidden transition-colors duration-200',
            collapsed
              ? 'border-transparent bg-transparent'
              : 'bg-slate-50 dark:bg-sidebar-accent border-slate-100 dark:border-sidebar-border',
          )}
        >
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
          <div className={cn('flex-1 min-w-0 overflow-hidden', fade)}>
            <p className="text-sm font-semibold truncate text-slate-900 dark:text-sidebar-foreground">
              {fullName}
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                tabIndex={collapsed ? -1 : undefined}
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

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const handleMouseEnter = () => {
    if (!isCollapsed) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // Atraso curto: não abre quando o mouse só cruza a borda a caminho de
    // outra coisa, sem parecer que a sidebar demora a responder.
    hoverTimer.current = setTimeout(() => setIsHovered(true), 90);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setIsHovered(false), 150);
  };

  const effectiveCollapsed = isCollapsed && !isHovered;
  const overlaying = isCollapsed && isHovered;

  return (
    // O <aside> só reserva o espaço na página. O painel de dentro é absoluto
    // e, no hover, abre POR CIMA do conteúdo — antes a largura do aside
    // animava e o dashboard inteiro era recalculado a cada quadro.
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'hidden md:block relative z-30 h-full shrink-0',
        isCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 overflow-hidden bg-sidebar border-r border-slate-200 dark:border-sidebar-border',
          'transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          effectiveCollapsed ? 'w-20' : 'w-64',
          overlaying ? 'shadow-[8px_0_32px_-12px_rgba(15,23,42,0.25)]' : 'shadow-none',
        )}
      >
        {/* Conteúdo com largura fixa: a animação só revela, nunca refaz o layout interno */}
        <div className="w-64 h-full">
          <SidebarContent {...props} collapsed={effectiveCollapsed} />
        </div>
      </div>
    </aside>
  );
}
