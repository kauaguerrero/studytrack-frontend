"use client";

import { useState } from "react";
import { Check, Circle, Calendar, Lock, ExternalLink, Loader2, PlayCircle, FileText } from "lucide-react";
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
  const [isCompleted, setIsCompleted] = useState(task.status === 'completed');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const content = Array.isArray(task.content_repository)
    ? task.content_repository[0]
    : task.content_repository;

  const handleToggle = async () => {
    if (!isToday || isLoading) return;

    const previousStatus = isCompleted;
    setIsCompleted(!previousStatus);
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/api/tasks/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });

      if (!response.ok) throw new Error("Erro na API");
      router.refresh();
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      setIsCompleted(previousStatus);
    } finally {
      setIsLoading(false);
    }
  };

  // Definição de estilos baseados no estado
  const isLocked = !isToday;
  
  return (
    <div
      onClick={handleToggle}
      className={`
        relative group p-5 rounded-2xl border transition-all duration-300 overflow-hidden
        ${isLocked 
            ? "bg-white/50 border-slate-100 opacity-70 cursor-not-allowed grayscale-[0.3]" 
            : "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer"
        }
        ${isCompleted ? "bg-emerald-50/50 border-emerald-100" : ""}
      `}
    >
        {/* Barra lateral de status (Visual Feedback) */}
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${isCompleted ? 'bg-emerald-400' : isToday ? 'bg-blue-400' : 'bg-slate-200'}`}></div>

        <div className="flex items-start gap-4 pl-2">
            
            {/* Checkbox Customizado */}
            <div className={`mt-0.5 shrink-0 transition-all duration-300 ${isLoading ? 'scale-90 opacity-70' : ''}`}>
                {isLoading ? (
                    <Loader2 size={22} className="animate-spin text-blue-500" />
                ) : isLocked ? (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400">
                        <Lock size={12} />
                    </div>
                ) : isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 border border-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200 scale-100">
                        <Check size={14} strokeWidth={3} />
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 group-hover:border-blue-400 transition-colors"></div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                {/* Header do Card */}
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide inline-flex items-center gap-1.5 ${isToday ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <Calendar size={10} />
                        {displayDate}
                    </span>
                    
                    {content && !isLocked && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            Material disponível
                        </span>
                    )}
                </div>

                {/* Título da Tarefa */}
                <h3 className={`font-semibold text-base leading-snug transition-all duration-300 ${isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                    {task.task_description}
                </h3>

                {/* Conteúdo Anexado (Se houver) */}
                {content && (
                    <div className={`mt-3 pt-3 border-t border-dashed ${isCompleted ? 'border-emerald-200/50' : 'border-slate-100'} transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <a
                            href={content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="group/link inline-flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 transition-all w-full"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${content.content_type === 'video' ? 'bg-red-100 text-red-500' : 'bg-indigo-100 text-indigo-500'}`}>
                                {content.content_type === 'video' ? <PlayCircle size={16} /> : <FileText size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 group-hover/link:text-blue-700 truncate">
                                    {content.title || "Material de Estudo"}
                                </p>
                                <p className="text-[10px] text-slate-400 group-hover/link:text-blue-400 flex items-center gap-1">
                                    Clique para abrir <ExternalLink size={8} />
                                </p>
                            </div>
                        </a>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}