import { getTeacherClasses } from "./actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server"; // <--- NECESSÁRIO
import { redirect } from "next/navigation"; // <--- NECESSÁRIO
import { DashboardNavbar } from "@/components/layout/navbar"; // <--- IMPORT DA NAVBAR

import { 
    Calendar, 
    GraduationCap, 
    School, 
    Users, 
    ArrowRight, 
    Brain,
    Target,
    Flame,
    Crown 
} from "lucide-react";

export default async function TeacherDashboard() {
  // 1. BUSCAR DADOS DO USUÁRIO (NECESSÁRIO PARA A NAVBAR)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) redirect('/auth/login');

  // Queries paralelas para performance
  const [{ data: profile }, classes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    getTeacherClasses(),
  ]);

  const fullName = profile?.full_name || "Docente";
  const firstName = fullName.split(' ')[0];
  const hasClasses = classes && classes.length > 0;

  // --- COMPONENTE INTERNO DE ERRO (Reutilizado) ---
  const EmptyState = () => (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center mt-8">
       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
           <GraduationCap className="text-slate-400" size={32} />
       </div>
       <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma turma encontrada</h3>
       <p className="text-slate-500 max-w-md mx-auto mb-6">
         Você ainda não está vinculado a nenhuma turma no sistema. Entre em contato com o coordenador.
       </p>
    </div>
  );

  // --- CÁLCULO DO TOP 1 ---
  let bestClassId: string | null = null;
  let highestScore = -1;

  if (hasClasses) {
      classes.forEach(c => {
          const score = c.metrics.avg_quality + c.metrics.avg_adherence;
          if (c.classroom.total_students > 0 && score > highestScore) {
              highestScore = score;
              bestClassId = c.id;
          }
      });
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-700">
      
      {/* NAVBAR UNIVERSAL - Configurada para Professor */}
      <DashboardNavbar 
        firstName={firstName} 
        fullName={fullName} 
        userRole="teacher" 
      />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8 mt-2">
        <HeaderSection />

        {!hasClasses ? (
          <EmptyState />
        ) : (
          <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <School className="text-blue-500" size={20} />
                Minhas Turmas Ativas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((item) => {
                const isTop1 = item.id === bestClassId; 

                // --- LÓGICA DE SITUAÇÃO ---
                const { avg_quality, avg_adherence } = item.metrics;
                let statusColor = "bg-slate-100 text-slate-600 border-slate-200";
                let statusDot = "bg-slate-400";
                let statusText = "Sem dados";

                if (item.classroom.total_students > 0) {
                    if (avg_quality >= 70 && avg_adherence >= 70) {
                        statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        statusDot = "bg-emerald-500";
                        statusText = "Excelente";
                    } else if (avg_quality < 50 && avg_adherence < 50) {
                        statusColor = "bg-red-50 text-red-700 border-red-200";
                        statusDot = "bg-red-500";
                        statusText = "Crítico";
                    } else {
                        statusColor = "bg-amber-50 text-amber-700 border-amber-200";
                        statusDot = "bg-amber-500";
                        statusText = "Atenção";
                    }
                }

                return (
                    <div key={item.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col overflow-visible relative">
                    
                    {/* Badge Top 1 */}
                    {isTop1 && (
                        <div className="absolute -top-3 -right-3 z-10 animate-bounce-slow">
                            <div className="bg-gradient-to-br from-amber-300 to-yellow-500 text-white p-2 rounded-full shadow-lg border-2 border-white flex items-center justify-center" title="Turma Destaque">
                                <Crown size={20} fill="currentColor" className="drop-shadow-sm" />
                            </div>
                        </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                            <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {item.subject}
                            </div>
                            
                            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-bold ${statusColor}`}>
                                <div className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`}></div>
                                {statusText}
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors truncate pr-4">
                            {item.classroom.name}
                        </h3>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-5">
                            <School size={14} />
                            {item.classroom.school?.name || "Escola não definida"}
                        </p>

                        {/* Métricas Agregadas */}
                        <div className="grid grid-cols-3 gap-2 mb-5 mt-auto bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                            {/* Qualidade */}
                            <div className="flex flex-col items-center justify-center text-center">
                                <Brain size={16} className="text-purple-500 mb-1" />
                                <span className="text-sm font-bold text-slate-700">{item.metrics.avg_quality}%</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Qualidade</span>
                            </div>

                            {/* Aderência */}
                            <div className="flex flex-col items-center justify-center text-center border-l border-r border-slate-200/50">
                                <Target size={16} className="text-blue-500 mb-1" />
                                <span className="text-sm font-bold text-slate-700">{item.metrics.avg_adherence}%</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Aderência</span>
                            </div>

                            {/* Streak */}
                            <div className="flex flex-col items-center justify-center text-center">
                                <Flame size={16} className="text-orange-500 mb-1" />
                                <span className="text-sm font-bold text-slate-700">{item.metrics.avg_streak}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">Dias</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-1.5">
                                <Users size={16} className="text-slate-400" />
                                <span className="font-semibold">
                                    {item.classroom.total_students} <span className="font-normal text-slate-500">Alunos</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <Link 
                        href={`/portal/teacher/classes/${item.classroom.id}`}
                        className="bg-slate-50 border-t border-slate-100 p-3 text-center text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Acessar Turma <ArrowRight size={16} />
                    </Link>
                    </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel do Professor</h1>
        <p className="text-slate-500">Visão geral do desempenho de todas as suas turmas.</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-blue-200">
          <Calendar size={18} />
          Novo Agendamento
      </button>
    </div>
  );
}