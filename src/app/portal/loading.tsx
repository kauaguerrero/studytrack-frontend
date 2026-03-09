export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Carregando...</p>
      </div>
    </div>
  );
}
