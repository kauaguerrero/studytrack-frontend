import { getClassroomDetails, getClassroomStudents } from "../../actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Phone, Clock, MoreVertical } from "lucide-react";
import { ClassroomActions } from "./ClassroomActions"; // <--- Importante: Componente Client Side

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: PageProps) {
  // 1. Resolve os parâmetros assíncronos (Next.js 15 exige await em params)
  const resolvedParams = await params;
  const classroomId = resolvedParams.id;

  // 2. Busca dados em paralelo (Performance Pattern)
  const [classroom, students] = await Promise.all([
    getClassroomDetails(classroomId),
    getClassroomStudents(classroomId)
  ]);

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
            {classroom.school?.name} • Código de Convite: 
            <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono font-bold select-all">
              {classroom.invite_code}
            </code>
          </p>
        </div>

        {/* AQUI ENTRA A COZINHA PESADA (Conectada ao Python via Modal) */}
        <ClassroomActions 
            classroomId={classroom.id} 
            classroomName={classroom.name} 
        />
      </div>

      {/* --- Lista de Alunos --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="text-slate-400" size={20} />
                Alunos Matriculados 
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full ml-2">
                    {students.length}
                </span>
            </h2>
        </div>

        {students.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
                <p>Nenhum aluno entrou nesta turma ainda.</p>
                <p className="text-sm mt-2">Compartilhe o código <strong>{classroom.invite_code}</strong> com eles.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Nome do Aluno</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4">Último Acesso</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                        {student.full_name.substring(0,2).toUpperCase()}
                                    </div>
                                    {student.full_name}
                                </td>
                                <td className="px-6 py-4">
                                    {student.whatsapp_phone ? (
                                        <div className="flex items-center gap-1.5 text-green-700 bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                                            <Phone size={12} />
                                            {student.whatsapp_phone}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">Não informado</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Clock size={14} />
                                        {student.last_active_at 
                                            ? new Date(student.last_active_at).toLocaleDateString('pt-BR') 
                                            : "Nunca acessou"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}