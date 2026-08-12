'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Inbox, MessageCircle, MessageSquareText, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useHandoff, apiAssumirHandoff } from '../automacao/hooks/useAutomacao';
import { apiGetLead } from '../hooks/useLeads';
import { LeadDrawer } from '../components/LeadDrawer';
import type { Lead } from '../types';
import type { HandoffItem } from '../automacao/types';

const OVERDUE_THRESHOLD_MS = 10 * 60 * 60 * 1000;

function timeSince(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() >= OVERDUE_THRESHOLD_MS;
}

function waLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/55${digits}` : null;
}

export default function HandoffPage() {
  const { handoff, isLoading, reload } = useHandoff();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [assumindo, setAssumindo] = useState<string | null>(null);

  async function handleOpenLead(item: HandoffItem) {
    if (!item.lead) {
      toast.error('Lead não encontrado');
      return;
    }
    try {
      const { lead } = await apiGetLead(item.lead.id);
      setSelectedLead(lead);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar lead');
    }
  }

  async function handleAssumir(phone: string) {
    setAssumindo(phone);
    try {
      await apiAssumirHandoff(phone);
      toast.success('Conversa assumida');
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao assumir conversa');
    } finally {
      setAssumindo(null);
    }
  }

  const overdue = handoff.filter((item) => isOverdue(item.handoff_at));
  const recent = handoff.filter((item) => !isOverdue(item.handoff_at));

  async function handleCopyMarkdown() {
    const markdown = recent.map((item) => `- ${item.session_phone} — ${item.node_title ?? '—'}`).join('\n');
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success('Lista copiada em markdown!');
    } catch {
      toast.error('Não consegui copiar — a área de transferência pode estar bloqueada');
    }
  }

  function renderRow(item: HandoffItem, overdueRow: boolean) {
    const link = waLink(item.lead?.telefone1 ?? item.lead?.telefone2);
    return (
      <tr
        key={item.session_phone}
        className={`border-b border-slate-50 dark:border-zinc-800/60 last:border-0 ${
          overdueRow ? 'bg-red-50/40 dark:bg-red-900/10' : ''
        }`}
      >
        <td className="px-4 py-3">
          <p className="font-semibold text-slate-900 dark:text-white">
            {item.lead?.nome_fantasia ?? item.lead?.razao_social ?? item.session_phone}
          </p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">
            {item.lead?.uf ?? '—'} {item.lead?.municipio ? `· ${item.lead.municipio}` : ''}
          </p>
        </td>
        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">
          <p>{item.flow_name ?? '—'}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500">{item.node_title ?? '—'}</p>
        </td>
        <td className={`px-4 py-3 ${overdueRow ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-500 dark:text-zinc-400'}`}>
          {timeSince(item.handoff_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </a>
            )}
            <button
              onClick={() => handleOpenLead(item)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
            >
              <MessageSquareText className="w-3.5 h-3.5" /> Ver conversa
            </button>
            <button
              onClick={() => handleAssumir(item.session_phone)}
              disabled={assumindo === item.session_phone}
              className="px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {assumindo === item.session_phone ? 'Assumindo...' : 'Assumir conversa'}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/portal/admin/prospeccao/automacao"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Automação
          </Link>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-violet-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Handoff</h1>
          </div>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Conversas que o bot terminou de conduzir e estão esperando um humano assumir.
          </p>
        </div>
        {recent.length > 0 && (
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Copy className="w-3.5 h-3.5" /> Copiar lista (markdown)
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-400 dark:text-zinc-500">Carregando...</p>
        ) : handoff.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">Nenhuma conversa esperando ação humana agora.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Fluxo / passo final</th>
                <th className="px-4 py-3">Esperando há</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {overdue.length > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/40">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> Esperando há mais de 10h — {overdue.length} lead(s)
                    </span>
                  </td>
                </tr>
              )}
              {overdue.map((item) => renderRow(item, true))}
              {overdue.length > 0 && recent.length > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 bg-slate-50 dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Esperando há menos de 10h</span>
                  </td>
                </tr>
              )}
              {recent.map((item) => renderRow(item, false))}
            </tbody>
          </table>
        )}
      </div>

      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onLeadUpdate={() => {}}
        />
      )}
    </div>
  );
}
