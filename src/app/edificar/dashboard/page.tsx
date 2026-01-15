import { LogOut, Calendar, Trophy, BarChart3, CheckCircle2, XCircle, BookOpen, Timer, Sparkles, Zap, ArrowRight, LayoutDashboard } from "lucide-react";
import { TaskCard } from "./task-card"; // Certifique-se que este componente existe ou comente se der erro
import Link from "next/link";

export default function Dashboard() {
  // =========================================================================
  // DADOS MOCKADOS (ESTÁTICOS) PARA VISUALIZAÇÃO
  // =========================================================================
  const firstName = "Igor";
  
  // Mock de Tarefas
  const tasks = [
    {
      id: 1,
      task_description: "Revisar Padrões de Projeto (Singleton)",
      scheduled_date: new Date().toISOString().split('T')[0], // Hoje
      status: "pending",
      content_repository: { title: "Dev.to Article", url: "#", content_type: "article" }
    },
    {
      id: 2,
      task_description: "Implementar Middleware no Next.js",
      scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Amanhã
      status: "pending",
      content_repository: { title: "Documentação Oficial", url: "#", content_type: "doc" }
    }
  ];

  // Mock de Histórico
  const history = [
    { id: 1, is_correct: true, created_at: new Date().toISOString(), questions: { subject: "Backend", title: "Conceitos de API RESTful" } },
    { id: 2, is_correct: false, created_at: new Date().toISOString(), questions: { subject: "Frontend", title: "Ciclo de Vida React" } },
    { id: 3, is_correct: true, created_at: new Date().toISOString(), questions: { subject: "Database", title: "Normalização SQL" } },
  ];

  const totalAnswered = 142;
  const accuracy = 78;

  // Utilitário de Data Simples
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return "Hoje";
    return dateStr.split('-').reverse().slice(0, 2).join('/');
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-slate-900 pb-20 relative selection:bg-orange-100 selection:text-orange-700">
      
      {/* Background Decoration (Laranja/Amber) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-200/40 rounded-full blur-3xl opacity-40 mix-blend-multiply animate-blob"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-200/40 rounded-full blur-3xl opacity-40 mix-blend-multiply animate-blob animation-delay-2000"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-40 px-4 pt-4 pb-2">
          <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl px-5 py-3 flex justify-between items-center transition-all">
              <div className="flex items-center gap-3">
                  {/* Logo Edificar: Laranja */}
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20">
                      <LayoutDashboard size={18} className="text-white" />
                  </div>
                  <div>
                      <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Edificar</h1>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Student Portal</p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-slate-600 hidden sm:block bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                      Olá, {firstName} 👋
                  </span>
                  <button className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl text-slate-400 transition-all active:scale-95">
                      <LogOut size={18} />
                  </button>
              </div>
          </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-2 relative z-10">

        {/* Cards de Acesso Rápido - NIVELADOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Plano (Laranja) */}
          <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden group hover:border-orange-200 hover:shadow-orange-100/50 hover:shadow-lg transition-all duration-300">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
               <Calendar size={100} className="text-orange-600" />
             </div>
             <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors duration-300">
               <Calendar className="w-6 h-6 text-orange-600" />
             </div>
             <h3 className="font-bold text-lg text-slate-800 mb-1">Plano de Estudos</h3>
             <p className="text-sm text-slate-500">Sua agenda diária e metas.</p>
          </div>

          {/* Card 2: Banco (Laranja Forte / Preto) */}
          <Link href="/edificar/banco" className="group col-span-1 md:col-span-1">
            <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden h-full group hover:border-orange-200 hover:shadow-orange-100/50 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
                <BookOpen size={100} className="text-orange-600" />
              </div>
              
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors duration-300">
                  <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
              
              <h3 className="font-bold text-lg text-slate-800 mb-1">Banco de Questões</h3>
              <p className="text-sm text-slate-500 mb-2">Pratique por matéria e tópico.</p>
              
              <span className="text-xs font-bold text-orange-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                  Acessar <ArrowRight size={12} />
              </span>
            </div>
          </Link>

          {/* Card 3: Simulado (Preto/Dark com hover Laranja) */}
          <Link href="/edificar/simulados" className="group">
            <div className="bg-white p-6 rounded-[1.5rem] border border-white/60 shadow-sm relative overflow-hidden h-full group hover:border-slate-800 hover:shadow-slate-200 hover:shadow-lg transition-all duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-110 duration-500">
                <Timer size={100} className="text-slate-900" />
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                <Timer className="w-6 h-6 text-slate-900 group-hover:text-orange-400 transition-colors" />
              </div>
              <h3 className="font-bold text-lg text-slate-800">Modo Simulado</h3>
              <p className="text-sm text-slate-500 mb-2">Treine contra o relógio.</p>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
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
                  <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Calendar size={18} />
                  </span>
                  Suas Missões
              </h2>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">
                  Hoje: {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>

            <div className="space-y-4">
              {tasks.length > 0 ? (
                tasks.map((task: any) => (
                  // Assumindo que TaskCard aceita estilos ou se adapta, senão precisaria ajustar o componente filho também
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

          {/* Coluna Direita: Stats (Preto/Branco com Laranja) */}
          <div className="space-y-6">
            {/* Card Principal Stats - Preto */}
            <div className="bg-slate-950 text-white p-6 rounded-[1.5rem] shadow-xl shadow-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 text-slate-400">
                  <Trophy size={16} className="text-orange-500" />
                  <span className="font-bold uppercase text-[10px] tracking-widest">Precisão Global</span>
                </div>
                
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-6xl font-black tracking-tighter text-white">{accuracy}%</span>
                  <span className="text-sm text-slate-400 font-medium mb-2">de acertos</span>
                </div>
                
                <div className="pt-4 border-t border-white/10 text-sm flex justify-between items-center">
                  <span className="text-slate-400">Questões Realizadas</span>
                  <span className="font-mono font-bold text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded-md">{totalAnswered}</span>
                </div>
              </div>
            </div>

            {/* Lista Histórico */}
            <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-5 text-sm uppercase tracking-wide">
                <BarChart3 className="w-4 h-4 text-orange-500" />
                Atividade Recente
              </h3>

              <div className="space-y-1">
                {history.map((h: any) => (
                  <div key={h.id} className="flex gap-3 items-center p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${h.is_correct ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-500'}`}>
                      {h.is_correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-wide">{h.questions?.subject || "Geral"}</p>
                      <p className="text-xs font-medium text-slate-700 truncate group-hover:text-orange-600 transition-colors">
                          {h.questions?.title || "Questão indisponível"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}