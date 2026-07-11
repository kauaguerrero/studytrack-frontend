'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Bell, Loader2, X, ChevronDown } from 'lucide-react';
import { ANNOUNCEMENT_ICONS, DEFAULT_ANNOUNCEMENT_ICON, getAnnouncementIcon } from '@/lib/announcement-icons';

const MAX_TITLE = 80;
const MAX_BODY = 600;

const TARGET_OPTIONS = [
  { value: 'all',        label: 'Todos os usuários' },
  { value: 'b2b_basic',  label: 'Parceiros — plano Basic' },
  { value: 'b2b_student', label: 'Parceiros — plano Student' },
  { value: 'b2b_pro',    label: 'Parceiros — plano Pro' },
  { value: 'b2b_test',   label: 'Contas de teste (dev)' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/** Quebra o corpo em linhas não-vazias — mesma lógica do feed real, pra preview fiel. */
function splitBullets(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export default function CreateAnnouncementModal({ isOpen, onClose, onCreated }: Props) {
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [icon, setIcon]         = useState(DEFAULT_ANNOUNCEMENT_ICON);
  const [target, setTarget]     = useState('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading]   = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setIcon(DEFAULT_ANNOUNCEMENT_ICON);
      setTarget('all');
      setExpiresAt('');
      setLoading(false);
      setIconPickerOpen(false);
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');

      const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${apiUrl}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          icon,
          target_plan: target,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro HTTP ${res.status}`);
      }

      toast.success('Anúncio criado! Aparecerá para os usuários na próxima vez que acessarem o portal.');
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar anúncio');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !loading;
  const SelectedIcon = getAnnouncementIcon(icon);
  const previewBullets = splitBullets(body);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
            <Bell className="w-4 h-4 text-violet-400" /> Criar anúncio de novidade
          </DialogTitle>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-0 max-h-[75vh] overflow-y-auto md:overflow-visible">
          {/* Coluna esquerda: formulário */}
          <div className="px-6 py-5 space-y-5 md:overflow-y-auto md:max-h-[75vh]">
            {/* Ícone */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Ícone
              </label>
              <button
                type="button"
                onClick={() => setIconPickerOpen((v) => !v)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 hover:border-zinc-700 transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30">
                  <SelectedIcon className="h-3.5 w-3.5 text-violet-300" />
                </div>
                <span className="flex-1 text-left">{ANNOUNCEMENT_ICONS[icon]?.label ?? 'Novidade'}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform ${iconPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {iconPickerOpen && (
                <div className="mt-2 grid grid-cols-5 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">
                  {Object.entries(ANNOUNCEMENT_ICONS).map(([key, { icon: Icon, label }]) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => { setIcon(key); setIconPickerOpen(false); }}
                      className={`flex flex-col items-center gap-1 rounded-lg py-2 transition-colors ${
                        icon === key ? 'bg-violet-500/20 border border-violet-500/40' : 'border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${icon === key ? 'text-violet-300' : 'text-zinc-400'}`} />
                      <span className="text-[9px] text-zinc-500 leading-none">{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Título */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Título <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs ${title.length > MAX_TITLE ? 'text-red-400' : 'text-zinc-500'}`}>
                  {title.length}/{MAX_TITLE}
                </span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="Ex: Atualização v12.2.3"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Corpo */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Mensagem <span className="text-red-400">*</span>
                </label>
                <span className={`text-xs ${body.length > MAX_BODY ? 'text-red-400' : 'text-zinc-500'}`}>
                  {body.length}/{MAX_BODY}
                </span>
              </div>
              <textarea
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                placeholder={'Descreva a novidade para os alunos...\nUma linha por item vira um bullet no feed.'}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">Dica: quebre em várias linhas para virar uma lista de novidades no feed.</p>
            </div>

            {/* Público-alvo + Expiração lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                  Público-alvo
                </label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                  Expirar em (opcional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Coluna direita: preview ao vivo, replicando o feed real */}
          <div className="hidden md:flex flex-col border-l border-zinc-800 bg-zinc-900/40 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Preview no feed</p>
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <div className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30">
                  <SelectedIcon className="h-4 w-4 text-violet-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-white">{title.trim() || 'Título do anúncio'}</p>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 rotate-180" />
              </div>
              <div className="border-t border-zinc-800 px-4 py-3.5">
                {previewBullets.length > 1 ? (
                  <ul className="space-y-1.5">
                    {previewBullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-300">
                    {body.trim() || 'A mensagem do anúncio aparece aqui conforme você digita.'}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-600">
              Público: {TARGET_OPTIONS.find((o) => o.value === target)?.label}
              {expiresAt && ` · expira em ${new Date(expiresAt).toLocaleDateString('pt-BR')}`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 text-sm px-5 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
            Criar anúncio
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
