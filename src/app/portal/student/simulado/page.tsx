'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Play, RotateCcw, AlertCircle, Lock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { UpsellModal } from '@/components/modals/UpsellModal'

interface Alternative {
    letter: string;
    text: string;
}

interface Question {
    id: string;
    external_id: string;
    subject: string;
    topic?: string;
    context: string;
    statement: string;
    images: string[];
    alternatives: Alternative[];
    correct_option: string;
    explanation?: string;
}

export default function SimuladoPage() {
    const router = useRouter();
    const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup');
    
    // Config
    const [subject, setSubject] = useState('Todas');
    const [qty, setQty] = useState(10);

    // Quiz State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Auth & Upsell
    const [userId, setUserId] = useState<string | null>(null)
    const [isUpsellOpen, setIsUpsellOpen] = useState(false)
    const [upsellReason, setUpsellReason] = useState<'DAILY_SIMULADO_REACHED' | 'TRIAL_EXPIRED'>('DAILY_SIMULADO_REACHED')

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setUserId(user.id)
        }
        getUser()
    }, [])

    useEffect(() => {
        if (step === 'quiz' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [step, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const startSimulado = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
            const res = await fetch(`${apiUrl}/api/questions/simulado?qty=${qty}&subject=${encodeURIComponent(subject)}&user_id=${userId}`);
            const data = await res.json();

            // --- LÓGICA DE BLOQUEIO ---
            if (res.status === 403) {
                setUpsellReason(data.code || 'DAILY_SIMULADO_REACHED');
                setIsUpsellOpen(true);
                setLoading(false);
                return;
            }

            if (data.error) throw new Error(data.error);

            if (!Array.isArray(data) || data.length === 0) {
                alert("Não encontramos questões suficientes para essa matéria.");
                return;
            }

            setQuestions(data);
            setTimeLeft(qty * 3 * 60);
            setUserAnswers({});
            setCurrentIdx(0);
            setStep('quiz');
        } catch (e) {
            alert("Erro ao conectar com o servidor.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (letter: string) => {
        const q = questions[currentIdx];
        setUserAnswers(prev => ({ ...prev, [q.id]: letter }));
    };

    const finishSimulado = () => {
        if (!confirm("Tem certeza que deseja finalizar?")) return;
        setStep('result');
    };

    const calculateScore = () => {
        let correct = 0;
        questions.forEach(q => {
            if (userAnswers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase()) {
                correct++;
            }
        });
        return correct;
    };

    return (
        <>
            <UpsellModal isOpen={isUpsellOpen} onClose={() => setIsUpsellOpen(false)} reason={upsellReason} />
            
            {step === 'setup' && (
                <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center p-4 font-sans text-slate-900 dark:text-foreground">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 dark:border-slate-800 relative">
                        <div className="flex flex-col items-center mb-8 mt-2">
                            <div className="bg-green-50 dark:bg-green-900/40 p-4 rounded-2xl mb-4 shadow-sm">
                                <Timer className="text-green-600 dark:text-green-400 w-10 h-10" strokeWidth={1.5} />
                            </div>
                            <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-50">Novo Simulado</h1>
                            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-1">Treine com questões reais do ENEM.</p>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Matéria</label>
                                <select className="w-full p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 font-semibold text-slate-700"
                                        value={subject} onChange={(e) => setSubject(e.target.value)}>
                                    <option value="Todas">📚 Todas as Matérias</option>
                                    <optgroup label="Áreas">
                                        <option value="Matemática">📐 Matemática</option>
                                        <option value="Física">⚡ Física</option>
                                        <option value="Química">🧪 Química</option>
                                        <option value="Biologia">🧬 Biologia</option>
                                        <option value="História">🏛️ História</option>
                                        <option value="Geografia">🌍 Geografia</option>
                                        <option value="Língua Portuguesa">📖 Português</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quantidade</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[5, 10, 15, 30].map((val) => (
                                        <button key={val} onClick={() => setQty(val)}
                                            className={`p-2 rounded-xl border font-bold text-sm transition-all ${qty === val ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/40 border-slate-200 dark:border-slate-700'}`}>
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={startSimulado} disabled={loading}
                            className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-70 group">
                            {loading ? 'Gerando...' : <><Play size={20} className="group-hover:translate-x-0.5 transition-transform" /> Iniciar Simulado</>}
                        </button>
                    </div>
                </div>
            )}

            {step === 'quiz' && (
                <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col font-sans text-slate-900 dark:text-foreground">
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Questão {currentIdx + 1} / {questions.length}</div>
                        <div className={`font-mono text-xl font-bold px-3 py-1 rounded-md border ${timeLeft < 300 ? 'bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 animate-pulse border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>{formatTime(timeLeft)}</div>
                        <button onClick={finishSimulado} className="text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/40 px-3 py-2 rounded-lg uppercase">Finalizar</button>
                    </div>
                    <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">
                        <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
                            {/* Renderização da Questão (Mantida) */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                <span className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1 rounded-full">{questions[currentIdx].subject}</span>
                                {questions[currentIdx].topic && <span className="bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 text-xs font-bold px-3 py-1 rounded-full">{questions[currentIdx].topic}</span>}
                            </div>
                            {questions[currentIdx].context && (
                                <div className="prose prose-slate dark:prose-invert max-w-none mb-6 text-slate-600 dark:text-slate-300 border-l-4 border-slate-200 dark:border-slate-700 pl-4">
                                    <ReactMarkdown>{questions[currentIdx].context}</ReactMarkdown>
                                </div>
                            )}
                            <div className="text-lg md:text-xl text-slate-900 dark:text-slate-50 font-medium mb-8 leading-relaxed">{questions[currentIdx].statement}</div>
                            <div className="space-y-3">
                                {questions[currentIdx].alternatives?.map((alt) => {
                                    const isSelected = userAnswers[questions[currentIdx].id] === alt.letter;
                                    return (
                                        <button key={alt.letter} onClick={() => handleSelectOption(alt.letter)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/40 border-blue-500 dark:border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                            <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-200 border-slate-200 dark:border-slate-600'}`}>{alt.letter}</span>
                                            <span className={`text-base leading-snug ${isSelected ? 'text-blue-900 dark:text-blue-100 font-medium' : 'text-slate-700 dark:text-slate-100'}`}>{alt.text}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </main>
                    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 fixed bottom-0 left-0 right-0 z-20">
                        <div className="max-w-3xl mx-auto w-full flex justify-between items-center gap-4 px-4 md:px-8">
                            <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="px-4 py-2.5 text-slate-500 dark:text-slate-400 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><ArrowLeft size={16} /> Anterior</button>
                            {currentIdx < questions.length - 1 ? (
                                <button onClick={() => setCurrentIdx(prev => prev + 1)} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">Próxima <ArrowRight size={16} /></button>
                            ) : (
                                <button onClick={finishSimulado} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors">Entregar <CheckCircle2 size={16} /></button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 'result' && (
                <div className="min-h-screen bg-slate-50 dark:bg-background p-4 md:p-8 font-sans text-slate-900 dark:text-foreground">
                    <div className="max-w-3xl mx-auto space-y-8 pb-20">
                         {/* Renderização do Resultado (Mantida) */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl text-center relative overflow-hidden border border-slate-100 dark:border-slate-800">
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                             <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-50">Resultado Final</h2>
                             <div className="text-8xl font-black my-8 text-slate-900 dark:text-slate-50">{calculateScore()} <span className="text-xl text-slate-400 dark:text-slate-500 font-bold">/ {questions.length}</span></div>
                             <div className="flex justify-center gap-4">
                                <button onClick={() => window.location.reload()} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-slate-800 dark:hover:bg-slate-200"><RotateCcw size={18}/> Novo Simulado</button>
                                <button onClick={() => router.push('dashboard')} className="border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100">Dashboard</button>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}