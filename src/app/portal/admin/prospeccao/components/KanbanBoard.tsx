'use client';

import { Calendar, Flame, Wind, Snowflake } from 'lucide-react';
import { toast } from 'sonner';
import { apiUpdateLead } from '../hooks/useLeads';
import { STATUS_CONFIG } from './LeadsTable';
import type { Lead, LeadStatusCRM, LeadTemperature } from '../types';

const ACTIVE_STATUSES: LeadStatusCRM[] = [
  'novo',
  'contatado',
  'respondeu',
  'demo_agendada',
  'proposta_enviada',
];

const BOARD_STATUSES: LeadStatusCRM[] = [...ACTIVE_STATUSES, 'fechado', 'perdido'];

function TemperatureBadge({ t }: { t: LeadTemperature }) {
  if (t === 'quente')
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500">
        <Flame className="w-3 h-3" />
        Quente
      </span>
    );
  if (t === 'morno')
    return (
      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
        <Wind className="w-3 h-3" />
        Morno
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400">
      <Snowflake className="w-3 h-3" />
      Frio
    </span>
  );
}

function formatDate(v: string | null) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function isOverdue(date: string | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

function daysSince(v: string) {
  const diff = Date.now() - new Date(v).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `${days}d atrás`;
}

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onLeadUpdate: () => void;
}

export function KanbanBoard({ leads, onSelectLead, onLeadUpdate }: KanbanBoardProps) {
  async function handleUpdateStatus(id: string, status: LeadStatusCRM) {
    try {
      await apiUpdateLead(id, { status_crm: status });
      onLeadUpdate();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  }

  function byStatus(status: LeadStatusCRM) {
    return leads.filter((l) => l.status_crm === status);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 pb-8">
      {BOARD_STATUSES.map((status) => {
        const cards = byStatus(status);
        const cfg = STATUS_CONFIG[status];
        const activeIdx = ACTIVE_STATUSES.indexOf(status);
        const isActive = activeIdx !== -1;

        return (
          <div key={status} className="flex flex-col gap-3">
            {/* Header da coluna */}
            <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${cfg.cls}`}>
              <span className="text-xs font-bold">{cfg.label}</span>
              <span className="text-xs font-black tabular-nums">{cards.length}</span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {cards.map((lead) => {
                const displayName = lead.nome_fantasia || lead.razao_social;
                return (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="cursor-pointer rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900 p-3.5 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                        {displayName}
                      </p>
                      {isActive && <TemperatureBadge t={lead.temperature} />}
                    </div>

                    {lead.nome_socio && (
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mb-2">
                        {lead.nome_socio}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {lead.org_id && (
                        <span className="rounded-full bg-violet-100 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                          Demo ativa
                        </span>
                      )}
                      {lead.uf && (
                        <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] text-slate-500 dark:text-zinc-400">
                          {lead.uf}
                          {lead.municipio ? ` · ${lead.municipio}` : ''}
                        </span>
                      )}
                    </div>

                    {lead.next_followup_at && (
                      <div
                        className={`flex items-center gap-1 text-[10px] font-semibold mt-1 ${
                          isOverdue(lead.next_followup_at)
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {isOverdue(lead.next_followup_at) ? 'Vencido — ' : ''}
                        Follow-up {formatDate(lead.next_followup_at)}
                      </div>
                    )}

                    {lead.lead_contacts.length > 0 && (
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                        Último contato{' '}
                        {daysSince(
                          lead.lead_contacts[lead.lead_contacts.length - 1]
                            .contact_date
                        )}
                      </p>
                    )}

                    {/* Avançar / Voltar — visível no hover */}
                    {isActive && (
                      <div
                        className="flex gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activeIdx > 0 && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                lead.id,
                                ACTIVE_STATUSES[activeIdx - 1]
                              )
                            }
                            className="flex-1 rounded-lg border border-slate-200 dark:border-zinc-700 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800"
                          >
                            Voltar
                          </button>
                        )}
                        {activeIdx < ACTIVE_STATUSES.length - 1 && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(
                                lead.id,
                                ACTIVE_STATUSES[activeIdx + 1]
                              )
                            }
                            className="flex-1 rounded-lg border border-indigo-300 dark:border-indigo-500/40 py-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                          >
                            Avançar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {cards.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 p-4 text-center">
                  <p className="text-[11px] text-slate-400 dark:text-zinc-600">
                    Nenhum lead
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
