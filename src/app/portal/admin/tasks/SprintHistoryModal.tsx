'use client';

import { CheckCircle2, History, TimerReset } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sprint } from './hooks/useTasks';

interface Props {
  open: boolean;
  onClose: () => void;
  sprints: Sprint[];
}

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SprintHistoryModal({ open, onClose, sprints }: Props) {
  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl p-0 gap-0 overflow-hidden rounded-3xl">
        <div className="h-[3px]" style={{ background: 'linear-gradient(90deg, #10b981, #10b98140)' }} />
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <History className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">Histórico de sprints</DialogTitle>
            <p className="text-xs text-zinc-500">Consulta rápida das últimas sprints encerradas.</p>
          </div>
        </div>

        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-4">
          {sprints.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Nenhuma sprint concluída ainda</p>
              <p className="text-xs text-zinc-500">Quando as primeiras sprints forem encerradas, o resumo aparece aqui.</p>
            </div>
          ) : sprints.map(sprint => (
            <div
              key={sprint.id}
              className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-5 py-5"
            >
              <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Encerrada
                  </span>
                  <span className="text-xs text-zinc-500">{formatDate(sprint.completed_at)}</span>
                </div>
                <span className="text-xs text-zinc-500">{sprint.completed_tasks}/{sprint.total_tasks} concluídas</span>
              </div>

              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3 leading-snug">{sprint.goal}</h3>

              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
                <TimerReset className="w-3.5 h-3.5" />
                <span>{formatDate(sprint.start_date)} - {formatDate(sprint.end_date)}</span>
              </div>

              {sprint.report_final_summary_final && (
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100/60 dark:bg-black/10 px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resumo final</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {sprint.report_final_summary_final}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
