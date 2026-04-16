'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, FileText, Code2, TimerReset, ArrowRight, ArrowLeft } from 'lucide-react';

interface CompletionReport {
  files_modified_count: number;
  files_modified_list: string[];
  summary: string;
  had_rework: boolean;
  had_delay: boolean;
  had_scope_deviation: boolean;
  delay_reason?: string;
}

interface Props {
  open: boolean;
  taskTitle: string;
  onConfirm: (data: CompletionReport) => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 'delivery' },
  { id: 'quality' },
] as const;

export default function CompleteTaskModal({ open, taskTitle, onConfirm, onCancel }: Props) {
  const [summary, setSummary] = useState('');
  const [filesRaw, setFilesRaw] = useState('');
  const [hadRework, setHadRework] = useState<boolean | null>(null);
  const [hadDelay, setHadDelay] = useState<boolean | null>(null);
  const [hadScopeDeviation, setHadScopeDeviation] = useState<boolean | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const filesList = useMemo(
    () => filesRaw.split('\n').map((f) => f.trim()).filter(Boolean),
    [filesRaw]
  );

  const isValid = Boolean(
    summary.trim() &&
    hadRework !== null &&
    hadDelay !== null &&
    hadScopeDeviation !== null &&
    (hadDelay !== true || delayReason.trim())
  );

  const stepReady = [
    Boolean(summary.trim()),
    Boolean(hadRework !== null && hadDelay !== null && hadScopeDeviation !== null && (hadDelay !== true || delayReason.trim())),
  ];
  const isLastStep = currentStep === STEPS.length - 1;
  const flowProgress = ((currentStep + 1) / STEPS.length) * 100;

  async function handleConfirm() {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm({
        files_modified_count: filesList.length,
        files_modified_list: filesList,
        summary: summary.trim(),
        had_rework: hadRework ?? false,
        had_delay: hadDelay ?? false,
        had_scope_deviation: hadScopeDeviation ?? false,
        delay_reason: hadDelay ? delayReason.trim() : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden rounded-[28px] flex flex-col max-h-[min(92vh,860px)]">
        <div className="h-[4px]" style={{ background: 'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)' }} />

        <div className="px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100">Fechamento operacional</DialogTitle>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{taskTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Passo {currentStep + 1} de {STEPS.length}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${flowProgress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <FieldLabel icon={FileText} label="Resumo técnico da conclusão" required />
                  <textarea
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    placeholder="Descreva a implementação realizada, os pontos alterados e o resultado técnico."
                    rows={5}
                    className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none"
                  />
                </div>

                <div>
                  <FieldLabel icon={Code2} label="Arquivos modificados" />
                  <textarea
                    value={filesRaw}
                    onChange={e => setFilesRaw(e.target.value)}
                    placeholder={'src/components/Foo.tsx\napp/services/bar.py'}
                    rows={5}
                    className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {filesList.length > 0
                      ? `${filesList.length} arquivo(s) listado(s)`
                      : 'Esse campo pode ficar vazio, mas ajuda na rastreabilidade técnica.'}
                  </p>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <BooleanField label="Houve retrabalho?" value={hadRework} onChange={setHadRework} accent="#f59e0b" />
                  <BooleanField label="Houve atraso?" value={hadDelay} onChange={setHadDelay} accent="#ef4444" />
                  <BooleanField label="Houve desvio de escopo?" value={hadScopeDeviation} onChange={setHadScopeDeviation} accent="#8b5cf6" />
                </div>

                {hadDelay === true && (
                  <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4">
                    <FieldLabel icon={TimerReset} label="Motivo do atraso" required />
                    <textarea
                      value={delayReason}
                      onChange={e => setDelayReason(e.target.value)}
                      placeholder="Explique o que gerou o atraso e por que ele ocorreu."
                      rows={3}
                      className="mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 resize-none focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {stepReady[currentStep] || isLastStep ? 'Você pode seguir.' : 'Complete os campos essenciais deste passo para continuar.'}
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
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#10b981' }}
              >
                Continuar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#10b981' }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {loading ? 'Concluindo...' : 'Concluir task'}
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
  icon: typeof FileText;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
      <Icon className="w-3.5 h-3.5" />
      {label}
      {required && (
        <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[9px] text-red-600 dark:text-red-300">
          Obrigatório
        </span>
      )}
    </label>
  );
}

function BooleanField({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all"
          style={{
            background: value === true ? `${accent}20` : 'transparent',
            color: value === true ? accent : '#a1a1aa',
            border: `1px solid ${value === true ? `${accent}60` : 'rgba(113,113,122,0.25)'}`,
          }}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
            value === false
              ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600'
              : 'bg-transparent text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700/40'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  );
}
