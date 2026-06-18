'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { apiCreateLead, reloadAllLeadsData } from '../hooks/useLeads';
import type { LeadStatusCRM, LeadTemperature } from '../types';

const inputCls =
  'h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

const labelCls =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateLeadModal({ open, onClose }: CreateLeadModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    nome_socio: '',
    telefone1: '',
    email: '',
    uf: '',
    municipio: '',
    status_crm: 'novo' as LeadStatusCRM,
    temperature: 'morno' as LeadTemperature,
    source_channel: 'whatsapp',
    next_followup_at: '',
    observacoes: '',
  });

  function resetForm() {
    setForm({
      razao_social: '',
      nome_fantasia: '',
      nome_socio: '',
      telefone1: '',
      email: '',
      uf: '',
      municipio: '',
      status_crm: 'novo',
      temperature: 'morno',
      source_channel: 'whatsapp',
      next_followup_at: '',
      observacoes: '',
    });
  }

  async function handleCreate() {
    if (!form.razao_social.trim()) return;
    setSaving(true);
    try {
      await apiCreateLead({
        ...form,
        next_followup_at: form.next_followup_at || null,
      });
      toast.success('Lead criado!');
      reloadAllLeadsData();
      resetForm();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar lead');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            Novo lead
          </p>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid min-h-0 gap-3 overflow-y-auto px-6 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Razão social *</label>
            <input
              value={form.razao_social}
              onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
              placeholder="Ex: Instituto Educacional Objetivo Ltda"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Nome fantasia</label>
            <input
              value={form.nome_fantasia}
              onChange={(e) => setForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
              placeholder="Ex: Cursinho Objetivo"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Responsável</label>
            <input
              value={form.nome_socio}
              onChange={(e) => setForm((f) => ({ ...f, nome_socio: e.target.value }))}
              placeholder="Nome do sócio/responsável"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Telefone</label>
            <input
              value={form.telefone1}
              onChange={(e) => setForm((f) => ({ ...f, telefone1: e.target.value }))}
              placeholder="(34) 9 9999-9999"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contato@cursinho.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>UF</label>
            <input
              value={form.uf}
              onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="MG"
              maxLength={2}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Município</label>
            <input
              value={form.municipio}
              onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
              placeholder="Uberlândia"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Status inicial</label>
            <select
              value={form.status_crm}
              onChange={(e) => setForm((f) => ({ ...f, status_crm: e.target.value as LeadStatusCRM }))}
              className={inputCls}
            >
              {(['novo', 'contatado', 'respondeu', 'demo_agendada', 'proposta_enviada'] as const).map(
                (s) => (
                  <option key={s} value={s}>
                    {s === 'novo' ? 'Novo' : s === 'contatado' ? 'Contatado' : s === 'respondeu' ? 'Respondeu' : s === 'demo_agendada' ? 'Demo agendada' : 'Proposta enviada'}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className={labelCls}>Temperatura</label>
            <select
              value={form.temperature}
              onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value as LeadTemperature }))}
              className={inputCls}
            >
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Canal de origem</label>
            <select
              value={form.source_channel}
              onChange={(e) => setForm((f) => ({ ...f, source_channel: e.target.value }))}
              className={inputCls}
            >
              {[
                ['whatsapp', 'WhatsApp'],
                ['indicacao', 'Indicação'],
                ['instagram', 'Instagram'],
                ['linkedin', 'LinkedIn'],
                ['evento', 'Evento'],
                ['importacao', 'Importação'],
                ['outro', 'Outro'],
              ].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Próximo follow-up</label>
            <input
              type="date"
              value={form.next_followup_at}
              onChange={(e) => setForm((f) => ({ ...f, next_followup_at: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="Contexto inicial, como conheceu, etc."
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !form.razao_social.trim()}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Criando...' : 'Criar lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
