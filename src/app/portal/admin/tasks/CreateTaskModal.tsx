'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, FileText, Tag, User, Flag } from 'lucide-react';
import { apiCreateTask, useAdminProfiles, TaskPriority } from './hooks/useTasks';
import { PRIORITY_CONFIG } from './TaskCard';
import { mutate } from 'swr';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export default function CreateTaskModal({ open, userId, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [coAssigneeId, setCoAssigneeId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { profiles } = useAdminProfiles();
  const isValid = title.trim() && scope.trim();

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await apiCreateTask({
        title: title.trim(),
        scope: scope.trim(),
        created_by: userId,
        priority,
        assignee_id: assigneeId || undefined,
        co_assignee_id: coAssigneeId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      toast.success('Task criada com sucesso!');
      mutate(key => typeof key === 'string' && key.startsWith('/api/admin/tasks'));
      handleClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao criar task');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTitle(''); setScope(''); setDeadline('');
    setPriority('medium'); setAssigneeId(''); setCoAssigneeId('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-lg p-0 gap-0 overflow-hidden rounded-2xl">

        {/* Accent bar */}
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #6366f1, #6366f140)' }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Plus className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">Nova Task</DialogTitle>
              <p className="text-xs text-zinc-600">Será adicionada ao Backlog</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              <Tag className="w-3 h-3" /> Título <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título curto e descritivo"
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              onKeyDown={e => e.key === 'Enter' && isValid && handleSubmit()}
            />
          </div>

          {/* Scope */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              <FileText className="w-3 h-3" /> Escopo <span className="text-red-400">*</span>
            </label>
            <textarea
              value={scope}
              onChange={e => setScope(e.target.value)}
              placeholder="Descreva detalhadamente o que precisa ser feito, contexto e critérios de aceitação..."
              rows={4}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              <Flag className="w-3 h-3" /> Prioridade
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map(p => {
                const pc = PRIORITY_CONFIG[p];
                const selected = priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
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
                <User className="w-3 h-3" /> Responsável <span className="text-zinc-700">(opcional)</span>
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              >
                <option value="">Não atribuído</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === coAssigneeId}>{p.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <User className="w-3 h-3" /> Co-responsável <span className="text-zinc-700">(opcional)</span>
              </label>
              <select
                value={coAssigneeId}
                onChange={e => setCoAssigneeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              >
                <option value="">Nenhum</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === assigneeId}>{p.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              <Calendar className="w-3 h-3" /> Prazo <span className="text-zinc-700">(opcional)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-2.5">
          <button
            onClick={handleClose}
            className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isValid ? '#6366f1' : '#6366f160' }}
          >
            <Plus className="w-3.5 h-3.5" />
            {loading ? 'Criando...' : 'Criar Task'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
