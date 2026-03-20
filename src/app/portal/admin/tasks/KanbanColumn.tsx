'use client';

import { useState } from 'react';
import { Task, TaskStatus } from './hooks/useTasks';
import TaskCard from './TaskCard';
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';

type ColumnConfig = {
  label: string;
  accent: string;
  emptyText: string;
  emptyIcon: string;
};

const COLUMN_CONFIG: Record<TaskStatus, ColumnConfig> = {
  backlog: {
    label: 'Backlog',
    accent: '#6366f1',
    emptyText: 'Nenhuma task no backlog',
    emptyIcon: '📋',
  },
  in_progress: {
    label: 'Em Andamento',
    accent: '#3b82f6',
    emptyText: 'Nada em andamento',
    emptyIcon: '⚡',
  },
  review: {
    label: 'Em Revisão (main-preview)',
    accent: '#f59e0b',
    emptyText: 'Nenhuma task em revisão',
    emptyIcon: '🔍',
  },
  done: {
    label: 'Concluído (main)',
    accent: '#10b981',
    emptyText: 'Nada concluído ainda',
    emptyIcon: '✅',
  },
  archived: {
    label: 'Arquivado',
    accent: '#71717a',
    emptyText: 'Arquivo vazio',
    emptyIcon: '📦',
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
      className="flex flex-col rounded-2xl transition-all duration-200 w-[265px] flex-shrink-0"
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
        className={`flex items-center justify-between px-4 py-3 flex-shrink-0 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setCollapsed(!collapsed)}
      >
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

        <div className="flex items-center gap-2">
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

      {/* Divider */}
      {!collapsed && (
        <div className="mx-4 h-px bg-zinc-200 dark:bg-white/[0.04] flex-shrink-0" />
      )}

      {/* Cards list */}
      {!collapsed && (
        <div
          className="flex flex-col gap-2 p-3 overflow-y-auto flex-1"
          style={{ maxHeight: 'calc(100vh - 230px)' }}
        >
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: `${config.accent}15` }}
              >
                <LayoutGrid className="w-4 h-4" style={{ color: config.accent, opacity: 0.5 }} />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-600 text-center leading-relaxed">
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
                Soltar aqui
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
