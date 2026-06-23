'use client';

import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  X, User, Calendar, Clock, FileText, History, CheckCircle2,
  AlertCircle, Edit3, Save, XCircle, Trash2, Flag, ShieldAlert, Unlock, RotateCcw, Sparkles, GitBranch, ListTodo, ArrowRight,
} from 'lucide-react';
import { TaskDetail, TaskStatus, TaskPriority, apiUpdateProgress, apiUpdateTask, apiUpdateStatus, apiDeleteTask, apiBlockTask, apiUnblockTask, apiReopenTask, useAdminProfiles, useTaskIntelligence } from './hooks/useTasks';
import TransferTaskModal from './TransferTaskModal';
import { PRIORITY_CONFIG, COLUMN_ACCENT } from './TaskCard';
import { mutate } from 'swr';
import { toast } from 'sonner';
import TaskStatusActionModal from './TaskStatusActionModal';

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído',
  blocked: 'Bloqueada',
  archived: 'Arquivado',
};

type Tab = 'details' | 'progress' | 'completion' | 'history';

const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
  { key: 'details', label: 'Detalhes', icon: FileText },
  { key: 'progress', label: 'Progresso', icon: Clock },
  { key: 'completion', label: 'Conclusão', icon: CheckCircle2 },
  { key: 'history', label: 'Histórico', icon: History },
];

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

interface Props {
  task: TaskDetail | null;
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

export default function TaskDetailModal({ task, open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('details');

  // Edit task fields
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editCoAssigneeId, setEditCoAssigneeId] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('backlog');
  const [savingTask, setSavingTask] = useState(false);

  // Archive
  const [deleteMode, setDeleteMode] = useState<'idle' | 'archive_confirm' | 'delete_confirm'>('idle');
  const [archiving, setArchiving] = useState(false);

  // Progress
  const [editProgress, setEditProgress] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState('');
  const [currentlyDoing, setCurrentlyDoing] = useState('');
  const [remaining, setRemaining] = useState('');
  const [dependencyUpdates, setDependencyUpdates] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionModal, setActionModal] = useState<{ mode: 'block' | 'unblock' | 'reopen'; targetStatus?: TaskStatus } | null>(null);
  const [transferModal, setTransferModal] = useState(false);

  const { profiles } = useAdminProfiles();
  const { data: intelligence } = useTaskIntelligence(task?.id ?? null);

  if (!task) return null;

  const accent = COLUMN_ACCENT[task.status as TaskStatus] ?? '#6366f1';
  const isOverdue = task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'done' &&
    task.status !== 'archived';

  function startEditTask() {
    setEditTitle(task!.title);
    setEditScope(task!.scope);
    setEditPriority(task!.priority ?? 'medium');
    setEditAssigneeId(task!.assignee_id ?? '');
    setEditCoAssigneeId(task!.co_assignee_id ?? '');
    setEditDeadline(toDateInputValue(task!.deadline));
    setEditStatus(task!.status);
    setEditMode(true);
  }

