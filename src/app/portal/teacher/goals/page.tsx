import Link from 'next/link';
import { Target, Calendar, Users, ChevronRight, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function GoalsPage() {
  // 1. Obtém usuário logado (Contexto de Servidor)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // 2. Busca as metas reais no Backend Python
  let goals = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/enterprise/goals/teacher/${user.id}`, {
      cache: 'no-store', // Garante dados frescos a cada refresh
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (res.ok) {
      goals = await res.json();
    } else {
      console.error("Erro ao buscar metas:", await res.text());
    }
  } catch (error) {
    console.error("Falha na conexão com API:", error);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Target className="text-blue-600" />
          Metas Criadas
        </h1>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Target className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhuma meta criada</h3>
            <p className="text-slate-500 mt-2 max-w-md">
                Crie metas para suas turmas acessando a página da turma e clicando em "Nova Meta".
            </p>
            <Link 
                href="/portal/teacher" 
                className="mt-6 text-blue-600 font-medium hover:underline"
            >
                Ir para Minhas Turmas
            </Link>
        </div>
      ) : (
        <div className="grid gap-4">
            {goals.map((goal: any) => (
            <Link 
                key={goal.group_id} 
                href={`/portal/teacher/goals/${goal.group_id}`}
                className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors">
                    {goal.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> 
                    {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1.5">
                    <Users size={14} /> 
                    {goal.completed_count}/{goal.total_students} Concluídos
                    </span>
                    {/* Badge de Status */}
                    {goal.avg_progress >= 100 ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            Concluída
                        </span>
                    ) : new Date(goal.deadline) < new Date() ? (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                            Expirada
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            Em Andamento
                        </span>
                    )}
                </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-auto">
                <div className="text-right">
                    <div className={`text-2xl font-bold ${goal.avg_progress >= 100 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {goal.avg_progress}%
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso Médio</div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
            </Link>
            ))}
        </div>
      )}
    </div>
  );
}