'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  BookOpen, 
  Users, 
  School, 
  BarChart, 
  LogOut,
  Settings,
  GraduationCap,
  ChevronRight,
  LifeBuoy
} from 'lucide-react';
import { UserRole } from '@/types/roles';

interface PortalSidebarProps {
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
}

export function PortalSidebar({ role, fullName, avatarUrl }: PortalSidebarProps) {
  const pathname = usePathname();

  // UX: Esconde a sidebar durante o onboarding para foco total
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
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
          active 
            ? 'bg-blue-50/80 text-blue-700 shadow-sm' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <Icon 
          size={18} 
          className={`transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} 
        />
        <span>{label}</span>
        {active && <ChevronRight size={14} className="ml-auto text-blue-400" />}
      </Link>
    );
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 mt-6 mb-2">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">
        {children}
      </span>
    </div>
  );

  return (
    <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col h-full z-20">
      
      {/* --- HEADER --- */}
      <div className="p-5 pb-2">
        <Link href="/" className="group flex items-center gap-2.5 mb-6 w-fit transition-opacity hover:opacity-80">
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/20">
            <BookOpen size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">
              StudyTrack
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
               <span className={`inline-block w-2 h-2 rounded-full ${role === 'student' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
               <span className="text-[11px] font-medium text-slate-500 capitalize leading-none">
                  {role === 'manager' ? 'Gestão' : role === 'teacher' ? 'Docente' : 'Área do Aluno'}
               </span>
            </div>
          </div>
        </Link>
      </div>
      
      {/* --- NAVIGATION --- */}
      <nav className="flex-1 px-4 pb-4 overflow-y-auto custom-scrollbar">
        
        {/* MENU ALUNO */}
        {role === 'student' && (
          <div className="space-y-0.5">
            <SectionTitle>Estudos</SectionTitle>
            <NavItem href="/portal/student/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem href="/portal/student/simulado" icon={FileText} label="Simulados" />
            <NavItem href="/portal/student/banco-de-questoes" icon={BookOpen} label="Banco de Questões" />
            
            <SectionTitle>Performance</SectionTitle>
            <NavItem href="/portal/student/analytics" icon={BarChart} label="Meu Desempenho" />
          </div>
        )}

        {/* MENU PROFESSOR */}
        {role === 'teacher' && (
          <div className="space-y-0.5">
            <SectionTitle>Sala de Aula</SectionTitle>
            <NavItem href="/portal/teacher" icon={School} label="Minhas Turmas" />
            <NavItem href="/portal/teacher/students" icon={Users} label="Alunos e Notas" />
            
            <SectionTitle>Conteúdo</SectionTitle>
            <NavItem href="/portal/teacher/assignments" icon={FileText} label="Tarefas e Listas" />
          </div>
        )}

        {/* MENU GESTOR */}
        {role === 'manager' && (
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
        <div className="mt-8 border-t border-slate-100 pt-4 space-y-0.5">
           <NavItem href="/portal/support" icon={LifeBuoy} label="Ajuda e Suporte" />
        </div>
      </nav>

      {/* --- USER FOOTER --- */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group cursor-default">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-blue-700 font-bold overflow-hidden border border-slate-200 shadow-sm shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{fullName.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
            <form action="/auth/signout" method="post">
                <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 font-medium transition-colors mt-0.5 w-full text-left">
                    Sair da conta
                </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}