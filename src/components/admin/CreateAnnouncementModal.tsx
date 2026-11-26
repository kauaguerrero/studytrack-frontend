'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Bell, Loader2, X, ChevronDown } from 'lucide-react';
import { ANNOUNCEMENT_ICONS, DEFAULT_ANNOUNCEMENT_ICON, getAnnouncementIcon } from '@/lib/announcement-icons';
import { CalendarFields, EMPTY_CALENDAR, calendarFrom, type CalendarValue } from '@/components/comms/CalendarFields';
import { announcementCalendarPayload } from '@/components/comms/SchoolAnnouncements';
import type { RecurrenceFields } from '@/lib/org-comms';

const MAX_TITLE = 80;
const MAX_BODY = 600;

const TARGET_OPTIONS = [
  { value: 'all',        label: 'Todos os usuários' },
  { value: 'b2b_basic',  label: 'Parceiros — plano Basic' },
  { value: 'b2b_student', label: 'Parceiros — plano Student' },
  { value: 'b2b_pro',    label: 'Parceiros — plano Pro' },
  { value: 'b2b_test',   label: 'Contas de teste (dev)' },
];

/** Aviso da plataforma já salvo (modo edição). */
export interface PlatformAnnouncement extends RecurrenceFields {
  id: string;
  title: string;
  body: string;
  icon: string;
  target_plan: string;
  expires_at: string | null;
  link_url?: string | null;
  is_important?: boolean;
  target_org_ids?: string[] | null;
  calendar_starts_at?: string | null;
  calendar_ends_at?: string | null;
  calendar_all_day?: boolean;
}

interface OrgOption { id: string; name: string; slug: string; is_mock?: boolean }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  editing?: PlatformAnnouncement | null;
}

const zInput = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500';
const zLabel = 'text-xs font-bold uppercase tracking-wider text-zinc-400';
const zChip = (on: boolean) => `h-8 w-8 rounded-full text-xs font-bold ${on ? 'bg-violet-600 text-white' : 'bg-zinc-800 text-zinc-400'}`;

