'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Plus, Kanban, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useTasks, useTaskDetail, type Task, type TaskStatus } from './hooks/useTasks';
import KanbanBoard from './KanbanBoard';
import TaskFilters, { type Filters, DEFAULT_FILTERS } from './TaskFilters';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import AISuggestionsPanel from './AISuggestionsPanel';

// ─── Client-side filter logic ─────────────────────────────────────────────────

function applyFilters(tasks: Task[], filters: Filters): Task[] {
  return tasks.filter(t => {
    if (filters.status.length && !filters.status.includes(t.status)) return false;
    if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
    if (
      filters.assignee_ids.length &&
      (!t.assignee_id || !filters.assignee_ids.includes(t.assignee_id))
    )
      return false;
    if (filters.created_by && t.created_by !== filters.created_by) return false;
    if (filters.date_range) {
      const now = new Date();
      const created = new Date(t.created_at);
      if (filters.date_range === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (created < start) return false;
      } else if (filters.date_range === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Monday
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
        if (created < start) return false;
      } else if (filters.date_range === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        if (created < start) return false;
      } else if (filters.date_range === 'year') {
        const start = new Date(now.getFullYear(), 0, 1);
        if (created < start) return false;
      }
    }
    return true;
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTasksPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const supabase = createClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // Server-side params: only search and overdue (everything else is client-side)
  const queryParams: Record<string, string> = {};
  if (filters.search) queryParams.search = filters.search;
  if (filters.overdue) queryParams.overdue = 'true';

  const { tasks: rawTasks, isLoading } = useTasks(
    Object.keys(queryParams).length ? queryParams : undefined
  );

  const tasks = applyFilters(rawTasks, filters);
  const { task: selectedTask } = useTaskDetail(selectedTaskId);

  // Pass single status to KanbanBoard for column visibility (backward compat)
  const statusFilter =
    filters.status.length === 1 ? (filters.status[0] as TaskStatus) : ('' as TaskStatus);

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/admin"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all flex-shrink-0"
            title="Voltar ao painel"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Kanban className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-zinc-100 tracking-tight">Tasks</h1>
            <p className="text-[10px] text-zinc-600">Gerenciamento do projeto</p>
          </div>

          {!isLoading && tasks.length > 0 && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-600 font-mono bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 ml-1">
              {tasks.length}
            </span>
          )}
        </div>

        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Task
          </button>
        )}
      </div>

      {/* Filters bar */}
      <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] flex-shrink-0 bg-zinc-50/50 dark:bg-white/[0.01]">
        <TaskFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Body: Kanban + AI Panel */}
      <div className="flex flex-1 gap-3 p-4 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-[265px] h-64 rounded-2xl animate-pulse"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-600">Carregando tasks...</p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onTaskClick={t => setSelectedTaskId(t.id)}
            statusFilter={statusFilter}
          />
        )}

        {userId && <AISuggestionsPanel userId={userId} />}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask ?? null}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />

      {/* Create Task Modal */}
      {userId && (
        <CreateTaskModal
          open={showCreate}
          userId={userId}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
