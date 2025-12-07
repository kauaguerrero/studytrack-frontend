import { createClient } from "@/lib/supabase/server";
import { LogOut, Calendar, Trophy, BarChart3, CheckCircle2, XCircle, BookOpen, Timer, Sparkles } from "lucide-react";
import { TaskCard } from "./task-card";
import Link from "next/link";

// Utilitário de Data (Mantido)
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return "Hoje";
  if (date.getTime() === tomorrow.getTime()) return "Amanhã";
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default async function Dashboard() {
  const supabase = await createClient();

  // MODO TESTE HARDCODED (Para desenvolvimento)
  const user = { id: "123e4567-e89b-12d3-a456-426614174000" };
  const profile = { full_name: "Igor (Elite Dev)", whatsapp_phone: "5516996973320" };

  // 2. Tarefas da Semana
  const { data: tasks } = await supabase
    .from('plan_tasks')
    .select(`
      id, task_description, scheduled_date, status,
      content_repository ( title, url, content_type )
    `)
    .eq('user_id', user.id)
    .gte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .limit(5);

  // 3. Histórico de Questões (ATUALIZADO PARA LER METADATA)
  const { data: history } = await supabase
    .from('user_answers')
    .select(`
      id, is_correct, created_at,
      questions ( subject, exam_year, statement, metadata )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Estatísticas
  const { count: totalAnswered } = await supabase
    .from('user_answers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: totalCorrect } = await supabase
    .from('user_answers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_correct', true);

  const accuracy = totalAnswered ? Math.round((totalCorrect! / totalAnswered!) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200">ST</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">StudyTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 hidden sm:block">
            {profile.full_name?.split(' ')[0]}
          </span>
          <form action="/auth/signout" method="post">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-4">

        {/* Cards de Acesso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Plano de Estudos</h3>
            <p className="text-sm text-slate-500 mt-1">Sua programação diária.</p>
          </div>

          <Link href="/banco-de-questoes" className="group">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-300 hover:shadow-md transition-all h-full cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BookOpen size={64} className="text-purple-600" />
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Banco de Questões</h3>
              <p className="text-sm text-slate-500 mt-1">Pratique por matéria com IA.</p>
              <span className="text-xs font-bold text-purple-600 mt-4 inline-block group-hover:underline">Acessar agora →</span>
            </div>
          </Link>

          <Link href="/simulado" className="group">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-green-300 hover:shadow-md transition-all h-full cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Timer size={64} className="text-green-600" />
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Simulado</h3>
              <p className="text-sm text-slate-500 mt-1">Modo prova cronometrado.</p>
              <span className="text-xs font-bold text-green-600 mt-4 inline-block group-hover:underline">Iniciar →</span>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tarefas */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              Próximas Tarefas
            </h2>
            <div className="space-y-3">
              {tasks && tasks.length > 0 ? (
                tasks.map((task: any) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isToday={formatDate(task.scheduled_date) === "Hoje"}
                    displayDate={formatDate(task.scheduled_date)}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <p>Tudo limpo por hoje! 🎉</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats & Histórico */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-30"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-blue-200">
                  <Trophy size={18} />
                  <span className="font-bold uppercase text-xs tracking-wider">Precisão Global</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold">{accuracy}%</span>
                  <span className="text-sm text-slate-400">de acertos</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400 flex justify-between">
                  <span>Respondidas:</span>
                  <span className="font-bold text-white">{totalAnswered || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                Atividade Recente
              </h3>

              <div className="space-y-4">
                {history && history.length > 0 ? (
                  history.map((h: any) => {
                    // Extrai o tópico da IA do campo metadata (se existir)
                    const aiTopic = h.questions?.metadata?.ai_topic;

                    return (
                      <div key={h.id} className="flex gap-3 items-start border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                        <div className={`mt-1 flex-shrink-0 ${h.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                          {h.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 tracking-wide flex items-center gap-1">
                            {h.questions?.subject || "Geral"}
                            {aiTopic && aiTopic !== "Geral" && (
                              <span className="text-purple-500 flex items-center gap-0.5">
                                • {aiTopic}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
                            {h.questions?.statement || "Questão indisponível"}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-sm text-slate-400 text-center py-4">
                    Nenhuma questão respondida.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}