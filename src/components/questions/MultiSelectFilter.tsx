'use client';

/**
 * Filtro de múltipla escolha no visual dos <select> do Banco de Questões:
 * os itens escolhidos viram chips removíveis dentro do campo e a lista abre
 * logo abaixo, com busca. Lista vazia = "todas as opções".
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Props {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  /** Cor do check sobre `--brand-primary` (marcas claras precisam de texto escuro). */
  accentTextColor?: string;
  /** Ícone fixo à esquerda do campo (ex.: calendário no filtro de ano). */
  icon?: ReactNode;
  /** Lado em que a lista se ancora quando é mais larga que o campo. */
  align?: 'left' | 'right';
  className?: string;
}

export function MultiSelectFilter({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Buscar...',
  accentTextColor = '#fff',
  icon,
  align = 'left',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => new Set(value), [value]);
  const visibleOptions = useMemo(() => {
    // Itens marcados continuam na lista mesmo que `options` (cruzado com os
    // outros filtros) não os traga mais — senão não daria para desmarcá-los ali.
    const all = [...options, ...value.filter((v) => !options.includes(v))];
    const term = search.trim().toLowerCase();
    return term ? all.filter((o) => o.toLowerCase().includes(term)) : all;
  }, [options, value, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
    setHighlighted(0);
  };

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setSearch('');
      setHighlighted(0);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const toggle = (option: string) => {
    onChange(selected.has(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // As setas/Enter/Backspace daqui não podem vazar para o atalho de teclado
    // global da página (navegação entre questões).
    e.stopPropagation();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, visibleOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = visibleOptions[highlighted];
      if (option) toggle(option);
    } else if (e.key === 'Escape') {
      close();
    } else if (e.key === 'Backspace' && !search && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {icon && (
        <span className="pointer-events-none absolute left-3 top-[23px] z-10 -translate-y-1/2 text-slate-400">{icon}</span>
      )}
      <div
        role="combobox"
        aria-expanded={open}
        // Só com a lista aberta: ela não existe fechada, e assim o id (que
        // diverge entre SSR e cliente nesta árvore) nunca vai no HTML do servidor.
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={
          'flex min-h-[46px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-xl border bg-white py-2 pr-8 shadow-sm transition-all dark:bg-slate-900 ' +
          (icon ? 'pl-8 ' : 'pl-2.5 ') +
          (open
            ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/20'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600')
        }
      >
        {value.map((item) => (
          <span
            key={item}
            title={item}
            className="inline-flex max-w-full items-center gap-1 rounded-lg py-1 pl-2 pr-1 text-xs font-bold text-slate-700 dark:text-slate-100"
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)' }}
          >
            <span className="truncate">{item}</span>
            <button
              type="button"
              aria-label={`Remover ${item}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(item);
              }}
              className="rounded p-0.5 text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={12} strokeWidth={3} />
            </button>
          </span>
        ))}

        {open ? (
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlighted(0);
            }}
            autoFocus
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? searchPlaceholder : ''}
            aria-autocomplete="list"
            className="min-w-[4rem] flex-1 bg-transparent px-1 text-sm font-semibold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-400 dark:text-slate-200"
          />
        ) : (
          value.length === 0 && (
            <span className="min-w-0 flex-1 truncate px-0.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{placeholder}</span>
          )
        )}
      </div>

      {value.length > 0 ? (
        <button
          type="button"
          aria-label="Limpar seleção"
          title="Limpar seleção"
          onClick={() => onChange([])}
          className="absolute right-2.5 top-[23px] -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        >
          <X size={14} />
        </button>
      ) : (
        <ChevronDown
          size={14}
          className={`pointer-events-none absolute right-3 top-[23px] -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable
          className={`absolute top-full z-40 mt-1.5 w-max min-w-full max-w-[18rem] ${align === 'right' ? 'right-0' : 'left-0'} max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900`}
        >
          {visibleOptions.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-400">Nenhuma opção encontrada</li>
          ) : (
            visibleOptions.map((option, idx) => {
              const isSelected = selected.has(option);
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(option)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors ${
                    idx === highlighted ? 'bg-slate-100 dark:bg-slate-800' : ''
                  } ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected ? 'border-transparent' : 'border-slate-300 dark:border-slate-600'
                    }`}
                    style={isSelected ? { background: 'var(--brand-primary)' } : undefined}
                  >
                    {isSelected && <Check size={11} strokeWidth={3.5} style={{ color: accentTextColor }} />}
                  </span>
                  <span className="min-w-0 break-words">{option}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
