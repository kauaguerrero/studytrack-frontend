import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogOut, Calendar, Trophy, BarChart3, CheckCircle2, XCircle, BookOpen, Timer, Sparkles, Zap, ArrowRight } from "lucide-react";
import { TaskCard } from "./task-card";
import Link from "next/link";
import { SubscriptionLock } from "@/components/dashboard/SubscriptionLock"; // Importando o novo componente

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) redirect('/auth/login');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('whatsapp_phone, full_name, handshake_completed, plan_tier, subscription_status')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    if (!profile?.whatsapp_phone) redirect('/onboarding/objetivo');

    // Se tiver telefone mas não confirmou o handshake, manda pra sala de espera
    if (!profile?.handshake_completed) {
      redirect('/portal/onboarding/handshake');
    }

    const firstName = profile.full_name?.split(' ')[0] || "Estudante";
    
    // =========================================================================
    // LÓGICA LOCK-WALL (BLOQUEIO DE PAGAMENTO)
    // =========================================================================
    const plan = profile.plan_tier || 'free';
    const status = profile.subscription_status || 'inactive';
    
    // Se não for Free e não estiver Ativo, exibe o Lock e para renderização do conteúdo
    if (plan !== 'free' && status !== 'active') {
        return (
            <SubscriptionLock planTier={plan} userName={firstName} />
        );
    }
    // =========================================================================

    // 2. Buscas em Paralelo (Performance: roda tudo ao mesmo tempo)
    const todayStr = new Date().toISOString().split('T')[0];

    const [tasksRes, historyRes, totalAnsweredRes, totalCorrectRes] = await Promise.all([
      supabase.from('plan_tasks')
        .select(`id, task_description, scheduled_date, status, content_repository ( title, url, content_type )`)
        .eq('user_id', user.id).gte('scheduled_date', todayStr).order('scheduled_date', { ascending: true }).limit(5),
      supabase.from('user_answers')
        .select(`id, is_correct, created_at, questions ( subject, exam_year, statement )`)
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_answers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_answers').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_correct', true)
    ]);

    const tasks = tasksRes.data || [];
    const history = historyRes.data || [];
    const totalAnswered = totalAnsweredRes.count || 0;
    const totalCorrect = totalCorrectRes.count || 0;
    const accuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    
    return (
      <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900 pb-20 relative selection:bg-blue-100 selection:text-blue-700">
        
        {/* Background Decoration */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-200/40 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000"></div>
        </div>

        {/* Navbar */}
        <nav className="sticky top-0 z-40 px-4 pt-4 pb-2">
            <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl px-5 py-3 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                        <Zap size={18} className="fill-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">StudyTrack</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Dashboard</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-slate-600 hidden sm:block bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        Olá, {firstName} 👋
                    </span>
                    <form action="/auth/signout" method="post">
                        <button className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400 transition-all active:scale-95">
                            <LogOut size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-2 relative z-10">

          {/* Cards de Acesso Rápido - NIVELADOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Card 1: Plano */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden group hover:border-sky-200 hover:shadow-sky-100/50 hover:shadow-lg transition-all duration-300">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
                 <Calendar size={100} className="text-sky-600" />
               </div>
               <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-sky-100 transition-colors duration-300">
                 <Calendar className="w-6 h-6 text-sky-600" />
               </div>
               <h3 className="font-bold text-lg text-slate-800 mb-1">Plano de Estudos</h3>
               <p className="text-sm text-slate-500">Sua agenda diária e metas.</p>
            </div>

            {/* Card 2: Banco (Agora nivelado, mas com identidade Azul Forte) */}
            <Link href="/banco-de-questoes" className="group col-span-1 md:col-span-1">
              <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden h-full group hover:border-blue-200 hover:shadow-blue-100/50 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
                  <BookOpen size={100} className="text-blue-600" />
                </div>
                
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors duration-300">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-1">Banco de Questões</h3>
                <p className="text-sm text-slate-500 mb-2">Pratique por matéria e tópico.</p>
                
                <span className="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    Acessar <ArrowRight size={12} />
                </span>
              </div>
            </Link>

            {/* Card 3: Simulado */}
            <Link href="/simulado" className="group">
              <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden h-full group hover:border-emerald-200 hover:shadow-emerald-100/50 hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
                  <Timer size={100} className="text-emerald-600" />
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors duration-300">
                  <Timer className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800">Modo Simulado</h3>
                <p className="text-sm text-slate-500 mb-2">Treine contra o relógio.</p>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    Iniciar Prova <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Esquerda: Tarefas */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Calendar size={18} />
                    </span>
                    Suas Missões
                </h2>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                    Hoje: {new Date().toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="space-y-4">
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
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-[1.5rem] border border-dashed border-slate-200">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Sparkles className="text-slate-400" size={20} />
                    </div>
                    <p className="text-slate-500 font-medium">Tudo limpo por hoje! 🎉</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Stats */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6 text-slate-300">
                    <Trophy size={16} className="text-yellow-400" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Precisão Global</span>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">{accuracy}%</span>
                    <span className="text-sm text-slate-400 font-medium mb-2">de acertos</span>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 text-sm flex justify-between items-center">
                    <span className="text-slate-400">Questões Realizadas</span>
                    <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{totalAnswered || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5 text-sm uppercase tracking-wide">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Atividade Recente
                </h3>

                <div className="space-y-1">
                  {history && history.length > 0 ? (
                    history.map((h: any) => (
                      <div key={h.id} className="flex gap-3 items-center p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${h.is_correct ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                          {h.is_correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-wide">{h.questions?.subject || "Geral"}</p>
                          <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">{h.questions?.statement || "Questão indisponível"}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-400 text-center py-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
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
    if (err.digest?.startsWith('NEXT_REDIRECT')) throw err;
    console.error("Erro Dashboard:", err);
    return (<div className="flex justify-center p-10">Erro de conexão.</div>);
  }
}