'use client'

interface SummaryRow {
  label: string
  value: string
}

interface WizardSidebarProps {
  rows: SummaryRow[]
  totalLabel: string
  totalValue: string
}

export function WizardSidebar({ rows, totalLabel, totalValue }: WizardSidebarProps) {
  return (
    <aside className="hidden shrink-0 lg:block lg:w-72">
      <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Resumo do simulado</p>
        <dl className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">{row.label}</dt>
              <dd className="max-w-[60%] truncate text-right font-semibold text-slate-800 dark:text-slate-200">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{totalLabel}</p>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--brand-primary)' }}>
            {totalValue}
          </p>
        </div>
      </div>
    </aside>
  )
}
