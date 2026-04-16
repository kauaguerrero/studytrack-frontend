'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Play, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  open: boolean;
  taskTitle: string;
  onConfirm: (data: { already_done: string; currently_doing: string; remaining: string }) => Promise<void>;
  onCancel: () => void;
}

export default function MoveToProgressModal({ open, taskTitle, onConfirm, onCancel }: Props) {
  const [already_done, setAlreadyDone] = useState('');
  const [currently_doing, setCurrentlyDoing] = useState('');
  const [remaining, setRemaining] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = Boolean(already_done.trim() && currently_doing.trim() && remaining.trim());

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm({
        already_done: already_done.trim(),
        currently_doing: currently_doing.trim(),
        remaining: remaining.trim(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl w-[calc(100%-2rem)] p-0 gap-0 rounded-[28px] flex flex-col max-h-[min(92vh,760px)] overflow-hidden">
        <div className="h-[4px]" style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />

        <div className="px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100">Preparar execução</DialogTitle>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{taskTitle}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <ProgressField
              label="O que já foi feito?"
              icon={CheckCircle2}
              accent="#10b981"
              value={already_done}
              onChange={setAlreadyDone}
              placeholder="Descreva o que já foi concluído..."
            />
            <ProgressField
              label="O que está sendo feito agora?"
              icon={Clock}
              accent="#3b82f6"
              value={currently_doing}
              onChange={setCurrentlyDoing}
              placeholder="Descreva a atividade atual..."
            />
            <ProgressField
              label="O que ainda falta?"
              icon={AlertCircle}
              accent="#f59e0b"
              value={remaining}
              onChange={setRemaining}
              placeholder="Descreva o que resta para concluir..."
            />
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {isValid ? 'Você pode seguir.' : 'Complete todos os campos antes de continuar.'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancel}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#3b82f6' }}
            >
              <Play className="w-3.5 h-3.5" />
              {loading ? 'Movendo...' : 'Iniciar execução'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressField({
  label, icon: Icon, accent, value, onChange, placeholder,
}: {
  label: string;
  icon: typeof Clock;
  accent: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] mb-2"
        style={{ color: accent }}
      >
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-white dark:bg-zinc-900 border rounded-xl px-3.5 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none transition-colors"
        style={{ borderColor: `${accent}30` }}
      />
    </div>
  );
}
