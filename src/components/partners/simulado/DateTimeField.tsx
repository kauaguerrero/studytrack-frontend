'use client'

import { useState } from 'react'

interface DateTimeFieldProps {
  label: string
  // Valor combinado no formato de <input type="datetime-local"> (ex.:
  // "2026-03-05T14:30") — fica "" até data E horário estarem preenchidos,
  // nunca um dos dois sozinho (mesma regra que um datetime-local nativo já
  // seguia; a diferença é que aqui dá pra avisar POR QUE ainda está vazio).
  value: string
  onChange: (value: string) => void
  hint?: string
  minDateTime?: string
  className?: string
  labelClassName?: string
  inputClassName: string
  ringStyle?: React.CSSProperties
}

function splitDateTimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date: date ?? '', time: time ?? '' }
}

// Campo de data+hora dividido em dois inputs nativos (data / hora) em vez de
// um único <input type="datetime-local">. Motivo: nesse tipo de input, se o
// founder preenche só a data e esquece o horário, o `.value` do elemento
// continua "" — indistinguível de "não preencheu nada" — e o único sinal que
// ele via era o botão de avançar ficando desabilitado sem explicação. Com os
// dois campos separados dá pra detectar exatamente esse caso e avisar.
export function DateTimeField({ label, value, onChange, hint, minDateTime, className, labelClassName, inputClassName, ringStyle }: DateTimeFieldProps) {
  const initial = splitDateTimeLocal(value)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const minimum = splitDateTimeLocal(minDateTime ?? '')
  const invalidEnd = Boolean(minDateTime && value && value <= minDateTime)

  function emit(nextDate: string, nextTime: string) {
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : '')
  }

  return (
    <div className={className}>
      <label className={labelClassName}>
        {label}
        {hint && <span className="ml-1 normal-case font-normal text-slate-400">{hint}</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[10rem] flex-1">
          <input
            type="date"
            aria-label={`${label} — data`}
            min={minimum.date || undefined}
            value={date}
            onChange={(e) => { setDate(e.target.value); emit(e.target.value, time) }}
            className={`${inputClassName} min-w-0`}
            style={ringStyle}
          />
        </div>
        <div className="w-28 shrink-0">
          <input
            type="time"
            aria-label={`${label} — horário`}
            min={date === minimum.date ? minimum.time || undefined : undefined}
            value={time}
            onChange={(e) => { setTime(e.target.value); emit(date, e.target.value) }}
            className={`${inputClassName} min-w-0`}
            style={ringStyle}
          />
        </div>
      </div>
      {date && !time && (
        <p role="status" className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          Falta preencher o horário.
        </p>
      )}
      {invalidEnd && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          O fim deve ser depois do início.
        </p>
      )}
    </div>
  )
}
