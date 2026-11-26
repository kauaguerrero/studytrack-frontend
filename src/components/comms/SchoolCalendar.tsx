'use client';

// Calendário da escola (fases 9/9b): grade do mês com eventos, avisos e
// simulados agendados, com as repetições já expandidas pelo backend.
// Aluno vê o que a turma dele vê; gestor (manage) vê tudo e cria/edita/exclui
// eventos (um dia da série ou a série inteira) e tira dias dos avisos da escola.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Loader2, MapPin, Megaphone, Plus, Repeat, Trash2, X } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { useOrgClasses } from '@/lib/org-classes';
import { HeroStat, PageShell, pageCard } from '@/components/partners/PageShell';
import { ClassVisibilityPicker } from '@/components/partners/ClassVisibilityPicker';
import { CalendarFields, EMPTY_CALENDAR, calendarFrom, recurrencePayload, type CalendarValue } from '@/components/comms/CalendarFields';
import { EVENT_KINDS, EVENT_KIND_COLOR, EVENT_KIND_LABEL, commsFetch, type CalendarItem, type EventKind } from '@/lib/org-comms';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white';
const label = 'text-xs font-semibold text-slate-600 dark:text-white/70';
const chip = (on: boolean) => `h-8 w-8 rounded-full text-xs font-bold ${on ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/70'}`;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 6 semanas a partir do domingo antes do dia 1. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

interface Draft {
  id?: string;
  /** Editar só este dia de uma série (yyyy-mm-dd). */
  day?: string;
  title: string;
  kind: EventKind;
  cal: CalendarValue;
  location: string;
  link_url: string;
  description: string;
  visible_class_ids: string[];
}

const isRecurring = (it: CalendarItem) => !!it.recurrence_freq && it.recurrence_freq !== 'none';

