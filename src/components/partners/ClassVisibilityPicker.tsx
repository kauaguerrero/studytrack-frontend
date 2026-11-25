'use client';

// "Quem vê": todas as turmas (padrão) ou só as turmas marcadas.
// Some sozinho quando a org ainda não tem turmas — aí tudo é de todos.

import { Users } from 'lucide-react';
import type { OrgClass } from '@/lib/org-classes';

interface Props {
  classes: OrgClass[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  hint?: string;
}

export function ClassVisibilityPicker({
  classes,
  value,
  onChange,
  label = 'Quem vê',
  hint = 'Sem turma marcada, todos os alunos da escola veem.',
}: Props) {
  if (!classes.length) return null;
  const selected = new Set(value);
  const all = selected.size === 0;

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(classes.filter((c) => next.has(c.id)).map((c) => c.id));
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
      active
        ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
    }`;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
        <Users className="h-3 w-3" />
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        <button type="button" className={chip(all)} aria-pressed={all} onClick={() => onChange([])}>
          Todas as turmas
        </button>
        {classes.map((c) => (
          <button
            key={c.id}
            type="button"
            className={chip(selected.has(c.id))}
            aria-pressed={selected.has(c.id)}
            onClick={() => toggle(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}
