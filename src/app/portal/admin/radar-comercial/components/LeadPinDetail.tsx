'use client';

import { X, ExternalLink, Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lead } from '../../prospeccao/types';
import { FUNNEL_LABELS, CHANNEL_LABELS } from '../constants';

const STATUS_PILL: Record<string, string> = {
  fechado:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  novo:         'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400',
  perdido:      'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};
function statusPill(s: string): string {
  return STATUS_PILL[s] ?? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function LeadPinDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const name = lead.nome_fantasia ?? lead.razao_social;

  const sortedContacts = [...lead.lead_contacts].sort(
    (a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime()
  );
  const lastContact = sortedContacts[0] ?? null;

  return (
    <motion.aside
      key={lead.id}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed inset-y-0 right-0 w-full sm:absolute sm:w-80 bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-700 shadow-2xl z-20 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 border-b border-slate-200 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-zinc-100 truncate text-sm">{name}</p>
          {lead.razao_social !== name && (
            <p className="text-xs text-slate-400 truncate">{lead.razao_social}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Fechar"
        >
          <X size={15} className="text-slate-400" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">

        {/* Status + location */}
        <div className="space-y-2">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusPill(lead.status_crm)}`}>
            {FUNNEL_LABELS[lead.status_crm] ?? lead.status_crm}
          </span>
          {(lead.municipio || lead.uf) && (
            <p className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-xs">
              <MapPin size={12} className="shrink-0" />
              {[lead.municipio, lead.uf].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {/* Contact info */}
        {(lead.telefone1 || lead.email) && (
          <div className="space-y-1.5">
            {lead.telefone1 && (
              <p className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 text-xs">
                <Phone size={11} className="shrink-0 text-slate-400" />
                {lead.telefone1}
              </p>
            )}
            {lead.email && (
              <p className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 text-xs truncate">
                <Mail size={11} className="shrink-0 text-slate-400" />
                {lead.email}
              </p>
            )}
          </div>
        )}

        {/* Proposal value */}
        {lead.valor_proposta_mensal != null && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 px-3 py-2">
            <p className="text-xs text-violet-500 dark:text-violet-400 mb-0.5">Proposta mensal</p>
            <p className="font-semibold text-violet-700 dark:text-violet-300">
              {fmtCurrency(lead.valor_proposta_mensal)}
            </p>
          </div>
        )}

        {/* Last contact */}
        {lastContact ? (
          <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
            <p className="text-xs text-slate-400 mb-2">Último contato</p>
            <div className="text-slate-700 dark:text-zinc-300 text-xs space-y-0.5">
              <p>{fmtDate(lastContact.contact_date)} · {CHANNEL_LABELS[lastContact.channel] ?? lastContact.channel}</p>
              {lastContact.notes && (
                <p className="text-slate-400 dark:text-zinc-500 leading-relaxed line-clamp-3">{lastContact.notes}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Sem contatos registrados</p>
        )}

        {/* Contact history count */}
        {lead.lead_contacts.length > 1 && (
          <p className="text-xs text-slate-400">
            +{lead.lead_contacts.length - 1} contato{lead.lead_contacts.length - 1 !== 1 ? 's' : ''} anteriore{lead.lead_contacts.length - 1 !== 1 ? 's' : 'r'}
          </p>
        )}

        {/* Observações */}
        {lead.observacoes && (
          <div className="border-t border-slate-100 dark:border-zinc-800 pt-4">
            <p className="text-xs text-slate-400 mb-1">Observações</p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-5">
              {lead.observacoes}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-800">
        <a
          href="/portal/admin/prospeccao"
          className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
        >
          <ExternalLink size={14} />
          Abrir no CRM
        </a>
      </div>
    </motion.aside>
  );
}
