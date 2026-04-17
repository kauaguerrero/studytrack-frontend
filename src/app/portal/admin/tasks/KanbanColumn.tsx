'use client';

import { useState } from 'react';
import { Task, TaskStatus } from './hooks/useTasks';
import TaskCard from './TaskCard';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';

type ColumnConfig = {
  label: string;
  accent: string;
  emptyText: string;
  guidance: string;
};

const COLUMN_CONFIG: Record<TaskStatus, ColumnConfig> = {
  backlog: {
    label: 'Backlog',
    accent: '#6366f1',
    emptyText: 'Nenhuma task no backlog',
    guidance: 'Defina contexto, resultado esperado e critérios antes de executar.',
  },
  in_progress: {
    label: 'Em Andamento',
    accent: '#3b82f6',
    emptyText: 'Nada em andamento',
    guidance: 'Exija próximo passo claro e atualização operacional consistente.',
  },
  review: {
    label: 'Em Revisão (main-preview)',
    accent: '#f59e0b',
    emptyText: 'Nenhuma task em revisão',
    guidance: 'Valide entrega, pendências finais e ajustes antes de concluir.',
  },
  done: {
    label: 'Concluído (main)',
    accent: '#10b981',
    emptyText: 'Nada concluído ainda',
    guidance: 'Fechamento completo com evidência, atraso e qualidade registrados.',
  },
  blocked: {
    label: 'Bloqueadas',
    accent: '#ef4444',
    emptyText: 'Nenhuma task bloqueada',
    guidance: 'Informe motivo, categoria e previsão realista de desbloqueio.',
  },
  archived: {
    label: 'Arquivado',
    accent: '#71717a',
    emptyText: 'Arquivo vazio',
    guidance: 'Use só para histórico ou itens retirados do fluxo ativo.',
  },
};

interface Props {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDragStart: (task: Task) => void;
  onDrop: (status: TaskStatus) => void;
  collapsible?: boolean;
  isDark: boolean;
}

export default function KanbanColumn({
  status, tasks, onTaskClick, onDragStart, onDrop, collapsible, isDark,
}: Props) {
  const [collapsed, setCollapsed] = useState(!!collapsible);
  const [isDragOver, setIsDragOver] = useState(false);
  const config = COLUMN_CONFIG[status];

  return (
    <div
      className="flex flex-col rounded-2xl transition-all duration-200 w-[280px] flex-shrink-0 h-[560px]"
      style={{
        background: isDragOver
          ? `linear-gradient(180deg, ${config.accent}18 0%, ${config.accent}08 100%)`
          : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: isDragOver
          ? `1.5px solid ${config.accent}70`
          : isDark ? '1.5px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(0,0,0,0.1)',
        boxShadow: isDragOver ? `0 0 32px ${config.accent}25` : 'none',
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
      }}
      onDrop={() => { setIsDragOver(false); onDrop(status); }}
    >
      {/* Accent top bar */}
      <div
        className="h-[3px] rounded-t-2xl flex-shrink-0"
        style={{ background: `linear-gradient(90deg, ${config.accent}, ${config.accent}40)` }}
      />

      {/* Header */}
      <div
        className={`px-3.5 py-3 flex-shrink-0 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? !collapsed : undefined}
        onClick={() => collapsible && setCollapsed(!collapsed)}
        onKeyDown={collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCollapsed(c => !c); } } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: config.accent,
                  boxShadow: `0 0 6px ${config.accent}`,
                }}
              />
              <span className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                {config.label}
              </span>
            </div>
            {!collapsed && (
              <p className="mt-1 pl-[18px] text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {config.guidance}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${config.accent}22`,
                color: config.accent,
                border: `1px solid ${config.accent}35`,
              }}
            >
              {tasks.length}
            </span>
            {collapsible && (
              collapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                : <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      {!collapsed && (
        <div className="mx-4 h-px bg-zinc-200 dark:bg-white/[0.04] flex-shrink-0" />
      )}

      {/* Cards list */}
      {!collapsed && (
        <div className="flex flex-col gap-2.5 p-3 flex-1 min-h-0 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: `${config.accent}12` }}
              >
                <LayoutGrid className="w-[18px] h-[18px]" style={{ color: config.accent, opacity: 0.45 }} />
              </div>
              <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-600 text-center leading-relaxed px-2">
                {config.emptyText}
              </p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                onDragStart={onDragStart}
              />
            ))
          )}

          {/* Drop zone hint */}
          {isDragOver && (
            <div
              className="rounded-xl h-14 flex items-center justify-center mt-1 transition-all"
              style={{
                border: `2px dashed ${config.accent}50`,
                background: `${config.accent}08`,
              }}
            >
              <p className="text-xs font-semibold" style={{ color: config.accent }}>
                Soltar para mover para {config.label.toLowerCase()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
