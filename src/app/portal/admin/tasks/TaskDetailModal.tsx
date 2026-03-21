'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  X, User, Calendar, Clock, FileText, History, CheckCircle2,
  AlertCircle, Edit3, Save, XCircle, Trash2, Flag,
} from 'lucide-react';
import { TaskDetail, TaskStatus, TaskPriority, apiUpdateProgress, apiUpdateTask, apiUpdateStatus, apiDeleteTask, useAdminProfiles } from './hooks/useTasks';
import { PRIORITY_CONFIG, COLUMN_ACCENT } from './TaskCard';
import { mutate } from 'swr';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'Em Andamento',
  review: 'Em Revisão',
  done: 'Concluído',
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
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Progress
  const [editProgress, setEditProgress] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState('');
  const [currentlyDoing, setCurrentlyDoing] = useState('');
  const [remaining, setRemaining] = useState('');
  const [saving, setSaving] = useState(false);

  const { profiles } = useAdminProfiles();

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
      // Se o status mudou, atualiza separadamente (usa a rota correta)
      if (editStatus !== task!.status) {
        await apiUpdateStatus(task!.id, { status: editStatus });
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
      setConfirmArchive(false);
    }
  }

  function startEditProgress() {
    setAlreadyDone(task!.progress?.already_done ?? '');
    setCurrentlyDoing(task!.progress?.currently_doing ?? '');
    setRemaining(task!.progress?.remaining ?? '');
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

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">

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
                <span className="flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Vencida
                </span>
              )}
            </div>
            <DialogTitle className="text-base font-bold text-zinc-100 leading-snug">{task.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.status !== 'archived' && !editMode && (
              <>
                <button
                  onClick={startEditTask}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                  title="Editar task"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                {!confirmArchive ? (
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Arquivar task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-xl px-2 py-1">
                    <span className="text-[11px] text-red-400 font-medium">Arquivar?</span>
                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {archiving ? '...' : 'Sim'}
                    </button>
                    <button
                      onClick={() => setConfirmArchive(false)}
                      className="text-[11px] text-zinc-600 hover:text-zinc-400"
                    >
                      Não
                    </button>
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-800 flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800/60 px-6 flex-shrink-0 gap-1">
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
                    : { borderBottomColor: 'transparent', color: '#52525b' }
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
                  {/* Title */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      <FileText className="w-3 h-3" /> Título
                    </label>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {/* Scope */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      <FileText className="w-3 h-3" /> Escopo
                    </label>
                    <textarea
                      value={editScope}
                      onChange={e => setEditScope(e.target.value)}
                      rows={4}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      <Clock className="w-3 h-3" /> Status
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(STATUS_LABELS) as TaskStatus[]).map(s => {
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

                  {/* Priority */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      <Flag className="w-3 h-3" /> Prioridade
                    </label>
                    <div className="flex gap-2 flex-wrap">
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

                  {/* Assignees */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        <User className="w-3 h-3" /> Responsável
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={e => setEditAssigneeId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      >
                        <option value="">Não atribuído</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === editCoAssigneeId}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        <User className="w-3 h-3" /> Co-responsável
                      </label>
                      <select
                        value={editCoAssigneeId}
                        onChange={e => setEditCoAssigneeId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                      >
                        <option value="">Nenhum</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id} disabled={p.id === editAssigneeId}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      <Calendar className="w-3 h-3" /> Prazo
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                    />
                  </div>

                  {/* Save / Cancel */}
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
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                    >
                      <XCircle className="w-3 h-3" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="space-y-4">
                  <InfoBlock label="Escopo" icon={FileText} value={task.scope} multiline />
                  <div className="grid grid-cols-2 gap-4">
                    <InfoBlock label="Prioridade" icon={Flag} value={PRIORITY_CONFIG[task.priority ?? 'medium']?.label ?? '—'} accentColor={PRIORITY_CONFIG[task.priority ?? 'medium']?.color} />
                    <InfoBlock label="Responsável" icon={User} value={task.assignee?.full_name ?? 'Não atribuído'} />
                    <InfoBlock label="Co-responsável" icon={User} value={task.co_assignee?.full_name ?? '—'} />
                    <InfoBlock label="Criado por" icon={User} value={task.creator?.full_name ?? '—'} />
                    <InfoBlock label="Prazo" icon={Calendar} value={formatDate(task.deadline)} />
                    <InfoBlock label="Criado em" icon={Clock} value={formatDate(task.created_at)} />
                    <InfoBlock label="Atualizado em" icon={Clock} value={formatDate(task.updated_at)} />
                  </div>
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
                      <InfoBlock label="O que já foi feito" icon={CheckCircle2} value={task.progress.already_done} multiline accent="#10b981" />
                      <InfoBlock label="O que está sendo feito" icon={Clock} value={task.progress.currently_doing} multiline accent="#3b82f6" />
                      <InfoBlock label="O que falta" icon={AlertCircle} value={task.progress.remaining} multiline accent="#f59e0b" />
                      <p className="text-xs text-zinc-600">Atualizado em {formatDate(task.progress.updated_at)}</p>
                      {task.status === 'in_progress' && (
                        <button
                          onClick={startEditProgress}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
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
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all"
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
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
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
                  <InfoBlock label="Resumo" icon={FileText} value={task.completion.summary} multiline accent="#10b981" />
                  <div
                    className="flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl"
                    style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98125' }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {task.completion.files_modified_count} arquivo(s) modificado(s)
                  </div>
                  {task.completion.files_modified_list?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Arquivos</p>
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1 font-mono text-xs text-zinc-400 max-h-36 overflow-y-auto">
                        {task.completion.files_modified_list.map((f, i) => (
                          <p key={i} className="hover:text-zinc-200 transition-colors">{f}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-zinc-600">Concluído em {formatDate(task.completion.completed_at)}</p>
                </>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {task.history.length === 0 ? (
                <EmptyState text="Nenhum histórico registrado." />
              ) : (
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-zinc-800" />
                  {task.history.map(h => (
                    <div key={h.id} className="flex items-start gap-3 pl-8 py-2 relative">
                      <div className="absolute left-2.5 top-3 w-1.5 h-1.5 rounded-full bg-zinc-600 -translate-x-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">
                          <span className="font-semibold text-zinc-300">{h.changer?.full_name ?? 'Sistema'}</span>
                          <span className="text-zinc-600"> alterou </span>
                          <span className="font-mono text-zinc-400 bg-zinc-800/80 px-1 rounded">{h.field_changed}</span>
                          {h.old_value && (
                            <>
                              <span className="text-zinc-600"> de </span>
                              <span className="text-zinc-500 line-through">"{h.old_value}"</span>
                            </>
                          )}
                          <span className="text-zinc-600"> para </span>
                          <span className="text-zinc-300">"{h.new_value}"</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{formatDate(h.changed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  return (
    <div
      className="rounded-xl p-3.5 border"
      style={{
        background: accent ? `${accent}08` : 'rgba(255,255,255,0.02)',
        borderColor: accent ? `${accent}20` : 'rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color: accentColor ?? accent ?? '#52525b' }} />
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor ?? accent ?? '#52525b' }}>
          {label}
        </p>
      </div>
      <p
        className={`text-sm text-zinc-200 leading-relaxed ${multiline ? 'whitespace-pre-wrap' : ''}`}
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value || '—'}
      </p>
    </div>
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
        className="w-full bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none transition-colors"
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
      <p className="text-sm text-zinc-600 italic text-center">{text}</p>
    </div>
  );
}
