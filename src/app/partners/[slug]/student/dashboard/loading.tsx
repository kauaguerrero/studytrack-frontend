export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse min-h-screen">
      {/* Hero skeleton */}
      <div className="h-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />

      {/* Progress bar skeleton */}
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800/50" />
        <div className="h-3 w-40 rounded-full bg-slate-100 dark:bg-slate-800/50" />
      </div>

      {/* Action cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-44 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50" />
      </div>

      {/* Portal link skeleton */}
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-3 flex flex-col items-center gap-2">
        <div className="h-3 w-52 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-36 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}