  async function saveTask() {
    if (!editTitle.trim() || !editScope.trim()) return;
    setSavingTask(true);
    try {
      if (editStatus !== task!.status) {
        if (task!.status === 'done' && ['in_progress', 'review', 'blocked'].includes(editStatus)) {
          await apiReopenTask(task!.id, {
            target_status: editStatus,
            reason: 'Task reaberta via edição manual de status.',
            category: null,
          });
        } else if (task!.status === 'blocked' && ['in_progress', 'review', 'done'].includes(editStatus)) {
          await apiUnblockTask(task!.id, {
            target_status: editStatus,
            resolution_note: 'Task desbloqueada via edição manual de status.',
          });
        } else {
          await apiUpdateStatus(task!.id, { status: editStatus });
        }
      }
      await apiUpdateTask(task!.id, {
        title: editTitle.trim(),
        scope: editScope.trim(),
        priority: editPriority,
        assignee_id: editAssigneeId || null,
        co_assignee_id: editCoAssigneeId || null,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
      });
      toast.success('Task atualizada!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      setEditMode(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSavingTask(false);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await apiDeleteTask(task!.id);
      toast.success('Task arquivada!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao arquivar');
    } finally {
      setArchiving(false);
      setDeleteMode('idle');
    }
  }

  async function handlePermanentDelete() {
    setArchiving(true);
    try {
      await apiDeleteTask(task!.id, { permanent: true });
      toast.success('Task excluída permanentemente!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao excluir permanentemente');
    } finally {
      setArchiving(false);
      setDeleteMode('idle');
    }
  }

  function startEditProgress() {
    setAlreadyDone(task!.progress?.already_done ?? '');
    setCurrentlyDoing(task!.progress?.currently_doing ?? '');
    setRemaining(task!.progress?.remaining ?? '');
    setDependencyUpdates((task as TaskDetail & { dependency_updates?: string | null }).dependency_updates ?? '');
    setEditProgress(true);
  }

  async function saveProgress() {
    if (!alreadyDone.trim() || !currentlyDoing.trim() || !remaining.trim()) return;
    setSaving(true);
    try {
      await apiUpdateProgress(task!.id, {
        already_done: alreadyDone.trim(),
        currently_doing: currentlyDoing.trim(),
        remaining: remaining.trim(),
        dependency_updates: dependencyUpdates.trim() || undefined,
      });
      toast.success('Progresso atualizado!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      setEditProgress(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar progresso');
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(payload: Record<string, unknown>) {
    if (!actionModal) return;
    try {
      if (actionModal.mode === 'block') {
        await apiBlockTask(task!.id, payload);
        toast.success('Task bloqueada!');
      } else if (actionModal.mode === 'unblock') {
        await apiUnblockTask(task!.id, payload);
        toast.success('Task desbloqueada!');
      } else {
        await apiReopenTask(task!.id, payload);
        toast.success('Task reaberta!');
      }
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      setActionModal(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao executar ação');
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Accent bar */}
        <div className="h-[3px] flex-shrink-0" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40)` }} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex-1 mr-4 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}40` }}
              >
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Vencida
                </span>
              )}
            </div>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">{task.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.status !== 'archived' && !editMode && (
              <>
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => setTransferModal(true)}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                    title="Transferir task"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={startEditTask}
                  className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                  title="Editar task"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {task.status !== 'blocked' && (
                  <button
                    onClick={() => setActionModal({ mode: task.status === 'done' ? 'reopen' : 'block', targetStatus: task.status === 'done' ? 'review' : 'blocked' })}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                    title={task.status === 'done' ? 'Reabrir task' : 'Bloquear task'}
                  >
                    {task.status === 'done' ? <RotateCcw className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  </button>
                )}
                {task.status === 'blocked' && (
                  <button
                    onClick={() => setActionModal({ mode: 'unblock', targetStatus: (task.blocked_from_status as TaskStatus) || 'in_progress' })}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all"
                    title="Desbloquear task"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                )}
                {deleteMode === 'idle' ? (
                  <button
                    onClick={() => setDeleteMode('archive_confirm')}
                    className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Arquivar task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : deleteMode === 'archive_confirm' ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-2 py-1">
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Arquivar?</span>
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      {archiving ? '...' : 'Sim'}
                    </button>
                    <button
                      onClick={() => setDeleteMode('delete_confirm')}
                      className="text-[11px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-2 py-1">
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">Excluir permanentemente?</span>
                    <button
                      onClick={handlePermanentDelete}
                      disabled={archiving}
                      className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                    >
                      {archiving ? '...' : 'Sim'}
                    </button>
                    <button
                      onClick={() => setDeleteMode('idle')}
                      className="text-[11px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400"
                    >
                      Não
                    </button>
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800/60 px-6 flex-shrink-0 gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 text-xs font-semibold py-3 px-3 border-b-2 transition-all duration-150 rounded-t-md"
                style={
                  active
                    ? { borderBottomColor: accent, color: accent }
                    : { borderBottomColor: 'transparent', color: '#71717a' }
                }
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {tab === 'details' && (
            <div className="space-y-4">
              {editMode ? (
                /* ── Edit mode ── */
                <div className="space-y-4">
                  <div>
                    <EditLabel icon={FileText} label="Título" />
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <EditLabel icon={FileText} label="Escopo" />
                    <textarea
                      value={editScope}
                      onChange={e => setEditScope(e.target.value)}
                      rows={4}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <EditLabel icon={Clock} label="Status" />
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {(Object.keys(STATUS_LABELS) as TaskStatus[]).filter(s => s !== 'blocked').map(s => {
                        const color = COLUMN_ACCENT[s];
                        const selected = editStatus === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setEditStatus(s)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                            style={{
                              background: selected ? `${color}22` : 'transparent',
                              color: selected ? color : '#71717a',
                              border: `1px solid ${selected ? `${color}50` : 'rgba(113,113,122,0.3)'}`,
                            }}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <EditLabel icon={Flag} label="Prioridade" />
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {PRIORITIES.map(p => {
                        const pc = PRIORITY_CONFIG[p];
                        const selected = editPriority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setEditPriority(p)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                            style={{
                              background: selected ? pc.bg : 'transparent',
                              color: selected ? pc.color : '#71717a',
                              border: `1px solid ${selected ? pc.border : 'rgba(113,113,122,0.3)'}`,
                            }}
                          >
                            {pc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <EditLabel icon={User} label="Responsável" />
                      <select
                        value={editAssigneeId}
                        onChange={e => setEditAssigneeId(e.target.value)}
                        className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all"
                      >
                        <option value="">Não atribuído</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === editCoAssigneeId}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <EditLabel icon={Calendar} label="Prazo" />
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500/50 transition-all [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveTask}
                      disabled={savingTask || !editTitle.trim() || !editScope.trim()}
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                      style={{ background: accent }}
                    >
                      <Save className="w-3 h-3" />
                      {savingTask ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                    >
                      <XCircle className="w-3 h-3" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="space-y-5">
                  <SectionGroup title="Definição" icon={FileText}>
                    <InfoBlock label="Escopo" icon={FileText} value={task.scope} multiline />
                    {task.description && task.description !== task.scope && (
                      <InfoBlock label="Descrição" icon={FileText} value={task.description} multiline />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <InfoBlock label="Prioridade" icon={Flag} value={PRIORITY_CONFIG[task.priority ?? 'medium']?.label ?? '—'} accentColor={PRIORITY_CONFIG[task.priority ?? 'medium']?.color} />
                      <InfoBlock label="Tipo" icon={Flag} value={task.task_type ?? '—'} />
                      <InfoBlock label="Sprint" icon={Calendar} value={task.active_sprint?.goal ?? '—'} />
                    </div>
                    {task.expected_outcome && (
                      <InfoBlock label="Resultado Esperado" icon={CheckCircle2} value={task.expected_outcome} multiline />
                    )}
                  </SectionGroup>

                  <SectionGroup title="Planejamento e ownership" icon={Calendar}>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoBlock label="Responsável" icon={User} value={task.assignee?.full_name ?? 'Não atribuído'} />
<InfoBlock label="Criado por" icon={User} value={task.creator?.full_name ?? '—'} />
                      <InfoBlock label="Prazo" icon={Calendar} value={formatDate(task.deadline)} />
                      <InfoBlock label="Prazo Alvo" icon={Calendar} value={formatDate(task.target_date)} />
                      <InfoBlock label="Criado em" icon={Clock} value={formatDate(task.created_at)} />
                      <InfoBlock label="Atualizado em" icon={Clock} value={formatDate(task.updated_at)} />
                    </div>
                  </SectionGroup>

                  {task.status === 'blocked' && (
                    <SectionGroup title="Bloqueio atual" icon={ShieldAlert}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoBlock label="Motivo do Bloqueio" icon={ShieldAlert} value={task.block_reason ?? '—'} multiline accent="#ef4444" />
                        <InfoBlock label="Categoria do Bloqueio" icon={ShieldAlert} value={task.block_category ?? '—'} accent="#ef4444" />
                      </div>
                    </SectionGroup>
                  )}

                </div>
              )}
            </div>
          )}

          {tab === 'progress' && (
            <div className="space-y-4">
              {task.status !== 'in_progress' && !task.progress ? (
                <EmptyState text="Progresso disponível apenas para tasks Em Andamento." />
              ) : (
                <>
                  {task.progress && !editProgress && (
                    <div className="space-y-4">
                      <SectionGroup title="Execução atual" icon={Clock}>
                        <InfoBlock label="O que já foi feito" icon={CheckCircle2} value={task.progress.already_done} multiline accent="#10b981" />
                        <InfoBlock label="O que está sendo feito" icon={Clock} value={task.progress.currently_doing} multiline accent="#3b82f6" />
                        <InfoBlock label="O que falta" icon={AlertCircle} value={task.progress.remaining} multiline accent="#f59e0b" />
                        {(task as TaskDetail & { dependency_updates?: string | null }).dependency_updates && (
                          <InfoBlock
                            label="Atualização de Dependências"
                            icon={GitBranch}
                            value={(task as TaskDetail & { dependency_updates?: string | null }).dependency_updates!}
                            multiline
                            accent="#6366f1"
                          />
                        )}
                      </SectionGroup>
                      <p className="text-xs text-zinc-400 dark:text-zinc-600">Atualizado em {formatDate(task.progress.updated_at)}</p>
                      {task.status === 'in_progress' && (
                        <button
                          onClick={startEditProgress}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                        >
                          <Edit3 className="w-3 h-3" /> Editar Progresso
                        </button>
                      )}
                    </div>
                  )}

                  {!task.progress && task.status === 'in_progress' && !editProgress && (
                    <div className="space-y-3">
                      <EmptyState text="Nenhum progresso registrado ainda." />
                      <button
                        onClick={startEditProgress}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                      >
                        <Edit3 className="w-3 h-3" /> Adicionar Progresso
                      </button>
                    </div>
                  )}

                  {editProgress && (
                    <div className="space-y-4">
                      <ProgressField label="O que já foi feito" value={alreadyDone} onChange={setAlreadyDone} accent="#10b981" />
                      <ProgressField label="O que está sendo feito" value={currentlyDoing} onChange={setCurrentlyDoing} accent="#3b82f6" />
                      <ProgressField label="O que falta" value={remaining} onChange={setRemaining} accent="#f59e0b" />
                      <ProgressField label="Atualização de Dependências" value={dependencyUpdates} onChange={setDependencyUpdates} accent="#6366f1" />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={saveProgress}
                          disabled={saving}
                          className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-50"
                          style={{ background: accent }}
                        >
                          <Save className="w-3 h-3" />
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditProgress(false)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                        >
                          <XCircle className="w-3 h-3" /> Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'completion' && (
            <div className="space-y-4">
              {!task.completion ? (
                <EmptyState text="Relatório de conclusão não disponível." />
              ) : (
                <>
                  <SectionGroup title="Entrega registrada" icon={CheckCircle2}>
                    <InfoBlock label="Resumo técnico" icon={FileText} value={task.completion.summary} multiline accent="#10b981" />
                    <div
                      className="flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl"
                      style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98125' }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {task.completion.files_modified_count} arquivo(s) modificado(s)
                    </div>
                    {task.completion.files_modified_list?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Arquivos</p>
                        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-1 font-mono text-xs text-zinc-500 dark:text-zinc-400 max-h-36 overflow-y-auto">
                          {task.completion.files_modified_list.map((f, i) => (
                            <p key={i} className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">{f}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionGroup>

                  <SectionGroup title="Qualidade" icon={ListTodo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoBlock label="Motivo do atraso" icon={Clock} value={(task as TaskDetail & { delay_reason?: string | null }).delay_reason ?? '—'} multiline accent="#ef4444" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoBlock label="Houve retrabalho" icon={RotateCcw} value={formatBoolean((task as TaskDetail & { had_rework?: boolean | null }).had_rework)} />
                      <InfoBlock label="Houve atraso" icon={Clock} value={formatBoolean((task as TaskDetail & { had_delay?: boolean | null }).had_delay)} />
                      <InfoBlock label="Houve desvio de escopo" icon={AlertCircle} value={formatBoolean((task as TaskDetail & { had_scope_deviation?: boolean | null }).had_scope_deviation)} />
                    </div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600">Concluído em {formatDate(task.completion.completed_at)}</p>
                  </SectionGroup>
                </>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-4">
              {task.history.length === 0 ? (
                <EmptyState text="Nenhum histórico registrado." />
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                  {task.history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 pl-8 py-2 relative">
                      <div className="absolute left-2.5 top-3 w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 -translate-x-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{h.changer?.full_name ?? 'Sistema'}</span>
                          <span className="text-zinc-400 dark:text-zinc-600"> alterou </span>
                          <span className="font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-1 rounded">{h.field_changed}</span>
                          {h.old_value && (
                            <>
                              <span className="text-zinc-400 dark:text-zinc-600"> de </span>
                              <span className="text-zinc-400 dark:text-zinc-500 line-through">&quot;{h.old_value}&quot;</span>
                            </>
                          )}
                          <span className="text-zinc-400 dark:text-zinc-600"> para </span>
                          <span className="text-zinc-700 dark:text-zinc-300">&quot;{h.new_value}&quot;</span>
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{formatDate(h.changed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(task.block_events?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">Eventos de Bloqueio</p>
                  <div className="space-y-2">
                    {task.block_events?.map((event) => (
                      <div key={event.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
                        <p className="text-xs text-zinc-700 dark:text-zinc-200">
                          <span className="font-semibold">{event.event_kind === 'blocked' ? 'Bloqueio' : 'Desbloqueio'}</span>
                          <span className="text-zinc-400 dark:text-zinc-500"> em {formatDate(event.created_at)}</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          {event.reason || event.resolution_note || 'Sem detalhe adicional'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(task.reopen_events?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">Reaberturas</p>
                  <div className="space-y-2">
                    {task.reopen_events?.map((event) => (
                      <div key={event.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
                        <p className="text-xs text-zinc-700 dark:text-zinc-200">
                          <span className="font-semibold">Reaberta para {STATUS_LABELS[event.reopened_to_status]}</span>
                          <span className="text-zinc-400 dark:text-zinc-500"> em {formatDate(event.created_at)}</span>
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">{event.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
      {actionModal && (
        <TaskStatusActionModal
          open
          mode={actionModal.mode}
          taskTitle={task.title}
          targetStatus={actionModal.targetStatus}
          onConfirm={handleAction}
          onCancel={() => setActionModal(null)}
        />
      )}
      {transferModal && (
        <TransferTaskModal
          open
          task={task}
          profiles={profiles}
          onConfirm={async (data) => {
            try {
              await apiUpdateTask(task.id, { assignee_id: data.assignee_id });
              toast.success('Task transferida!');
              mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
              setTransferModal(false);
            } catch (e: any) {
              toast.error(e.message ?? 'Erro ao transferir task');
            }
          }}
          onCancel={() => setTransferModal(false)}
        />
      )}
    </Dialog>
  );
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return '—';
}

function SectionGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
        <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoBlock({
  label, icon: Icon, value, multiline, accent, accentColor,
}: {
  label: string;
  icon: typeof FileText;
  value: string;
  multiline?: boolean;
  accent?: string;
  accentColor?: string;
}) {
  const labelColor = accentColor ?? accent;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 flex-shrink-0" style={labelColor ? { color: labelColor } : undefined} />
        <p
          className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
          style={labelColor ? { color: labelColor } : undefined}
        >
          {label}
        </p>
      </div>
      <p
        className={`text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed ${multiline ? 'whitespace-pre-wrap' : ''}`}
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value || '—'}
      </p>
    </div>
  );
}

function EditLabel({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      <Icon className="w-3 h-3" /> {label}
    </label>
  );
}

function ProgressField({ label, value, onChange, accent }: { label: string; value: string; onChange: (v: string) => void; accent: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: accent }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="w-full bg-white dark:bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none transition-colors"
        style={{ borderColor: `${accent}30` }}
        onFocus={e => (e.target.style.borderColor = `${accent}70`)}
        onBlur={e => (e.target.style.borderColor = `${accent}30`)}
      />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm text-zinc-400 dark:text-zinc-600 italic text-center">{text}</p>
    </div>
  );
}
