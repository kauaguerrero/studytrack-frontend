'use client';

import { useState } from 'react';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { key: 'Esc', desc: 'Voltar ao Brasil' },
  { key: '← →', desc: 'Alternar métrica' },
  { key: 'Ctrl+F', desc: 'Busca rápida' },
];

export function KeyboardShortcutsHint() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors"
      >
        <Keyboard className="w-3.5 h-3.5" />
        Atalhos
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg p-3 min-w-48">
          <div className="space-y-1.5">
            {SHORTCUTS.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-4 text-xs">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded font-mono text-slate-600 dark:text-zinc-400">
                  {s.key}
                </kbd>
                <span className="text-slate-500 dark:text-zinc-400">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
