'use client'

import { useState } from "react";
import { CheckCircle2, Circle, Calendar, Loader2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

// Interfaces para tipagem
interface Task {
  id: string;
  task_description: string;
  scheduled_date: string;
  status: string;
  content_repository: any; 
}

export function TaskItem({ task }: { task: Task }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() + 3); // Ajuste de fuso simples se necessário
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === tomorrow.toDateString()) return "Amanhã";
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const isDone = task.status === 'completed';
  const dateLabel = formatDate(task.scheduled_date);
  const isToday = dateLabel === "Hoje";

  // Lida com o clique na checkbox
  const handleToggle = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // URL hardcoded. Em prod, use process.env.NEXT_PUBLIC_API_URL
      const response = await fetch('http://127.0.0.1:5000/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });
      
      if (!response.ok) throw new Error('Falha ao atualizar');

      // Recarrega a página para pegar o dado atualizado do servidor
      router.refresh(); 
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com o backend Python.");
    } finally {
      setIsLoading(false);
    }
  };

  // Tratamento de array vs objeto do Supabase
  const content = Array.isArray(task.content_repository) 
    ? task.content_repository[0] 
    : task.content_repository;

  return (
    <div 
      onClick={handleToggle}
      className={`group cursor-pointer bg-white p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
        isDone ? 'border-slate-100 bg-slate-50/50 opacity-75' : 'border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md'
      } ${isToday && !isDone ? 'ring-2 ring-blue-500/20 border-blue-500' : ''}`}
    >
      {/* Ícone de Status */}
      <div className={`mt-1 transition-colors ${isDone ? 'text-green-500' : 'text-slate-300 group-hover:text-blue-500'}`}>
        {isLoading ? <Loader2 className="animate-spin" size={24} /> : isDone ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isToday ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
          }`}>
            <Calendar size={10} />
            {dateLabel}
          </span>
        </div>
        
        <h3 className={`font-medium text-lg leading-snug ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.task_description}
        </h3>

        {content && (
          <a 
            href={content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
          >
            <ExternalLink size={14} /> {content.title}
          </a>
        )}
      </div>
    </div>
  );
}