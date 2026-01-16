'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
    Zap, Timer, Trophy, ArrowRight, XCircle, CheckCircle2, 
    Loader2, Volume2, VolumeX, History, Crown, Play, RotateCcw, Home,
    BarChart3, BrainCircuit, Target, Flame, Users, School, Globe
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameSound } from '@/hooks/useGameSound' 

// --- TYPES ---
type Question = {
  id: string
  statement: string
  discipline: string
  difficulty: string
  alternatives: { id: string, text: string }[]
  correct_option: string
}

type LeaderboardEntry = {
    name: string
    score: number
    max_combo: number
}

type HistoryEntry = {
    id: string
    score: number
    max_combo: number
    created_at: string
}

type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'GAME_OVER'
type RankingScope = 'global' | 'school' | 'classroom'

export default function SpeedRunPage() {
  const supabase = createClient()
  const router = useRouter()
  const { playHit, playMiss, toggleBGM, toggleMute, isMuted, testSound } = useGameSound()
  
  // Game Config
  const START_TIME = 60
  const BONUS_TIME = 8
  const PENALTY_TIME = 5

  // State Global
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [activeTab, setActiveTab] = useState<'PLAY' | 'RANK' | 'HISTORY'>('PLAY')
  
  // Dados & Loading
  const [questions, setQuestions] = useState<Question[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  
  // Filtros de Ranking
  const [rankingScope, setRankingScope] = useState<RankingScope>('global')

  // State Gameplay
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(START_TIME)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  
  // Feedback Visual
  const [feedback, setFeedback] = useState<'HIT' | 'MISS' | null>(null)
  const [shaking, setShaking] = useState(false)

  // Analytics
  const sessionStartRef = useRef<number>(0)
  const questionStartRef = useRef<number>(0)
  const answersLog = useRef<any[]>([])

  // --- INIT ---
  useEffect(() => {
    checkUser()
  }, [])

  // Atualiza dados quando a aba ou filtro muda
  useEffect(() => {
    if (activeTab === 'RANK' && userId) {
        fetchLeaderboard()
    }
    if (activeTab === 'HISTORY' && userId) {
        fetchHistory()
    }
  }, [activeTab, rankingScope, userId])

  const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if(data.user) setUserId(data.user.id)
  }

  // --- DATA FETCHING ---
  const fetchLeaderboard = async () => {
      if (!userId) return; // Segurança
      setIsLoadingRanking(true)
      try {
        // Agora passa o scope e o user_id para o backend filtrar corretamente
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/games/speedrun/leaderboard?scope=${rankingScope}&user_id=${userId}`)
        if (res.ok) {
            const data = await res.json()
            if(Array.isArray(data)) setLeaderboard(data)
        } else {
            setLeaderboard([])
        }
      } catch (e) { 
          console.error(e)
          setLeaderboard([]) 
      } finally {
          setIsLoadingRanking(false)
      }
  }

  const fetchHistory = async () => {
      if(!userId) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/games/speedrun/history?user_id=${userId}`)
        const data = await res.json()
        if(Array.isArray(data)) setHistory(data)
      } catch (e) { console.error(e) }
  }

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/games/speedrun/questions`)
      const data = await res.json()
      if (data && Array.isArray(data)) {
        setQuestions(data)
        setGameState('PLAYING')
        startGameLogic()
      }
    } catch (err) {
      console.error("Erro ao carregar jogo:", err)
    }
  }

  // --- GAME ENGINE ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (timeLeft <= 0) {
        endGame();
        return;
    }

    const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const startGame = () => {
      toggleBGM(true) 
      setGameState('LOADING')
      fetchQuestions()
  }

  const startGameLogic = () => {
    setTimeLeft(START_TIME)
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setCurrentIndex(0)
    answersLog.current = []
    sessionStartRef.current = Date.now()
    questionStartRef.current = Date.now()
  }

  const handleAnswer = (selectedLetter: string) => {
    if (gameState !== 'PLAYING') return

    const currentQ = questions[currentIndex]
    if (!currentQ) return; 

    const isCorrect = selectedLetter.toLowerCase() === currentQ.correct_option.toLowerCase()
    const timeSpent = Date.now() - questionStartRef.current

    answersLog.current.push({
      question_id: currentQ.id,
      selected_option: selectedLetter,
      is_correct: isCorrect,
      time_spent_ms: timeSpent
    })

    if (isCorrect) {
      playHit()
      const newCombo = combo + 1
      setCombo(newCombo)
      if (newCombo > maxCombo) setMaxCombo(newCombo)
      
      const points = 100 + (newCombo * 10)
      setScore(s => s + points)
      
      setTimeLeft(t => t + BONUS_TIME)
      triggerFeedback('HIT')
    } else {
      playMiss()
      setCombo(0)
      setTimeLeft(t => Math.max(0, t - PENALTY_TIME)) 
      triggerFeedback('MISS')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }

    questionStartRef.current = Date.now()
    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setFeedback(null)
      }, 200) 
    } else {
      endGame() 
    }
  }

  const triggerFeedback = (type: 'HIT' | 'MISS') => {
    setFeedback(type)
  }

  const endGame = async () => {
    if (gameState === 'GAME_OVER') return;
    toggleBGM(false)
    setGameState('GAME_OVER')
    const totalTime = Math.floor((Date.now() - sessionStartRef.current) / 1000)

    if (userId) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/games/speedrun/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          score,
          max_combo: maxCombo,
          survival_time: totalTime,
          answers: answersLog.current
        })
      })
      // Não precisa chamar fetchHistory aqui pois o useEffect do activeTab cuidará disso quando o usuário voltar
    }
  }

  const returnToMenu = () => {
      setGameState('MENU')
      setActiveTab('RANK')
      // useEffect cuidará do fetch
  }

  // --- RENDERERS ---

  // 1. MENU PRINCIPAL (LOBBY)
  if (gameState === 'MENU') {
      return (
          <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center relative font-sans overflow-x-hidden">
              
              {/* Background Decorativo */}
              <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none" />
              <div className="fixed -top-20 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="fixed top-40 -left-20 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* HEADER DE NAVEGAÇÃO */}
              <div className="w-full max-w-4xl flex justify-between items-center p-6 z-10">
                  <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                      <div className="p-2 bg-slate-900 rounded-full border border-slate-800 group-hover:border-slate-600">
                        <Home size={18} />
                      </div>
                      <span className="text-sm font-medium">Voltar</span>
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800 shadow-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-slate-300 tracking-wide">SERVIDOR ONLINE</span>
                  </div>
              </div>

              {/* HERO SECTION */}
              <div className="w-full max-w-2xl text-center mb-8 z-10 px-4 mt-4">
                 <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-blue-500/30 blur-2xl rounded-full"></div>
                    <Zap size={64} className="text-yellow-400 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" fill="currentColor" />
                 </div>
                 <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter text-white mb-2 drop-shadow-xl">
                     SPEED<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 pr-4">RUN</span>
                 </h1>
                 <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
                     Desafie seu conhecimento em alta velocidade. Erros custam tempo. Acertos garantem a glória.
                 </p>
              </div>

              {/* TABS DE NAVEGAÇÃO */}
              <div className="w-full max-w-3xl px-4 z-10 pb-10">
                <div className="flex p-1.5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl mb-6">
                    <button onClick={() => setActiveTab('PLAY')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2", activeTab === 'PLAY' ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50")}>
                        <Zap size={16} /> JOGAR
                    </button>
                    <button onClick={() => setActiveTab('RANK')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2", activeTab === 'RANK' ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50")}>
                        <Trophy size={16} /> RANKING
                    </button>
                    <button onClick={() => setActiveTab('HISTORY')} className={cn("flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2", activeTab === 'HISTORY' ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/50")}>
                        <History size={16} /> HISTÓRICO
                    </button>
                </div>

                {/* AREA DE CONTEÚDO (CONTAINER PRINCIPAL) */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-1 backdrop-blur-sm relative overflow-hidden min-h-[400px]">
                    
                    {/* Botão de Som Discreto */}
                    <button 
                        onClick={testSound}
                        className="absolute top-4 right-4 text-xs text-slate-600 hover:text-blue-400 flex items-center gap-1 transition-colors z-20 bg-slate-900/50 px-2 py-1 rounded-md"
                    >
                        <Volume2 size={12} /> Testar Som
                    </button>

                    <div className="p-4 sm:p-6 h-full">
                        
                        {activeTab === 'PLAY' && (
                            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full justify-between">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
                                        <Timer className="text-blue-400 mb-2" size={28} />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tempo Inicial</p>
                                        <p className="text-2xl font-black text-white mt-1">60s</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
                                        <Flame className="text-orange-500 mb-2" size={28} />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Mecânica</p>
                                        <p className="text-2xl font-black text-white mt-1">Combo</p>
                                    </div>
                                </div>

                                <div className="space-y-3 bg-slate-950/30 p-5 rounded-2xl border border-slate-800">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> 
                                        <span>Acerto: <b className="text-emerald-400">+8s</b> e pontos extras.</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <XCircle className="text-rose-500 shrink-0" size={18} /> 
                                        <span>Erro: <b className="text-rose-400">-5s</b> e perde o combo.</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={startGame}
                                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group relative overflow-hidden mt-2"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                    <Play fill="currentColor" className="group-hover:scale-110 transition-transform relative z-10" /> 
                                    <span className="relative z-10">INICIAR PARTIDA</span>
                                </button>
                            </div>
                        )}

                        {activeTab === 'RANK' && (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* FILTROS DE RANKING */}
                                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                    <button 
                                        onClick={() => setRankingScope('global')}
                                        className={cn("px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors", rankingScope === 'global' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                                    >
                                        <Globe size={14} /> Plataforma
                                    </button>
                                    <button 
                                        onClick={() => setRankingScope('school')}
                                        className={cn("px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors", rankingScope === 'school' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                                    >
                                        <School size={14} /> Minha Escola
                                    </button>
                                    <button 
                                        onClick={() => setRankingScope('classroom')}
                                        className={cn("px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors", rankingScope === 'classroom' ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                                    >
                                        <Users size={14} /> Minha Turma
                                    </button>
                                </div>

                                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {isLoadingRanking ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                                            <Loader2 className="animate-spin text-blue-500" />
                                            <p className="text-xs font-medium uppercase tracking-widest">Sincronizando...</p>
                                        </div>
                                    ) : leaderboard.length === 0 ? (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <Trophy size={48} className="mb-4 text-slate-700" />
                                            <p className="text-slate-400 font-medium">Sem registros neste filtro.</p>
                                        </div>
                                    ) : (
                                        leaderboard.map((entry, idx) => (
                                            <div key={idx} className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01]",
                                                idx === 0 ? "bg-gradient-to-r from-yellow-500/20 to-yellow-900/10 border-yellow-500/30" : 
                                                idx === 1 ? "bg-gradient-to-r from-slate-300/20 to-slate-800/10 border-slate-400/30" : 
                                                idx === 2 ? "bg-gradient-to-r from-orange-700/20 to-orange-900/10 border-orange-700/30" : 
                                                "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
                                            )}>
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-8 h-8 flex items-center justify-center font-black rounded-lg text-sm shadow-inner shrink-0",
                                                        idx === 0 ? "bg-yellow-400 text-yellow-950" : 
                                                        idx === 1 ? "bg-slate-200 text-slate-900" : 
                                                        idx === 2 ? "bg-orange-600 text-white" : 
                                                        "bg-slate-700 text-slate-400"
                                                    )}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <p className={cn("font-bold text-sm truncate", idx < 3 ? "text-white" : "text-slate-300")}>{entry.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                            <Flame size={10} /> COMBO {entry.max_combo}x
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={cn("font-black text-lg leading-none", idx === 0 ? "text-yellow-400" : "text-blue-400")}>{entry.score}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">PTS</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'HISTORY' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300 overflow-y-auto pr-2 custom-scrollbar h-full">
                                {history.length === 0 ? (
                                    <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                        <History size={48} className="mb-4 text-slate-700" />
                                        <p className="text-slate-400">Histórico vazio.</p>
                                    </div>
                                ) : (
                                    history.map((game) => (
                                        <div key={game.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-slate-900 rounded-lg shrink-0">
                                                    <Target size={16} className="text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-200 text-xs mb-0.5">
                                                        {new Date(game.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(game.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-slate-900 px-1.5 py-0.5 rounded inline-block">SpeedRun</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-black text-white text-lg block">{game.score}</span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Pontos</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
              </div>
              
              {/* FOOTER */}
              <div className="mt-8 mb-6 text-center z-10">
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em]">StudyTrack Gamification System</p>
              </div>
          </div>
      )
  }

  // 2. TELA DE LOADING
  if (gameState === 'LOADING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
        </div>
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-6 animate-pulse">Sincronizando Questões...</p>
      </div>
    )
  }

  // 3. TELA DE GAME OVER (RESULTADO)
  if (gameState === 'GAME_OVER') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500 font-sans relative overflow-hidden">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>

        <div className="relative mb-8 z-10">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse"></div>
            <Crown size={80} className="text-yellow-400 relative z-10 mx-auto drop-shadow-lg" />
        </div>

        <h2 className="text-2xl font-bold text-slate-300 mb-2 tracking-wide uppercase z-10">Sessão Finalizada</h2>
        
        {/* SCORE GIGANTE */}
        <div className="relative z-10 mb-10">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tighter drop-shadow-2xl">
            {score}
            </div>
            <div className="text-sm font-bold text-blue-500 uppercase tracking-[0.5em] mt-2 border-t border-slate-800 pt-2 inline-block">Pontuação Final</div>
        </div>
        
        {/* GRID DE STATS */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10 z-10">
            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Flame size={14} />
                    <p className="text-[10px] uppercase font-bold tracking-wider">Maior Combo</p>
                </div>
                <p className="text-3xl font-black text-white">{maxCombo}x</p>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
                 <div className="flex items-center gap-2 mb-2 text-slate-400">
                    <Target size={14} />
                    <p className="text-[10px] uppercase font-bold tracking-wider">Precisão</p>
                </div>
                <p className="text-3xl font-black text-white">
                  {answersLog.current.length > 0 
                     ? Math.round((answersLog.current.filter(a => a.is_correct).length / answersLog.current.length) * 100) 
                     : 0}%
                </p>
            </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3 w-full max-w-xs z-10">
            <button 
                onClick={startGameLogic} 
                className="w-full py-4 bg-white hover:bg-slate-200 text-slate-950 font-black rounded-xl transition-all active:scale-95 shadow-xl shadow-white/10 flex items-center justify-center gap-2"
            >
                <RotateCcw size={18} strokeWidth={3} /> JOGAR NOVAMENTE
            </button>
            <button 
                onClick={returnToMenu} 
                className="w-full py-4 bg-transparent border border-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
                <BarChart3 size={18} /> VER RANKING
            </button>
        </div>
      </div>
    )
  }

  // 4. GAMEPLAY
  const currentQ = questions[currentIndex]

  if (!currentQ && gameState === 'PLAYING') {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center">
             <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
      )
  }

  // Cálculo da cor do timer
  const timerColor = timeLeft > 30 ? "text-white" : timeLeft > 10 ? "text-yellow-400" : "text-rose-500";
  const timerProgress = (timeLeft / START_TIME) * 100;

  return (
    <div className={cn(
        "min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden transition-all duration-200 font-sans relative",
        feedback === 'HIT' && "ring-8 ring-inset ring-emerald-500/20",
        feedback === 'MISS' && "ring-8 ring-inset ring-rose-500/20", 
        shaking && "animate-shake"
    )}>
      
      {/* BACKGROUND PULSANTE SE TEMPO ACABANDO */}
      {timeLeft < 10 && (
         <div className="absolute inset-0 bg-rose-500/10 animate-pulse pointer-events-none z-0" />
      )}

      {/* OVERLAY DE PARTICULAS NO ACERTO */}
      {feedback === 'HIT' && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
              <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
              <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-100"></div>
          </div>
      )}

      {/* CONTROLES TOP-RIGHT */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button 
            onClick={toggleMute}
            className="p-3 bg-slate-900/80 backdrop-blur rounded-full hover:bg-slate-800 border border-slate-700 transition-colors"
        >
            {isMuted ? <VolumeX size={18} className="text-slate-500" /> : <Volume2 size={18} className="text-white" />}
        </button>
      </div>

      {/* HUD SUPERIOR */}
      <div className="pt-6 px-6 pb-2 flex justify-between items-end max-w-5xl mx-auto w-full z-10 relative">
        <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Score Atual</span>
            <span className="text-4xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{score.toLocaleString()}</span>
        </div>

        {/* TIMER VISUAL */}
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 -bottom-2">
            <div className={cn("text-6xl font-black font-mono tracking-tighter drop-shadow-2xl transition-colors duration-300", timerColor)}>
                {timeLeft}
            </div>
        </div>

        <div className="flex flex-col items-end">
             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Combo Streak</span>
             <div className="flex items-center gap-2">
                <Flame size={24} className={cn("transition-colors", combo > 4 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-700")} />
                <span className={cn("text-4xl font-black italic transition-all", combo > 2 ? "text-yellow-400" : "text-slate-700")}>
                    {combo}x
                </span>
             </div>
        </div>
      </div>

      {/* BARRA DE PROGRESSO DO TEMPO */}
      <div className="w-full h-1 bg-slate-900 mt-4 relative overflow-hidden">
         <div 
           className={cn("h-full transition-all duration-1000 ease-linear", 
             timeLeft > 30 ? "bg-emerald-500" : timeLeft > 10 ? "bg-yellow-500" : "bg-rose-500"
           )}
           style={{ width: `${timerProgress}%` }}
         />
      </div>

      {/* ÁREA CENTRAL */}
      <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full p-6 relative z-10">
        
        {/* Feedback Flutuante */}
        {feedback === 'HIT' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20 text-emerald-400 font-black text-6xl animate-bounce drop-shadow-[0_4px_10px_rgba(16,185,129,0.5)] z-50">
                +8s
            </div>
        )}
        {feedback === 'MISS' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-20 text-rose-500 font-black text-6xl animate-bounce drop-shadow-[0_4px_10px_rgba(244,63,94,0.5)] z-50">
                -5s
            </div>
        )}

        <div className="mb-10 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/20">
                    <BrainCircuit size={12} />
                    {currentQ.discipline}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase border border-slate-700">
                    {currentQ.difficulty}
                </span>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-bold leading-tight drop-shadow-md text-slate-100">
                {currentQ.statement}
            </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQ.alternatives.map((alt, idx) => (
                <button
                    key={alt.id}
                    onClick={() => handleAnswer(alt.id)}
                    className="group relative p-6 bg-slate-900/60 hover:bg-slate-800 border-2 border-slate-800 hover:border-blue-500/50 rounded-2xl text-left transition-all active:scale-[0.98] overflow-hidden backdrop-blur-sm"
                >
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <span className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center font-bold text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors text-lg border border-slate-800 group-hover:border-blue-500/30">
                            {alt.id.toUpperCase()}
                        </span>
                        <span className="font-medium text-lg text-slate-300 group-hover:text-white leading-snug">{alt.text}</span>
                    </div>
                </button>
            ))}
        </div>

      </main>
      
      {/* PROGRESSO DAS QUESTÕES */}
      <div className="h-1.5 bg-slate-900 w-full fixed bottom-0 left-0">
         <div 
           className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
           style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
         />
      </div>
    </div>
  )
}