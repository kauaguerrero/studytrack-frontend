'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Lead } from '../types';

const HOUR_HEIGHT = 56; // px por hora
const START_HOUR = 6;
const END_HOUR = 22;
const TIME_ZONE = 'America/Sao_Paulo';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// Hora decimal (ex: 14:30 → 14.5) já convertida pro fuso de exibição.
function decimalHourInTZ(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: TIME_ZONE,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour + minute / 60;
}

interface PositionedCall {
  lead: Lead;
  top: number;
  height: number;
  col: number;
  totalCols: number;
}

// Distribui calls que se sobrepõem em colunas lado a lado (algoritmo guloso
// de coloração de intervalos — suficiente pra esse volume de calls por dia).
function layoutDay(dayLeads: Lead[]): PositionedCall[] {
  const sorted = [...dayLeads].sort(
    (a, b) => new Date(a.call_scheduled_at!).getTime() - new Date(b.call_scheduled_at!).getTime()
  );

  const columns: { endHour: number }[] = [];
  const placed: (PositionedCall & { colIndex: number })[] = [];

  for (const lead of sorted) {
    const start = new Date(lead.call_scheduled_at!);
    const end = lead.call_ends_at ? new Date(lead.call_ends_at) : new Date(start.getTime() + 30 * 60000);
    const startH = Math.max(decimalHourInTZ(start), START_HOUR);
    const endH = Math.min(Math.max(decimalHourInTZ(end), startH + 0.5), END_HOUR);

    let colIndex = columns.findIndex((c) => c.endHour <= startH);
    if (colIndex === -1) {
      colIndex = columns.length;
      columns.push({ endHour: endH });
    } else {
      columns[colIndex].endHour = endH;
    }

    placed.push({
      lead,
      top: (startH - START_HOUR) * HOUR_HEIGHT,
      height: Math.max((endH - startH) * HOUR_HEIGHT, 22),
      col: colIndex,
      colIndex,
      totalCols: 1,
    });
  }

  const totalCols = Math.max(columns.length, 1);
  return placed.map((p) => ({ ...p, totalCols }));
}

interface CallAgendaModalProps {
  leads: Lead[];
  onClose: () => void;
  onSelectLead: (lead: Lead) => void;
}

export function CallAgendaModal({ leads, onClose, onSelectLead }: CallAgendaModalProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const scheduledLeads = useMemo(() => leads.filter((l) => l.call_scheduled_at), [leads]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    []
  );

  const byDay = useMemo(() => {
    return days.map((day) =>
      layoutDay(scheduledLeads.filter((l) => isSameDay(new Date(l.call_scheduled_at!), day)))
    );
  }, [days, scheduledLeads]);

  const weekLabel = `${days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  const today = new Date();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <p className="text-base font-bold text-slate-900 dark:text-white">Agenda de Calls</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="rounded-lg border border-slate-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-slate-500 dark:text-zinc-400">{weekLabel}</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)] min-w-[900px]">
          {/* Cabeçalho dos dias */}
          <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950" />
          {days.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                className="sticky top-0 z-10 border-b border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-2 text-center"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-zinc-500">
                  {WEEKDAY_LABELS[day.getDay()]}
                </p>
                <p
                  className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                    isToday
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}

          {/* Eixo de horas + colunas dos dias */}
          <div className="relative">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-slate-100 dark:border-zinc-900 pr-2 text-right text-[10px] text-slate-400 dark:text-zinc-500 -translate-y-2"
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {days.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className="relative border-l border-slate-200 dark:border-zinc-800"
              style={{ height: hours.length * HOUR_HEIGHT }}
            >
              {hours.map((h) => (
                <div
                  key={h}
                  className="border-b border-slate-100 dark:border-zinc-900"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {byDay[dayIdx].map(({ lead, top, height, col, totalCols }) => {
                const displayName = lead.nome_fantasia || lead.razao_social;
                const time = new Date(lead.call_scheduled_at!).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: TIME_ZONE,
                });
                return (
                  <button
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    style={{
                      position: 'absolute',
                      top,
                      height,
                      left: `${(col / totalCols) * 100}%`,
                      width: `${100 / totalCols}%`,
                    }}
                    className="overflow-hidden rounded-md border-l-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15 px-1.5 py-0.5 text-left text-[11px] leading-tight text-cyan-900 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 transition-colors"
                  >
                    <p className="font-bold truncate">{time}</p>
                    <p className="truncate">{displayName}</p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
