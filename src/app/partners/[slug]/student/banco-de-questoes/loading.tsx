export default function BancoQuestoesLoading() {
  return (
    <div className="min-h-dvh bg-[#F5F5F7] flex flex-col">
      {/* Header skeleton */}
      <div className="bg-white/95 border-b border-slate-100 shadow-sm px-4 py-3 animate-pulse">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-40 rounded-lg bg-slate-200" />
            <div className="flex gap-2">
              <div className="h-8 w-32 rounded-xl bg-slate-100" />
              <div className="h-8 w-8 rounded-xl bg-slate-100" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 flex-1 sm:w-56 sm:flex-none rounded-xl bg-slate-100" />
            <div className="h-10 w-20 rounded-xl bg-slate-100 sm:hidden" />
            <div className="hidden sm:flex flex-1 gap-2">
              <div className="h-10 flex-1 rounded-xl bg-slate-100" />
              <div className="h-10 flex-1 rounded-xl bg-slate-100" />
              <div className="h-10 flex-1 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-4xl mx-auto px-4 py-5 w-full animate-pulse">
        <div className="flex justify-between items-center mb-5">
          <div className="h-5 w-28 rounded-lg bg-slate-200" />
          <div className="h-5 w-24 rounded-lg bg-slate-200" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between mb-6">
            <div className="h-5 w-28 rounded-lg bg-slate-100" />
            <div className="h-5 w-20 rounded-lg bg-slate-100" />
          </div>
          <div className="space-y-3 mb-8">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-11/12 rounded bg-slate-100" />
            <div className="h-4 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 border border-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
