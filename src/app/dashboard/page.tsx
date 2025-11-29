import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Trophy, BarChart3, XCircle, CheckCircle2 } from "lucide-react";
import { TaskCard } from "./task-card"; // <--- IMPORTAÇÃO DESCOMENTADA E CORRIGIDA
import Link from "next/link"; // Adicionado para o botão de acesso ao banco

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
    .limit(5);

  const { data: history } = await supabase
    .from('user_question_history')
    .select(`
      id,
      is_correct,
      answered_at,
      question_bank (
        subject,
        topic,
        difficulty,
        question_text
      )
    `)
    .eq('user_id', user.id)
    .order('answered_at', { ascending: false })
    .limit(10);

  const { count: totalAnswered } = await supabase
    .from('user_question_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: totalCorrect } = await supabase
    .from('user_question_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_correct', true);

  const accuracy = totalAnswered ? Math.round((totalCorrect! / totalAnswered!) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">ST</div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">StudyTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">
            Olá, {profile.full_name?.split(' ')[0]}
          </span>
          <form action="/auth/signout" method="post">
             <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Sair">
                <LogOut size={20} />
             </button>
          </form>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        <div className="lg:col-span-2 space-y-6">
          <header>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Plano de Hoje
            </h2>
            <p className="text-slate-500 mt-1">Mantenha o ritmo para garantir sua aprovação.</p>
          </header>

          <div className="space-y-3">
            {tasks && tasks.length > 0 ? (
              tasks.map((task: any) => {
                const isToday = formatDate(task.scheduled_date) === "Hoje";
                
                return (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    isToday={isToday} 
                    displayDate={formatDate(task.scheduled_date)} 
                  />
                );
              })
            ) : (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                Sem tarefas pendentes.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4 text-blue-200">
                <Trophy size={20} />
                <span className="font-bold uppercase text-xs tracking-wider">Desempenho Geral</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold">{accuracy}%</span>
                <span className="text-sm text-slate-400">de acertos</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Você respondeu <strong>{totalAnswered || 0}</strong> questões via WhatsApp.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              Últimas Questões
            </h3>
            
            <div className="space-y-4">
              {history && history.length > 0 ? (
                history.map((h: any) => (
                  <div key={h.id} className="flex gap-3 items-start border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                    <div className={`mt-0.5 ${h.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                      {h.is_correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">
                        {h.question_bank?.subject} • {h.question_bank?.difficulty}
                      </p>
                      <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
                        {h.question_bank?.question_text}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  Ainda não respondeu nenhuma questão no WhatsApp.
                </p>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100">
                <Link href="/banco-de-questoes" className="flex items-center justify-center w-full py-3 text-sm text-white font-bold bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md">
                  Acessar Banco Completo
                </Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}