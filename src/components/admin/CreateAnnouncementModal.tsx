'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Bell, Loader2, X } from 'lucide-react';

const MAX_TITLE = 80;
const MAX_BODY = 600;

const TARGET_OPTIONS = [
  { value: 'all',   label: 'Todos os usuários' },
  { value: 'free',  label: 'Apenas Free' },
  { value: 'pro',   label: 'Apenas Pro' },
  { value: 'elite', label: 'Apenas Elite' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateAnnouncementModal({ isOpen, onClose }: Props) {
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [target, setTarget]     = useState('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading]   = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setTarget('all');
      setExpiresAt('');
      setLoading(false);
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
          target_plan: target,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro HTTP ${res.status}`);
      }

      toast.success('Anúncio criado! Aparecerá para os usuários na próxima vez que acessarem o portal.');
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar anúncio');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !loading;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)] rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
            <Bell className="w-4 h-4 text-violet-400" /> Criar anúncio de novidade
          </DialogTitle>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
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
              placeholder="Ex: Nova função de speedrun liberada!"
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
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
              placeholder="Descreva a novidade para os alunos..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            />
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
