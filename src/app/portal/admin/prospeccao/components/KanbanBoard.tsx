'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import {
  Bot,
  Calendar,
  CheckCircle2,
  Flame,
  GripVertical,
  LayoutGrid,
  Snowflake,
  UserCheck,
  Video,
  Wind,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiUpdateLead } from '../hooks/useLeads';
import { STATUS_CONFIG } from './LeadsTable';
import { CallAgendaModal } from './CallAgendaModal';
import type { Lead, LeadStatusCRM, LeadTemperature } from '../types';

const ACTIVE_STATUSES: LeadStatusCRM[] = [
  'novo',
  'contatado',
  'respondeu',
  'handoff',
  'esperando_contato_gestor',
  'aguardando_confirmacao_call',
  'call_agendado',
  'interesse',
  'demo_teste',
  'enviar_proposta',
  'proposta_enviada',
];

const BOARD_STATUSES: LeadStatusCRM[] = [...ACTIVE_STATUSES, 'fechado', 'perdido'];

const COLUMN_ACCENT: Record<LeadStatusCRM, string> = {
  novo: '#64748b',
  contatado: '#3b82f6',
  respondeu: '#8b5cf6',
  handoff: '#d946ef',
  esperando_contato_gestor: '#ec4899',
  aguardando_confirmacao_call: '#fb7185',
  call_agendado: '#06b6d4',
  interesse: '#f59e0b',
  demo_teste: '#fb923c',
  enviar_proposta: '#ea580c',
  proposta_enviada: '#f97316',
  fechado: '#10b981',
  perdido: '#ef4444',
};

const COLUMN_GUIDANCE: Record<LeadStatusCRM, string> = {
  novo: 'Leads recém encontrados e ainda não abordados.',
  contatado: 'Primeira abordagem feita, aguardando retorno.',
  respondeu: 'Houve resposta e existe conversa ativa.',
  handoff: 'O bot encerrou o script e está esperando um humano assumir a conversa.',
  esperando_contato_gestor: 'Aguardando o lead passar o contato de quem decide, pra marcar a call.',
  aguardando_confirmacao_call: 'O gestor chegou a marcar a call mas sumiu antes de confirmar — retomar contato.',
  call_agendado: 'Ligação ou reunião marcada com o lead.',
  interesse: 'Demonstrou interesse na call/reunião — falta preparar e enviar a proposta.',
  demo_teste: 'Cursinho testando a org de demonstração antes de receber a proposta.',
  enviar_proposta: 'Proposta pronta ou em preparação, falta enviar.',
  proposta_enviada: 'Proposta enviada, acompanhar decisão.',
  fechado: 'Lead convertido em parceiro.',
  perdido: 'Sem fit ou oportunidade encerrada.',
};

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