/** Quebra o corpo em linhas não-vazias — mesma lógica do feed real, pra preview fiel. */
function splitBullets(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

export default function CreateAnnouncementModal({ isOpen, onClose, onCreated, editing = null }: Props) {
  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [icon, setIcon]         = useState(DEFAULT_ANNOUNCEMENT_ICON);
  const [target, setTarget]     = useState('all');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading]   = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [orgMode, setOrgMode] = useState<'all' | 'some'>('all');
  const [orgIds, setOrgIds] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[] | null>(null);
  const [orgQuery, setOrgQuery] = useState('');
  const [cal, setCal] = useState<CalendarValue>(EMPTY_CALENDAR);
  const [linkUrl, setLinkUrl] = useState('');
  const [important, setImportant] = useState(false);
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setIcon(DEFAULT_ANNOUNCEMENT_ICON);
      setTarget('all');
      setExpiresAt('');
      setLoading(false);
      setIconPickerOpen(false);
      setOrgMode('all'); setOrgIds([]); setOrgQuery(''); setCal(EMPTY_CALENDAR); setLinkUrl(''); setImportant(false);
      return;
    }
    if (editing) {
      setTitle(editing.title); setBody(editing.body); setIcon(editing.icon || DEFAULT_ANNOUNCEMENT_ICON);
      setTarget(editing.target_plan || 'all'); setExpiresAt(editing.expires_at ? editing.expires_at.slice(0, 10) : '');
      setOrgMode(editing.target_org_ids?.length ? 'some' : 'all'); setOrgIds(editing.target_org_ids ?? []);
      setLinkUrl(editing.link_url ?? ''); setImportant(!!editing.is_important);
      setCal(editing.calendar_starts_at
        ? calendarFrom({ starts_at: editing.calendar_starts_at, ends_at: editing.calendar_ends_at, all_day: editing.calendar_all_day,
            recurrence_freq: editing.recurrence_freq, recurrence_weekdays: editing.recurrence_weekdays, recurrence_until: editing.recurrence_until })
        : { ...EMPTY_CALENDAR, freq: editing.recurrence_freq ?? 'none', weekdays: editing.recurrence_weekdays ?? [], until: editing.recurrence_until ?? '' });
    }
  }, [isOpen, editing]);

  // Lista de orgs para o alvo "só algumas" (uma leitura por abertura).
  useEffect(() => {
    if (!isOpen || orgs) return;
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const r = await fetch(`${apiUrl}/api/admin/announcements/organizations`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const j = await r.json().catch(() => ({}));
      if (alive) setOrgs(r.ok ? (j.organizations ?? []) : []);
    })().catch(() => { if (alive) setOrgs([]); });
    return () => { alive = false; };
  }, [isOpen, orgs, apiUrl, supabase]);

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada.');

      const res = await fetch(`${apiUrl}/api/admin/announcements${editing ? `/${editing.id}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          icon,
          target_plan: target,
          expires_at: expiresAt ? new Date(`${expiresAt}T23:59:00`).toISOString() : null,
          target_org_ids: orgMode === 'some' ? orgIds : null,
          link_url: linkUrl.trim() || null,
          is_important: important,
          ...announcementCalendarPayload(cal),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Erro HTTP ${res.status}`);
      }

      toast.success(editing ? 'Anúncio atualizado.' : 'Anúncio criado! Aparecerá para os usuários na próxima vez que acessarem o portal.');
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar anúncio');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !loading && (orgMode === 'all' || orgIds.length > 0);
  const shownOrgs = (orgs ?? []).filter((o) => !orgQuery.trim() || `${o.name} ${o.slug}`.toLowerCase().includes(orgQuery.trim().toLowerCase()));
  const SelectedIcon = getAnnouncementIcon(icon);
  const previewBullets = splitBullets(body);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl w-[calc(100%-2rem)] rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-white">
            <Bell className="w-4 h-4 text-violet-400" /> {editing ? 'Editar anúncio' : 'Criar anúncio de novidade'}
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

            {/* Orgs: todas (padrão) ou só algumas */}
            <div className="space-y-2">
              <p className={zLabel}>Escolas</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Escolas">
                {(['all', 'some'] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={orgMode === m} onClick={() => setOrgMode(m)}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${orgMode === m ? 'border-violet-500 bg-violet-500/10 text-white' : 'border-zinc-800 text-zinc-400'}`}>
                    {m === 'all' ? 'Todas as escolas' : 'Só algumas'}
                  </button>
                ))}
              </div>
              {orgMode === 'some' && (
                <div className="rounded-xl border border-zinc-800 p-2">
                  <input aria-label="Buscar escola" className={zInput} placeholder="Buscar escola" value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} />
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {orgs === null ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : shownOrgs.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm text-zinc-200">
                        <input type="checkbox" checked={orgIds.includes(o.id)}
                          onChange={(e) => setOrgIds(e.target.checked ? [...orgIds, o.id] : orgIds.filter((x) => x !== o.id))} />
                        {o.name}{o.is_mock ? <span className="text-[10px] text-zinc-500">(demo)</span> : null}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">{orgIds.length} selecionada(s)</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className={`${zLabel} block`}>Link (opcional)</label>
              <input aria-label="Link" className={zInput} placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> Importante (pop-up com &quot;Entendi&quot;)
            </label>

            <fieldset className="rounded-xl border border-zinc-800 p-3">
              <legend className={`${zLabel} px-1`}>No calendário</legend>
              <CalendarFields value={cal} onChange={setCal} inputClass={zInput} labelClass="text-xs font-semibold text-zinc-400" chipClass={zChip}
                startLabel="Dia no calendário" startHint="Sem data: aparece no dia da publicação." />
            </fieldset>
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
              {orgMode === 'some' ? ` · ${orgIds.length} escola(s)` : ' · todas as escolas'}
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
            {editing ? 'Salvar' : 'Criar anúncio'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
