import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import Link from 'next/link';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const role = user.user_metadata?.role || 'student';
  const fullName = user.user_metadata?.full_name || 'Usuário';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="flex h-screen w-full bg-slate-50">
      
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r hidden md:flex flex-col h-full shadow-sm z-10">
         <div className="p-6 border-b">
            <h1 className="font-bold text-xl text-blue-600 flex items-center gap-2">
              StudyTrack
            </h1>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">
              Área do {role === 'manager' ? 'Gestor' : role === 'teacher' ? 'Professor' : 'Aluno'}
            </span>
         </div>
         
         <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Menu ALUNO */}
            {role === 'student' && (
              <>
                <Link href="/portal/student/dashboard" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>📊</span> Dashboard
                </Link>
                <Link href="/portal/student/simulado" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>📝</span> Simulados
                </Link>
                <Link href="/portal/student/banco-de-questoes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>📚</span> Questões
                </Link>
              </>
            )}

            {/* Menu PROFESSOR */}
            {role === 'teacher' && (
              <>
                <Link href="/portal/teacher" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>👨‍🏫</span> Minhas Turmas
                </Link>
                {/* Links futuros para tarefas */}
              </>
            )}

            {/* Menu GESTOR */}
            {role === 'manager' && (
              <>
                <Link href="/portal/manager" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>📈</span> Visão Geral
                </Link>
                <Link href="/portal/manager/students" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                   <span>👥</span> Alunos
                </Link>
              </>
            )}
         </nav>

         {/* Rodapé da Sidebar (User Profile) */}
         <div className="p-4 border-t bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden border border-blue-200">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{fullName}</p>
                <form action="/auth/signout" method="post">
                   <button className="text-xs text-red-500 hover:text-red-700 font-medium">Sair</button>
                </form>
              </div>
            </div>
         </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto h-full relative flex flex-col">
        {/* Header Mobile (aparece só em telas pequenas) */}
        <header className="bg-white h-16 border-b flex items-center justify-between px-6 md:hidden flex-shrink-0">
            <span className="font-bold text-blue-600">StudyTrack</span>
            <div className="text-xs bg-slate-100 px-2 py-1 rounded capitalize">{role}</div>
        </header>
        
        <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}