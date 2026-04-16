'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Users,
  School,
  BarChart,
  Settings,
  GraduationCap,
  ChevronRight,
  LifeBuoy,
  Target,
  Trophy,
  Gamepad2,
  LogOut,
  Library,
  ClipboardList,
  User,
  Map,
  BrainCircuit,
  Sparkles,
  ListChecks,
  Flag,
  ScanSearch,
} from 'lucide-react';
import { UserRole } from '@/types/roles';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

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
    pathname.startsWith('/portal/secretariat')
      ? 'secretariat'
      : pathname.startsWith('/portal/teacher')
        ? 'teacher'
        : pathname.startsWith('/portal/manager')
          ? 'manager'
          : pathname.startsWith('/portal/student')
            ? 'student'
            : pathname.startsWith('/portal/admin')
              ? 'admin'
              : pathname.startsWith('/portal/dev')
                ? 'dev'
              : role;

  if (pathname.includes('/onboarding')) {
    return null;
  }

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const NavItem = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }) => {
    const active = isActive(href);
    const baseClasses = `group flex items-center gap-3 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-blue-50/80 dark:bg-sidebar-accent text-blue-700 dark:text-sidebar-accent-foreground shadow-sm'
        : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-sidebar-accent/50 hover:text-slate-900 dark:hover:text-sidebar-foreground'
    }`;
    const iconClasses = `transition-colors shrink-0 ${
      active
        ? 'text-blue-600 dark:text-sidebar-primary'
        : 'text-slate-400 dark:text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-sidebar-foreground'
    }`;

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
        {!collapsed && (
          <>
            <span>{label}</span>
            {active && (
              <ChevronRight
                size={14}
                className="ml-auto text-blue-400 shrink-0"
              />
            )}
          </>
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

  const SectionTitle = ({ children }: { children: React.ReactNode }) => {
    if (collapsed) return null;
    return (
      <div className="px-3 mt-6 mb-2">
        <span className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-widest leading-none">
          {children}
        </span>
      </div>
    );
  };

  const portalHomeHref =
    resolvedRole === 'student'
      ? '/portal/student/dashboard'
      : resolvedRole === 'teacher'
        ? '/portal/teacher'
        : resolvedRole === 'secretariat'
          ? '/portal/secretariat'
      : resolvedRole === 'manager'
        ? '/portal/manager'
        : resolvedRole === 'dev'
          ? '/portal/dev/tasks'
        : '/portal';

  const roleLabel =
    resolvedRole === 'manager'
      ? 'Gestão'
      : resolvedRole === 'teacher'
        ? 'Docente'
        : resolvedRole === 'secretariat'
          ? 'Secretaria'
          : resolvedRole === 'dev'
            ? 'Operação'
          : 'Área do Aluno';

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
          {!collapsed && (
            <div className="ml-1">
              <h1 className="font-bold text-lg text-slate-900 dark:text-sidebar-foreground tracking-tight leading-none">
                Study
                <span className="text-blue-600 dark:text-sidebar-primary">
                  Track
                </span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    resolvedRole === 'student' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground capitalize leading-none">
                  {roleLabel}
                </span>
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* --- NAVIGATION --- */}
      <nav
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          collapsed ? 'px-2 pb-4' : 'px-4 pb-4'
        }`}
      >
        {resolvedRole === 'student' && (
          <div className="space-y-0.5">
            <SectionTitle>Estudos</SectionTitle>
            <NavItem
              href="/portal/student/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
            />
            <NavItem
              href="/portal/student/study-map"
              icon={Map}
              label="Mapa ENEM"
            />
            <NavItem
              href="/portal/student/library"
              icon={Library}
              label="Biblioteca Digital"
            />
            <NavItem
              href="/portal/student/simulado"
              icon={FileText}
              label="Simulados"
            />
            <NavItem
              href="/portal/student/banco-de-questoes"
              icon={BookOpen}
              label="Banco de Questões"
            />
            <NavItem
              href="/portal/student/goals"
              icon={Trophy}
              label="Minhas Metas"
            />
            <NavItem href="/jogos" icon={Gamepad2} label="Sala de Jogos" />
            <NavItem
              href="/portal/student/flashcards"
              icon={BrainCircuit}
              label="Flashcards"
            />
            <SectionTitle>Performance</SectionTitle>
            <NavItem
              href="/portal/student/analytics"
              icon={BarChart}
              label="Meu Desempenho"
            />
          </div>
        )}

        {resolvedRole === 'teacher' && (
          <div className="space-y-0.5">
            <SectionTitle>Sala de Aula</SectionTitle>
            <NavItem href="/portal/teacher" icon={School} label="Minhas Turmas" />
            <NavItem
              href="/portal/teacher/students"
              icon={Users}
              label="Alunos e Notas"
            />
            <SectionTitle>Avaliações</SectionTitle>
            <NavItem
              href="/portal/teacher/assessments"
              icon={ClipboardList}
              label="Provas e Simulados"
            />
            <SectionTitle>Conteúdo</SectionTitle>
            <NavItem
              href="/portal/teacher/assignments"
              icon={FileText}
              label="Tarefas e Listas"
            />
            <NavItem
              href="/portal/teacher/goals"
              icon={Target}
              label="Metas Criadas"
            />
          </div>
        )}

        {resolvedRole === 'admin' && (
          <div className="space-y-0.5">
            <SectionTitle>Visão Geral</SectionTitle>
            <NavItem href="/portal/admin" icon={LayoutDashboard} label="Dashboard" />
            <NavItem href="/portal/admin/tasks" icon={ListChecks} label="Tasks" />
            <SectionTitle>Conteúdo</SectionTitle>
            <NavItem href="/portal/admin/audits" icon={ScanSearch} label="Audit Center" />
            <NavItem href="/portal/admin/social-media" icon={Sparkles} label="Social Media IA" />
            <NavItem href="/portal/admin/questions" icon={BookOpen} label="Questões" />
            <SectionTitle>Relatórios</SectionTitle>
            <NavItem href="/portal/admin/reengagement" icon={Target} label="Reengajamento" />
            <NavItem href="/portal/admin/reports" icon={Flag} label="Denúncias" />
          </div>
        )}

        {resolvedRole === 'dev' && (
          <div className="space-y-0.5">
            <SectionTitle>Operação</SectionTitle>
            <NavItem href="/portal/dev/tasks" icon={ListChecks} label="Tasks" />
          </div>
        )}

        {resolvedRole === 'secretariat' && (
          <div className="space-y-0.5">
            <SectionTitle>Inclusão & Adaptação</SectionTitle>
            <NavItem
              href="/portal/secretariat"
              icon={LayoutDashboard}
              label="Dashboard"
            />
            <NavItem
              href="/portal/secretariat/adaptation/new"
              icon={FileText}
              label="Nova Adaptação"
            />
            <NavItem
              href="/portal/secretariat/students"
              icon={Users}
              label="Alunos NEE"
            />
          </div>
        )}

        {resolvedRole === 'manager' && (
          <div className="space-y-0.5">
            <SectionTitle>Administração</SectionTitle>
            <NavItem
              href="/portal/manager"
              icon={BarChart}
              label="Visão Geral"
            />
            <NavItem
              href="/portal/manager/students"
              icon={GraduationCap}
              label="Gestão de Alunos"
            />
            <NavItem
              href="/portal/manager/curriculum"
              icon={BookOpen}
              label="Grade Curricular"
            />
            <SectionTitle>Sistema</SectionTitle>
            <NavItem
              href="/portal/manager/settings"
              icon={Settings}
              label="Configurações da Escola"
            />
          </div>
        )}

        <div
          className={`border-t border-slate-100 dark:border-sidebar-border pt-4 space-y-0.5 ${
            collapsed ? 'mt-6' : 'mt-8'
          }`}
        >
          <NavItem
            href="/portal/student/profile"
            icon={User}
            label="Meu Perfil"
          />
          <NavItem
            href="/portal/support"
            icon={LifeBuoy}
            label="Ajuda e Suporte"
          />
        </div>
      </nav>

      {/* --- USER FOOTER --- */}
      <div
        className={`border-t border-slate-100 dark:border-sidebar-border ${
          collapsed ? 'p-2' : 'p-4'
        }`}
      >
        <div className="bg-slate-50 dark:bg-sidebar-accent rounded-xl border border-slate-100 dark:border-sidebar-border flex items-center gap-3 hover:border-blue-200 dark:hover:border-sidebar-ring hover:bg-blue-50/50 dark:hover:bg-sidebar-accent/80 transition-colors group cursor-default overflow-hidden">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-blue-700 dark:text-sidebar-primary-foreground font-bold overflow-hidden shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600">
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
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-900 dark:text-sidebar-foreground truncate">
                  {fullName}
                </p>
                {resolvedRole === 'student' && (
                  <span className="text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider shrink-0">
                    Aluno
                  </span>
                )}
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-destructive font-medium transition-colors mt-0.5 w-full text-left"
                >
                  <LogOut size={12} /> Sair da conta
                </button>
              </form>
            </div>
          )}
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
    hoverTimer.current = setTimeout(() => setIsHovered(true), 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setIsHovered(false);
  };

  const effectiveCollapsed = isCollapsed && !isHovered;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'hidden md:flex flex-col h-full z-0 sticky top-0 border-r border-slate-200 dark:border-sidebar-border transition-[width] duration-300 ease-in-out shrink-0',
        effectiveCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <SidebarContent {...props} collapsed={effectiveCollapsed} />
    </aside>
  );
}
