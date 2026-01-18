'use client'

import Link from 'next/link'
import { Zap, Lock, Gamepad2, Timer, ArrowRight, Brain, ArrowLeft, LayoutDashboard } from 'lucide-react'

export default function GamesLobby() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] font-sans relative selection:bg-blue-100 selection:text-blue-700">
      
      {/* BACKGROUND DECORATION */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000"></div>
      </div>

      {/* NAVBAR DE NAVEGAÇÃO (ESCAPE HATCH) */}
      <nav className="sticky top-0 z-50 w-full px-4 py-4">
        <div className="max-w-6xl mx-auto">
            <Link 
                href="/portal/student/dashboard" 
                className="group inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/50 px-4 py-2.5 rounded-full shadow-sm hover:shadow-md hover:border-blue-200 hover:text-blue-700 transition-all duration-300 active:scale-95"
            >
                <div className="bg-slate-100 group-hover:bg-blue-100 p-1.5 rounded-full transition-colors">
                    <ArrowLeft size={16} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="text-sm font-bold text-slate-600 group-hover:text-blue-700">
                    Voltar ao Dashboard
                </span>
            </Link>
        </div>
      </nav>

      <main className="relative z-10 p-4 md:p-6 pb-20">
        
        {/* HERO SECTION */}
        <div className="max-w-6xl mx-auto mb-10 md:mb-14 text-center md:text-left">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 md:hidden">
             <Gamepad2 className="w-8 h-8 text-blue-600" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-800 flex flex-col md:flex-row items-center gap-3 mb-3 md:mb-2 tracking-tight">
            <Gamepad2 className="hidden md:block w-12 h-12 text-blue-600" />
            <span>Arcade <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">StudyTrack</span></span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto md:mx-0 font-medium">
            Transforme seu estudo em competição. Teste seus conhecimentos em ambientes de alta pressão e suba no ranking.
          </p>
        </div>

        {/* GRID DE JOGOS */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* CARD 1: SPEEDRUN (ATIVO) */}
            <Link 
            href="/jogos/speedrun"
            className="group relative bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-200/50 hover:border-blue-300 transition-all duration-500 overflow-hidden transform hover:-translate-y-1"
            >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-100/50 transition-all duration-500"></div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:rotate-6 transition-all duration-500 shadow-sm">
                        <Zap className="w-8 h-8 text-blue-600 fill-blue-600 group-hover:text-white group-hover:fill-white transition-colors duration-500" />
                    </div>
                    
                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200 uppercase tracking-wide">
                        Disponível
                    </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                SpeedRun
                </h3>
                <p className="text-slate-500 mb-8 leading-relaxed text-sm font-medium">
                Responda o máximo de questões em 60 segundos. Cada erro custa tempo. Sobreviva para maximizar seu Score.
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/50 transition-colors">
                        <Timer size={14} className="text-blue-500" /> 60s Timer
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50/50 transition-colors">
                        <Brain size={14} className="text-purple-500" /> +Foco
                    </span>
                </div>
                
                <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-75">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white hover:bg-blue-700">
                        <ArrowRight size={24} />
                    </div>
                </div>
            </div>
            </Link>

            {/* CARD 2: EM BREVE */}
            <div className="relative bg-slate-50/50 rounded-[2rem] border-2 border-slate-200 border-dashed p-8 flex flex-col items-center justify-center text-center opacity-80 group hover:opacity-100 hover:bg-slate-50 transition-all duration-300 cursor-not-allowed">
                <div className="absolute top-6 right-6">
                    <div className="bg-slate-200 p-2 rounded-full">
                        <Lock className="text-slate-400" size={16} />
                    </div>
                </div>
                
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-8 h-8 text-slate-400" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-400 mb-1 group-hover:text-slate-500">Duelo 1v1</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-200/50 px-3 py-1 rounded-full">
                    Em desenvolvimento
                </p>
            </div>

        </div>
      </main>
    </div>
  )
}