'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Plus, Calendar, FileText, Tag, User, Flag, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiCreateTask, useAdminProfiles, TaskPriority } from './hooks/useTasks';
import { PRIORITY_CONFIG } from './TaskCard';
import { mutate } from 'swr';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
const TASK_TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Melhoria' },
  { value: 'tech_debt', label: 'Dívida técnica' },
  { value: 'ops', label: 'Operação' },
  { value: 'other', label: 'Outro' },
] as const;
const STEPS = [
  {
    id: 'definition',
  },
  {
    id: 'classification',
  },
] as const;

export default function CreateTaskModal({ open, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState('');
  const [customTaskType, setCustomTaskType] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { profiles } = useAdminProfiles();
  const resolvedTaskType = taskType === 'other' ? customTaskType.trim() : taskType;
  const requiredFields = {
    title: title.trim().length > 0,
    scope: scope.trim().length > 0,
    expectedOutcome: expectedOutcome.trim().length > 0,
    priority: !!priority,
    taskType: resolvedTaskType.length > 0,
  };
  const isValid = Object.values(requiredFields).every(Boolean);
  const stepReady = [
    requiredFields.title && requiredFields.scope && requiredFields.expectedOutcome,
    requiredFields.priority && requiredFields.taskType,
  ];
  const canAdvance = stepReady[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const flowProgress = ((currentStep + 1) / STEPS.length) * 100;
  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    try {
      await apiCreateTask({
        title: title.trim(),
        scope: scope.trim(),
        priority,
        assignee_ids: assigneeIds.length ? assigneeIds : undefined,
        target_date: targetDate ? new Date(targetDate).toISOString() : undefined,
        task_type: resolvedTaskType || undefined,
        expected_outcome: expectedOutcome || undefined,
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
    setTitle(''); setScope(''); setTargetDate('');
    setPriority('medium'); setAssigneeIds([]);
    setTaskType(''); setCustomTaskType(''); setExpectedOutcome('');
    setCurrentStep(0);
    onClose();
  }

  function handleNext() {
    if (!canAdvance || isLastStep) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function handlePrevious() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  const submitLabel = loading ? 'Criando...' : 'Criar Task';

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden rounded-[28px] flex flex-col max-h-[min(92vh,860px)]">
        <div className="h-[4px]" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb, #60a5fa)' }} />

        <div className="px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100">Nova Task</DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Criação por etapas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Passo {currentStep + 1} de {STEPS.length}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${flowProgress}%`, background: 'linear-gradient(90deg, #2563eb, #60a5fa)' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <FieldLabel icon={Tag} label="Título" required />
                    <input
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Ajustar fluxo de reset de senha no portal"
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm"
                    />
                  </div>

                  <div>
                    <FieldLabel icon={FileText} label="Escopo" required />
                    <textarea
                      value={scope}
                      onChange={e => setScope(e.target.value)}
                      placeholder="Explique o problema, o contexto e o limite do que deve ser feito."
                      rows={5}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <FieldLabel icon={CheckCircle2} label="Resultado esperado" required />
                    <textarea
                      value={expectedOutcome}
                      onChange={e => setExpectedOutcome(e.target.value)}
                      rows={4}
                      placeholder="Ex: usuário consegue redefinir a senha sem erro e recebe feedback claro na tela."
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <FieldLabel icon={Flag} label="Prioridade" required />
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {PRIORITIES.map(p => {
                        const pc = PRIORITY_CONFIG[p];
                        const selected = priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className="text-xs font-bold px-3.5 py-2 rounded-xl transition-all border"
                            style={{
                              background: selected ? pc.bg : 'transparent',
                              color: selected ? pc.color : '#71717a',
                              borderColor: selected ? pc.border : 'rgba(113,113,122,0.25)',
                            }}
                          >
                            {pc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px),1fr] gap-5">
                    <div>
                      <FieldLabel icon={Tag} label="Tipo" required />
                      <select
                        value={taskType}
                        onChange={e => setTaskType(e.target.value)}
                        className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm"
                      >
                        <option value="">Selecione o tipo</option>
                        {TASK_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>

                      {taskType === 'other' && (
                        <input
                          value={customTaskType}
                          onChange={e => setCustomTaskType(e.target.value)}
                          placeholder="Descreva o tipo"
                          className="mt-3 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm"
                        />
                      )}
                    </div>

                    <div>
                      <FieldLabel icon={User} label="Responsáveis" />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profiles.map((profile) => {
                          const active = assigneeIds.includes(profile.id);
                          return (
                            <button
                              key={profile.id}
                              type="button"
                              onClick={() => setAssigneeIds((current) => (
                                current.includes(profile.id)
                                  ? current.filter((id) => id !== profile.id)
                                  : [...current, profile.id]
                              ))}
                              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all"
                              style={{
                                background: active ? 'rgba(37,99,235,0.10)' : 'transparent',
                                borderColor: active ? 'rgba(37,99,235,0.35)' : 'rgba(113,113,122,0.22)',
                                color: active ? '#2563eb' : undefined,
                              }}
                            >
                              <span className={`h-2 w-2 rounded-full ${active ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                              {profile.full_name}
                            </button>
                          );
                        })}
                      </div>
                      {assigneeIds.length > 0 && (
                        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          {assigneeIds.length} selecionado(s)
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <FieldLabel icon={Calendar} label="Prazo" />
                    <input
                      type="date"
                      value={targetDate}
                      onChange={e => setTargetDate(e.target.value)}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {canAdvance || isLastStep ? 'Você pode seguir.' : 'Complete os campos essenciais deste passo para continuar.'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClose}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
            {!isLastStep ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#2563eb' }}
              >
                Continuar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#2563eb' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {submitLabel}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({
  icon: Icon,
  label,
  required,
}: {
  icon: typeof Tag;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
      <Icon className="w-3.5 h-3.5" />
      {label}
      {required && <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[9px] text-red-600 dark:text-red-300">Obrigatório</span>}
    </label>
  );
}
