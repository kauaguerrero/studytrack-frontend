'use client';

/**
 * Tabela dos simulados externos do aluno: datas, acertos por área (pílula
 * colorida pela % de acerto), total, redação e status. Clicar numa linha
 * abre a edição.
 */

import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EXTERNAL_AREAS, PCT_TONE_CLASSES, areaResult, formatDayBR, isComplete, pctTone, totalResult,
  type AreaResult, type ExternalSimulado,
} from '@/lib/external-simulados';

interface Props {
  simulados: ExternalSimulado[];
  onEdit: (simulado: ExternalSimulado) => void;
}

function ScorePill({ result, className }: { result: AreaResult | null; className?: string }) {
  if (!result) {
    return (
      <span className={cn('inline-flex min-w-[3.5rem] justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500', className)}>
        —
      </span>
    );
  }
  return (
    <span
      title={`${result.correct}/${result.total} · ${result.pct}%`}
      className={cn('inline-flex min-w-[3.5rem] justify-center rounded-lg px-2 py-1 text-xs font-bold', PCT_TONE_CLASSES[pctTone(result.pct)], className)}
    >
      {result.correct}
      <span className="font-semibold opacity-60">/{result.total}</span>
    </span>
  );
}

function StatusBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
      Finalizado
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
      Parcial
    </span>
  );
}

export function ExternalSimuladosTable({ simulados, onEdit }: Props) {
  return (
    <>
      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
              <th className="px-4 py-3">Simulado</th>
              <th className="px-2 py-3">Dia 1</th>
              <th className="px-2 py-3">Dia 2</th>
              {EXTERNAL_AREAS.map(({ key, label }) => (
                <th key={key} className="px-2 py-3 text-center">{label}</th>
              ))}
              <th className="px-2 py-3 text-center">Total</th>
              <th className="px-2 py-3 text-center">Redação</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {simulados.map((sim) => (
              <tr
                key={sim.id}
                onClick={() => onEdit(sim)}
                className="group cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                <td className="max-w-[14rem] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-slate-800 dark:text-slate-100" title={sim.title}>{sim.title}</span>
                    <Pencil size={12} className="shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-2 py-3 text-slate-500 dark:text-slate-400">{formatDayBR(sim.day1_date)}</td>
                <td className="px-2 py-3 text-slate-500 dark:text-slate-400">{formatDayBR(sim.day2_date)}</td>
                {EXTERNAL_AREAS.map(({ key }) => (
                  <td key={key} className="px-2 py-3 text-center"><ScorePill result={areaResult(sim, key)} /></td>
                ))}
                <td className="px-2 py-3 text-center"><ScorePill result={totalResult(sim)} /></td>
                <td className="px-2 py-3 text-center font-bold text-slate-700 dark:text-slate-200">{sim.essay_score ?? '—'}</td>
                <td className="px-4 py-3 text-center"><StatusBadge complete={isComplete(sim)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {simulados.map((sim) => {
          const total = totalResult(sim);
          return (
            <button
              key={sim.id}
              type="button"
              onClick={() => onEdit(sim)}
              className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 dark:text-slate-100">{sim.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDayBR(sim.day1_date, true)}
                    {sim.day2_date && ` e ${formatDayBR(sim.day2_date, true)}`}
                  </p>
                </div>
                <StatusBadge complete={isComplete(sim)} />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {EXTERNAL_AREAS.map(({ key, label }) => (
                  <div key={key} className="text-center">
                    <p className="mb-1 truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                    <ScorePill result={areaResult(sim, key)} className="w-full min-w-0" />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  Total: <span className="font-bold text-slate-800 dark:text-slate-100">
                    {total ? `${total.correct}/${total.total} (${total.pct}%)` : '—'}
                  </span>
                </span>
                <span>
                  Redação: <span className="font-bold text-slate-800 dark:text-slate-100">{sim.essay_score ?? '—'}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
