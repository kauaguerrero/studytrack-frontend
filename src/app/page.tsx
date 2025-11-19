import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50 text-slate-900">
      <div className="relative flex place-items-center flex-col gap-6">
        <h1 className="text-4xl font-bold text-center text-blue-600">
          StudyTrack
        </h1>
        <p className="text-center max-w-md text-slate-600">
          Seu mentor de inteligência artificial para estudos.
        </p>
        
        <Link 
          href="/auth/login" 
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all"
        >
          Entrar no Sistema
        </Link>
      </div>
    </main>
  );
}