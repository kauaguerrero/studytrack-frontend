'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Target, MapPin, Download, List, LayoutGrid, Plus, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeads, useLeadsStats, reloadAllLeadsData } from './hooks/useLeads';
import { KPICards } from './components/KPICards';
import { FilterBar } from './components/FilterBar';
import { LeadsTable } from './components/LeadsTable';
import { KanbanBoard } from './components/KanbanBoard';
import { LeadDrawer } from './components/LeadDrawer';
import { ImportModal } from './components/ImportModal';
import { CreateLeadModal } from './components/CreateLeadModal';
import { ScheduleCallModal } from './components/ScheduleCallModal';
import { GoogleCalendarTokenBadge } from './components/GoogleCalendarTokenBadge';
import type { Lead, LeadFilters } from './types';

function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const EMPTY_FILTERS: LeadFilters = {
  uf: '',
  status: [],
  has_phone: false,
  search: '',
  temperature: '',
};

type View = 'table' | 'kanban';

export default function ProspeccaoPage() {
  const [view, setView] = useState<View>('table');
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleCallLead, setScheduleCallLead] = useState<Lead | null>(null);

  const { leads, isLoading: leadsLoading, error } = useLeads(filters);
  const { stats, isLoading: statsLoading } = useLeadsStats();

  // Derivado da lista (não guardado à parte) — assim o drawer sempre reflete o
  // dado mais recente do SWR sem precisar de um efeito pra "sincronizar" os dois.
  const selectedLead = selectedLeadId ? (leads.find((l) => l.id === selectedLeadId) ?? null) : null;

  // Client-side filtering for kanban (SWR já filtra na tabela via query string,
  // mas o Kanban precisa de todos os leads sem filtros de UF/status para as colunas)
  const filteredLeads = useMemo(() => {
    if (view === 'table') return leads;
    // Para kanban, aplicar filtros de busca/temperatura/contato client-side
    return leads.filter((l) => {
      if (filters.search) {
        const q = normalizeStr(filters.search);
        const digits = filters.search.replace(/\D/g, '');
        const haystack = normalizeStr(
          [l.nome_fantasia, l.razao_social, l.nome_socio, l.municipio, l.email]
            .filter(Boolean)
            .join(' ')
        );
        const matchesText = haystack.includes(q);
        const matchesDigits =
          digits.length > 0 &&
          [l.cnpj, l.telefone1, l.telefone2].some((v) => v?.replace(/\D/g, '').includes(digits));
        if (!matchesText && !matchesDigits) return false;
      }
      if (filters.has_phone && !l.telefone1 && !l.telefone2) return false;
      if (filters.temperature && l.temperature !== filters.temperature) return false;
      return true;
    });
  }, [leads, filters, view]);

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function handleLeadUpdate() {
    reloadAllLeadsData();
  }

  function handleExportCSV() {
    const params = new URLSearchParams();
    if (filters.uf) params.set('uf', filters.uf);
    for (const s of filters.status) params.append('status', s);
    if (filters.has_phone) params.set('has_phone', '1');
    if (filters.search) params.set('search', filters.search);
    if (filters.temperature) params.set('temperature', filters.temperature);
    const qs = params.toString();
    const url = `/api/admin/prospeccao/export${qs ? `?${qs}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
  }

  const totalLeads = stats?.total ?? leads.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Target className="w-5 h-5 text-violet-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Prospecção</h1>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {statsLoading ? 'Carregando...' : `${totalLeads} leads na base`}
          </p>
          <div className="mt-2">
            <GoogleCalendarTokenBadge />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/portal/admin/prospeccao/automacao"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Bot className="w-4 h-4" />
            Automação WhatsApp
          </Link>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>

          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo lead
          </button>

          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all shadow-md"
          >
            <MapPin className="w-4 h-4" />
            Buscar no Google Maps
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards stats={stats} isLoading={statsLoading} />

      {/* Filtros */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalLeads={totalLeads}
        filteredCount={view === 'table' ? leads.length : filteredLeads.length}
        stats={stats}
      />

      {/* Toggle de view */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setView('table')}
          title="Visualização em tabela"
          className={cn(
            'flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-lg transition-colors',
            view === 'table'
              ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-white'
              : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
          )}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setView('kanban')}
          title="Visualização em kanban"
          className={cn(
            'flex items-center justify-center h-11 w-11 sm:h-8 sm:w-8 rounded-lg transition-colors',
            view === 'kanban'
              ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-white'
              : 'text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo principal */}
      {view === 'table' ? (
        <LeadsTable
          leads={leads}
          isLoading={leadsLoading}
          error={error}
          totalLeads={totalLeads}
          onSelectLead={(lead) => setSelectedLeadId(lead.id)}
          onLeadUpdate={handleLeadUpdate}
          onImportClick={() => setImportOpen(true)}
          onClearFilters={handleClearFilters}
          onRequestScheduleCall={setScheduleCallLead}
        />
      ) : (
        <KanbanBoard
          leads={filteredLeads}
          visibleStatuses={filters.status}
          onSelectLead={(lead) => setSelectedLeadId(lead.id)}
          onLeadUpdate={handleLeadUpdate}
          onRequestScheduleCall={setScheduleCallLead}
        />
      )}

      {/* Drawer de detalhes */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdate={handleLeadUpdate}
          onRequestScheduleCall={setScheduleCallLead}
        />
      )}

      {/* Modal de agendamento de call (Google Meet) */}
      <ScheduleCallModal
        lead={scheduleCallLead}
        onClose={() => setScheduleCallLead(null)}
        onScheduled={handleLeadUpdate}
      />

      {/* Modal de importação */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportDone={() => {
          reloadAllLeadsData();
          setImportOpen(false);
        }}
      />

      {/* Modal de criação manual */}
      <CreateLeadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
