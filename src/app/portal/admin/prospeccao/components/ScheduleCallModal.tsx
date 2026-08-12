'use client';

import { useEffect, useState } from 'react';
import { Calendar, Check, Copy, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { apiScheduleCall } from '../hooks/useLeads';
import { formatCallMessage } from '../lib/callMessage';
import type { Lead } from '../types';

const TIME_ZONE = 'America/Sao_Paulo';

const inputCls =
  'h-9 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors';

const labelCls =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400 mb-1';

function defaultTitle(lead: Lead): string {
  const displayName = lead.nome_fantasia || lead.razao_social;
  return `Reunião Onboarding - ${displayName} x StudyTrack`;
}

function getWhatsAppUrl(phone: string, text: string) {
  return `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

interface ScheduleCallModalProps {
  lead: Lead | null;
  onClose: () => void;
  onScheduled: () => void;
}

export function ScheduleCallModal({ lead, onClose, onScheduled }: ScheduleCallModalProps) {
  const [phase, setPhase] = useState<'form' | 'confirm'>('form');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    attendee_email: '',
  });

  // Reseta o form toda vez que um lead novo é passado (modal reaberto)
  useEffect(() => {
    if (!lead) return;
    setPhase('form');
    setError(null);
    setCopied(false);
    setForm({
      title: defaultTitle(lead),
      date: '',
      start_time: '',
      end_time: '',
      attendee_email: lead.email ?? '',
    });
  }, [lead]);

  if (!lead) return null;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleClose() {
    if (saving) return;
    onClose();
  }

  async function handleSubmit() {
    if (!lead) return;
    if (!form.title.trim() || !form.date || !form.start_time || !form.end_time) {
      setError('Preencha título, data e horários de início/fim.');
      return;
    }
    const startISO = `${form.date}T${form.start_time}:00-03:00`;
    const endISO = `${form.date}T${form.end_time}:00-03:00`;
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (end <= start) {
      setError('O horário de término precisa ser depois do início.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { meet_link } = await apiScheduleCall(lead.id, {
        title: form.title.trim(),
        start: startISO,
        end: endISO,
        time_zone: TIME_ZONE,
        attendee_email: form.attendee_email.trim() || undefined,
      });
      setMessage(
        formatCallMessage({
          title: form.title.trim(),
          start,
          end,
          timeZone: TIME_ZONE,
          meetLink: meet_link,
        })
      );
      onScheduled();
      setPhase('confirm');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar a call');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Mensagem copiada');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não deu pra copiar automaticamente — selecione o texto manualmente');
    }
  }

  const displayName = lead.nome_fantasia || lead.razao_social;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-500" />
            {phase === 'form' ? `Agendar call com ${displayName}` : 'Call agendada!'}
          </p>
        </div>

        {phase === 'form' ? (
          <>
            <div className="grid min-h-0 gap-3 overflow-y-auto px-6 py-4">
              <div>
                <label className={labelCls}>Título</label>
                <input
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className={inputCls}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Início</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => updateField('start_time', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Fim</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => updateField('end_time', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 -mt-1">
                Fuso horário: America/Sao_Paulo
              </p>

              <div>
                <label className={labelCls}>Email do convidado (opcional)</label>
                <input
                  type="email"
                  value={form.attendee_email}
                  onChange={(e) => updateField('attendee_email', e.target.value)}
                  placeholder="contato@cursinho.com"
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0">
              <button
                onClick={handleClose}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50 transition-all"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Criando call...</>
                ) : (
                  <><Calendar className="w-4 h-4" />Criar call</>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Evento criado no Google Calendar com Meet. Copie a mensagem abaixo e envie pro lead:
              </p>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 p-3.5 text-sm text-slate-700 dark:text-zinc-200 font-sans">
                {message}
              </pre>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-zinc-800 px-6 py-4 shrink-0 sm:flex-row sm:justify-end">
              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar mensagem'}
              </button>
              {lead.telefone1 && (
                <a
                  href={getWhatsAppUrl(lead.telefone1, message)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors"
                >
                  Abrir WhatsApp
                </a>
              )}
              <button
                onClick={handleClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Concluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
