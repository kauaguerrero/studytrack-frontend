'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight } from 'lucide-react';
import type { Task, AdminProfile } from './hooks/useTasks';

interface Props {
  open: boolean;
  task: Task;
  profiles: AdminProfile[];
  onConfirm: (data: { assignee_id: string | null; message?: string }) => Promise<void>;
  onCancel: () => void;
}

export default function TransferTaskModal({ open, task, profiles, onConfirm, onCancel }: Props) {
  const [transferTo, setTransferTo] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!transferTo) return;
    setLoading(true);
    try {
      await onConfirm({
        assignee_id: transferTo === '__none__' ? null : transferTo,
        message: message.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setTransferTo('');
    setMessage('');
    setLoading(false);
    onCancel();
  }

  const selectedName = profiles.find(p => p.id === transferTo)?.full_name;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-md w-[calc(100%-2rem)] p-0 gap-0 rounded-[24px] flex flex-col overflow-hidden">

        <div className="h-[3px] bg-gradient-to-r from-blue-500 to-indigo-400" />

        <div className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                Transferir task
              </DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{task.title}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {task.assignee && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Responsável atual:</span>
              {task.assignee.full_name}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
              Transferir para
            </label>
            <select
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
            >
              <option value="">Selecione um membro...</option>
              {profiles
                .filter(p => p.id !== task.assignee_id)
                .map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              {task.assignee_id && (
                <option value="__none__">Remover responsável</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5 block">
              Mensagem{' '}
              <span className="font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Contexto ou instruções ao transferir..."
              rows={3}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {selectedName ? `Para: ${selectedName}` : transferTo === '__none__' ? 'Responsável será removido' : ''}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!transferTo || loading}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              {loading ? 'Transferindo...' : 'Transferir'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
