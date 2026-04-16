'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar, ChevronDown, ChevronUp, Plus, Target, X } from 'lucide-react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { apiCreateSprint, Task } from './hooks/useTasks';
import { PRIORITY_CONFIG } from './TaskCard';

interface Props {
  open: boolean;
  backlogTasks: Task[];
  onClose: () => void;
}

export default function CreateSprintModal({ open, backlogTasks, onClose }: Props) {
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);

  const visibleBacklogTasks = backlogTasks.filter(task => {
    if (selectedTaskIds.includes(task.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return task.title.toLowerCase().includes(q) || task.scope.toLowerCase().includes(q);
  });

  const selectedTasks = selectedTaskIds
    .map(taskId => backlogTasks.find(task => task.id === taskId))
    .filter(Boolean) as Task[];

  const isValid = goal.trim() && startDate && endDate && selectedTaskIds.length > 0;

  function resetAndClose() {
    setGoal('');
    setStartDate('');
    setEndDate('');
    setSelectedTaskIds([]);
    setSearch('');
    onClose();
  }

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await apiCreateSprint({
        goal: goal.trim(),
        start_date: startDate,
        end_date: endDate,
        task_ids: selectedTaskIds,
      });
      toast.success('Sprint criada com sucesso!');
      mutate('/api/admin/sprints');
      mutate('/api/admin/sprints?history=true');
      mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      resetAndClose();
    } catch (error: any) {
      toast.error(error.message ?? 'Erro ao criar sprint');
    } finally {
      setLoading(false);
    }
  }

  function toggleTask(taskId: string) {
    setSelectedTaskIds(current =>
      current.includes(taskId)
        ? current.filter(id => id !== taskId)
        : [...current, taskId]
    );
  }

  function toggleExpanded(taskId: string) {
    setExpandedTaskIds(current =>
      current.includes(taskId)
        ? current.filter(id => id !== taskId)
        : [...current, taskId]
    );
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && resetAndClose()}>
      <DialogContent
        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 !max-w-none sm:!max-w-none p-0 gap-0 overflow-hidden rounded-[2rem] flex flex-col shadow-2xl"
        style={{
          width: 'min(96vw, 1520px)',
          height: 'min(92vh, 980px)',
          maxWidth: 'none',
          maxHeight: '92vh',
        }}
      >
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #0f766e, #0f766e40)' }} />

        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/60 flex-shrink-0 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">Nova Sprint</DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Defina objetivo, prazo e selecione as tasks do backlog.</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px_minmax(0,1.35fr)_minmax(0,1fr)] grid-cols-1 gap-0 flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800/60 space-y-4 overflow-y-auto min-h-0 min-w-0 bg-zinc-50/60 dark:bg-zinc-950">
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                <Target className="w-3 h-3" /> Objetivo da sprint
              </label>
              <textarea
                value={goal}
                onChange={event => setGoal(event.target.value)}
                rows={6}
                placeholder="Ex.: Entregar melhorias críticas do painel admin e estabilizar o fluxo principal."
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                  <Calendar className="w-3 h-3" /> Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={event => setStartDate(event.target.value)}
                  className="w-full min-w-0 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                  <Calendar className="w-3 h-3" /> Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={event => setEndDate(event.target.value)}
                  className="w-full min-w-0 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">Resumo</p>
              <div className="space-y-2 text-sm">
                <p className="text-zinc-700 dark:text-zinc-300">Tasks selecionadas: <span className="font-bold">{selectedTaskIds.length}</span></p>
                <p className="text-zinc-700 dark:text-zinc-300">Backlog disponível: <span className="font-bold">{visibleBacklogTasks.length}</span></p>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                  Depois de iniciada, a sprint fica com escopo fechado. Tasks não concluídas retornam ao backlog no encerramento.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800/60 flex flex-col min-h-0 min-w-0 overflow-hidden bg-white dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 mb-4 flex-shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Backlog</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Role pela lista e clique no + para montar a sprint.</p>
              </div>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar task..."
                className="w-52 bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[320px]">
              {visibleBacklogTasks.length === 0 ? (
                <div className="h-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center px-6 text-center text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-900/40">
                  Nenhuma task disponível no backlog com os filtros atuais.
                </div>
              ) : visibleBacklogTasks.map(task => {
                const priority = PRIORITY_CONFIG[task.priority ?? 'medium'];
                const isExpanded = expandedTaskIds.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className="w-full text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 hover:border-teal-500/30 hover:bg-teal-500/[0.05] dark:hover:bg-teal-500/[0.07] transition-all px-3.5 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded mb-1.5 inline-block"
                          style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}
                        >
                          {priority.label}
                        </span>
                        <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                          {task.title}
                        </p>
                        {isExpanded ? (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                            {task.scope}
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words line-clamp-2">
                            {task.scope}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center flex-shrink-0 hover:bg-teal-500/20 transition-all"
                        title="Adicionar à sprint"
                        aria-label="Adicionar à sprint"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(task.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Ocultar descrição
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Ver descrição completa
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 sm:p-6 flex flex-col min-h-0 min-w-0 overflow-hidden bg-zinc-50/60 dark:bg-zinc-950">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Sprint</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Escopo fechado da nova sprint.</p>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                {selectedTasks.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[320px]">
              {selectedTasks.length === 0 ? (
                <div className="h-full rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center px-8 text-center text-sm text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900/40">
                  <div className="max-w-[320px] leading-relaxed">
                    Clique no <span className="mx-1 inline-flex items-center justify-center w-5 h-5 rounded-lg bg-teal-500/15 text-teal-400 align-middle"><Plus className="w-3 h-3" /></span> das tasks do backlog para montar a sprint.
                  </div>
                </div>
              ) : selectedTasks.map(task => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed break-words line-clamp-2">
                        {task.scope}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center flex-shrink-0 hover:bg-red-500/15 transition-all"
                      title="Remover da sprint"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 pt-4 flex items-center justify-end gap-2.5 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0 bg-white dark:bg-zinc-950">
          <button
            onClick={resetAndClose}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isValid ? '#0f766e' : '#0f766e66' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {loading ? 'Criando...' : 'Criar Sprint'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
