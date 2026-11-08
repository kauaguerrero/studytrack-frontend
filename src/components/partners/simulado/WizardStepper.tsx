'use client'

import { CheckCircle2 } from 'lucide-react'

export interface WizardStepperStep {
  key: string
  label: string
}

interface WizardStepperProps {
  steps: WizardStepperStep[]
  currentIndex: number
  brandTextColor: string
}

export function WizardStepper({ steps, currentIndex, brandTextColor }: WizardStepperProps) {
  return (
    <ol className="flex items-center" aria-label="Etapas do simulado">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming'
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                  state === 'upcoming'
                    ? 'border-2 border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500'
                    : 'border-2 border-transparent'
                }`}
                style={state !== 'upcoming' ? { background: 'var(--brand-primary)', color: brandTextColor } : undefined}
              >
                {state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-bold sm:inline ${
                  state === 'upcoming' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${state === 'done' ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
                style={state === 'done' ? { background: 'var(--brand-primary)' } : undefined}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