export function SchoolCalendar({ manage = false }: { manage?: boolean }) {
  const { org } = useOrg();
  const slug = org.slug;
  const { classes } = useOrgClasses(slug, { enabled: manage });
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [selected, setSelected] = useState(iso(today));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<CalendarItem | null>(null);
  const [editing, setEditing] = useState<CalendarItem | null>(null);
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
      const k = it.occurrence_date ?? iso(new Date(it.starts_at));
      m.set(k, [...(m.get(k) ?? []), it]);
    }
    return m;
  }, [items]);
  const dayItems = byDay.get(selected) ?? [];

  const move = (delta: number) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  function newEvent() {
    setDraft({ title: '', kind: 'evento', cal: { ...EMPTY_CALENDAR, allDay: false, starts: `${selected}T19:00` },
      location: '', link_url: '', description: '', visible_class_ids: [] });
  }

  function editDay(it: CalendarItem) {
    setEditing(null);
    setDraft({
      id: it.id, day: it.occurrence_date, title: it.title, kind: it.kind as EventKind,
      cal: calendarFrom({ starts_at: it.starts_at, ends_at: it.ends_at, all_day: it.all_day, recurrence_freq: 'none' }),
      location: it.location ?? '', link_url: it.link_url ?? '', description: it.description ?? '',
      visible_class_ids: it.visible_class_ids ?? [],
    });
  }

  function editEvent(it: CalendarItem) {
    setEditing(null);
    setDraft({
      id: it.id, title: it.title, kind: it.kind as EventKind,
      cal: calendarFrom({ starts_at: it.series_starts_at ?? it.starts_at, ends_at: it.series_ends_at ?? it.ends_at, all_day: it.all_day,
        recurrence_freq: it.recurrence_freq, recurrence_weekdays: it.recurrence_weekdays, recurrence_until: it.recurrence_until }),
      location: it.location ?? '', link_url: it.link_url ?? '', description: it.description ?? '',
      visible_class_ids: it.visible_class_ids ?? [],
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const { cal } = draft;
    const body = {
      title: draft.title, kind: draft.kind, all_day: cal.allDay,
      starts_at: cal.allDay ? cal.starts.slice(0, 10) : cal.starts,
      ends_at: cal.allDay ? null : cal.ends || null,
      location: draft.location || null, link_url: draft.link_url.trim() || null,
      description: draft.description || null, visible_class_ids: draft.visible_class_ids.length ? draft.visible_class_ids : null,
      ...recurrencePayload(cal),
    };
    try {
      if (draft.id && draft.day) {
        const { recurrence_freq: _f, recurrence_weekdays: _w, recurrence_until: _u, ...changes } = body;
        void _f; void _w; void _u;
        await commsFetch(slug, `/events/${draft.id}/day`, { method: 'POST', body: JSON.stringify({ date: draft.day, changes }) });
      } else if (draft.id) await commsFetch(slug, `/events/${draft.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await commsFetch(slug, '/events', { method: 'POST', body: JSON.stringify(body) });
      toast.success('Evento salvo.');
      setDraft(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  }

  async function removeItem(it: CalendarItem, scope: 'day' | 'all') {
    const base = it.source === 'event' ? `/events/${it.id}` : `/announcements/${it.id}`;
    setBusy(true);
    try {
      if (scope === 'day') await commsFetch(slug, `${base}/skip`, { method: 'POST', body: JSON.stringify({ date: it.occurrence_date }) });
      else await commsFetch(slug, base, { method: 'DELETE' });
      toast.success(scope === 'day' ? 'Dia removido da repetição.' : it.source === 'event' ? 'Evento excluído.' : 'Aviso tirado do ar.');
      setRemoving(null);
      void load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro.'); } finally { setBusy(false); }
  }

  const timeLabel = (it: CalendarItem) => it.all_day ? 'Dia todo'
    : new Date(it.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      + (it.ends_at ? ` – ${new Date(it.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '');
  const kindLabel = (it: CalendarItem) => it.source === 'simulado' ? 'Simulado'
    : it.source === 'announcement' ? (it.announcement_source === 'platform' ? 'Aviso StudyTrack' : 'Aviso da escola')
    : EVENT_KIND_LABEL[it.kind];
  const canEditAnn = (it: CalendarItem) => manage && it.source === 'announcement' && it.announcement_source === 'school';

  // Números do hero: itens do mês visível e o próximo a partir de agora.
  const monthCount = (items ?? []).filter((it) => new Date(`${it.occurrence_date ?? it.starts_at.slice(0, 10)}T12:00:00`).getMonth() === cursor.m).length;
  const nextItem = (items ?? [])
    .filter((it) => new Date(it.starts_at).getTime() >= Date.now() - 3600_000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const timeShort = (it: CalendarItem) => (it.all_day ? '' : new Date(it.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  return (
    <PageShell
      variant={manage ? 'founder' : 'student'}
      kicker="Comunicação"
      icon={CalendarDays}
      title="Calendário"
      description={manage
        ? 'Eventos, avisos e simulados da escola. Cada turma vê só o que for dela.'
        : 'Eventos, avisos e provas da sua escola.'}
      actions={manage ? (
        <button type="button" onClick={newEvent}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-transform hover:scale-[1.02]" style={{ background: 'var(--brand-primary)' }}>
          <Plus className="h-4 w-4" /> Novo evento
        </button>
      ) : undefined}
      aside={manage ? undefined : (<>
        <HeroStat label={`Em ${MONTHS[cursor.m].toLowerCase()}`} value={items === null ? '…' : monthCount} hint={monthCount === 1 ? 'item no calendário' : 'itens no calendário'} />
        <HeroStat label="Próximo" value={nextItem ? new Date(nextItem.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
          hint={nextItem ? nextItem.title : 'Nada marcado à frente'} />
      </>)}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${pageCard} p-3 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Mês anterior" onClick={() => move(-1)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <p className="min-w-[150px] text-center text-lg font-black text-slate-900 dark:text-white" data-testid="month-label">{MONTHS[cursor.m]} {cursor.y}</p>
              <button type="button" aria-label="Próximo mês" onClick={() => move(1)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-3">
              {items === null && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="h-3 w-3 animate-spin" /> Carregando…</span>}
              <button type="button" onClick={() => { setCursor({ y: today.getFullYear(), m: today.getMonth() }); setSelected(iso(today)); }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10">Hoje</button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400 sm:gap-1.5">
            {WD.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
            {grid.map((d) => {
              const k = iso(d);
              const its = byDay.get(k) ?? [];
              const out = d.getMonth() !== cursor.m;
              const isSel = k === selected;
              const isToday = k === iso(today);
              return (
                <button key={k} type="button" onClick={() => setSelected(k)} aria-label={`Dia ${d.getDate()}${its.length ? `, ${its.length} item(ns)` : ''}`}
                  className={`flex min-h-[64px] flex-col items-stretch rounded-xl border p-1 text-left text-xs transition sm:min-h-[104px] sm:p-1.5 ${isSel ? 'border-transparent' : 'border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5'} ${out ? 'opacity-40' : ''}`}
                  style={isSel ? { boxShadow: '0 0 0 2px var(--brand-primary)' } : undefined}>
                  <span className={`self-center font-bold sm:self-start ${isToday ? 'rounded-full px-1.5 text-white' : 'text-slate-700 dark:text-white/80'}`}
                    style={isToday ? { background: 'var(--brand-primary)' } : undefined}>{d.getDate()}</span>
                  {/* celular: só os pontos; tela maior: título e horário de cada item */}
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden" aria-hidden>
                    {its.slice(0, 3).map((it) => <span key={`${it.source}-${it.id}`} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_KIND_COLOR[it.kind] }} />)}
                  </span>
                  <span className="mt-1 hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden>
                    {its.slice(0, 3).map((it) => (
                      <span key={`${it.source}-${it.id}`} className="truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight text-slate-800 dark:text-white/90"
                        style={{ background: `color-mix(in srgb, ${EVENT_KIND_COLOR[it.kind]} 18%, transparent)`, borderLeft: `3px solid ${EVENT_KIND_COLOR[it.kind]}` }}>
                        {timeShort(it) && <span className="mr-1 opacity-60">{timeShort(it)}</span>}{it.title}
                      </span>
                    ))}
                    {its.length > 3 && <span className="px-1 text-[10px] font-semibold text-slate-500">+{its.length - 3} mais</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-white/55">
            {(['aviso', 'evento', 'prova', 'feriado', 'prazo', 'aula'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: EVENT_KIND_COLOR[k] }} />{EVENT_KIND_LABEL[k]}</span>
            ))}
          </div>
        </section>

        <section className={`${pageCard} p-4 sm:p-5 xl:sticky xl:top-4 xl:self-start`} aria-label="Eventos do dia">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Dia selecionado</p>
          <p className="mt-0.5 text-base font-black capitalize text-slate-900 dark:text-white">
            {new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          {dayItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-white/55">Nada marcado neste dia.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayItems.map((it) => (
                <li key={`${it.source}-${it.id}-${it.occurrence_date}`} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/5"
                  style={{ borderLeft: `4px solid ${EVENT_KIND_COLOR[it.kind]}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                        {it.source === 'announcement' && <Megaphone className="h-3.5 w-3.5 shrink-0" style={{ color: EVENT_KIND_COLOR.aviso }} />}
                        {it.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/55">{kindLabel(it)} · {timeLabel(it)}</p>
                      {it.recurrence_label && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/55"><Repeat className="h-3 w-3" /> {it.recurrence_label}</p>
                      )}
                    </div>
                    {manage && it.source === 'event' && (
                      <span className="flex shrink-0 gap-2">
                        <button type="button" className="text-xs font-semibold text-slate-500 hover:underline" onClick={() => (isRecurring(it) ? setEditing(it) : editEvent(it))}>Editar</button>
                        <button type="button" aria-label="Excluir evento" onClick={() => (isRecurring(it) ? setRemoving(it) : window.confirm(`Excluir "${it.title}"?`) && void removeItem(it, 'all'))}
                          className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    )}
                    {canEditAnn(it) && (
                      <span className="flex shrink-0 gap-2">
                        <Link href={`/partners/${slug}/avisos`} className="text-xs font-semibold text-slate-500 hover:underline">Editar</Link>
                        <button type="button" aria-label="Excluir aviso" onClick={() => (isRecurring(it) ? setRemoving(it) : window.confirm(`Tirar "${it.title}" do ar?`) && void removeItem(it, 'all'))}
                          className="text-slate-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </span>
                    )}
                  </div>
                  {it.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt="" className="mt-2 max-h-40 w-full rounded-xl object-cover" />
                  )}
                  {it.location && <p className="mt-1 flex items-center gap-1 text-xs text-slate-600 dark:text-white/65"><MapPin className="h-3 w-3" /> {it.location}</p>}
                  {it.description && <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs text-slate-600 dark:text-white/65">{it.description}</p>}
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setEditing(null)}>
          <div role="dialog" aria-label="Editar item repetido" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-3 rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:bg-slate-900">
            <h2 className="font-black text-slate-900 dark:text-white">Editar &quot;{editing.title}&quot;</h2>
            <p className="text-sm text-slate-600 dark:text-white/70">Este evento se repete ({editing.recurrence_label}).</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => editDay(editing)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-white/15 dark:text-white">
                Só o dia {new Date(`${editing.occurrence_date}T12:00:00`).toLocaleDateString('pt-BR')}
              </button>
              <button type="button" onClick={() => editEvent(editing)} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--brand-primary)' }}>
                Toda a série
              </button>
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-1 text-sm font-semibold text-slate-500">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {removing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setRemoving(null)}>
          <div role="dialog" aria-label="Excluir item repetido" onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-3 rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:bg-slate-900">
            <h2 className="font-black text-slate-900 dark:text-white">Excluir &quot;{removing.title}&quot;</h2>
            <p className="text-sm text-slate-600 dark:text-white/70">Este item se repete ({removing.recurrence_label}).</p>
            <div className="flex flex-col gap-2">
              <button type="button" disabled={busy} onClick={() => void removeItem(removing, 'day')}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-white/15 dark:text-white">
                Só o dia {new Date(`${removing.occurrence_date}T12:00:00`).toLocaleDateString('pt-BR')}
              </button>
              <button type="button" disabled={busy} onClick={() => void removeItem(removing, 'all')}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">
                {removing.source === 'event' ? 'Toda a série' : 'Tirar o aviso do ar'}
              </button>
              <button type="button" onClick={() => setRemoving(null)} className="px-4 py-1 text-sm font-semibold text-slate-500">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setDraft(null)}>
          <div role="dialog" aria-label="Evento" onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-900 dark:text-white">{draft.day ? `Editar só ${new Date(`${draft.day}T12:00:00`).toLocaleDateString('pt-BR')}` : draft.id ? 'Editar evento' : 'Novo evento'}</h2>
              <button type="button" aria-label="Fechar" onClick={() => setDraft(null)}><X className="h-4 w-4" /></button>
            </div>
            <input aria-label="Título do evento" className={input} placeholder="Título" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <select aria-label="Tipo" className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as EventKind })}>
              {EVENT_KINDS.map((k) => <option key={k} value={k}>{EVENT_KIND_LABEL[k]}</option>)}
            </select>
            <CalendarFields value={draft.cal} onChange={(cal) => setDraft({ ...draft, cal })} inputClass={input} labelClass={label} chipClass={chip}
              startLabel="Início" requireStart hideRepeat={!!draft.day} />
            {draft.day && (
              <p className="text-[11px] text-slate-500 dark:text-white/55">Só este dia muda; os outros dias da série continuam iguais.</p>
            )}
            {draft.id && !draft.day && draft.cal.freq !== 'none' && (
              <p className="text-[11px] text-slate-500 dark:text-white/55">Salvar altera todos os dias da série.</p>
            )}
            <input aria-label="Local" className={input} placeholder="Local (opcional)" maxLength={200} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            <input aria-label="Link do evento" className={input} placeholder="Link (opcional, https://...)" value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} />
            <textarea aria-label="Descrição" className={`${input} min-h-[80px]`} placeholder="Descrição (opcional)" maxLength={2000} value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <ClassVisibilityPicker classes={classes} value={draft.visible_class_ids} onChange={(ids) => setDraft({ ...draft, visible_class_ids: ids })} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">Cancelar</button>
              <button type="button" disabled={busy || !draft.title.trim() || !draft.cal.starts} onClick={() => void save()}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50" style={{ background: 'var(--brand-primary)' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
