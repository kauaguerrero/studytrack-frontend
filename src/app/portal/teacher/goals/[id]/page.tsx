import Link from 'next/link';
import { ArrowLeft, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { reportError } from '@/lib/reportError';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GoalDetailsPage({ params }: PageProps) {
  const { id } = await params;

  // Busca detalhes reais na API
  let goalDetails = null;
  let students = [];

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/details/${id}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
        const data = await res.json();
        // A API retorna uma lista plana de alunos com os dados da meta repetidos.
        // Vamos extrair os metadados do primeiro registro e a lista de alunos.
        if (data && data.length > 0) {
            goalDetails = {
                title: data[0].title,
                description: data[0].description,
                deadline: data[0].deadline,
                target_value: data[0].target_value,
                metric_type: data[0].metric_type
            };
            
            // Mapeia alunos
            students = data.map((row: any) => {
                // Cálculo de progresso
                const progress = row.target_value > 0 
                    ? Math.min(100, Math.round((row.current_value / row.target_value) * 100)) 
                    : 0;
                
                return {
                    id: row.user_id,
                    name: row.profiles?.full_name || 'Aluno Desconhecido',
                    phone: row.profiles?.whatsapp_phone,
                    status: row.status, // active, completed
                    current: row.current_value,
                    target: row.target_value,
                    progress: progress
                };
            });
        }
    }
  } catch (error) {
    console.error("Erro fetch details:", error);
    void reportError("TeacherGoalDetailFetchError", String(error));
  }

  if (!goalDetails) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-slate-800">Meta não encontrada</h2>
            <Link href="/portal/teacher/goals" className="text-blue-600 hover:underline mt-4 block">Voltar</Link>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <Link href="/portal/teacher/goals" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 w-fit transition-colors">
        <ArrowLeft size={16} /> Voltar para Metas
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{goalDetails.title}</h1>
                <p className="text-slate-500 mt-1">{goalDetails.description || "Sem descrição definida."}</p>
                <div className="flex items-center gap-2 mt-3 text-sm font-medium text-slate-600 bg-slate-50 w-fit px-3 py-1 rounded-lg border border-slate-100">
                    <Clock size={16} className="text-blue-500" />
                    Prazo: {new Date(goalDetails.deadline).toLocaleString('pt-BR')}
                </div>
            </div>
            <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{goalDetails.target_value}</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Meta Alvo</div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
                <tr>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-1/3">Progresso Atual</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {students.map((student: any) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{student.name}</div>
                        {student.phone && <div className="text-xs text-slate-400">{student.phone}</div>}
                    </td>
                    <td className="px-6 py-4">
                    {student.progress >= 100 ? (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full w-fit text-xs border border-emerald-100">
                        <CheckCircle size={14} /> Concluído
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-full w-fit text-xs border border-amber-100">
                        <Clock size={14} /> {student.current}/{student.target}
                        </span>
                    )}
                    </td>
                    <td className="px-6 py-4 align-middle">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${student.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                style={{ width: `${student.progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-9 text-right">{student.progress}%</span>
                    </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}