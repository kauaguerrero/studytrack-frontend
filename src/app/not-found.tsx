import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-center px-4">
      <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">Página não encontrada</h2>
      <p className="text-slate-600 mb-8 max-w-md">
        Ops! Parece que a página que você está tentando acessar não existe ou foi movida.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/portal/student/dashboard" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Ir para o Dashboard
        </Link>
        <Link 
          href="/" 
          className="px-6 py-3 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
        >
          Página Inicial
        </Link>
      </div>
    </div>
  )
}