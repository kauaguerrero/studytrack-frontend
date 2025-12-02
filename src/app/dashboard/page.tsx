import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Trophy, BarChart3, CheckCircle2, XCircle, BookOpen, Timer } from "lucide-react";
import { TaskCard } from "./task-card";
import Link from "next/link";

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

  // 1. Verificação de Auth
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
    .limit(5);

  // 3. Buscar Histórico (Adaptado para a nova tabela 'user_answers')
  const { data: history } = await supabase
    .from('user_answers')
    .select(`
      id,
      is_correct,
      created_at,
      questions (
        subject,
        exam_year,
        statement
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Calcular Estatísticas
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-blue-200">ST</div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block tracking-tight">StudyTrack</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600 hidden sm:block">
            Olá, {profile.full_name?.split(' ')[0]}
          </span>
          <form action="/auth/signout" method="post">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Sair">
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-4">

        {/* --- SEÇÃO 1: ACESSO RÁPIDO (Cards Coloridos) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Plano */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-blue-200 transition-all">
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Plano Semanal</h3>
              <p className="text-sm text-slate-500 mt-1">Visualize suas metas de hoje.</p>
            </div>
          </div>

          {/* Card Banco de Questões */}
          <Link href="/banco-de-questoes">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-purple-300 hover:shadow-md transition-all h-full group">
              <div>
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Banco de Questões</h3>
                <p className="text-sm text-slate-500 mt-1">Filtre por matéria e resolva.</p>
              </div>
              <div className="mt-4 text-purple-600 text-sm font-bold flex items-center gap-1">
                Acessar <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* Card Simulados */}
          <Link href="/simulado">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:border-green-300 hover:shadow-md transition-all h-full group">
              <div>
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                  <Timer className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Gerar Simulado</h3>
                <p className="text-sm text-slate-500 mt-1">Modo prova com cronômetro.</p>
              </div>
              <div className="mt-4 text-green-600 text-sm font-bold flex items-center gap-1">
                Iniciar <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUNA ESQUERDA: Tarefas */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Sua Jornada Hoje</h2>
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
                  <p>Nenhuma tarefa pendente para hoje.</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: Desempenho */}
          <div className="space-y-6">
            {/* Card Stats */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-blue-200">
                  <Trophy size={20} />
                  <span className="font-bold uppercase text-xs tracking-wider">Precisão</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold">{accuracy}%</span>
                  <span className="text-sm text-slate-400">de acertos</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Total respondido: <strong>{totalAnswered || 0}</strong> questões
                </p>
              </div>
            </div>

            {/* Lista Recente */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-slate-500" />
                Atividade Recente
              </h3>

              <div className="space-y-4">
                {history && history.length > 0 ? (
                  history.map((h: any) => (
                    <div key={h.id} className="flex gap-3 items-start border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                      <div className={`mt-1 flex-shrink-0 ${h.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                        {h.is_correct ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500 uppercase mb-0.5">
                          {/* Tratamento para evitar erro se questions for null */}
                          {h.questions?.subject || "Geral"} • {h.questions?.exam_year || "ENEM"}
                        </p>
                        <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
                          {h.questions?.statement || "Questão sem enunciado disponível."}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                    Nenhuma questão respondida ainda.
                    <br />
                    <Link href="/banco-de-questoes" className="text-blue-600 hover:underline mt-1 inline-block">
                      Resolver agora
                    </Link>
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