'use client';

// Calendário da escola (fase 9): grade do mês com eventos + simulados agendados.
// Aluno vê o que a turma dele vê; gestor (manage) vê tudo e cria/edita/apaga eventos.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgClasses } from '@/lib/org-classes';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { toLocalInput } from '@/components/comms/SchoolAnnouncements';
import { EVENT_KIND_COLOR, EVENT_KIND_LABEL, commsFetch, type CalendarItem, type EventKind } from '@/lib/org-comms';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayKey = (s: string) => iso(new Date(s));

/** 6 semanas a partir do domingo antes do dia 1. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

interface Draft {
  id?: string;
  title: string;
  kind: EventKind;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string;
  link_url: string;
  description: string;
  visible_class_ids: string[];
}

export function SchoolCalendar({ manage = false }: { manage?: boolean }) {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug, { enabled: manage });
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [selected, setSelected] = useState(iso(today));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const load = useCallback(async () => {
    setItems(null);
    try {
      const r = await commsFetch<{ items: CalendarItem[] }>(slug, `/calendar?from=${iso(grid[0])}&to=${iso(grid[41])}`);
      setItems(r.items);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao carregar.'); setItems([]); }
  }, [slug, grid]);
  useEffect(() => { void load(); }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items ?? []) {
      const k = dayKey(it.starts_at);
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return m;
  }, [items]);
  const dayItems = byDay.get(selected) ?? [];

  const move = (delta: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = {
      title: draft.title, kind: draft.kind, all_day: draft.all_day,
      starts_at: draft.all_day ? draft.starts_at.slice(0, 10) : draft.starts_at,
      ends_at: draft.ends_at || null, location: draft.location || null, link_url: draft.link_url.trim() || null,
      description: draft.description || null, visible_class_ids: draft.visible_class_ids.length ? draft.visible_class_ids : null,
    };
    try {
      if (draft.id) await commsFetch(slug, `/events/${draft.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await commsFetch(slug, '/events', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Evento salvo.');
      setDraft(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  }

  async function remove(it: CalendarItem) {
    if (!window.confirm(`Apagar "${it.title}"?`)) return;
    try { await commsFetch(slug, `/events/${it.id}`, { method: 'DELETE' }); void load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); }
  }

  const timeLabel = (it: CalendarItem) => it.all_day ? 'Dia todo'
    : new Date(it.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      + (it.ends_at ? ` – ${new Date(it.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '');

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white"><CalendarDays className="h-6 w-6" /> Calendário</h1>
        {manage && (
          <button type="button" onClick={() => setDraft({ title: '', kind: 'evento', starts_at: `${selected}T19:00`, ends_at: '', all_day: false,
            location: '', link_url: '', description: '', visible_class_ids: [] })}
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
            <Plus className="h-4 w-4" /> Novo evento
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Mês anterior" onClick={() => move(-1)} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
            <p className="font-black text-slate-900 dark:text-white" data-testid="month-label">{MONTHS[cursor.m]} {cursor.y}</p>
            <button type="button" aria-label="Próximo mês" onClick={() => move(1)} className="rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WD.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const k = iso(d);
              const its = byDay.get(k) ?? [];
              const out = d.getMonth() !== cursor.m;
              const isSel = k === selected;
              return (
                <button key={k} type="button" onClick={() => setSelected(k)} aria-label={`Dia ${d.getDate()}${its.length ? `, ${its.length} evento(s)` : ''}`}
                  className={`flex min-h-[54px] flex-col items-center rounded-xl p-1 text-xs transition ${isSel ? 'ring-2' : 'hover:bg-slate-50 dark:hover:bg-white/5'} ${out ? 'opacity-40' : ''}`}
                  style={isSel ? { boxShadow: '0 0 0 2px var(--brand-primary)' } : undefined}>
                  <span className={`font-bold ${k === iso(today) ? 'rounded-full px-1.5 text-white' : 'text-slate-700 dark:text-white/80'}`}
                    style={k === iso(today) ? { background: 'var(--brand-primary)' } : undefined}>{d.getDate()}</span>
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {its.slice(0, 3).map((it) => <span key={it.id} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_KIND_COLOR[it.kind] }} />)}
                  </span>
                </button>
              );
            })}
          </div>
          {items === null && <div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Carregando…</div>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5" aria-label="Eventos do dia">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            {new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          {dayItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-white/55">Nada marcado neste dia.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayItems.map((it) => (
                <li key={`${it.source}-${it.id}`} className="rounded-2xl border border-slate-100 p-3 dark:border-white/10"
                  style={{ borderLeft: `4px solid ${EVENT_KIND_COLOR[it.kind]}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{it.title}</p>
                      <p className="text-xs text-slate-500 dark:text-white/55">
                        {it.source === 'simulado' ? 'Simulado' : EVENT_KIND_LABEL[it.kind]} · {timeLabel(it)}
                      </p>
                    </div>
                    {manage && it.source === 'event' && (
                      <span className="flex shrink-0 gap-1">
                        <button type="button" className="text-xs font-semibold text-slate-500 hover:underline"
                          onClick={() => setDraft({ id: it.id, title: it.title, kind: it.kind, starts_at: toLocalInput(it.starts_at), ends_at: toLocalInput(it.ends_at),
                            all_day: it.all_day, location: it.location ?? '', link_url: it.link_url ?? '', description: it.description ?? '',
                            visible_class_ids: it.visible_class_ids ?? [] })}>Editar</button>
                        <button type="button" aria-label="Apagar evento" onClick={() => void remove(it)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    )}
                  </div>
                  {it.location && <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-white/65"><MapPin className="h-3 w-3" /> {it.location}</p>}
                  {it.description && <p className="mt-1 whitespace-pre-line text-xs text-slate-600 dark:text-white/65">{it.description}</p>}
                  {it.link_url && (
                    <a href={it.link_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
                      Abrir link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setDraft(null)}>
          <div role="dialog" aria-label="Evento" onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white">{draft.id ? 'Editar evento' : 'Novo evento'}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setDraft(null)}><X className="h-4 w-4" /></button>
            </div>
            <input aria-label="Título do evento" className={input} placeholder="Título" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <select aria-label="Tipo" className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EventKind })}>
                {(Object.keys(EVENT_KIND_LABEL) as EventKind[]).map((k) => <option key={k} value={k}>{EVENT_KIND_LABEL[k]}</option>)}
              </select>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-white/80">
                <input type="checkbox" checked={draft.all_day} onChange={(e) => setDraft({ ...draft, all_day: e.target.checked })} /> Dia todo
              </label>
              <label className="text-xs font-semibold text-slate-600 dark:text-white/70">Início
                <input aria-label="Início" type={draft.all_day ? 'date' : 'datetime-local'} className={`${input} mt-1`}
                  value={draft.all_day ? draft.starts_at.slice(0, 10) : draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} />
              </label>
              {!draft.all_day && (
                <label className="text-xs font-semibold text-slate-600 dark:text-white/70">Fim (opcional)
                  <input aria-label="Fim" type="datetime-local" className={`${input} mt-1`} value={draft.ends_at} onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })} />
                </label>
              )}
            </div>
            <input aria-label="Local" className={input} placeholder="Local (opcional)" maxLength={200} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            <input aria-label="Link do evento" className={input} placeholder="Link (opcional, https://...)" value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} />
            <textarea aria-label="Descrição" className={`${input} min-h-[80px]`} placeholder="Descrição (opcional)" maxLength={2000} value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <ClassVisibilityPicker classes={classes} value={draft.visible_class_ids} onChange={(ids) => setDraft({ ...draft, visible_class_ids: ids })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">Cancelar</button>
              <button type="button" disabled={busy || !draft.title.trim() || !draft.starts_at} onClick={() => void save()}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
