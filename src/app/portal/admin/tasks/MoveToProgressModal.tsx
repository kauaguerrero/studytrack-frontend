'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Play, CheckCircle2, Clock, AlertCircle, ArrowRight, ArrowLeft, Copy, Check, Bot } from 'lucide-react';
import type { Task } from './hooks/useTasks';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature: 'Feature',
  improvement: 'Melhoria',
  tech_debt: 'Dívida técnica',
  ops: 'Operação',
  other: 'Outro',
};

interface Props {
  open: boolean;
  task: Task;
  onConfirm: (data: { already_done: string; currently_doing: string; remaining: string }) => Promise<void>;
  onCancel: () => void;
}

function buildClaudePrompt(task: Task, progress: { already_done: string; currently_doing: string; remaining: string }) {
  const lines: string[] = [];

  lines.push(`Task: ${task.title}`);
  lines.push('');

  if (task.task_type) {
    lines.push(`Tipo: ${TASK_TYPE_LABELS[task.task_type] ?? task.task_type}`);
  }
  lines.push(`Prioridade: ${PRIORITY_LABELS[task.priority] ?? task.priority}`);
  if (task.active_sprint?.goal) {
    lines.push(`Sprint: ${task.active_sprint.goal}`);
  }
  lines.push('');

  lines.push('Escopo:');
  lines.push(task.scope);
  lines.push('');

  if (task.expected_outcome) {
    lines.push('Resultado esperado:');
    lines.push(task.expected_outcome);
    lines.push('');
  }

  if (task.acceptance_criteria) {
    lines.push('Critérios de aceite:');
    lines.push(task.acceptance_criteria);
    lines.push('');
  }

  if (progress.already_done || progress.currently_doing || progress.remaining) {
    lines.push('Contexto de execução:');
    if (progress.already_done) lines.push(`Já foi feito: ${progress.already_done}`);
    if (progress.currently_doing) lines.push(`Sendo feito agora: ${progress.currently_doing}`);
    if (progress.remaining) lines.push(`Ainda falta: ${progress.remaining}`);
  }

  return lines.join('\n');
}

export default function MoveToProgressModal({ open, task, onConfirm, onCancel }: Props) {
  const [already_done, setAlreadyDone] = useState('');
  const [currently_doing, setCurrentlyDoing] = useState('');
  const [remaining, setRemaining] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isValid = Boolean(already_done.trim() && currently_doing.trim() && remaining.trim());
  const flowProgress = ((currentStep + 1) / 2) * 100;

  const claudePrompt = buildClaudePrompt(task, {
    already_done: already_done.trim(),
    currently_doing: currently_doing.trim(),
    remaining: remaining.trim(),
  });

  function handleCopy() {
    navigator.clipboard.writeText(claudePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  function handleClose() {
    setAlreadyDone('');
    setCurrentlyDoing('');
    setRemaining('');
    setCurrentStep(0);
    setCopied(false);
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl w-[calc(100%-2rem)] p-0 gap-0 rounded-[28px] flex flex-col max-h-[min(92vh,760px)] overflow-hidden">
        <div className="h-[4px]" style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />

        <div className="px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Play className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-zinc-900 dark:text-zinc-100">Preparar execução</DialogTitle>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{task.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Passo {currentStep + 1} de 2
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
          <div className="mx-auto max-w-3xl space-y-4">
            {currentStep === 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Contexto para o Claude</p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all"
                    style={copied
                      ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)', color: '#10b981' }
                      : { background: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.30)', color: '#3b82f6' }
                    }
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Copie o bloco abaixo e cole no Claude Web para iniciar a execução com contexto completo.
                </p>
                <pre className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-4 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-[340px]">
                  {claudePrompt}
                </pre>
              </div>
            )}

            {currentStep === 1 && (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="px-6 pb-5 pt-4 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800/60 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {currentStep === 0
              ? 'Copie o contexto e continue para registrar o progresso.'
              : isValid ? 'Você pode iniciar a execução.' : 'Complete todos os campos antes de continuar.'}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClose}
              className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            {currentStep === 1 && (
              <button
                onClick={() => setCurrentStep(0)}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}
            {currentStep === 0 ? (
              <button
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white"
                style={{ background: '#3b82f6' }}
              >
                Continuar
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#3b82f6' }}
              >
                <Play className="w-3.5 h-3.5" />
                {loading ? 'Movendo...' : 'Iniciar execução'}
              </button>
            )}
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
