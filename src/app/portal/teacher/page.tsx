import { getTeacherClasses } from "./actions";
import Link from "next/link";
import { BookOpen, Calendar, GraduationCap, School, Users, ArrowRight, AlertCircle } from "lucide-react";

export default async function TeacherDashboard() {
  // Busca os dados no servidor
  const classes = await getTeacherClasses();
  
  // Verifica se NÃO tem dados (Early Return)
  // Isso elimina a complexidade do ternário e resolve o erro de sintaxe visual
  const hasClasses = classes && classes.length > 0;

  if (!hasClasses) {
    return (
      <div className="space-y-8">
         <HeaderSection />
         <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center mt-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <GraduationCap className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Nenhuma turma encontrada</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              Você ainda não está vinculado a nenhuma turma no sistema. Entre em contato com o coordenador.
            </p>
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                <AlertCircle size={16} />
                <span>Dica: Verifique a tabela <code>teacher_classrooms</code> no banco.</span>
            </div>
          </div>
      </div>
    );
  }

  // Se chegou aqui, é porque TEM turmas. Renderiza a lista limpa.
  return (
    <div className="space-y-8">
      <HeaderSection />

      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <School className="text-blue-500" size={20} />
            Minhas Turmas Ativas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((item) => (
            <div key={item.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {item.subject}
                    </div>
                    <span className="text-slate-400 text-xs font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
                      {item.classroom.year}
                    </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {item.classroom.name}
                </h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-4">
                  <School size={14} />
                  {item.classroom.school?.name || "Escola não definida"}
                </p>

                <div className="flex items-center gap-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5" title="Alunos Matriculados">
                      <Users size={16} className="text-slate-400" />
                      <span className="font-semibold">--</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Tarefas Pendentes">
                      <BookOpen size={16} className="text-slate-400" />
                      <span className="font-semibold">--</span>
                  </div>
                </div>
              </div>

              <Link 
                href={`/portal/teacher/classes/${item.classroom.id}`}
                className="bg-slate-50 border-t border-slate-100 p-3 text-center text-sm font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Gerenciar Turma <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Componente auxiliar para evitar repetição de código
function HeaderSection() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel do Professor</h1>
        <p className="text-slate-500">Gerencie suas turmas e acompanhe o progresso dos alunos.</p>
      </div>
      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm shadow-blue-200">
          <Calendar size={18} />
          Novo Agendamento
      </button>
    </div>
  );
}