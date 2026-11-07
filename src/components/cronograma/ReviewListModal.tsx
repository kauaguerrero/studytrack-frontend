'use client';

import { CheckCircle2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDayMonth, type PlanItem } from '@/lib/cronograma';
import type { ReviewGroup } from './WeekBoard';
import { useStudentThemeRoot } from '@/hooks/useStudentThemeRoot';

export function ReviewListModal({
  group, onClose, onStart,
}: {
  group: ReviewGroup | null;
  onClose: () => void;
  onStart: (item: PlanItem) => void;
}) {
  const themeRoot = useStudentThemeRoot();
  return (
    <Dialog open={!!group} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white" container={themeRoot}>
        {group && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-[18px] text-slate-900 dark:text-white">
                Revisão · {group.area_label} · {formatDayMonth(group.date)}
              </DialogTitle>
              <DialogDescription className="text-[12.5px] text-slate-500 dark:text-white/60">
                Revisar no tempo certo é o que faz o conteúdo ficar até a prova. Cada revisão leva cerca de 15 min.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-1.5">
              {group.items.map((i) => (
                <li key={i.id}>
                  <button type="button" disabled={i.status === 'done' || i.projected} onClick={() => onStart(i)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left hover:shadow-md disabled:cursor-default disabled:hover:shadow-none dark:border-white/10 dark:bg-slate-900">
                    {i.status === 'done'
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      : <RotateCcw className="h-4 w-4 shrink-0 text-slate-400" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-slate-900 dark:text-white">{i.topic}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-white/50">
                        {i.q_discipline || i.subject}{i.projected ? ' · prevista' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
