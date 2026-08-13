'use client';

// Botão circular discreto que se expande revelando um rótulo ao passar o
// mouse — usado onde um botão de texto full-time ocuparia espaço demais
// (ex: cards compactos), mas o ícone sozinho não é auto-explicativo o
// bastante. Adaptado do "button-7" (21st.dev): trocou o link/seta genéricos
// por ícone+texto customizáveis via props.

import type { LucideIcon } from 'lucide-react';

export function ExpandingIconButton({
  icon: Icon,
  label,
  onClick,
  className = '',
  title,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#656fe2] bg-gradient-to-r from-[#c0c7ff] to-[#4c64ff] font-medium text-white transition-all duration-300 hover:w-28 dark:from-[#070e41] dark:to-[#263381] ${className}`}
    >
      <span className="inline-flex whitespace-nowrap text-xs opacity-0 transition-all duration-200 group-hover:-translate-x-2.5 group-hover:opacity-100">
        {label}
      </span>
      <span className="absolute right-2.5">
        <Icon className="h-4 w-4" />
      </span>
    </button>
  );
}
