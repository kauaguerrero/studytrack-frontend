'use client';

import { Task, TaskStatus } from './hooks/useTasks';
import { Calendar, AlertCircle, GripVertical, Clock } from 'lucide-react';

export const COLUMN_ACCENT: Record<TaskStatus, string> = {
  backlog: '#6366f1',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
  archived: '#71717a',
};

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function isOverdue(task: Task): boolean {
  if (!task.deadline) return false;
  if (task.status === 'done' || task.status === 'archived') return false;
  return new Date(task.deadline) < new Date();
}

function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d atraso`;
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays <= 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

interface Props {
  task: Task;
  onClick: (task: Task) => void;
  onDragStart: (task: Task) => void;
}

export default function TaskCard({ task, onClick, onDragStart }: Props) {
  const overdue = isOverdue(task);
  const assigneeName = task.assignee?.full_name ?? '';
  const initials = assigneeName
    ? assigneeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const accentColor = COLUMN_ACCENT[task.status];
  const avatarColor = assigneeName ? getAvatarColor(assigneeName) : 'bg-zinc-700';

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      onClick={() => onClick(task)}
      className="group relative bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl p-3.5 cursor-pointer transition-all duration-150 select-none hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30 hover:-translate-y-0.5 active:scale-[0.97] active:opacity-75"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Drag handle */}
      <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-25 transition-opacity pointer-events-none">
        <GripVertical className="w-3.5 h-3.5 text-zinc-400" />
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 mb-3 pr-5">
        {task.title}
      </p>

      {/* In-progress snippet */}
      {task.status === 'in_progress' && task.currently_doing && (
        <div
          className="mb-3 rounded-lg px-2.5 py-1.5"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: accentColor }} />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: accentColor, opacity: 0.8 }}>
              Fazendo agora
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 line-clamp-1 leading-relaxed">
            {task.currently_doing}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ring-1 ring-black/20`}
          >
            {initials}
          </div>
          {assigneeName && (
            <span className="text-[11px] text-zinc-500 truncate">
              {assigneeName.split(' ')[0]}
            </span>
          )}
          {!assigneeName && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-700 italic">Sem responsável</span>
          )}
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div
            className={`flex items-center gap-1 text-[11px] font-medium flex-shrink-0 px-2 py-0.5 rounded-md ${
              overdue
                ? 'bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300 dark:border-zinc-700/50'
            }`}
          >
            {overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Calendar className="w-2.5 h-2.5" />}
            <span>{formatDeadline(task.deadline)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
