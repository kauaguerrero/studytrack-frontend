'use client'

import Link from 'next/link'
import { Zap, Lock, Gamepad2, Timer, ArrowRight, Brain } from 'lucide-react'

export default function GamesLobby() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3 mb-2">
          <Gamepad2 className="w-10 h-10 text-blue-600" />
          Arcade StudyTrack
        </h1>
        <p className="text-slate-500 text-lg">
          Teste seus conhecimentos em ambientes de alta pressão.
        </p>
      </div>

      {/* GRID DE JOGOS */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* CARD 1: SPEEDRUN (ATIVO) */}
        <Link 
          href="/jogos/speedrun"
          className="group relative bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden"
        >
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
          
          <div className="relative z-10">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-8 h-8 text-blue-600 fill-current" />
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
              SpeedRun
            </h3>
            <p className="text-slate-500 mb-6 leading-relaxed">
              Responda rápido antes que o tempo acabe. Sobreviva para maximizar seu Score.
            </p>

            <div className="flex items-center gap-4 text-sm font-bold text-slate-400">
               <span className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                 <Timer size={14} /> 60s
               </span>
               <span className="flex items-center gap-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                 <Brain size={14} /> +Focus
               </span>
            </div>
            
            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg text-white">
                    <ArrowRight size={20} />
                </div>
            </div>
          </div>
        </Link>

        {/* CARD 2: EM BREVE */}
        <div className="relative bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed p-8 flex flex-col items-center justify-center text-center opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
           <div className="absolute top-4 right-4">
              <Lock className="text-slate-300" size={20} />
           </div>
           <div className="w-14 h-14 bg-slate-200 rounded-2xl flex items-center justify-center mb-4">
              <Gamepad2 className="w-8 h-8 text-slate-400" />
           </div>
           <h3 className="text-xl font-bold text-slate-400 mb-1">Duelo 1v1</h3>
           <p className="text-sm text-slate-400">Em desenvolvimento</p>
        </div>

      </div>
    </div>
  )
}