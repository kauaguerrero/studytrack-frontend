'use client';

import Link from 'next/link';
import { Radar, Bot, Download, Plus, MapPin, LayoutGrid } from 'lucide-react';

const btnCls =
  'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors';

export function RadarHeader({
  onCreateLead,
  onImport,
  onExportCSV,
}: {
  onCreateLead: () => void;
  onImport: () => void;
  onExportCSV: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Radar className="w-5 h-5 text-violet-500" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Radar Comercial</h1>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Link href="/portal/admin/prospeccao/automacao" className={btnCls} title="Automação WhatsApp">
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Automação WhatsApp</span>
        </Link>

        <button onClick={onExportCSV} className={btnCls} title="Exportar CSV">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>

        <button onClick={onCreateLead} className={btnCls}>
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Novo lead</span>
        </button>

        <button onClick={onImport} className={btnCls} title="Buscar no Google Maps">
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">Buscar no Maps</span>
        </button>

        <Link href="/portal/admin/prospeccao" className={btnCls}>
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden xs:inline">Prospecção</span>
        </Link>
      </div>
    </div>
  );
}
