import { getClassroomDetails, getClassroomStudents } from "../../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClassroomActions } from "./ClassroomActions";
import { StudentListContainer } from "./StudentListContainer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: PageProps) {
  // 1. Resolve os parâmetros (Next 15)
  const resolvedParams = await params;
  const classroomId = resolvedParams.id;

  // 2. Busca dados em paralelo para máxima performance
  const [classroom, students] = await Promise.all([
    getClassroomDetails(classroomId),
    getClassroomStudents(classroomId)
  ]);

  // Se a turma não existir, 404
  if (!classroom) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      {/* --- Header da Turma --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <Link 
            href="/portal/teacher" 
            className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-2 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar para Painel
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            {classroom.name}
            <span className="text-sm font-normal bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                {classroom.year}
            </span>
          </h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            {classroom.school?.name} • Código: 
            <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-bold select-all border border-slate-200">
              {classroom.invite_code}
            </code>
          </p>
        </div>

        {/* Ações da Turma (Modal de Atividades) */}
        <ClassroomActions 
            classroomId={classroom.id} 
            classroomName={classroom.name} 
        />
      </div>

      {/* --- Container de Alunos (Client Side para Toggle List/Grid) --- */}
      {/* Passamos os dados buscados no servidor para o cliente renderizar */}
      <StudentListContainer students={students} />
      
    </div>
  );
}