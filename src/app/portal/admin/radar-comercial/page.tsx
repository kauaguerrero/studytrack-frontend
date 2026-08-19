'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RadarHeader } from './components/RadarHeader';
import { KPIStrip } from './components/KPIStrip';
import { BrazilMap } from './components/BrazilMap';
import { MapControls } from './components/MapControls';
import { SidebarCharts } from './components/SidebarCharts';
import { KeyboardShortcutsHint } from './components/KeyboardShortcutsHint';
import { useNationalGeo, useStateGeo, useAllLeads } from './hooks/useRadarData';
import { METRIC_LAYERS, STATE_NAMES } from './constants';
import type { MetricLayer, SelectedRegion } from './types';
import type { Lead } from '../prospeccao/types';

// Reuse existing Prospecção modals + drawer
import { CreateLeadModal } from '../prospeccao/components/CreateLeadModal';
import { ImportModal } from '../prospeccao/components/ImportModal';
import { LeadDrawer } from '../prospeccao/components/LeadDrawer';
import { ScheduleCallModal } from '../prospeccao/components/ScheduleCallModal';
import { CallModeModal } from '../prospeccao/components/CallModeModal';
import { reloadAllLeadsData } from '../prospeccao/hooks/useLeads';

const INITIAL_REGION: SelectedRegion = { level: 'national' };

export default function RadarComercialPage() {
  const [region, setRegion] = useState<SelectedRegion>(INITIAL_REGION);
  const [activeMetric, setActiveMetric] = useState<MetricLayer>('leads');
  const [searchValue, setSearchValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filteredLeadId, setFilteredLeadId] = useState<string | null>(null);
  const [scheduleCallLead, setScheduleCallLead] = useState<Lead | null>(null);
  const [callModalLead, setCallModalLead] = useState<Lead | null>(null);
  const [callsKey, setCallsKey] = useState(0);

  const searchRef = useRef<HTMLInputElement | null>(null);

  // Aggregated geo data (for KPIs + choropleth + charts)
  const { data: nationalData, isLoading: nationalLoading } = useNationalGeo();
  const { data: stateData, isLoading: stateLoading } = useStateGeo(
    region.level === 'state' ? (region.uf ?? null) : null
  );

  // Individual lead data for pin rendering
  const { data: leadsData } = useAllLeads();
  const allLeads = leadsData?.leads ?? [];

  const activeData = region.level === 'state' ? stateData : nationalData;
  const regions = activeData?.regions ?? nationalData?.regions ?? [];
  const funnel = activeData?.funnel ?? nationalData?.funnel ?? {};
  const isLoading = region.level === 'state' ? (nationalLoading || stateLoading) : nationalLoading;

  function regionName(): string {
    if (region.level === 'national') return 'Brasil (todos os estados)';
    return STATE_NAMES[region.uf ?? ''] ?? region.name ?? region.uf ?? '';
  }

  const handleStateClick = useCallback((uf: string, name: string) => {
    setRegion({ level: 'state', uf, name });
  }, []);

  const handleGoNational = useCallback(() => {
    setRegion(INITIAL_REGION);
    setSelectedLead(null);
    setFilteredLeadId(null);
  }, []);

  const handleLeadSelect = useCallback((lead: Lead) => {
    if (lead.uf) {
      setRegion({ level: 'state', uf: lead.uf, name: STATE_NAMES[lead.uf] });
    }
    setFilteredLeadId(lead.id);
    setSelectedLead(lead);
  }, []);

  const handleLeadFilterClear = useCallback(() => {
    setFilteredLeadId(null);
    setSelectedLead(null);
  }, []);

  const handleSearchResult = useCallback((uf: string) => {
    setRegion({ level: 'state', uf, name: STATE_NAMES[uf] });
  }, []);

  const cycleMetric = useCallback((dir: 1 | -1) => {
    setActiveMetric(cur => {
      const idx = METRIC_LAYERS.findIndex(m => m.key === cur);
      const next = (idx + dir + METRIC_LAYERS.length) % METRIC_LAYERS.length;
      return METRIC_LAYERS[next].key;
    });
  }, []);

  function handleExportCSV() {
    const a = document.createElement('a');
    a.href = '/api/admin/prospeccao/export';
    a.download = 'leads.csv';
    a.click();
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (selectedLead) { setSelectedLead(null); return; }
        if (filteredLeadId) { handleLeadFilterClear(); return; }
        if (region.level === 'state') handleGoNational();
      } else if (e.key === 'ArrowRight') {
        cycleMetric(1);
      } else if (e.key === 'ArrowLeft') {
        cycleMetric(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [region, selectedLead, filteredLeadId, handleGoNational, handleLeadFilterClear, cycleMetric]);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8 space-y-5">

      <RadarHeader
        onCreateLead={() => setCreateOpen(true)}
        onImport={() => setImportOpen(true)}
        onExportCSV={handleExportCSV}
      />

      {/* KPI strip */}
      <KPIStrip
        totals={region.level === 'state' && stateData ? stateData.totals : nationalData?.totals}
        loading={isLoading}
        regionName={regionName()}
      />

      {/* Main content: map + sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Map area */}
        <div className="flex flex-col gap-3 w-full lg:flex-[3] min-w-0 relative">
          <MapControls
            region={region}
            activeMetric={activeMetric}
            leads={allLeads}
            filteredLeadId={filteredLeadId}
            onGoNational={handleGoNational}
            onMetricChange={setActiveMetric}
            onLeadSelect={handleLeadSelect}
            onLeadFilterClear={handleLeadFilterClear}
            searchRef={searchRef}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchClear={() => setSearchValue('')}
            onSearchResult={handleSearchResult}
          />
          <div className="relative">
            <BrazilMap
              region={region}
              regions={region.level === 'state' ? (stateData?.regions ?? []) : (nationalData?.regions ?? [])}
              activeMetric={activeMetric}
              leads={allLeads}
              filteredLeadId={filteredLeadId}
              onStateClick={handleStateClick}
              onPinClick={setSelectedLead}
            />

            {/* Lead drawer — mesmo do kanban de prospecção */}
            {selectedLead && (
              <LeadDrawer
                lead={selectedLead}
                onClose={() => setSelectedLead(null)}
                onLeadUpdate={() => { reloadAllLeadsData(); }}
                onRequestScheduleCall={setScheduleCallLead}
                onRequestCallMode={setCallModalLead}
                callsKey={callsKey}
              />
            )}
          </div>
        </div>

        {/* Sidebar charts */}
        <div className="w-full lg:flex-[1] lg:min-w-64 lg:max-w-xs bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 lg:self-stretch">
          <SidebarCharts
            regions={regions}
            funnel={funnel}
            activeMetric={activeMetric}
          />
        </div>
      </div>

      {/* Footer — keyboard shortcuts hint, desktop only */}
      <div className="hidden sm:flex justify-end">
        <KeyboardShortcutsHint />
      </div>

      {/* Modals */}
      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportDone={() => { reloadAllLeadsData(); setImportOpen(false); }}
      />
      <ScheduleCallModal
        lead={scheduleCallLead}
        onClose={() => setScheduleCallLead(null)}
        onScheduled={() => { reloadAllLeadsData(); }}
      />
      <CallModeModal
        lead={callModalLead}
        isOpen={!!callModalLead}
        onClose={() => setCallModalLead(null)}
        onCallSaved={() => { setCallsKey(k => k + 1); reloadAllLeadsData(); }}
      />
    </div>
  );
}
