'use client';

import { ChevronRight, Search, X } from 'lucide-react';
import type { MetricLayer, SelectedRegion } from '../types';
import type { Lead } from '../../prospeccao/types';
import { METRIC_LAYERS, STATE_NAMES } from '../constants';
import { LeadSearch } from './LeadSearch';

export function MapControls({
  region,
  activeMetric,
  leads,
  filteredLeadId,
  onGoNational,
  onMetricChange,
  onLeadSelect,
  onLeadFilterClear,
  searchRef,
  searchValue,
  onSearchChange,
  onSearchClear,
  onSearchResult,
}: {
  region: SelectedRegion;
  activeMetric: MetricLayer;
  leads: Lead[];
  filteredLeadId: string | null;
  onGoNational: () => void;
  onMetricChange: (m: MetricLayer) => void;
  onLeadSelect: (lead: Lead) => void;
  onLeadFilterClear: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  searchValue: string;
  onSearchChange: (v: string) => void;
  onSearchClear: () => void;
  onSearchResult: (uf: string) => void;
}) {
  const q = searchValue.trim().toLowerCase();
  const matches = q.length > 0
    ? Object.entries(STATE_NAMES).filter(([uf, name]) =>
        name.toLowerCase().includes(q) || uf.toLowerCase().startsWith(q)
      )
    : [];

  function handleSelect(uf: string) {
    onSearchResult(uf);
    onSearchClear();
  }

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 text-sm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
        <button
          onClick={onGoNational}
          className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium"
        >
          Brasil
        </button>
        {region.level === 'state' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            <span className="text-slate-800 dark:text-white font-semibold">{region.name}</span>
          </>
        )}
      </div>

      <div className="hidden sm:block flex-1" />

      {/* Controls: metric toggle + lead search + state search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Metric toggle */}
        <div className="flex gap-1 bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5">
          {METRIC_LAYERS.map(m => (
            <button
              key={m.key}
              onClick={() => onMetricChange(m.key)}
              title={m.label}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeMetric === m.key
                  ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              {m.shortLabel}
            </button>
          ))}
        </div>

        {/* Lead search (by name or phone) */}
        <LeadSearch
          leads={leads}
          filteredLeadId={filteredLeadId}
          onSelect={onLeadSelect}
          onClear={onLeadFilterClear}
        />

        {/* State quick search (Ctrl+F) */}
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar estado"
            className="pl-7 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-48"
          />
          {searchValue && (
            <button
              onClick={onSearchClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          {matches.length > 0 && (
            <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 min-w-44 max-h-60 overflow-y-auto">
              {matches.map(([uf, name]) => (
                <button
                  key={uf}
                  onClick={() => handleSelect(uf)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-violet-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                >
                  <span className="font-mono text-xs text-slate-400 mr-1.5">{uf}</span>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
