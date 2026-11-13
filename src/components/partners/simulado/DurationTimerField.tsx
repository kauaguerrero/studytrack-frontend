'use client'

import { useState } from 'react'

interface DurationTimerFieldProps {
  label: string
  // Duração total em SEGUNDOS — mesma unidade de scheduled_simulados.config.
  // time_limit_secs no banco. null/undefined == não preenchido.
  value: number | null
  onChange: (seconds: number | null) => void
  hint?: string
  className?: string
  labelClassName?: string
  inputClassName: string
  ringStyle?: React.CSSProperties
}

function secondsToParts(totalSeconds: number | null | undefined): { h: string; m: string; s: string } {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return { h: '', m: '', s: '' }
  }
  const safe = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return { h: String(h), m: String(m), s: String(s) }
}

// Timer HH:MM:SS pra duração da prova — substitui um número cru de minutos
// por um controle no formato que todo mundo já reconhece (cronômetro),
// pra ficar intuitivo configurar "1h30" em vez de digitar "90".
//
// Emite sempre o total em SEGUNDOS (mesma unidade de
// scheduled_simulados.config.time_limit_secs no banco) — nunca minutos, pra
// não reintroduzir a conversão ×60/÷60 que esse campo tinha espalhada pelos
// formulários antes dessa mudança.
export function DurationTimerField({
  label,
  value,
  onChange,
  hint,
  className,
  labelClassName,
  inputClassName,
  ringStyle,
}: DurationTimerFieldProps) {
  const initial = secondsToParts(value)
  const [h, setH] = useState(initial.h)
  const [m, setM] = useState(initial.m)
  const [s, setS] = useState(initial.s)

  function emit(nextH: string, nextM: string, nextS: string) {
    if (!nextH && !nextM && !nextS) {
      onChange(null)
      return
    }
    const hNum = Number(nextH) || 0
    const mNum = Number(nextM) || 0
    const sNum = Number(nextS) || 0
    onChange(hNum * 3600 + mNum * 60 + sNum)
  }

  return (
    <div className={className}>
      <label className={labelClassName}>
        {label}
        {hint && <span className="ml-1 normal-case font-normal text-slate-400">{hint}</span>}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          max={23}
          aria-label={`${label} — horas`}
          placeholder="00"
          value={h}
          onChange={(e) => {
            setH(e.target.value)
            emit(e.target.value, m, s)
          }}
          className={`${inputClassName} w-16 min-w-0 text-center`}
          style={ringStyle}
        />
        <span className="text-xs font-bold text-slate-400">h</span>
        <input
          type="number"
          min={0}
          max={59}
          aria-label={`${label} — minutos`}
          placeholder="00"
          value={m}
          onChange={(e) => {
            setM(e.target.value)
            emit(h, e.target.value, s)
          }}
          className={`${inputClassName} w-16 min-w-0 text-center`}
          style={ringStyle}
        />
        <span className="text-xs font-bold text-slate-400">min</span>
        <input
          type="number"
          min={0}
          max={59}
          aria-label={`${label} — segundos`}
          placeholder="00"
          value={s}
          onChange={(e) => {
            setS(e.target.value)
            emit(h, m, e.target.value)
          }}
          className={`${inputClassName} w-16 min-w-0 text-center`}
          style={ringStyle}
        />
        <span className="text-xs font-bold text-slate-400">seg</span>
      </div>
    </div>
  )
}
