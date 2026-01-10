import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { PortalSidebar } from '@/components/layout/PortalSidebar';
import { UserRole } from '@/types/roles';

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Busca do Banco para saber qual Sidebar mostrar
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as UserRole) || (user.user_metadata?.role as UserRole) || 'student';
  const fullName = profile?.full_name || user.user_metadata?.full_name || 'Usuário';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="flex h-screen w-full bg-[#F0F4F8] text-slate-900">
      <PortalSidebar role={role} fullName={fullName} avatarUrl={avatarUrl} />

      <main className="flex-1 overflow-y-auto h-full relative flex flex-col">
        {/* Header Mobile */}
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-6 md:hidden flex-shrink-0 sticky top-0 z-30">
            <span className="font-bold text-blue-600 text-lg">StudyTrack</span>
            <div className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wide">
                {role === 'manager' ? 'Gestão' : role === 'teacher' ? 'Docente' : 'Aluno'}
            </div>
        </header>
        
        <div className="flex-1 p-4 md:p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}