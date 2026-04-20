'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from 'next-themes';
import { Plus, Kanban, ChevronLeft, Target, Sparkles, History, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTasks, useTaskDetail, useActiveSprint, useSprintHistory, useAISuggestions, useTaskWorkspaceSummary, type Task, type TaskStatus } from './hooks/useTasks';
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
    const taskAssigneeIds = t.assignee_ids?.length
      ? t.assignee_ids
      : [t.assignee_id, t.co_assignee_id].filter(Boolean) as string[];
    if (
      filters.assignee_ids.length &&
      !taskAssigneeIds.some((id) => filters.assignee_ids.includes(id))
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
  const [currentTime] = useState(() => Date.now());
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const isDark = mounted && resolvedTheme !== 'light';

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status && ['backlog', 'in_progress', 'review', 'done', 'blocked', 'archived'].includes(status)) {
      setFilters((current) => ({ ...current, status: [status as TaskStatus] }));
    }
  }, [searchParams]);

  // Server-side params: only search and overdue (everything else is client-side)
  const queryParams: Record<string, string> = {};
  if (filters.search) queryParams.search = filters.search;
  if (filters.overdue) queryParams.overdue = 'true';

  const { tasks: rawTasks, isLoading } = useTasks(
    Object.keys(queryParams).length ? queryParams : undefined
  );
  const { sprint: activeSprint } = useActiveSprint();
  const { sprints: sprintHistory } = useSprintHistory();
  const { data: workspaceSummary, isLoading: isLoadingWorkspaceSummary, error: workspaceSummaryError } = useTaskWorkspaceSummary();
  const role = workspaceSummary?.role;
  const isAdmin = role === 'admin';
  const { suggestions } = useAISuggestions(isAdmin);
  const homeHref = pathname?.startsWith('/portal/dev') ? '/portal' : '/portal/admin';

  useEffect(() => {
    if (!activeSprint) setSprintOnly(false);
  }, [activeSprint]);

  const sprintTaskIds = activeSprint?.tasks.map(item => item.task_id) ?? [];
  const filteredTasks = applyFilters(rawTasks, filters);
  const activeSprintTaskIds = new Set(sprintTaskIds);
  const tasksWithSprintContext = filteredTasks.map(task => (
    activeSprintTaskIds.has(task.id)
      ? {
          ...task,
          active_sprint: {
            id: activeSprint!.id,
            goal: activeSprint!.goal,
            status: activeSprint!.status,
            start_date: activeSprint!.start_date,
            end_date: activeSprint!.end_date,
          },
        }
      : task
  ));
  const tasks = activeSprint && sprintOnly
    ? tasksWithSprintContext.filter(task => activeSprintTaskIds.has(task.id))
    : tasksWithSprintContext;
  const backlogTasks = rawTasks.filter(task => task.status === 'backlog');
  const { task: selectedTask } = useTaskDetail(selectedTaskId);
  const agingTasks = tasks.filter(task => {
    const sourceDate = task.last_progress_update_at ?? task.updated_at;
    if (!sourceDate) return false;
    const ageInDays = (currentTime - new Date(sourceDate).getTime()) / (1000 * 60 * 60 * 24);
    return task.status === 'in_progress' && ageInDays >= 3;
  });
  const doneTasks = tasks.filter(t => t.status === 'done');
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  const completenessVal = tasks.length > 0 ? `${Math.round((doneTasks.length / tasks.length) * 100)}%` : '—';
  const blockRateVal = tasks.length > 0 ? `${Math.round((blockedCount / tasks.length) * 100)}%` : '—';

  // Pass single status to KanbanBoard for column visibility (backward compat)
  const statusFilter =
    filters.status.length === 1 ? (filters.status[0] as TaskStatus) : ('' as TaskStatus);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 border-b border-zinc-200 dark:border-white/[0.06] bg-slate-100/95 dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href={homeHref}
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

        </div>

        {userId && (
          <div className="flex items-center gap-2">
            {isAdmin && (
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
            )}
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
            {isAdmin && !activeSprint && (
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

      <div className="px-6 pt-4 pb-3">
        {isAdmin && (
          <div className="mb-2 flex justify-end">
            <Link
              href="/portal/admin/tasks/dashboard"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-200"
            >
              ver análise completa
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">

          {/* ── Tiles de métricas ── */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-px bg-zinc-100 dark:bg-zinc-800/40">
            {[
              {
                label: 'Total',
                value: tasks.length,
                num: 'text-zinc-700 dark:text-zinc-200',
                onClick: null,
              },
              {
                label: 'Concluídas',
                value: doneTasks.length,
                num: 'text-indigo-600 dark:text-indigo-400',
                onClick: null,
              },
              {
                label: 'Completude',
                value: completenessVal,
                num: 'text-emerald-600 dark:text-emerald-400',
                onClick: null,
              },
              {
                label: 'Estagnadas',
                value: agingTasks.length,
                num: 'text-amber-500 dark:text-amber-400',
                onClick: null,
              },
              {
                label: 'Bloqueio',
                value: blockRateVal,
                num: 'text-red-500 dark:text-red-400',
                onClick: () => setFilters(f => ({ ...f, status: ['blocked'] })),
              },
            ].map(({ label, value, num, onClick }) => (
              <div
                key={label}
                role={onClick ? 'button' : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick ?? undefined}
                onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
                className={`flex flex-col px-3 py-2 bg-white dark:bg-zinc-900${onClick ? ' cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors duration-150' : ''}`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1.5">{label}</p>
                <p className={`text-xl font-bold tabular-nums leading-none ${num}${(value === 0 || value === '0%') ? ' opacity-30' : ''}`}>{value}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {activeSprint && (
        <ActiveSprintPanel
          sprint={activeSprint}
          sprintOnly={sprintOnly}
          onToggleSprintOnly={setSprintOnly}
          onFinish={() => isAdmin && setShowFinishSprint(true)}
        />
      )}

      {/* Filters bar */}
      <div className="px-6 py-3 border-b border-zinc-100 dark:border-white/[0.04] flex-shrink-0 bg-zinc-50/50 dark:bg-white/[0.01]">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          sprintOnly={activeSprint ? sprintOnly : undefined}
          onToggleSprintOnly={activeSprint ? setSprintOnly : undefined}
        />
      </div>

      {/* Body: Kanban */}
      <div className="overflow-x-auto px-6 pt-5 pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-[280px] h-[580px] rounded-2xl animate-pulse"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                      animationDelay: `${i * 100}ms`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500">Carregando tasks...</p>
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
          onClose={() => setShowCreate(false)}
        />
      )}

      <CreateSprintModal
        open={showCreateSprint}
        backlogTasks={backlogTasks}
        onClose={() => setShowCreateSprint(false)}
      />

      {isAdmin && (
        <FinishSprintModal
          sprint={activeSprint}
          open={showFinishSprint}
          onClose={() => setShowFinishSprint(false)}
        />
      )}

      {isAdmin && (
        <AIInsightsModal
          open={showInsights}
          onClose={() => setShowInsights(false)}
        />
      )}

      <SprintHistoryModal
        open={showSprintHistory}
        onClose={() => setShowSprintHistory(false)}
        sprints={sprintHistory}
      />
    </div>
  );
}
