'use client';

// Turma (plano Cenas, fase 4): grade de aulas (semanal + exceções) e faltas.
// A grade aparece em roxo no cronograma dos alunos; as faltas são marcadas
// por eles ("vou faltar" / "faltei") e lidas aqui pela coordenação.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CalendarX, ChevronLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { BrandButton, ElevatedCard, RevealGroup, RevealItem, SectionTitle, Segmented } from '@/components/partners/founder-ui';
import { classesFetch, type OrgClass } from '@/lib/org-classes';

const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const labelCls = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';

interface Slot {
  id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
  subject: string;
  title: string | null;
  plurall_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

interface ScheduleException {
  id: string;
  date: string;
  kind: 'cancel' | 'replace' | 'extra';
  slot_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  subject: string | null;
  note: string | null;
}

interface AttendanceRecord {
  occurrence_date: string;
  subject: string;
  minutes: number;
  status: 'vai_faltar' | 'faltou';
  studied_instead: boolean | null;
  makeup_item_id: string | null;
}

interface StudentAttendance {
  user_id: string;
  full_name: string | null;
  email: string | null;
  absences: number;
  planned_absences: number;
  studied_instead: number;
  alert: boolean;
  records: AttendanceRecord[];
}

interface AttendanceReport {
  alert_rule: { absences: number; days: number };
  range: { start: string; end: string };
  students: StudentAttendance[];
}

const hm = (t: string | null) => (t ? t.slice(0, 5) : '');
const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const isoToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function TurmaPage() {
  return (
    <PartnerLayout variant="founder">
      <Suspense fallback={<div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>}>
        <TurmaInner />
      </Suspense>
    </PartnerLayout>
  );
}

function TurmaInner() {
  const { org } = useOrg();
  const slug = org.slug;
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get('aba') === 'faltas' ? 'faltas' : 'grade';
  const [klass, setKlass] = useState<OrgClass | null>(null);

  useEffect(() => {
    if (org.is_mock) return;
    classesFetch<{ classes: OrgClass[] }>(slug, '/classes')
      .then((d) => setKlass(d.classes.find((c) => c.id === id) ?? null))
      .catch(() => setKlass(null));
  }, [slug, id, org.is_mock]);

  return (
    <div className="min-h-full -mx-4 -mt-4 px-4 pt-4 pb-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-8">
      <RevealGroup className="mx-auto max-w-5xl space-y-5">
        <RevealItem>
          <Link href={`/partners/${slug}/turmas`} className="mb-1.5 flex w-fit items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600">
            <ChevronLeft size={14} /> Turmas
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{klass?.name ?? 'Turma'}</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {tab === 'grade'
                  ? 'As aulas aparecem em roxo no cronograma dos alunos e puxam a matéria do dia para a frente.'
                  : 'Faltas marcadas pelos alunos no cronograma. O alerta aparece para quem falta muito em pouco tempo.'}
              </p>
            </div>
            <Segmented<'grade' | 'faltas'>
              options={[{ value: 'grade', label: 'Grade de aulas' }, { value: 'faltas', label: 'Faltas' }]}
              value={tab}
              onChange={(v) => router.replace(`/partners/${slug}/turmas/${id}?aba=${v}`)}
              hex={org.brand_primary}
            />
          </div>
        </RevealItem>
        {org.is_mock ? (
          <p className="text-sm text-slate-500">Disponível na conta real da escola.</p>
        ) : tab === 'grade' ? <ScheduleEditor slug={slug} classId={id} hex={org.brand_primary} /> : <AttendanceView slug={slug} classId={id} />}
      </RevealGroup>
    </div>
  );
}

// ─── Grade ───────────────────────────────────────────────────────────────────

const EMPTY_SLOT = { weekday: 0, starts_at: '19:00', ends_at: '20:40', subject: '', title: '', plurall_url: '' };

function ScheduleEditor({ slug, classId, hex }: { slug: string; classId: string; hex?: string }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [form, setForm] = useState<typeof EMPTY_SLOT | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<Slot | null>(null);
  const [cancelDate, setCancelDate] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await classesFetch<{ slots: Slot[]; exceptions: ScheduleException[] }>(slug, `/classes/${classId}/schedule`);
      setSlots(d.slots);
      setExceptions(d.exceptions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar a grade.');
      setSlots([]);
    }
  }, [slug, classId]);
  useEffect(() => { void load(); }, [load]);

  const byDay = useMemo(() => {
    const m: Slot[][] = Array.from({ length: 7 }, () => []);
    for (const s of slots ?? []) m[s.weekday]?.push(s);
    return m;
  }, [slots]);

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      const body = JSON.stringify({ ...form, title: form.title || null, plurall_url: form.plurall_url || null });
      await classesFetch(slug, editing ? `/classes/schedule/slots/${editing}` : `/classes/${classId}/schedule/slots`,
        { method: editing ? 'PATCH' : 'POST', body });
      toast.success(editing ? 'Aula atualizada' : 'Aula adicionada');
      setForm(null); setEditing(null);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao salvar.'); } finally { setBusy(false); }
  }

  async function remove(s: Slot) {
    if (!window.confirm(`Tirar ${s.subject} de ${WEEKDAYS[s.weekday].toLowerCase()} da grade? As faltas já marcadas ficam guardadas.`)) return;
    try {
      await classesFetch(slug, `/classes/schedule/slots/${s.id}`, { method: 'DELETE' });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao remover.'); }
  }

  async function cancelOn() {
    if (!cancelFor || !cancelDate) return;
    setBusy(true);
    try {
      await classesFetch(slug, `/classes/${classId}/schedule/exceptions`, {
        method: 'POST', body: JSON.stringify({ kind: 'cancel', slot_id: cancelFor.id, date: cancelDate }),
      });
      toast.success('Aula cancelada nesse dia');
      setCancelFor(null); setCancelDate('');
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao cancelar.'); } finally { setBusy(false); }
  }

  async function dropException(x: ScheduleException) {
    try {
      await classesFetch(slug, `/classes/schedule/exceptions/${x.id}`, { method: 'DELETE' });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro ao desfazer.'); }
  }

  if (slots === null) return <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando grade…</div>;
  const slotName = (id: string | null) => slots.find((s) => s.id === id)?.subject ?? 'Aula';
  const upcoming = exceptions.filter((x) => x.date >= addDays(isoToday(), -1));

  return (
    <>
      <RevealItem>
        <SectionTitle kicker="Semana" title="Aulas fixas" hex={hex}
          action={!form ? (
            <BrandButton hex={hex} onClick={() => { setForm({ ...EMPTY_SLOT }); setEditing(null); }}>
              <Plus className="h-4 w-4" /> Adicionar aula
            </BrandButton>
          ) : undefined} />
        {form && (
          <ElevatedCard className="mb-3 p-4">
            <div className="grid gap-3 sm:grid-cols-[150px_110px_110px_1fr]">
              <div>
                <label className={labelCls} htmlFor="slot-wd">Dia</label>
                <select id="slot-wd" className={inputCls} value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="slot-st">Início</label>
                <input id="slot-st" type="time" className={inputCls} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor="slot-en">Fim</label>
                <input id="slot-en" type="time" className={inputCls} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor="slot-subj">Matéria (como no banco de questões)</label>
                <input id="slot-subj" className={inputCls} value={form.subject} maxLength={80} placeholder="Ex: Matemática"
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="slot-title">Título (opcional)</label>
                <input id="slot-title" className={inputCls} value={form.title} maxLength={80} placeholder="Ex: Funções — prof. Ana"
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="slot-plurall">Link do Plurall (opcional)</label>
                <input id="slot-plurall" className={inputCls} value={form.plurall_url} placeholder="https://…"
                  onChange={(e) => setForm({ ...form, plurall_url: e.target.value })} />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setForm(null); setEditing(null); }}
                className="rounded-full border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancelar</button>
              <BrandButton hex={hex} onClick={() => void save()} disabled={busy || !form.subject.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </BrandButton>
            </div>
          </ElevatedCard>
        )}
        {slots.length === 0 && !form ? (
          <ElevatedCard className="p-6 text-center text-sm text-slate-500">Nenhuma aula na grade ainda.</ElevatedCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byDay.map((list, wd) => list.length > 0 && (
              <ElevatedCard key={wd} className="p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{WEEKDAYS[wd]}</p>
                <ul className="space-y-1.5">
                  {list.map((s) => (
                    <li key={s.id} className="rounded-xl border border-violet-200 bg-violet-50/70 p-2 dark:border-violet-400/25 dark:bg-violet-500/10">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="min-w-0 text-left" onClick={() => {
                          setEditing(s.id);
                          setForm({ weekday: s.weekday, starts_at: hm(s.starts_at), ends_at: hm(s.ends_at), subject: s.subject, title: s.title ?? '', plurall_url: s.plurall_url ?? '' });
                        }}>
                          <span className="block text-[11px] font-bold text-violet-700 dark:text-violet-300">{hm(s.starts_at)}–{hm(s.ends_at)}</span>
                          <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-white">{s.title || s.subject}</span>
                          {s.title && <span className="block text-[11px] text-slate-500">{s.subject}</span>}
                        </button>
                        <div className="flex shrink-0 gap-0.5">
                          <button type="button" aria-label="Cancelar numa data" title="Cancelar numa data" onClick={() => { setCancelFor(s); setCancelDate(''); }}
                            className="rounded-full p-1.5 text-slate-500 hover:bg-white dark:hover:bg-slate-800"><CalendarX className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="Remover da grade" title="Remover da grade" onClick={() => void remove(s)}
                            className="rounded-full p-1.5 text-slate-500 hover:bg-white dark:hover:bg-slate-800"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      {cancelFor?.id === s.id && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <input type="date" className={`${inputCls} py-1 text-xs`} value={cancelDate} min={isoToday()}
                            aria-label="Data da aula cancelada" onChange={(e) => setCancelDate(e.target.value)} />
                          <button type="button" disabled={busy || !cancelDate} onClick={() => void cancelOn()}
                            className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">Cancelar aula</button>
                          <button type="button" onClick={() => setCancelFor(null)} className="text-xs text-slate-500">Fechar</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </ElevatedCard>
            ))}
          </div>
        )}
      </RevealItem>
      {upcoming.length > 0 && (
        <RevealItem>
          <SectionTitle kicker="Exceções" title="Mudanças na grade" hex={hex} />
          <ElevatedCard className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map((x) => (
              <div key={x.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-slate-700 dark:text-slate-200">
                  <b>{fmt(x.date)}</b> ·{' '}
                  {x.kind === 'cancel' ? `${slotName(x.slot_id)} cancelada`
                    : x.kind === 'replace' ? `${x.subject || slotName(x.slot_id)} em novo horário (${hm(x.starts_at)}–${hm(x.ends_at)})`
                    : `Aula extra de ${x.subject} (${hm(x.starts_at)}–${hm(x.ends_at)})`}
                </span>
                <button type="button" onClick={() => void dropException(x)} className="text-xs font-semibold text-slate-500 hover:underline">Desfazer</button>
              </div>
            ))}
          </ElevatedCard>
        </RevealItem>
      )}
    </>
  );
}

// ─── Faltas ──────────────────────────────────────────────────────────────────

function AttendanceView({ slug, classId }: { slug: string; classId: string }) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const to = addDays(isoToday(), 14);
    const from = addDays(isoToday(), -(days - 1));
    setReport(null);
    classesFetch<AttendanceReport>(slug, `/classes/${classId}/attendance?from=${from}&to=${to}`)
      .then(setReport)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Erro ao carregar faltas.'));
  }, [slug, classId, days]);

  if (!report) return <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando faltas…</div>;
  const alerts = report.students.filter((s) => s.alert).length;
  const today = isoToday();

  return (
    <RevealItem>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {alerts > 0
            ? <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300"><AlertTriangle className="h-4 w-4" /> {alerts} {alerts === 1 ? 'aluno' : 'alunos'} com {report.alert_rule.absences}+ faltas nos últimos {report.alert_rule.days} dias</span>
            : `Nenhum aluno com ${report.alert_rule.absences}+ faltas nos últimos ${report.alert_rule.days} dias.`}
        </p>
        <select aria-label="Período" className={`${inputCls} w-auto`} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={14}>Últimos 14 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={60}>Últimos 60 dias</option>
        </select>
      </div>
      <ElevatedCard className="overflow-hidden">
        {report.students.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">A turma não tem alunos.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.students.map((s) => (
              <li key={s.user_id}>
                <button type="button" onClick={() => setOpen(open === s.user_id ? null : s.user_id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{s.full_name || s.email}</span>
                    <span className="block text-xs text-slate-500">
                      {s.absences} {s.absences === 1 ? 'falta' : 'faltas'}
                      {s.studied_instead ? ` · estudou em ${s.studied_instead}` : ''}
                      {s.planned_absences ? ` · ${s.planned_absences} avisada${s.planned_absences > 1 ? 's' : ''} para os próximos dias` : ''}
                    </span>
                  </span>
                  {s.alert && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      <AlertTriangle className="h-3 w-3" /> Atenção
                    </span>
                  )}
                </button>
                {open === s.user_id && s.records.length > 0 && (
                  <ul className="space-y-1 px-4 pb-3">
                    {s.records.map((r) => (
                      <li key={`${r.occurrence_date}-${r.subject}`} className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span><b>{fmt(r.occurrence_date)}</b> · {r.subject}</span>
                        <span className={r.status === 'faltou' ? 'text-rose-600 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}>
                          {r.status === 'faltou'
                            ? r.studied_instead ? 'faltou, estudou no horário' : r.makeup_item_id ? 'faltou · reposição marcada' : 'faltou'
                            : r.occurrence_date >= today ? 'vai faltar' : 'avisou que ia faltar'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </ElevatedCard>
    </RevealItem>
  );
}
