"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Calendar, Lock, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface TaskProps {
  task: {
    id: string;
    task_description: string;
    scheduled_date: string;
    status: string;
    content_repository: any;
  };
  isToday: boolean;
  displayDate: string;
}

export function TaskCard({ task, isToday, displayDate }: TaskProps) {
  // Estado local para atualização otimista (feedback instantâneo)
  const [isCompleted, setIsCompleted] = useState(task.status === 'completed');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Se content_repository vier como array, pega o primeiro item
  const content = Array.isArray(task.content_repository) 
    ? task.content_repository[0] 
    : task.content_repository;

  const handleToggle = async () => {
    // Bloqueia interação se não for dia de hoje ou se estiver carregando
    if (!isToday || isLoading) return;

    // 1. Atualização Otimista (Muda a UI antes do servidor responder)
    const newStatus = !isCompleted;
    setIsCompleted(newStatus);
    setIsLoading(true);

    try {
      // 2. Chama o Backend
      const response = await fetch('http://127.0.0.1:5000/api/tasks/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Em produção, adicione o token de autorização aqui
        },
        body: JSON.stringify({ task_id: task.id })
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar tarefa");
      }
      
      // Opcional: Atualiza os dados da página em segundo plano para garantir sincronia
      router.refresh();

    } catch (error) {
      console.error("Erro ao dar check:", error);
      // Reverte em caso de erro
      setIsCompleted(!newStatus);
      alert("Erro ao sincronizar tarefa. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Estilos Condicionais
  const containerClasses = isToday
    ? "bg-white border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer" // Hoje (Ativo)
    : "bg-slate-50 border-slate-100 opacity-60 grayscale-[0.5] cursor-not-allowed"; // Outros dias (Bloqueado)

  const completedClasses = isCompleted 
    ? "bg-green-50 border-green-200" 
    : "";

  return (
    <div 
      onClick={handleToggle}
      className={`group p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 relative overflow-hidden ${containerClasses} ${completedClasses} ${isLoading ? 'opacity-80' : ''}`}
    >
      {/* Faixa decorativa para tarefas concluídas */}
      {isCompleted && isToday && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
      )}

      {/* Ícone de Checkbox ou Cadeado */}
      <div className={`mt-1 shrink-0 transition-colors ${
        isCompleted ? 'text-green-500' : isToday ? 'text-slate-300 group-hover:text-blue-500' : 'text-slate-300'
      }`}>
        {!isToday ? (
          <Lock size={24} className="opacity-50" />
        ) : isCompleted ? (
          <CheckCircle2 size={24} className="fill-current" />
        ) : (
          <Circle size={24} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header: Data e Badges */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
            isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
          }`}>
            <Calendar size={10} />
            {displayDate}
          </span>
          
          {!isToday && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Lock size={10} /> Bloqueado
            </span>
          )}
        </div>
        
        {/* Descrição da Tarefa */}
        <h3 className={`font-medium text-lg leading-snug transition-all ${
          isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
        }`}>
          {task.task_description}
        </h3>

        {/* Conteúdo / Material de Estudo */}
        {content && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200/60">
            <a 
              href={content.url} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Evita marcar check ao clicar no link
              className={`inline-flex items-center gap-1.5 text-sm font-medium truncate max-w-full transition-colors ${
                isToday ? 'text-blue-600 hover:text-blue-800 hover:underline' : 'text-slate-400 pointer-events-none'
              }`}
            >
              {content.content_type === 'video' ? '🎥' : '📄'} 
              {content.title}
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}