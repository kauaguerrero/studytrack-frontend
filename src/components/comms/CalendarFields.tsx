'use client';

// Campos de data + repetição do calendário (fase 9b), usados no evento da
// escola, no aviso da escola e no aviso da plataforma (painel interno).

import { toLocalInput } from '@/lib/org-comms';

export type RecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarValue {
  starts: string;      // datetime-local ou date ('' = aviso no dia da publicação)
  ends: string;
  allDay: boolean;
  freq: RecurrenceFreq;
  weekdays: number[];  // 0=dom..6=sáb
  until: string;       // yyyy-mm-dd
}

export const EMPTY_CALENDAR: CalendarValue = { starts: '', ends: '', allDay: true, freq: 'none', weekdays: [], until: '' };
const WD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WD_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const FREQ_LABEL: Record<RecurrenceFreq, string> = { none: 'Não repete', daily: 'Todo dia', weekly: 'Toda semana', monthly: 'Todo mês' };

export function recurrencePayload(v: CalendarValue) {
  return {
    recurrence_freq: v.freq,
    recurrence_weekdays: v.freq === 'weekly' && v.weekdays.length ? v.weekdays : null,
    recurrence_until: v.freq !== 'none' && v.until ? v.until : null,
  };
}

/** Valor do formulário a partir de uma série salva. */
export function calendarFrom(row: {
  starts_at?: string | null; ends_at?: string | null; all_day?: boolean | null;
  recurrence_freq?: string | null; recurrence_weekdays?: number[] | null; recurrence_until?: string | null;
}): CalendarValue {
  const allDay = row.all_day !== false;
  const s = toLocalInput(row.starts_at ?? null);
  return {
    starts: allDay ? s.slice(0, 10) : s,
    ends: allDay ? '' : toLocalInput(row.ends_at ?? null),
    allDay,
    freq: (row.recurrence_freq as RecurrenceFreq) || 'none',
    weekdays: row.recurrence_weekdays ?? [],
    until: row.recurrence_until ?? '',
  };
}

export function CalendarFields({ value, onChange, inputClass, labelClass, chipClass, startLabel = 'Data', startHint, requireStart = false }: {
  value: CalendarValue;
  onChange: (v: CalendarValue) => void;
  inputClass: string;
  labelClass: string;
  chipClass: (active: boolean) => string;
  startLabel?: string;
  startHint?: string;
  requireStart?: boolean;
}) {
  const set = (patch: Partial<CalendarValue>) => onChange({ ...value, ...patch });
  const toggleWd = (d: number) => set({ weekdays: value.weekdays.includes(d) ? value.weekdays.filter((x) => x !== d) : [...value.weekdays, d].sort() });

  return (
    <div className="space-y-3" data-testid="calendar-fields">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>{startLabel}{requireStart ? '' : ' (opcional)'}
          <input aria-label={startLabel} type={value.allDay ? 'date' : 'datetime-local'} className={`${inputClass} mt-1`}
            value={value.allDay ? value.starts.slice(0, 10) : value.starts}
            onChange={(e) => set({ starts: e.target.value })} />
          {startHint && <span className="mt-1 block text-[11px] font-normal opacity-70">{startHint}</span>}
        </label>
        <div className="flex flex-col gap-2">
          <label className={`${labelClass} inline-flex items-center gap-2`}>
            <input type="checkbox" checked={value.allDay}
              onChange={(e) => set({ allDay: e.target.checked, starts: e.target.checked ? value.starts.slice(0, 10) : (value.starts ? `${value.starts.slice(0, 10)}T19:00` : ''), ends: '' })} />
            Dia todo
          </label>
          {!value.allDay && (
            <label className={labelClass}>Fim (opcional)
              <input aria-label="Fim" type="datetime-local" className={`${inputClass} mt-1`} value={value.ends} onChange={(e) => set({ ends: e.target.value })} />
            </label>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Repetir
          <select aria-label="Repetir" className={`${inputClass} mt-1`} value={value.freq}
            onChange={(e) => set({ freq: e.target.value as RecurrenceFreq })}>
            {(Object.keys(FREQ_LABEL) as RecurrenceFreq[]).map((f) => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
          </select>
        </label>
        {value.freq !== 'none' && (
          <label className={labelClass}>Até (opcional)
            <input aria-label="Repetir até" type="date" className={`${inputClass} mt-1`} value={value.until} onChange={(e) => set({ until: e.target.value })} />
          </label>
        )}
      </div>
      {value.freq === 'weekly' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
          {WD.map((d, i) => (
            <button key={i} type="button" aria-label={WD_FULL[i]} aria-pressed={value.weekdays.includes(i)}
              className={chipClass(value.weekdays.includes(i))} onClick={() => toggleWd(i)}>{d}</button>
          ))}
          <span className="self-center text-[11px] opacity-70">Sem dia marcado: o mesmo dia da semana da data.</span>
        </div>
      )}
    </div>
  );
}
