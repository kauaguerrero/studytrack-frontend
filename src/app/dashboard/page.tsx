import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { TaskCard } from "./task-card";

function formatDate(dateStr: string) {
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split('-').map(Number);
  
  const date = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === tomorrow.getTime()) return "Amanhã";
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Verificação de Auth e Onboarding
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('whatsapp_phone, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.whatsapp_phone) redirect('/onboarding/telefone');

  // 2. Buscar Tarefas
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select(`
      id, 
      task_description, 
      scheduled_date, 
      status,
      content_repository ( title, url, content_type )
    `)
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true })
    .limit(20);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200">ST</div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block tracking-tight">StudyTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 hidden sm:block">
            Olá, {profile.full_name?.split(' ')[0]}
          </span>
          <form action="/auth/signout" method="post">
             <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-400 transition-colors" title="Sair">
                <LogOut size={20} />
             </button>
          </form>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8">
        
        {/* Header do Dia */}
        <header className="mt-4 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Seu Plano de Estudos</h2>
          <p className="text-slate-500 mt-2 text-lg">Foco no dia de hoje para manter o ritmo.</p>
        </header>

        {/* Lista de Tarefas */}
        <div className="space-y-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task: any) => {
              const dateLabel = formatDate(task.scheduled_date);
              const isToday = dateLabel === "Hoje";

              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  isToday={isToday} 
                  displayDate={dateLabel}
                />
              );
            })
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-slate-900 font-medium text-lg">Tudo limpo por aqui!</p>
              <p className="text-slate-500">Você não tem tarefas pendentes.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}