import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, CheckCircle2, Circle, Calendar } from "lucide-react";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Zera as horas para comparar apenas dia/mês/ano
  date.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  tomorrow.setHours(0,0,0,0);

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

  // 2. Buscar Tarefas Reais (Ordenadas por data)
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
    .limit(10); // Pega as próximas 10 para não poluir

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">ST</div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">StudyTrack</h1>
        </div>
        <div className="flex items-center gap-4">
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
        
        {/* Header do Dia */}
        <header className="mt-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Seu Plano de Estudos</h2>
          <p className="text-slate-500 mt-1">Acompanhe seu progresso diário.</p>
        </header>

        {/* Lista de Tarefas */}
        <div className="space-y-3">
          {tasks && tasks.length > 0 ? (
            /* --- A CORREÇÃO ESTÁ AQUI: (task: any) --- */
            tasks.map((task: any) => {
              const isDone = task.status === 'completed';
              const isToday = formatDate(task.scheduled_date) === "Hoje";
              
              /* Verifica se content_repository existe e se é uma lista (array) ou objeto */
              /* O Supabase às vezes retorna array mesmo sendo um item só */
              const content = Array.isArray(task.content_repository) 
                ? task.content_repository[0] 
                : task.content_repository;

              return (
                <div 
                  key={task.id} 
                  className={`group bg-white p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                    isDone ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'
                  } ${isToday && !isDone ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
                >
                  {/* Ícone de Status */}
                  <div className={`mt-1 ${isDone ? 'text-green-500' : 'text-slate-300 group-hover:text-blue-500'}`}>
                    {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Calendar size={10} className="inline mr-1 mb-0.5" />
                        {formatDate(task.scheduled_date)}
                      </span>
                    </div>
                    
                    <h3 className={`font-medium text-lg leading-snug ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {task.task_description}
                    </h3>

                    {/* Link do Conteúdo (Tratado) */}
                    {content && (
                      <a 
                        href={content.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                      >
                        🔗 {content.title}
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">Nenhuma tarefa encontrada.</p>
              <p className="text-sm text-slate-400">Fale com o suporte para gerar seu plano.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}