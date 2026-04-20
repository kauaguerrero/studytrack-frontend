'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, RotateCcw, ShieldAlert, Unlock, ArrowRight, ArrowLeft } from 'lucide-react';
import type { TaskStatus } from './hooks/useTasks';

type Mode = 'block' | 'unblock' | 'reopen';

interface Props {
  open: boolean;
  mode: Mode;
  taskTitle: string;
  targetStatus?: TaskStatus;
  onConfirm: (payload: Record<string, unknown>) => Promise<void> | void;
  onCancel: () => void;
}

const MODE_META = {
  block: {
    title: 'Bloquear Task',
    icon: ShieldAlert,
    accent: '#ef4444',
    description: 'Registro de bloqueio.',
  },
  unblock: {
    title: 'Desbloquear Task',
    icon: Unlock,
    accent: '#10b981',
    description: 'Retorno ao fluxo.',
  },
  reopen: {
    title: 'Reabrir Task',
    icon: RotateCcw,
    accent: '#f59e0b',
    description: 'Reabertura da task.',
  },
} as const;

export default function TaskStatusActionModal({
  open,
  mode,
  taskTitle,
  targetStatus,
  onConfirm,
  onCancel,
}: Props) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [nextStatus, setNextStatus] = useState<TaskStatus>(targetStatus ?? 'in_progress');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const blockCategories = [
    { value: 'dependency', label: 'Dependência' },
    { value: 'validation', label: 'Validação' },
    { value: 'scope', label: 'Escopo' },
    { value: 'access', label: 'Acesso' },
    { value: 'third_party', label: 'Terceiro' },
  ];

  useEffect(() => {
    setReason('');
    setCategory('');
    setExpectedDate('');
    setResolutionNote('');
    setNextStatus(targetStatus ?? 'in_progress');
    setCurrentStep(0);
  }, [mode, targetStatus, open]);

  const steps = useMemo(() => {
    if (mode === 'block') {
      return [
        {
          eyebrow: 'Passo 1',
          title: 'Por que a task está bloqueada?',
          description: 'Registre motivo, categoria e previsão de desbloqueio antes de confirmar.',
        },
        {
          eyebrow: 'Passo 2',
          title: 'Confirmar registro do bloqueio',
          description: 'Revise o resumo antes de enviar a ação para o histórico operacional.',
        },
      ] as const;
    }

    if (mode === 'unblock') {
      return [
        {
          eyebrow: 'Passo 1',
          title: 'Para onde a task volta?',
          description: 'Escolha o destino válido e, se fizer sentido, descreva o que mudou.',
        },
        {
          eyebrow: 'Passo 2',
          title: 'Confirmar desbloqueio',
          description: 'Revise o retorno da task ao fluxo antes de concluir.',
        },
      ] as const;
    }

    return [
      {
        eyebrow: 'Passo 1',
        title: 'Por que a task precisa ser reaberta?',
        description: 'Defina o motivo principal e a categoria da causa, quando aplicável.',
      },
      {
        eyebrow: 'Passo 2',
        title: 'Qual será o novo destino?',
        description: 'Escolha para onde a task volta e confirme a reabertura.',
      },
    ] as const;
  }, [mode]);

  const stepReady = useMemo(() => {
    if (mode === 'block') {
      return [
        reason.trim().length > 0 && category.trim().length > 0 && expectedDate.length > 0,
        reason.trim().length > 0 && category.trim().length > 0 && expectedDate.length > 0,
      ];
    }

    if (mode === 'unblock') {
      const validDestination = ['in_progress', 'review'].includes(nextStatus);
      return [validDestination, validDestination];
    }

    const validDestination = ['in_progress', 'review', 'blocked'].includes(nextStatus);
    return [reason.trim().length > 0, reason.trim().length > 0 && validDestination];
  }, [mode, reason, category, expectedDate, nextStatus]);

  const isValid =
    mode === 'block'
      ? reason.trim().length > 0 && category.trim().length > 0 && expectedDate.length > 0
      : mode === 'unblock'
        ? ['in_progress', 'review'].includes(nextStatus)
        : reason.trim().length > 0 && ['in_progress', 'review', 'blocked'].includes(nextStatus);

  async function handleConfirm() {
    setLoading(true);
    try {
      if (mode === 'block') {
        await onConfirm({
          reason: reason.trim(),
          category: category.trim(),
          expected_unblock_date: expectedDate ? new Date(expectedDate).toISOString() : null,
        });
      } else if (mode === 'unblock') {
        await onConfirm({
          target_status: nextStatus,
          resolution_note: resolutionNote.trim() || null,
        });
      } else {
        await onConfirm({
          target_status: nextStatus,
          reason: reason.trim(),
          category: category.trim() || null,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const isLastStep = currentStep === steps.length - 1;
  const flowProgress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onCancel()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-3xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden rounded-[28px] flex flex-col max-h-[min(92vh,720px)]">
        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${meta.accent}, ${meta.accent}40)` }} />

        <div className="px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${meta.accent}20` }}>
              <Icon className="w-4 h-4" style={{ color: meta.accent }} />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-zinc-900 dark:text-zinc-100">{meta.title}</DialogTitle>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{taskTitle}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Passo {currentStep + 1} de {steps.length}</span>
            <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${flowProgress}%`, background: meta.accent }} />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {mode === 'block' && currentStep === 0 && (
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">
                    Motivo <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Explique o impedimento atual e por que ele trava a entrega."
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">
                      Categoria <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                    >
                      <option value="">Selecione a categoria</option>
                      {blockCategories.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">
                      Previsão de desbloqueio <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </section>
            )}

            {mode === 'unblock' && currentStep === 0 && (
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">Retornar para</label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as TaskStatus)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">Nota de resolução</label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={4}
                    placeholder="Explique como o bloqueio foi resolvido e o que mudou para a task voltar ao fluxo."
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                  />
                </div>
              </section>
            )}

            {mode === 'reopen' && currentStep === 0 && (
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">
                    Motivo <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="Explique por que a task precisa voltar ao fluxo operacional."
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">Categoria da causa</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="quality, validação, regressão..."
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                  />
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/70 p-5 space-y-4">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-3">Resumo da ação</p>
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                    <SummaryRow label="Task" value={taskTitle} />
                    {mode === 'block' && <SummaryRow label="Motivo" value={reason || 'Não informado'} />}
                    {mode === 'block' && <SummaryRow label="Categoria" value={category || 'Não informada'} />}
                    {mode === 'block' && <SummaryRow label="Previsão" value={expectedDate || 'Não informada'} />}
                    {mode === 'unblock' && <SummaryRow label="Destino" value={nextStatus} />}
                    {mode === 'unblock' && <SummaryRow label="Nota de resolução" value={resolutionNote || 'Sem nota adicional'} />}
                    {mode === 'reopen' && <SummaryRow label="Motivo" value={reason || 'Não informado'} />}
                    {mode === 'reopen' && <SummaryRow label="Categoria" value={category || 'Não informada'} />}
                    {mode === 'reopen' && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-2">Destino</label>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value as TaskStatus)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none"
                        >
                          <option value="review">Review</option>
                          <option value="in_progress">In Progress</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {!isValid && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Preencha os campos obrigatórios antes de continuar.
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {stepReady[currentStep] || isLastStep ? 'Você pode seguir.' : 'Complete este passo antes de avançar.'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onCancel}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((step) => step - 1)}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
            {!isLastStep ? (
              <button
                onClick={() => setCurrentStep((step) => step + 1)}
                disabled={!stepReady[currentStep]}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40"
                style={{ background: meta.accent }}
              >
                Continuar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40"
                style={{ background: meta.accent }}
              >
                {loading ? 'Salvando...' : meta.title}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 mb-1">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-200">{value}</p>
    </div>
  );
}
