'use client';

import { useRef, useState, useEffect } from 'react';
import { Building2, Search, X } from 'lucide-react';
import type { Lead } from '../../prospeccao/types';
import { FUNNEL_LABELS } from '../constants';

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function matchesQuery(lead: Lead, q: string): boolean {
  const norm = normalizeName(q);
  if (normalizeName(lead.razao_social).includes(norm)) return true;
  if (lead.nome_fantasia && normalizeName(lead.nome_fantasia).includes(norm)) return true;
  if (lead.telefone1 && lead.telefone1.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) return true;
  if (lead.telefone2 && lead.telefone2.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) return true;
  return false;
}

const STATUS_DOT: Record<string, string> = {
  fechado: 'bg-green-400',
  novo: 'bg-slate-300',
  perdido: 'bg-red-400',
};
function dotColor(s: string): string {
  return STATUS_DOT[s] ?? 'bg-amber-400';
}

export function LeadSearch({
  leads,
  filteredLeadId,
  onSelect,
  onClear,
}: {
  leads: Lead[];
  filteredLeadId: string | null;
  onSelect: (lead: Lead) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim();
  const matches: Lead[] = q.length >= 2
    ? leads.filter(l => matchesQuery(l, q)).slice(0, 10)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(lead: Lead) {
    setQuery('');
    setOpen(false);
    onSelect(lead);
  }

  function handleClear() {
    setQuery('');
    setOpen(false);
    onClear();
  }

  const activeLeadName = filteredLeadId
    ? (leads.find(l => l.id === filteredLeadId)?.nome_fantasia
      ?? leads.find(l => l.id === filteredLeadId)?.razao_social
      ?? null)
    : null;

  // When a filter is active, show pill instead of search input
  if (activeLeadName) {
    return (
      <div className="flex items-center gap-1.5 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-lg px-2.5 py-1.5 text-xs font-medium">
        <Building2 className="w-3 h-3 shrink-0" />
        <span className="max-w-36 truncate">{activeLeadName}</span>
        <button
          onClick={handleClear}
          title="Limpar filtro"
          className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={query}
        placeholder="Buscar cursinho…"
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="pl-7 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-44"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {open && matches.length > 0 && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-60 max-h-72 overflow-y-auto">
          {matches.map(lead => {
            const name = lead.nome_fantasia ?? lead.razao_social;
            const loc = [lead.municipio, lead.uf].filter(Boolean).join('/');
            return (
              <button
                key={lead.id}
                onClick={() => handleSelect(lead)}
                className="w-full text-left px-3 py-2 hover:bg-violet-50 dark:hover:bg-zinc-800 flex items-start gap-2.5"
              >
                <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${dotColor(lead.status_crm)}`} />
                <div className="min-w-0">
                  <p className="text-sm text-slate-800 dark:text-zinc-200 truncate font-medium">{name}</p>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">
                    {loc && <span>{loc} · </span>}
                    {FUNNEL_LABELS[lead.status_crm] ?? lead.status_crm}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && q.length >= 2 && matches.length === 0 && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg py-3 px-4 min-w-52 text-xs text-slate-400">
          Nenhum cursinho encontrado
        </div>
      )}
    </div>
  );
}
