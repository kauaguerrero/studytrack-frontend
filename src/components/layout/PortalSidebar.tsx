'use client'

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
  User
} from 'lucide-react';
import { UserRole } from '@/types/roles';

interface PortalSidebarProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  onCloseMobile?: () => void;
}

export function SidebarContent({ role, fullName, avatarUrl, onCloseMobile }: PortalSidebarProps) {
  const pathname = usePathname();
  const resolvedRole: UserRole =
    pathname.startsWith('/portal/secretariat') ? 'secretariat' :
    pathname.startsWith('/portal/teacher') ? 'teacher' :
    pathname.startsWith('/portal/manager') ? 'manager' :
    pathname.startsWith('/portal/student') ? 'student' :
    role;

  if (pathname.includes('/onboarding')) {
    return null;
  }

  const isActive = (path: string) => {
      return pathname === path || pathname.startsWith(`${path}/`);
  };

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = isActive(href);
    return (
      <Link 
        href={href} 
        onClick={onCloseMobile}
        className={`group flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          active 
            ? 'bg-blue-50/80 dark:bg-sidebar-accent text-blue-700 dark:text-sidebar-accent-foreground shadow-sm' 
            : 'text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-sidebar-accent/50 hover:text-slate-900 dark:hover:text-sidebar-foreground'
        }`}
      >
        <Icon 
          size={18} 
          className={`transition-colors ${active ? "text-blue-600 dark:text-sidebar-primary" : "text-slate-400 dark:text-muted-foreground group-hover:text-slate-600 dark:group-hover:text-sidebar-foreground"}`} 
        />
        <span>{label}</span>
        {active && <ChevronRight size={14} className="ml-auto text-blue-400" />}
      </Link>
    );
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 mt-6 mb-2">
      <span className="text-[11px] font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-widest leading-none">
        {children}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-sidebar dark:bg-sidebar text-slate-900 dark:text-sidebar-foreground">
      {/* --- HEADER --- */}
      <div className="p-5 pb-2">
        <Link href="/" onClick={onCloseMobile} className="group flex items-center gap-1 mb-6 w-fit transition-opacity hover:opacity-80">
          <div className="flex items-center justify-center -mr-1 group-hover:scale-110 transition-transform duration-300">
             <Image 
               src="/logost-transparente-sombra.png" 
               alt="Logo StudyTrack" 
               width={40} 
               height={40} 
               className="w-10 h-10 object-contain"
               priority
               unoptimized
             />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 dark:text-sidebar-foreground tracking-tight leading-none">
              Study<span className="text-blue-600 dark:text-sidebar-primary">Track</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
               <span className={`inline-block w-2 h-2 rounded-full ${resolvedRole === 'student' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
               <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground capitalize leading-none">
                 {resolvedRole === 'manager' ? 'Gestão' : resolvedRole === 'teacher' ? 'Docente' : resolvedRole === 'secretariat' ? 'Secretaria' : 'Área do Aluno'}
               </span>
            </div>
          </div>
        </Link>
      </div>
      
      {/* --- NAVIGATION --- */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto custom-scrollbar">
        
        {/* MENU ALUNO */}
        {resolvedRole === 'student' && (
          <div className="space-y-0.5">
            <SectionTitle>Estudos</SectionTitle>
            <NavItem href="/portal/student/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem href="/portal/student/library" icon={Library} label="Biblioteca Digital" /> 
            <NavItem href="/portal/student/simulado" icon={FileText} label="Simulados" />
            <NavItem href="/portal/student/banco-de-questoes" icon={BookOpen} label="Banco de Questões" />
            <NavItem href="/portal/student/goals" icon={Trophy} label="Minhas Metas" />
            <NavItem href="/jogos" icon={Gamepad2} label="Sala de Jogos" />
            
            <SectionTitle>Performance</SectionTitle>
            <NavItem href="/portal/student/analytics" icon={BarChart} label="Meu Desempenho" />
          </div>
        )}

        {/* MENU PROFESSOR */}
        {resolvedRole === 'teacher' && (
          <div className="space-y-0.5">
            <SectionTitle>Sala de Aula</SectionTitle>
            <NavItem href="/portal/teacher" icon={School} label="Minhas Turmas" />
            <NavItem href="/portal/teacher/students" icon={Users} label="Alunos e Notas" />
            <SectionTitle>Avaliações</SectionTitle>
            {/* LINK NOVO AQUI: */}
            <NavItem href="/portal/teacher/assessments" icon={ClipboardList} label="Provas e Simulados" />
            <SectionTitle>Conteúdo</SectionTitle>
            <NavItem href="/portal/teacher/assignments" icon={FileText} label="Tarefas e Listas" />
            <NavItem href="/portal/teacher/goals" icon={Target} label="Metas Criadas" />
          </div>
        )}

        {/* MENU SECRETARIA (NOVO) */}
        {resolvedRole === 'secretariat' && (
          <div className="space-y-0.5">
            <SectionTitle>Inclusão & Adaptação</SectionTitle>
            <NavItem href="/portal/secretariat" icon={LayoutDashboard} label="Dashboard" />
            <NavItem href="/portal/secretariat/adaptation/new" icon={FileText} label="Nova Adaptação" />
            <NavItem href="/portal/secretariat/students" icon={Users} label="Alunos NEE" />
          </div>
        )}

        {/* MENU GESTOR */}
        {resolvedRole === 'manager' && (
          <div className="space-y-0.5">
            <SectionTitle>Administração</SectionTitle>
            <NavItem href="/portal/manager" icon={BarChart} label="Visão Geral" />
            <NavItem href="/portal/manager/students" icon={GraduationCap} label="Gestão de Alunos" />
            <NavItem href="/portal/manager/curriculum" icon={BookOpen} label="Grade Curricular" />
            <SectionTitle>Sistema</SectionTitle>
            <NavItem href="/portal/manager/settings" icon={Settings} label="Configurações da Escola" />
          </div>
        )}

        {/* Links Comuns */}
        <div className="mt-8 border-t border-slate-100 dark:border-sidebar-border pt-4 space-y-0.5">
           <NavItem href="/portal/profile" icon={User} label="Meu Perfil" />
           <NavItem href="/portal/support" icon={LifeBuoy} label="Ajuda e Suporte" />
        </div>
      </nav>

      {/* --- USER FOOTER --- */}
      <div className="p-4 border-t border-slate-100 dark:border-sidebar-border">
        <div className="bg-slate-50 dark:bg-sidebar-accent rounded-xl p-3 border border-slate-100 dark:border-sidebar-border flex items-center gap-3 hover:border-blue-200 dark:hover:border-sidebar-ring hover:bg-blue-50/50 dark:hover:bg-sidebar-accent/80 transition-colors group cursor-default">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-blue-700 dark:text-sidebar-primary-foreground font-bold overflow-hidden shrink-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-sm">{fullName.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-900 dark:text-sidebar-foreground truncate">{fullName}</p>
              {resolvedRole === 'student' && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider shrink-0">Aluno</span>
              )}
            </div>
            <form action="/auth/signout" method="post">
                <button className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-muted-foreground hover:text-red-600 dark:hover:text-destructive font-medium transition-colors mt-0.5 w-full text-left">
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
  return (
    <aside className="w-72 border-r border-slate-200 dark:border-sidebar-border hidden md:flex flex-col h-full z-0 sticky top-0">
      <SidebarContent {...props} />
    </aside>
  );
}