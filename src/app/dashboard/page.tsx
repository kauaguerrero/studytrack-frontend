import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar } from "lucide-react";
import { TaskItem } from "@/components/dashboard/TaskItem"; 
import { Logo } from "@/components/Logo";

export default async function Dashboard() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('whatsapp_phone, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.whatsapp_phone) redirect('/onboarding/telefone');

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
    .limit(10);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 hidden sm:block">
            {profile.full_name?.split(' ')[0]}
          </span>
          <form action="/auth/signout" method="post">
             <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Sair">
                <LogOut size={20} />
             </button>
          </form>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <header className="mt-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Seu Plano de Estudos</h2>
          <p className="text-slate-500 mt-1">Acompanhe seu progresso diário.</p>
        </header>

        <div className="space-y-3">
          {tasks && tasks.length > 0 ? (
            tasks.map((task: any) => (
              <TaskItem key={task.id} task={task} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500">Nenhuma tarefa encontrada.</p>
              <p className="text-sm text-slate-400">Fale com o suporte para gerar seu plano.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}