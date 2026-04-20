'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
  MoreHorizontal,
  CalendarDays,
  Target,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Sprint } from './hooks/useTasks';

interface Props {
  sprint: Sprint;
  sprintOnly: boolean;
  onToggleSprintOnly: (value: boolean) => void;
  onFinish: () => void;
}

type SprintHealth = 'healthy' | 'warning' | 'critical';

function getSprintHealth(endDate: string): { text: string; health: SprintHealth } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { text: `${Math.abs(diff)}d em atraso`, health: 'critical' };
  if (diff === 0) return { text: 'Termina hoje', health: 'critical' };
  if (diff <= 3) return { text: `${diff} ${diff === 1 ? 'dia' : 'dias'} restante${diff === 1 ? '' : 's'}`, health: 'warning' };
  return { text: `${diff} dias restantes`, health: 'healthy' };
}

function formatDateShort(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

const HEALTH_DOT: Record<SprintHealth, { color: string; shadow: string; pulse: boolean }> = {
  healthy:  { color: '#14b8a6', shadow: '0 0 6px rgba(20,184,166,0.6)',  pulse: false },
  warning:  { color: '#f59e0b', shadow: '0 0 6px rgba(245,158,11,0.6)',  pulse: false },
  critical: { color: '#ef4444', shadow: '0 0 8px rgba(239,68,68,0.65)', pulse: true  },
};

const HEALTH_DAYS_CLASS: Record<SprintHealth, string> = {
  healthy:  'text-zinc-500 dark:text-zinc-400',
  warning:  'text-amber-600 dark:text-amber-400',
  critical: 'text-red-500 dark:text-red-400',
};

// ─── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <div
      className="w-8 h-4 rounded-full flex items-center px-0.5 transition-colors duration-200 flex-shrink-0"
      style={{ background: active ? '#14b8a6' : 'rgba(113,113,122,0.3)' }}
    >
      <div
        className="w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: active ? 'translateX(16px)' : 'translateX(0px)' }}
      />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ActiveSprintPanel({
  sprint,
  sprintOnly,
  onToggleSprintOnly,
  onFinish,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme !== 'light';

  const progress = sprint.total_tasks > 0
    ? Math.round((sprint.completed_tasks / sprint.total_tasks) * 100)
    : 0;

  const { text: daysText, health } = getSprintHealth(sprint.end_date);
  const dot = HEALTH_DOT[health];

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div
      className="flex items-center gap-3 px-6 h-12 flex-shrink-0 border-b"
      style={{
        background:   isDark ? 'rgba(20,184,166,0.05)' : 'rgba(20,184,166,0.04)',
        borderColor:  isDark ? 'rgba(20,184,166,0.13)' : 'rgba(20,184,166,0.10)',
      }}
    >
      {/* ── Status indicator ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0${dot.pulse ? ' animate-pulse' : ''}`}
          style={{ backgroundColor: dot.color, boxShadow: dot.shadow }}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400 hidden sm:block">
          Sprint ativa
        </span>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div
        className="w-px h-3.5 flex-shrink-0"
        style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)' }}
      />

      {/* ── Goal (truncated) ──────────────────────────────────────────────── */}
      <p className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 truncate flex-1 min-w-0">
        {sprint.goal}
      </p>

      {/* ── Progress bar + % ──────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <div
          className="w-28 h-2 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)' }}
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#2dd4bf)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-bold tabular-nums text-zinc-600 dark:text-zinc-400 w-8 text-right">
          {progress}%
        </span>
      </div>

      {/* ── Days remaining ────────────────────────────────────────────────── */}
      <span className={`text-[11px] font-medium flex-shrink-0 hidden sm:block tabular-nums ${HEALTH_DAYS_CLASS[health]}`}>
        {daysText}
      </span>

      {/* ── Menu ─────────────────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0">
        <button
          ref={btnRef}
          onClick={() => setOpen(v => !v)}
          aria-label="Opções da sprint"
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
            open
              ? 'bg-zinc-200 dark:bg-white/[0.10] text-zinc-700 dark:text-zinc-200'
              : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] hover:text-zinc-700 dark:hover:text-zinc-200'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* ── Popover ───────────────────────────────────────────────────── */}
        {open && (
          <div
            ref={menuRef}
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-72 rounded-2xl border shadow-2xl overflow-hidden"
            style={{
              background:   isDark ? '#18181b' : '#ffffff',
              borderColor:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              boxShadow:    isDark
                ? '0 24px 48px rgba(0,0,0,0.5)'
                : '0 12px 40px rgba(15,23,42,0.12)',
            }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0${dot.pulse ? ' animate-pulse' : ''}`}
                  style={{ backgroundColor: dot.color, boxShadow: dot.shadow }}
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-700 dark:text-teal-400">
                  Sprint ativa
                </span>
                <span className={`ml-auto text-[10px] font-semibold tabular-nums ${HEALTH_DAYS_CLASS[health]}`}>
                  {daysText}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                {sprint.goal}
              </p>
            </div>

            {/* Stats block */}
            <div
              className="mx-3 mb-3 rounded-xl border px-3 py-2.5 flex flex-col gap-2.5"
              style={{
                background:  isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <CalendarDays className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Período</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {formatDateShort(sprint.start_date)} – {formatDateShort(sprint.end_date)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <Target className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Escopo</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {sprint.total_tasks} tasks
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] font-medium">Conclusão</span>
                </div>
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
                  {sprint.completed_tasks}/{sprint.total_tasks} concluídas
                </span>
              </div>
              {/* Progress bar */}
              <div className="flex items-center gap-2 pt-0.5">
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)' }}
                >
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#2dd4bf)] transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold tabular-nums text-zinc-600 dark:text-zinc-400 w-8 text-right flex-shrink-0">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Sprint-only toggle */}
            <div className="px-3 pb-2">
              <button
                onClick={() => { onToggleSprintOnly(!sprintOnly); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              >
                <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
                  Mostrar só tasks da sprint
                </span>
                <ToggleSwitch active={sprintOnly} />
              </button>
            </div>

            {/* Divider */}
            <div
              className="mx-3 mb-2 h-px"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }}
            />

            {/* Finalizar sprint — ação crítica, separada */}
            <div className="px-3 pb-3">
              <button
                onClick={() => { onFinish(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[12px] font-semibold transition-all text-red-600 dark:text-red-400 hover:bg-red-500/[0.08] dark:hover:bg-red-500/[0.10]"
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Finalizar sprint
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