// next_followup_at é uma data pura (sem hora), sempre gravada como meia-noite
// UTC da data escolhida no <input type="date"> — nunca construir um Date()
// com esse valor e formatar em horário local: em BRT (UTC-3) isso volta pro
// dia anterior. Tratar como string YYYY-MM-DD evita o bug de fuso.
function formatDate(v: string | null) {
  if (!v) return '—';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function todayBRT(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isOverdue(date: string | null) {
  if (!date) return false;
  return date.slice(0, 10) < todayBRT();
}

function formatCallDateTime(v: string) {
  const date = new Date(v);
  const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timePart = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  return `${datePart} às ${timePart}`;
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
  visibleStatuses?: LeadStatusCRM[];
  onSelectLead: (lead: Lead) => void;
  onLeadUpdate: () => void;
  onRequestScheduleCall: (lead: Lead) => void;
}

export function KanbanBoard({
  leads,
  visibleStatuses,
  onSelectLead,
  onLeadUpdate,
  onRequestScheduleCall,
}: KanbanBoardProps) {
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatusCRM | null>(null);
  const [agendaOpen, setAgendaOpen] = useState(false);

  async function handleDrop(targetStatus: LeadStatusCRM) {
    if (!dragging || dragging.status_crm === targetStatus) {
      setDragging(null);
      setDragOverStatus(null);
      return;
    }

    const lead = dragging;
    setDragging(null);
    setDragOverStatus(null);

    // Mover pra "call_agendado" abre o modal de agendamento — o status só
    // muda de fato quando a call é criada com sucesso lá dentro.
    if (targetStatus === 'call_agendado') {
      onRequestScheduleCall(lead);
      return;
    }

    const previousLeads = leads;

    mutate(
      (key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/prospeccao/leads'),
      (current: unknown) => {
        if (!current || typeof current !== 'object' || !('leads' in current)) return current;
        const payload = current as { leads: Lead[] };
        return {
          ...payload,
          leads: payload.leads.map((l) =>
            l.id === lead.id
              ? { ...l, status_crm: targetStatus, status_changed_at: new Date().toISOString() }
              : l
          ),
        };
      },
      false
    );

    try {
      await apiUpdateLead(lead.id, { status_crm: targetStatus });
      onLeadUpdate();
      toast.success('Status atualizado');
    } catch {
      mutate(
        (key: unknown) => typeof key === 'string' && key.startsWith('/api/admin/prospeccao/leads'),
        (current: unknown) => {
          if (!current || typeof current !== 'object' || !('leads' in current)) return current;
          return { ...(current as { leads: Lead[] }), leads: previousLeads };
        },
        false
      );
      toast.error('Erro ao atualizar status');
    }
  }

  function byStatus(status: LeadStatusCRM) {
    const filtered = leads.filter((l) => l.status_crm === status);
    if (status === 'call_agendado') {
      // Call mais próxima primeiro, sem data vai pro fim.
      return [...filtered].sort((a, b) => {
        if (!a.call_scheduled_at && !b.call_scheduled_at) return 0;
        if (!a.call_scheduled_at) return 1;
        if (!b.call_scheduled_at) return -1;
        return new Date(a.call_scheduled_at).getTime() - new Date(b.call_scheduled_at).getTime();
      });
    }
    return filtered;
  }

  const displayedStatuses =
    visibleStatuses && visibleStatuses.length > 0
      ? BOARD_STATUSES.filter((s) => visibleStatuses.includes(s))
      : BOARD_STATUSES;

  return (
    <div className="flex gap-4 items-start overflow-x-auto pb-8">
      {displayedStatuses.map((status) => {
        const cards = byStatus(status);
        const cfg = STATUS_CONFIG[status];
        const isActive = ACTIVE_STATUSES.includes(status);
        const accent = COLUMN_ACCENT[status];
        const isDragOver = dragOverStatus === status;

        return (
          <div
            key={status}
            className="flex h-[560px] w-[280px] flex-shrink-0 flex-col rounded-2xl transition-all duration-200"
            style={{
              background: isDragOver ? `${accent}14` : undefined,
              border: isDragOver
                ? `1.5px solid ${accent}70`
                : '1.5px solid rgba(148,163,184,0.18)',
              boxShadow: isDragOver ? `0 0 32px ${accent}25` : 'none',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverStatus(null);
              }
            }}
            onDrop={() => handleDrop(status)}
          >
            <div
              className="h-[3px] rounded-t-2xl flex-shrink-0"
              style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40)` }}
            />

            <div className="px-3.5 py-3 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
                    />
                    <span
                      onDoubleClick={status === 'call_agendado' ? () => setAgendaOpen(true) : undefined}
                      title={status === 'call_agendado' ? 'Duplo clique para ver a agenda' : undefined}
                      className={`text-[13px] font-bold text-slate-800 dark:text-zinc-200 tracking-tight ${
                        status === 'call_agendado' ? 'cursor-pointer select-none' : ''
                      }`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-1 pl-[18px] text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                    {COLUMN_GUIDANCE[status]}
                  </p>
                </div>

                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${accent}22`,
                    color: accent,
                    border: `1px solid ${accent}35`,
                  }}
                >
                  {cards.length}
                </span>
              </div>
            </div>

            <div className="mx-4 h-px bg-slate-200 dark:bg-white/[0.04] flex-shrink-0" />

            <div className="flex flex-col gap-2.5 p-3 flex-1 min-h-0 overflow-y-auto">
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ background: `${accent}12` }}
                  >
                    <LayoutGrid className="w-[18px] h-[18px]" style={{ color: accent, opacity: 0.45 }} />
                  </div>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-zinc-600 text-center leading-relaxed px-2">
                    Nenhum lead
                  </p>
                </div>
              ) : cards.map((lead) => {
                const displayName = lead.nome_fantasia || lead.razao_social;
                return (
                  <div
                    key={lead.id}
                    draggable
                    tabIndex={0}
                    onDragStart={() => setDragging(lead)}
                    onDragEnd={() => {
                      setDragging(null);
                      setDragOverStatus(null);
                    }}
                    onClick={() => onSelectLead(lead)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectLead(lead);
                      }
                    }}
                    className="group relative cursor-grab rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 transition-all duration-150 select-none hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg hover:shadow-black/5 active:cursor-grabbing active:scale-[0.98] active:opacity-75 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/90 dark:hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-25 transition-opacity pointer-events-none">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="pr-5 text-sm font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">
                        {displayName}
                      </p>
                      {isActive && <TemperatureBadge t={lead.temperature} />}
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-2">
                      Nesta etapa {daysSince(lead.status_changed_at)}
                    </p>

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

                    {lead.automation?.node_title && (
                      <span
                        className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          lead.automation.session_status === 'aguardando_humano'
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                        }`}
                      >
                        {lead.automation.session_status === 'aguardando_humano' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <Bot className="w-3 h-3" />
                        )}
                        {lead.automation.node_title}
                      </span>
                    )}

                    {lead.call_scheduled_at && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold mt-1 text-cyan-600 dark:text-cyan-400">
                        {lead.call_outcome === 'ocorreu' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Video className="w-3 h-3" />
                        )}
                        Call {formatCallDateTime(lead.call_scheduled_at)}
                      </div>
                    )}

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

                  </div>
                );
              })}

              {isDragOver && (
                <div
                  className="rounded-xl h-14 flex items-center justify-center mt-1 transition-all"
                  style={{
                    border: `2px dashed ${accent}50`,
                    background: `${accent}08`,
                  }}
                >
                  <p className="text-xs font-semibold" style={{ color: accent }}>
                    Soltar para mover para {cfg.label.toLowerCase()}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {agendaOpen && (
        <CallAgendaModal
          leads={byStatus('call_agendado')}
          onClose={() => setAgendaOpen(false)}
          onSelectLead={onSelectLead}
        />
      )}
    </div>
  );
}
