'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Plus, Kanban, ChevronLeft, Target, Sparkles, History } from 'lucide-react';
import Link from 'next/link';
import { useTasks, useTaskDetail, useActiveSprint, useSprintHistory, useAISuggestions, type Task, type TaskStatus } from './hooks/useTasks';
import KanbanBoard from './KanbanBoard';
import TaskFilters, { type Filters, DEFAULT_FILTERS } from './TaskFilters';
import TaskDetailModal from './TaskDetailModal';
import CreateTaskModal from './CreateTaskModal';
import CreateSprintModal from './CreateSprintModal';
import ActiveSprintPanel from './ActiveSprintPanel';
import FinishSprintModal from './FinishSprintModal';
import AIInsightsModal from './AIInsightsModal';
import SprintHistoryModal from './SprintHistoryModal';

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
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [showFinishSprint, setShowFinishSprint] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showSprintHistory, setShowSprintHistory] = useState(false);
  const [sprintOnly, setSprintOnly] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const { resolvedTheme } = useTheme();
  const isDark = mounted && resolvedTheme !== 'light';

  useEffect(() => {
    setMounted(true);
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
  const { sprint: activeSprint } = useActiveSprint();
  const { sprints: sprintHistory } = useSprintHistory();
  const { suggestions } = useAISuggestions();

  useEffect(() => {
    if (!activeSprint) setSprintOnly(false);
  }, [activeSprint]);

  const sprintTaskIds = activeSprint?.tasks.map(item => item.task_id) ?? [];
  const filteredTasks = applyFilters(rawTasks, filters);
  const tasks = activeSprint && sprintOnly
    ? filteredTasks.filter(task => sprintTaskIds.includes(task.id))
    : filteredTasks;
  const backlogTasks = rawTasks.filter(task => task.status === 'backlog');
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
            <h1 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Tasks</h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-600">Gerenciamento do projeto</p>
          </div>

          {!isLoading && tasks.length > 0 && (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-600 font-mono bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 ml-1">
              {tasks.length}
            </span>
          )}
        </div>

        {userId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInsights(true)}
              className="relative flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-200 transition-all hover:border-fuchsia-500/25 hover:text-fuchsia-400"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Insights IA
              {suggestions.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-fuchsia-500/12 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] inline-flex items-center justify-center">
                  {suggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSprintHistory(true)}
              className="relative flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-200 transition-all hover:border-emerald-500/25 hover:text-emerald-400"
            >
              <History className="w-3.5 h-3.5" />
              Histórico
              {sprintHistory.length > 0 && (
                <span className="min-w-5 h-5 px-1 rounded-full bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 text-[10px] inline-flex items-center justify-center">
                  {sprintHistory.length}
                </span>
              )}
            </button>
            {!activeSprint && (
              <button
                onClick={() => setShowCreateSprint(true)}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white transition-all hover:brightness-110 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)' }}
              >
                <Target className="w-3.5 h-3.5" />
                Nova Sprint
              </button>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Task
            </button>
          </div>
        )}
      </div>

      {activeSprint && (
        <ActiveSprintPanel
          sprint={activeSprint}
          sprintOnly={sprintOnly}
          onToggleSprintOnly={setSprintOnly}
          onFinish={() => setShowFinishSprint(true)}
        />
      )}

      {/* Filters bar */}
      <div className="px-6 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] flex-shrink-0 bg-zinc-50/50 dark:bg-white/[0.01]">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          sprintOnly={activeSprint ? sprintOnly : undefined}
          onToggleSprintOnly={activeSprint ? setSprintOnly : undefined}
        />
      </div>

      {/* Body: Kanban */}
      <div className="flex flex-1 min-h-0 gap-3 px-6 py-4 overflow-hidden">
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

      <CreateSprintModal
        open={showCreateSprint}
        backlogTasks={backlogTasks}
        onClose={() => setShowCreateSprint(false)}
      />

      <FinishSprintModal
        sprint={activeSprint}
        open={showFinishSprint}
        onClose={() => setShowFinishSprint(false)}
      />

      <AIInsightsModal
        open={showInsights}
        onClose={() => setShowInsights(false)}
      />

      <SprintHistoryModal
        open={showSprintHistory}
        onClose={() => setShowSprintHistory(false)}
        sprints={sprintHistory}
      />
    </div>
  );
}
