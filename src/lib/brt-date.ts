export const BRT_TIMEZONE = 'America/Sao_Paulo';

export function toBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function todayBrtDateKey(): string {
  return toBrtDateKey(new Date());
}

export function brtDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toBrtDateKey(d);
}

export function toBrtDateKeyFromIso(value?: string | null): string {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return toBrtDateKey(dt);
}

function dateKeyToUtcMs(dateKey: string): number {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) return NaN;
  return Date.UTC(year, month - 1, day);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const baseMs = dateKeyToUtcMs(dateKey);
  if (Number.isNaN(baseMs)) return '';
  return new Date(baseMs + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function compareDateKeys(a: string, b: string): number {
  const aMs = dateKeyToUtcMs(a);
  const bMs = dateKeyToUtcMs(b);
  if (Number.isNaN(aMs) || Number.isNaN(bMs)) return 0;
  return aMs === bMs ? 0 : aMs > bMs ? 1 : -1;
}

export function diffDaysBetweenDateKeys(fromDateKey: string, toDateKey: string): number | null {
  const fromMs = dateKeyToUtcMs(fromDateKey);
  const toMs = dateKeyToUtcMs(toDateKey);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  return Math.ceil((toMs - fromMs) / (24 * 60 * 60 * 1000));
}
