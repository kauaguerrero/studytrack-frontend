'use client';

import { useState } from 'react';
import {
  Phone,
  Mail,
  PhoneOff,
  MailX,
  MessageSquare,
  MessageCircle,
  AlertCircle,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiUpdateLead } from '../hooks/useLeads';
import type { Lead, LeadStatusCRM, LeadTemperature } from '../types';

export const STATUS_CONFIG: Record<
  LeadStatusCRM,
  { label: string; cls: string }
> = {
  novo: {
    label: 'Novo',
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  contatado: {
    label: 'Contatado',
    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
  respondeu: {
    label: 'Respondeu',
    cls: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
  handoff: {
    label: 'Hand-off',
    cls: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300',
  },
  esperando_contato_gestor: {
    label: 'Esperando Contato do Gestor',
    cls: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300',
  },
  aguardando_confirmacao_call: {
    label: 'Aguardando Confirmação da Call',
    cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  },
  call_agendado: {
    label: 'Call/Reunião Marcada',
    cls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300',
  },
  interesse: {
    label: 'Interesse',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  demo_teste: {
    label: 'Demo / Em Testes',
    cls: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
  },
  enviar_proposta: {
    label: 'Enviar proposta',
    cls: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400',
  },
  proposta_enviada: {
    label: 'Proposta enviada',
    cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  },
  fechado: {
    label: 'Fechado',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  perdido: {
    label: 'Perdido',
    cls: 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400',
  },
};

const TEMP_CONFIG: Record<LeadTemperature, { label: string; cls: string }> = {
  quente: { label: 'Quente', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300' },
  morno: { label: 'Morno', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  frio: { label: 'Frio', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' },
};

function getWhatsAppUrl(phone: string) {
  return `https://wa.me/55${phone.replace(/\D/g, '')}`;
}

interface LeadsTableProps {
  leads: Lead[];
  isLoading: boolean;
  error: Error | undefined;
  totalLeads: number;
  onSelectLead: (lead: Lead) => void;
  onLeadUpdate: () => void;
  onImportClick: () => void;
  onClearFilters: () => void;
  onRequestScheduleCall: (lead: Lead) => void;
}

export function LeadsTable({
  leads,
  isLoading,
  error,
  totalLeads,
  onSelectLead,
  onLeadUpdate,
  onImportClick,
  onClearFilters,
  onRequestScheduleCall,
}: LeadsTableProps) {
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, LeadStatusCRM>
  >({});

  function getStatus(lead: Lead): LeadStatusCRM {
    return localStatuses[lead.id] ?? lead.status_crm;
  }

  async function handleStatusChange(lead: Lead, newStatus: LeadStatusCRM) {
    // Mover pra "call_agendado" abre o modal de agendamento — não mexe no
    // select local, então ele volta sozinho pro valor atual do lead.
    if (newStatus === 'call_agendado') {
      onRequestScheduleCall(lead);
      return;
    }

    const prev = lead.status_crm;
    setLocalStatuses((s) => ({ ...s, [lead.id]: newStatus }));
    try {
      await apiUpdateLead(lead.id, { status_crm: newStatus });
      onLeadUpdate();
    } catch {
      setLocalStatuses((s) => ({ ...s, [lead.id]: prev }));
      toast.error('Erro ao atualizar status');
    }
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-zinc-800">
                <td className="px-4 py-3">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-40 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-3.5 w-16 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-3.5 w-24 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-28 rounded-full bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-6 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
          Erro ao carregar leads
        </p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-xs text-center">
          {error.message}
        </p>
        <button
          onClick={onLeadUpdate}
          className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Empty state: nenhum lead importado ainda
  if (totalLeads === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/10">
          <MapPin className="w-7 h-7 text-violet-500" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200 mb-1">
            Nenhum lead na base
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            Busque cursinhos no Google Maps para começar a prospectar
          </p>
        </div>
        <button
          onClick={onImportClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 transition-all shadow-md"
        >
          <MapPin className="w-4 h-4" />
          Buscar no Google Maps
        </button>
      </div>
    );
  }

  // Empty state: filtros não retornaram resultados
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900">
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
          Nenhum lead com esses filtros
        </p>
        <button
          onClick={onClearFilters}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Limpar filtros
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="block md:hidden space-y-2.5">
        {leads.map((lead) => {
          const status = getStatus(lead);
          const cfg = STATUS_CONFIG[status];
          const temp = TEMP_CONFIG[lead.temperature];
          const displayName = lead.nome_fantasia || lead.razao_social;

          return (
            <div
              key={lead.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectLead(lead)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectLead(lead);
              }}
              className="w-full rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-3.5 text-left shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/70"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">
                    {displayName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {lead.uf && (
                      <span className="rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                        {lead.uf}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${temp.cls}`}>
                      {temp.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
                {lead.telefone1 && (
                  <a
                    href={getWhatsAppUrl(lead.telefone1)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-colors"
                    title="Abrir WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-white/[0.06] overflow-auto bg-white dark:bg-zinc-900">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <TableHead />
          </thead>
          <tbody>
            {leads.map((lead) => {
              const status = getStatus(lead);
              const cfg = STATUS_CONFIG[status];
              const displayName = lead.nome_fantasia || lead.razao_social;

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                >
                {/* Nome */}
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                    {displayName}
                  </p>
                  {lead.nome_fantasia && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 truncate max-w-[200px]">
                      {lead.razao_social}
                    </p>
                  )}
                </td>

                {/* UF / Município */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {lead.uf && (
                      <span className="rounded bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                        {lead.uf}
                      </span>
                    )}
                    {lead.municipio && (
                      <span className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-[100px]">
                        {lead.municipio}
                      </span>
                    )}
                    {!lead.uf && !lead.municipio && (
                      <span className="text-slate-300 dark:text-zinc-600">—</span>
                    )}
                  </div>
                </td>

                {/* Contato */}
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-1">
                    {lead.telefone1 && (
                      <a
                        href={getWhatsAppUrl(lead.telefone1)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0 text-emerald-500" />
                        WhatsApp
                      </a>
                    )}
                    {lead.telefone1 ? (
                      <a
                        href={`tel:${lead.telefone1}`}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        {lead.telefone1}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-300 dark:text-zinc-600">
                        <PhoneOff className="w-3 h-3" />
                        Sem telefone
                      </span>
                    )}
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[160px]"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        {lead.email}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-300 dark:text-zinc-600">
                        <MailX className="w-3 h-3" />
                        Sem email
                      </span>
                    )}
                  </div>
                </td>

                {/* Status CRM — inline select */}
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    value={status}
                    onChange={(e) =>
                      handleStatusChange(lead, e.target.value as LeadStatusCRM)
                    }
                    className={cn(
                      'rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer',
                      cfg.cls
                    )}
                  >
                    {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                      <option key={v} value={v}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Ações */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {lead.telefone1 && (
                      <a
                        href={getWhatsAppUrl(lead.telefone1)}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir WhatsApp"
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onSelectLead(lead)}
                      title="Ver detalhes e registrar observação"
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TableHead() {
  return (
    <tr className="border-b border-slate-100 dark:border-zinc-800">
      {[
        'Nome',
        'UF / Município',
        'Contato',
        'Status CRM',
        'Ações',
      ].map((col, i) => (
        <th
          key={i}
          className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500"
        >
          {col}
        </th>
      ))}
    </tr>
  );
}
