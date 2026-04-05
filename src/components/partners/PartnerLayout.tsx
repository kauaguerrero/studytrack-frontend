'use client';
/* eslint-disable react-hooks/static-components */

import { ReactNode, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { useEssayNotification } from '@/contexts/EssayNotificationContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  LogOut,
  GraduationCap,
  BookOpen,
  FileText,
  ClipboardCheck,
  PenLine,
  BarChart3,
  Home,
  User,
  Trophy,
  BadgeCheck,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ForcePasswordChangeModal } from '@/components/partners/ForcePasswordChangeModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemDef {
  href: string;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
}

// ─── Sidebar nav item (desktop) ───────────────────────────────────────────────

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  collapsed,
  showNotification,
}: NavItemDef & { collapsed?: boolean; showNotification?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  const linkEl = (
    <Link
      href={href}
      style={isActive ? { backgroundColor: 'var(--brand-primary)' } : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
        collapsed && 'justify-center px-2',
        isActive
          ? 'text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
      )}
    >
      <span className="relative inline-flex shrink-0">
        <Icon className="h-4 w-4" />
        {showNotification && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        )}
      </span>
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

// ─── Bottom tab item (mobile) ─────────────────────────────────────────────────

function BottomTabItem({ href, icon: Icon, shortLabel, showNotification }: NavItemDef & { showNotification?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-1 py-2',
        'min-h-[56px] transition-colors',
        'text-[10px] font-bold tracking-wide',
        isActive
          ? 'text-[var(--brand-primary)]'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
      )}
    >
      <span className="relative inline-flex">
        <Icon
          className={cn(
            'h-5 w-5 transition-transform',
            isActive && 'scale-110',
          )}
        />
        {showNotification && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        )}
      </span>
      <span>{shortLabel}</span>
      {/* Active indicator dot */}
      {isActive && (
        <span
          className="absolute bottom-1 h-1 w-1 rounded-full"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        />
      )}
    </Link>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface PartnerLayoutProps {
  children: ReactNode;
  /** 'founder' mostra nav de gestão; 'student' mostra nav de estudo */
  variant?: 'founder' | 'student';
}

export function PartnerLayout({ children, variant = 'founder' }: PartnerLayoutProps) {
  const { org, userProfile } = useOrg();
  const { hasPendingCorrection } = useEssayNotification();
  const [isHovered, setIsHovered] = useState(false);
  const [passwordModalDismissed, setPasswordModalDismissed] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPasswordModal = userProfile.mustChangePassword === true && !passwordModalDismissed;
  const isAssociate = userProfile.role === 'associate' || userProfile.role === 'teacher';

  const founderNavItems: NavItemDef[] = [
    { href: `/partners/${org.slug}/dashboard`,      icon: LayoutDashboard, label: 'Dashboard',        shortLabel: 'Dashboard' },
    { href: `/partners/${org.slug}/alunos`,          icon: Users,           label: 'Alunos',            shortLabel: 'Alunos' },
    { href: `/partners/${org.slug}/planos`,          icon: WalletCards,     label: 'Planos',            shortLabel: 'Planos' },
    { href: `/partners/${org.slug}/redacoes`,        icon: FileText,        label: 'Redações',          shortLabel: 'Redações' },
    { href: `/partners/${org.slug}/alunos/convidar`, icon: UserPlus,        label: 'Adicionar Alunos', shortLabel: 'Adicionar' },
    { href: `/partners/${org.slug}/configuracoes`,   icon: Settings,        label: 'Configurações',    shortLabel: 'Config' },
  ];

  const studentNavItems: NavItemDef[] = [
    { href: `/partners/${org.slug}/student/dashboard`,         icon: Home,      label: 'Início',          shortLabel: 'Início' },
    { href: `/partners/${org.slug}/student/banco-de-questoes`, icon: BookOpen,  label: 'Questões',        shortLabel: 'Questões' },
    { href: `/partners/${org.slug}/student/simulado`,          icon: ClipboardCheck,  label: 'Simulados',       shortLabel: 'Simulados' },
    { href: `/partners/${org.slug}/student/ranking`,           icon: Trophy,    label: 'Ranking',         shortLabel: 'Ranking' },
    { href: `/partners/${org.slug}/student/titulos`,           icon: BadgeCheck, label: 'Títulos',        shortLabel: 'Títulos' },
    { href: `/partners/${org.slug}/student/desempenho`,        icon: BarChart3, label: 'Meu Desempenho',  shortLabel: 'Desempenho' },
    { href: `/partners/${org.slug}/student/redacoes`,          icon: PenLine,  label: 'Redações',        shortLabel: 'Redações' },
    { href: `/partners/${org.slug}/student/perfil`,            icon: User,      label: 'Perfil',          shortLabel: 'Perfil' },
  ];

  const associateNavItems: NavItemDef[] = [
    { href: `/partners/${org.slug}/redacoes`, icon: FileText, label: 'Redações', shortLabel: 'Redações' },
  ];

  const navItems = variant === 'student'
    ? studentNavItems
    : (isAssociate ? associateNavItems : founderNavItems);

  const initials = userProfile.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

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
              {variant === 'student' ? 'Portal do Aluno' : isAssociate ? 'Portal Associado' : 'Portal Parceiro'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 space-y-1 py-4', c ? 'px-2' : 'px-3')}>
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            {...item}
            collapsed={c}
            showNotification={
              variant === 'student'
                && item.href === `/partners/${org.slug}/student/redacoes`
                && hasPendingCorrection
            }
          />
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
              initials
            )}
          </div>
          {!c && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {userProfile.fullName}
                </p>
                <p className="text-xs text-slate-500">
                  {variant === 'student' ? 'Aluno' : isAssociate ? 'Associado' : 'Founder'}
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
    <div className="flex h-dvh min-h-dvh overflow-hidden overscroll-none bg-slate-50 dark:bg-slate-950">
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

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile top header */}
        <header className="flex items-center justify-between border-b dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 md:hidden shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {org.logo_url ? (
              <Image
                src={org.logo_url}
                alt={org.name}
                width={28}
                height={28}
                className="rounded-md object-contain shrink-0"
              />
            ) : (
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <GraduationCap className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {org.name}
            </span>
          </div>

          {/* Avatar + sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-2 pr-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Sair"
          >
            <div
              className="h-7 w-7 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {userProfile.avatarUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                : initials}
            </div>
            <LogOut className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom tab bar */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-slate-900 border-t dark:border-slate-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="relative flex items-stretch">
          {navItems.map((item) => (
            <BottomTabItem
              key={item.href}
              {...item}
              showNotification={
                variant === 'student'
                && item.href === `/partners/${org.slug}/student/redacoes`
                && hasPendingCorrection
              }
            />
          ))}
        </div>
      </nav>

      {showPasswordModal && (
        <ForcePasswordChangeModal onSuccess={() => setPasswordModalDismissed(true)} />
      )}

    </div>
  );
}
