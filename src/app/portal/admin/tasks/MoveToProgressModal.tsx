'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Play, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Crítica', color: '#ef4444', bg: '#ef444415' },
  high:     { label: 'Alta',    color: '#f97316', bg: '#f9731615' },
  medium:   { label: 'Média',   color: '#f59e0b', bg: '#f59e0b15' },
  low:      { label: 'Baixa',   color: '#6366f1', bg: '#6366f115' },
};

interface Props {
  open: boolean;
  taskTitle: string;
  taskScope?: string | null;
  taskPriority?: string | null;
  onConfirm: (data: { already_done: string; currently_doing: string; remaining: string }) => Promise<void>;
  onCancel: () => void;
}

export default function MoveToProgressModal({ open, taskTitle, taskScope, taskPriority, onConfirm, onCancel }: Props) {
  const [already_done, setAlreadyDone] = useState('');
  const [currently_doing, setCurrentlyDoing] = useState('');
  const [remaining, setRemaining] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = [
      `📋 Task: ${taskTitle}`,
      taskScope ? `📝 Escopo: ${taskScope}` : null,
      taskPriority ? `⚡ Prioridade: ${PRIORITY_CONFIG[taskPriority]?.label ?? taskPriority}` : null,
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isValid = already_done.trim() && currently_doing.trim() && remaining.trim();

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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl w-[calc(100%-2rem)] p-0 gap-0 rounded-2xl flex flex-col max-h-[min(90vh,700px)] overflow-hidden">

        {/* Accent bar */}
        <div className="h-[3px] rounded-t-2xl flex-shrink-0" style={{ background: 'linear-gradient(90deg, #3b82f6, #3b82f640)' }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-zinc-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#3b82f620' }}>
              <Play className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-zinc-100">Mover para Em Andamento</DialogTitle>
              <p className="text-xs text-zinc-600 truncate">{taskTitle}</p>
            </div>
          </div>
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Left — task context */}
          <div className="w-64 shrink-0 border-r border-zinc-800/60 flex flex-col overflow-y-auto">
            <div className="p-5 space-y-4 flex-1">

              {/* Nome */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Task</p>
                <p className="text-sm font-semibold text-zinc-100 leading-snug">{taskTitle}</p>
              </div>

              {/* Escopo */}
              {taskScope && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Escopo</p>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{taskScope}</p>
                </div>
              )}

              {/* Prioridade */}
              {taskPriority && PRIORITY_CONFIG[taskPriority] && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Prioridade</p>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      color: PRIORITY_CONFIG[taskPriority].color,
                      background: PRIORITY_CONFIG[taskPriority].bg,
                      border: `1px solid ${PRIORITY_CONFIG[taskPriority].color}30`,
                    }}
                  >
                    {PRIORITY_CONFIG[taskPriority].label}
                  </span>
                </div>
              )}
            </div>

            {/* Botão copiar — fixo na base da coluna esquerda */}
            <div className="p-4 border-t border-zinc-800/60 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg transition-all"
                style={{
                  background: copied ? '#10b98115' : '#6366f115',
                  color: copied ? '#10b981' : '#818cf8',
                  border: `1px solid ${copied ? '#10b98130' : '#6366f130'}`,
                }}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar contexto para o Claude'}
              </button>
            </div>
          </div>

          {/* Right — form fields */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
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

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-end gap-2.5 flex-shrink-0 border-t border-zinc-800/40 pt-4">
              <button
                onClick={onCancel}
                className="text-sm font-medium px-4 py-2 rounded-xl border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid || loading}
                className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#3b82f6' }}
              >
                <Play className="w-3.5 h-3.5" />
                {loading ? 'Movendo...' : 'Confirmar'}
              </button>
            </div>
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
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-zinc-900 border rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none transition-colors"
        style={{ borderColor: `${accent}30` }}
        onFocus={e => (e.target.style.borderColor = `${accent}60`)}
        onBlur={e => (e.target.style.borderColor = `${accent}30`)}
      />
    </div>
  );
}
