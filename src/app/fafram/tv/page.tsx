'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image' // Import obrigatório para otimização
import { createClient } from '@/lib/supabase/client'
import { Crown } from 'lucide-react'

// Crie este componente para ser a "TV"
export default function TvLeaderboard() {
    const supabase = createClient()
    const [leaderboard, setLeaderboard] = useState<any[]>([])

    const fetchLeaderboard = async () => {
        const { data } = await supabase
            .from('fafram_leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(10)
        
        if (data) setLeaderboard(data)
    }

    useEffect(() => {
        fetchLeaderboard()

        console.log("🔌 Conectando ao canal Realtime...")

        const channel = supabase
            .channel('fafram_tv_channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'fafram_leaderboard' },
                (payload) => {
                    console.log('🚀 NOVO SCORE RECEBIDO!', payload)
                    fetchLeaderboard() 
                }
            )
            .subscribe((status) => {
                console.log("📡 Status da Conexão:", status)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return (
        <div className="min-h-screen bg-[#050505] text-white p-10 font-sans">
            <header className="flex items-center justify-between mb-12 border-b border-slate-800 pb-8">
                {/* --- ÁREA DO LOGO E TÍTULO --- */}
                <div className="flex items-center gap-8">
                    <div className="relative w-32 h-32">
                        <Image 
                            src="/logost-transparente.png" 
                            alt="StudyTrack Logo" 
                            fill
                            // Drop-shadow calibrado para TV (contraste alto)
                            className="object-contain drop-shadow-[0_2px_4px_rgba(255,255,255,0.6)]"
                            priority
                        />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                            RANKING 2026
                        </h1>
                        <p className="text-slate-500 text-lg font-medium mt-1 uppercase tracking-widest">
                            StudyTrack • Fafram Edition
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-slate-400 text-xl">Acesse para jogar:</p>
                    <p className="text-3xl font-bold text-white tracking-wide">studytrack-event.vercel.app</p>
                </div>
            </header>

            <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                    <div 
                        key={entry.id}
                        className={`flex items-center p-6 rounded-2xl border-2 transition-all ${
                            index === 0 ? 'bg-yellow-500/10 border-yellow-500/50 scale-[1.02] shadow-[0_0_30px_rgba(234,179,8,0.2)]' : 
                            index === 1 ? 'bg-slate-800/40 border-slate-700' :
                            index === 2 ? 'bg-slate-800/40 border-slate-700' :
                            'bg-slate-900/30 border-slate-800 opacity-80'
                        }`}
                    >
                        <div className={`w-16 h-16 flex items-center justify-center text-3xl font-black rounded-xl mr-8 ${
                             index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' : 'bg-slate-800 text-slate-400'
                        }`}>
                            {index + 1}
                        </div>
                        
                        <div className="flex-1">
                            <h2 className={`text-4xl font-bold uppercase ${index === 0 ? 'text-yellow-400 drop-shadow-md' : 'text-white'}`}>
                                {entry.nickname}
                            </h2>
                            <div className="flex gap-4 text-slate-400 mt-1">
                                <span className="font-mono text-lg bg-slate-900 px-2 rounded">COMBO: {entry.max_combo}x</span>
                            </div>
                        </div>

                        <div className={`text-6xl font-black tracking-tighter tabular-nums ${index === 0 ? 'text-yellow-500' : 'text-slate-200'}`}>
                            {entry.score.toLocaleString()}
                        </div>
                        
                        {index === 0 && <Crown className="w-16 h-16 text-yellow-500 ml-8 animate-bounce" />}
                    </div>
                ))}

                {leaderboard.length === 0 && (
                    <div className="text-center text-slate-600 py-20 text-2xl font-mono animate-pulse">
                        AGUARDANDO JOGADORES...
                    </div>
                )}
            </div>
        </div>
    )
}