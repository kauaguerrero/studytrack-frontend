'use client';

import { Globe2, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (isPublic: boolean) => void;
}

// Pergunta obrigatória antes de criar uma questão por IA ou do zero: pública
// (entra no banco compartilhado, aguardando curadoria) ou privada (só do
// cursinho, direto, sem fila) — ver _save_question/_org_scope_filter no
// backend pra como cada escolha é persistida.
export function PublicPrivateDialog({ open, onClose, onChoose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Essa questão pode ser pública?</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
          Escolha se ela entra no banco compartilhado (passa por curadoria antes de ficar visível a outros
          cursinhos) ou se fica só no seu.
        </p>
        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => onChoose(true)}
            className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[var(--brand-primary)] dark:border-white/10"
          >
            <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Pública</span>
              <span className="block text-xs text-slate-500 dark:text-white/50">
                Entra no banco compartilhado, aguardando aprovação da curadoria.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose(false)}
            className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-[var(--brand-primary)] dark:border-white/10"
          >
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Só do meu cursinho</span>
              <span className="block text-xs text-slate-500 dark:text-white/50">
                Fica disponível direto, sem fila de curadoria, e não aparece pra outros cursinhos.
              </span>
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-white/70"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
