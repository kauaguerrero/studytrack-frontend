'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, MessageSquareText, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOutboundHistory, apiDeleteOutboundHistory } from '../hooks/useAutomacao';
import { apiGetLead } from '../../hooks/useLeads';
import { LeadDrawer } from '../../components/LeadDrawer';
import type { Lead } from '../../types';
import type { OutboundHistoryItem } from '../types';

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'sent', label: 'Enviado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'failed', label: 'Falhou' },
];

const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  failed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function OutboundHistoryPage() {
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const { items, total, isLoading, reload } = useOutboundHistory({ status, search, limit: PAGE_SIZE, offset });

  function applySearch() {
    setSearch(searchInput.trim());
    setOffset(0);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    const ok = window.confirm(`Excluir ${selected.size} registro(s) do histórico? Essa ação não desfaz o envio, só remove o registro.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await apiDeleteOutboundHistory([...selected]);
      toast.success(`${selected.size} registro(s) excluído(s)`);
      setSelected(new Set());
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  }

  async function handleViewConversation(item: OutboundHistoryItem) {
    try {
      const { lead } = await apiGetLead(item.lead_id);
      setSelectedLead(lead);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar lead');
    }
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 md:p-8 space-y-6">
      <div>
        <Link
          href="/portal/admin/prospeccao/automacao"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Automação
        </Link>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-violet-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Histórico de envios</h1>
        </div>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
          {total} registro(s) — mensagens de abertura enfileiradas pelo bot (manual ou automático).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
            setSelected(new Set());
          }}
          className="h-9 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Buscar por lead..."
            className="h-9 w-56 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400"
          />
          <button
            onClick={applySearch}
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir {selected.size} selecionado(s)
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-400 dark:text-zinc-500">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-400 dark:text-zinc-500">Nenhum registro encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                  <th className="px-4 py-3 w-8">
                    <input type="checkbox" checked={selected.size === items.length} onChange={toggleAll} />
                  </th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Mensagem</th>
                  <th className="px-4 py-3">Passo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50 dark:border-zinc-800/60 last:border-0 align-top">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.lead?.nome_fantasia ?? item.lead?.razao_social ?? item.phone}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500">
                        {item.phone} {item.lead?.uf ? `· ${item.lead.uf}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 max-w-xs">
                      <p className="truncate" title={item.body}>
                        {item.body}
                      </p>
                      {item.error_message && (
                        <p className="text-xs text-red-500 dark:text-red-400 truncate" title={item.error_message}>
                          {item.error_message}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{item.node_title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[item.status] ?? ''}`}>
                        {STATUS_OPTIONS.find((o) => o.value === item.status)?.label ?? item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewConversation(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      >
                        <MessageSquareText className="w-3.5 h-3.5" /> Ver conversa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            disabled={offset === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-slate-400 dark:text-zinc-500 text-xs">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {selectedLead && <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} onLeadUpdate={() => {}} />}
    </div>
  );
}
