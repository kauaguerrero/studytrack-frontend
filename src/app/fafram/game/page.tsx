'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Zap, Timer, Trophy, ArrowRight, XCircle, CheckCircle2, 
    Loader2, Volume2, VolumeX, Crown, Play, RotateCcw, Home,
    BarChart3, BrainCircuit, Target, Flame, User, LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGameSound } from '@/hooks/useGameSound' 
import { Input } from '@/components/ui/input' 

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
    nickname: string
    score: number
    max_combo: number
}

type GameState = 'MENU' | 'LOADING' | 'PLAYING' | 'GAME_OVER'

export default function FaframSpeedRunPage() {
  const router = useRouter()
  const { playHit, playMiss, toggleBGM, toggleMute, isMuted, testSound } = useGameSound()
  
  // Game Config
  const START_TIME = 60
  const BONUS_TIME = 8
  const PENALTY_TIME = 5

  // State Global
  const [gameState, setGameState] = useState<GameState>('MENU')
  const [activeTab, setActiveTab] = useState<'PLAY' | 'RANK'>('PLAY')
  
  // Dados do Usuário (Sessão Persistente)
  const [nickname, setNickname] = useState('')
  const [userId, setUserId] = useState('')
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  
  // Dados & Loading
  const [questions, setQuestions] = useState<Question[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  
  // State Gameplay (Visual)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(START_TIME)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  
  // Feedback Visual
  const [feedback, setFeedback] = useState<'HIT' | 'MISS' | null>(null)
  const [shaking, setShaking] = useState(false)

  // --- REFS PARA LOGICA DE JOGO (CRÍTICO PARA CORRIGIR SCORE 0) ---
  // O React State pode não atualizar dentro do closure do Timer/EndGame.
  // Usamos Refs para garantir que o valor enviado ao banco seja sempre o mais atual.
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartRef = useRef<number>(0)
  const answersLog = useRef<any[]>([])

  // 1. VERIFICAÇÃO DE SESSÃO (Gatekeeper)
  useEffect(() => {
    const storedId = localStorage.getItem('fafram_user_id')
    const storedNick = localStorage.getItem('fafram_nickname')

    if (!storedId || !storedNick) {
        // Se não tem cadastro, manda para a tela de registro
        router.push('/fafram/auth')
    } else {
        setUserId(storedId)
        setNickname(storedNick)
        setIsSessionLoaded(true)
    }
  }, [])

  // 2. Fetch de Dados
  useEffect(() => {
    if (activeTab === 'RANK') {
        fetchLeaderboard()
    }
  }, [activeTab])

  // --- API ACTIONS ---
  const handleLogout = () => {
      if (confirm("Sair do jogo? Você precisará preencher seus dados novamente.")) {
          localStorage.removeItem('fafram_user_id')
          localStorage.removeItem('fafram_nickname')
          router.push('/fafram/auth')
      }
  }

  const fetchLeaderboard = async () => {
      setIsLoadingRanking(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fafram/leaderboard`)
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

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fafram/questions`)
      const data = await res.json()
      if (data && Array.isArray(data) && data.length > 0) {
        setQuestions(data)
        setGameState('PLAYING')
        startGameLogic()
      } else {
        alert("Erro ao carregar perguntas. Tente novamente.")
        setGameState('MENU')
      }
    } catch (err) {
      console.error("Erro ao carregar jogo:", err)
      alert("Erro de conexão com o servidor.")
      setGameState('MENU')
    }
  }

  // --- GAME LOGIC ---
  const startGameLogic = () => {
    // Reset States & Refs
    setTimeLeft(START_TIME)
    
    setScore(0); scoreRef.current = 0;
    setCombo(0); comboRef.current = 0;
    setMaxCombo(0); maxComboRef.current = 0;
    
    setCurrentIndex(0)
    answersLog.current = []
    questionStartRef.current = Date.now()
    setFeedback(null)

    // Timer Loop
    if (timerRef.current) clearInterval(timerRef.current)
    
    timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
            if (prev <= 1) {
                // Ao acabar o tempo, chamamos endGame que usará as REFS com o valor correto
                endGame()
                return 0
            }
            return prev - 1
        })
    }, 1000)
  }

  // Trigger Inicial
  const handleStartRequest = () => {
      if (!isSessionLoaded) return
      toggleBGM(true) 
      setGameState('LOADING')
      fetchQuestions()
  }

  // Handle Answer Click
  const handleAnswer = (selectedLetter: string) => {
    if (gameState !== 'PLAYING') return
    if (feedback) return // Bloqueia spam de cliques

    const currentQ = questions[currentIndex]
    if (!currentQ) return; 

    const isCorrect = selectedLetter.toLowerCase() === currentQ.correct_option.toLowerCase()
    
    // Log para analytics futuro
    const timeSpent = Date.now() - questionStartRef.current
    answersLog.current.push({
      question_id: currentQ.id,
      selected_option: selectedLetter,
      is_correct: isCorrect,
      time_spent_ms: timeSpent
    })

    if (isCorrect) {
      playHit()
      
      // Atualiza Refs (Lógica Real)
      const newCombo = comboRef.current + 1
      comboRef.current = newCombo
      if (newCombo > maxComboRef.current) maxComboRef.current = newCombo
      
      const points = 100 + (newCombo * 10)
      scoreRef.current += points

      // Atualiza State (Visual UI)
      setCombo(newCombo)
      setMaxCombo(maxComboRef.current)
      setScore(scoreRef.current)
      
      setTimeLeft(t => t + BONUS_TIME)
      setFeedback('HIT')
    } else {
      playMiss()
      
      // Zera combo no Ref e State
      comboRef.current = 0
      setCombo(0)
      
      setTimeLeft(t => Math.max(0, t - PENALTY_TIME)) 
      setFeedback('MISS')
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }

    questionStartRef.current = Date.now()
    
    // Delay para próxima questão
    setTimeout(() => {
        setFeedback(null)
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            // Se acabarem as perguntas (raro), finaliza o jogo salvando o score atual
            endGame() 
        }
    }, 500) 
  }

  const endGame = async () => {
    // Evita loop se chamado múltiplas vezes
    if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
    }
    
    // Se já estiver em game over, para aqui
    setGameState(currentState => {
        if (currentState === 'GAME_OVER') return currentState;
        
        toggleBGM(false)
        
        // Pega valores das REFS (garantia de não ser 0)
        const finalScore = scoreRef.current
        const finalMaxCombo = maxComboRef.current

        console.log("Enviando Score para API:", finalScore) // Debug

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fafram/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId, // CRÍTICO: Envia o ID da sessão
                nickname: nickname,
                score: finalScore,
                max_combo: finalMaxCombo,
                answers: answersLog.current 
            })
        }).catch(e => console.error("Erro ao salvar score", e))

        return 'GAME_OVER'
    })
  }

  const returnToMenu = () => {
      setGameState('MENU')
      setActiveTab('RANK')
  }

  // --- RENDERERS ---

  // Se a sessão não carregou, exibe loading vazio para evitar flash
  if (!isSessionLoaded) return <div className="min-h-screen bg-black" />

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
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-800 shadow-sm">
                      <User size={14} className="text-blue-400" />
                      <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">{nickname}</span>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-400 transition-colors">
                      <LogOut size={14} /> SAIR
                  </button>
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
                      Desafio Sistemas de Informação • FAFRAM 2026
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
                            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full justify-center">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
                                        <Timer className="text-blue-400 mb-2" size={28} />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tempo</p>
                                        <p className="text-2xl font-black text-white mt-1">60s</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 flex flex-col items-center text-center">
                                        <Flame className="text-orange-500 mb-2" size={28} />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Regra</p>
                                        <p className="text-2xl font-black text-white mt-1">Combo</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mt-4">
                                    <button 
                                        onClick={handleStartRequest}
                                        className="w-full py-6 font-black text-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-transform active:scale-95 group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                        <Play fill="currentColor" className="group-hover:scale-110 transition-transform relative z-10" /> 
                                        <span className="relative z-10">INICIAR PARTIDA</span>
                                    </button>
                                    
                                    <p className="text-center text-xs text-slate-500">
                                        Logado como <span className="text-white font-bold">{nickname}</span>
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'RANK' && (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[300px]">
                                    {isLoadingRanking ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                                            <Loader2 className="animate-spin text-blue-500" />
                                            <p className="text-xs font-medium uppercase tracking-widest">Sincronizando...</p>
                                        </div>
                                    ) : leaderboard.length === 0 ? (
                                        <div className="text-center py-10 opacity-50 flex flex-col items-center">
                                            <Trophy size={48} className="mb-4 text-slate-700" />
                                            <p className="text-slate-400 font-medium">Ranking vazio. Seja o primeiro!</p>
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
                                                        <p className={cn("font-bold text-sm truncate uppercase", idx < 3 ? "text-white" : "text-slate-300")}>{entry.nickname}</p>
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
                    </div>
                </div>
              </div>
              
              {/* FOOTER */}
              <div className="mt-8 mb-6 text-center z-10">
                  <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.2em]">StudyTrack • Fafram Edition</p>
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
        <div className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-wider">{nickname}</div>
        
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
                className="w-full py-4 bg-white hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-950 dark:text-slate-100 font-black rounded-xl transition-all active:scale-95 shadow-xl dark:shadow-none dark:border dark:border-slate-700 flex items-center justify-center gap-2"
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

  // Cor baseada na dificuldade
  const diffColor = currentQ.difficulty === 'easy' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                    currentQ.difficulty === 'medium' ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' :
                    'text-rose-400 border-rose-500/30 bg-rose-500/10';

  return (
    <div className={cn(
        "min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden transition-all duration-200 font-sans relative select-none",
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
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{nickname}</span>
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
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[10px] font-bold uppercase border", diffColor)}>
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