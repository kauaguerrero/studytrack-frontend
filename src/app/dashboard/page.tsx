import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, CheckCircle2, Circle, Calendar, Trophy, BarChart3, XCircle } from "lucide-react";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  date.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  tomorrow.setHours(0,0,0,0);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === tomorrow.getTime()) return "Amanhã";
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default async function Dashboard() {
  const supabase = await createClient();

  // 1. Verificação de Auth
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('whatsapp_phone, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.whatsapp_phone) redirect('/onboarding/telefone');

  // 2. Buscar Tarefas (Do dia a dia)
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

  // 3. NOVO: Buscar Histórico de Questões (O "Banco" do usuário)
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
    .limit(10); // Últimas 10 respostas

  // 4. Calcular Estatísticas Rápidas
  // Nota: Em produção, isso deveria ser uma query count() no banco para não puxar tudo
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
      {/* Navbar */}
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
        
        {/* COLUNA ESQUERDA: Tarefas (Main Focus) */}
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
                const isDone = task.status === 'completed';
                const isToday = formatDate(task.scheduled_date) === "Hoje";
                const content = Array.isArray(task.content_repository) ? task.content_repository[0] : task.content_repository;

                return (
                  <div key={task.id} className={`group bg-white p-5 rounded-xl border transition-all duration-200 flex items-start gap-4 ${isDone ? 'opacity-75 border-slate-100' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                    <div className={`mt-1 ${isDone ? 'text-green-500' : 'text-slate-300'}`}>
                      {isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                          {formatDate(task.scheduled_date)}
                        </span>
                      </div>
                      <h3 className={`font-medium text-lg ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.task_description}
                      </h3>
                      {content && (
                        <a href={content.url} target="_blank" className="text-sm text-blue-600 hover:underline mt-1 block">
                          👉 {content.title}
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                Sem tarefas pendentes.
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Desempenho e Banco de Questões */}
        <div className="space-y-6">
          
          {/* Card de Stats */}
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

          {/* Lista Recente de Questões (O "Banco") */}
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
            
            {history && history.length > 0 && (
              <button className="w-full mt-4 py-2 text-sm text-blue-600 font-bold bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Ver Banco Completo
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}