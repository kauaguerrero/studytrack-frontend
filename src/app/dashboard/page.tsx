import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Trophy, BarChart3, CheckCircle2, XCircle, BookOpen, Timer, WifiOff } from "lucide-react";
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
  
  try {
    // 1. Autenticação e Perfil
    // Timeout manual para não travar o servidor por 10s se a rede estiver ruim
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) redirect('/auth/login');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp_phone, full_name, handshake_completed')
      .eq('id', user.id)
      .single();

    // Se der erro de conexão aqui, vai pro catch
    if (profileError && profileError.code !== 'PGRST116') throw profileError;

    // Redirecionamento de Onboarding
    if (!profile?.whatsapp_phone) redirect('/onboarding/objetivo');

    // Se tiver telefone mas não confirmou o handshake, manda pra sala de espera
    if (!profile?.handshake_completed) {
      redirect('/onboarding/handshake');
    }

    // 2. Buscas em Paralelo (Performance: roda tudo ao mesmo tempo)
    const todayStr = new Date().toISOString().split('T')[0];

    const [tasksRes, historyRes, totalAnsweredRes, totalCorrectRes] = await Promise.all([
      // Tarefas
      supabase
        .from('plan_tasks')
        .select(`
          id, task_description, scheduled_date, status,
          content_repository ( title, url, content_type )
        `)
        .eq('user_id', user.id)
        .gte('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true })
        .limit(5),

      // Histórico
      supabase
        .from('user_answers')
        .select(`
          id, is_correct, created_at,
          questions ( subject, exam_year, statement )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),

      // Contagem Total
      supabase
        .from('user_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Contagem Acertos
      supabase
        .from('user_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_correct', true)
    ]);

    const tasks = tasksRes.data || [];
    const history = historyRes.data || [];
    const totalAnswered = totalAnsweredRes.count || 0;
    const totalCorrect = totalCorrectRes.count || 0;
    const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
        {/* Navbar Simplificada */}
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
                <p className="text-sm text-slate-500 mt-1">Pratique por matéria.</p>
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
              {/* Widget de Estatística */}
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

              {/* Histórico Recente */}
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
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 tracking-wide">
                            {h.questions?.subject || "Geral"} • {h.questions?.exam_year || "ENEM"}
                          </p>
                          <p className="text-sm text-slate-800 line-clamp-2 leading-snug">
                            {h.questions?.statement || "Questão indisponível"}
                          </p>
                        </div>
                      </div>
                    ))
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

  } catch (err: any) {
    // IMPORTANTE: Em Next.js server components, 'redirect' lança um erro que precisa ser relançado.
    // Se não relançar, o redirecionamento falha.
    if (err.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }

    console.error("Erro crítico no Dashboard:", err);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="text-red-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Conexão Instável</h2>
          <p className="text-slate-500 mb-6">Não conseguimos conectar ao banco de dados. Verifique sua internet e tente novamente.</p>
          <a href="/dashboard" className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
            Tentar Novamente
          </a>
        </div>
      </div>
    );
  }
}