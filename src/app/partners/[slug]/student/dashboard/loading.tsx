export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-44 rounded-2xl bg-slate-200" />

      {/* Progress bar skeleton */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-40 rounded-full bg-slate-100" />
      </div>

      {/* Action cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-44 rounded-xl bg-slate-200" />
        <div className="h-44 rounded-xl bg-slate-100 border border-slate-100" />
      </div>

      {/* Portal link skeleton */}
      <div className="rounded-xl border border-dashed border-slate-200 p-3 flex flex-col items-center gap-2">
        <div className="h-3 w-52 rounded-full bg-slate-100" />
        <div className="h-3 w-36 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
