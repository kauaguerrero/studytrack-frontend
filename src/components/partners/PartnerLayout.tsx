'use client';

import { ReactNode, useState } from 'react';
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
  Target,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--brand-primary)] text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

interface PartnerLayoutProps {
  children: ReactNode;
  /** 'founder' mostra nav de gestão; 'student' mostra nav de estudo */
  variant?: 'founder' | 'student';
}

export function PartnerLayout({ children, variant = 'founder' }: PartnerLayoutProps) {
  const { org, userProfile } = useOrg();
  const [mobileOpen, setMobileOpen] = useState(false);

  const founderNavItems = [
    { href: `/partners/${org.slug}/dashboard`,      icon: LayoutDashboard, label: 'Dashboard' },
    { href: `/partners/${org.slug}/alunos`,          icon: Users,           label: 'Alunos' },
    { href: `/partners/${org.slug}/alunos/convidar`, icon: UserPlus,        label: 'Adicionar Alunos' },
    { href: `/partners/${org.slug}/configuracoes`,   icon: Settings,        label: 'Configurações' },
  ];

  const studentNavItems = [
    { href: `/partners/${org.slug}/student/dashboard`,          icon: Home,      label: 'Início' },
    { href: `/partners/${org.slug}/student/banco-de-questoes`,  icon: BookOpen,  label: 'Questões' },
    { href: `/partners/${org.slug}/student/simulado`,           icon: FileText,  label: 'Simulados' },
  ];

  const navItems = variant === 'student' ? studentNavItems : founderNavItems;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  const initials = userProfile.fullName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo + org name */}
      <div className="flex items-center gap-3 border-b px-4 py-4">
        {org.logo_url ? (
          <Image
            src={org.logo_url}
            alt={org.name}
            width={32}
            height={32}
            className="rounded-md object-contain"
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md text-white text-xs font-bold"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <GraduationCap className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {org.name}
          </p>
          <p className="text-xs text-slate-500">
            {variant === 'student' ? 'Portal do Aluno' : 'Portal Parceiro'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
          <div
            className="h-8 w-8 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {userProfile.avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={userProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
              : initials}
          </div>
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
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-slate-600"
            onClick={handleSignOut}
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-white dark:bg-slate-900 md:flex md:flex-col">
        <SidebarContent />
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
        <header className="flex items-center gap-3 border-b bg-white dark:bg-slate-900 px-4 py-3 md:hidden">
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
