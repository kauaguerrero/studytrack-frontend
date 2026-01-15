'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, Play, RotateCcw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

// MOCK DATA PARA SIMULADO
const MOCK_SIMULADO = [
    {
        id: "101",
        external_id: "SIM-01",
        subject: "Matemática",
        topic: "Geometria",
        context: "Para construir uma cisterna cilíndrica...",
        statement: "Se o raio da base for duplicado, o volume será multiplicado por:",
        images: [],
        alternatives: [
            { letter: "A", text: "2" },
            { letter: "B", text: "4" },
            { letter: "C", text: "6" },
            { letter: "D", text: "8" },
            { letter: "E", text: "16" }
        ],
        correct_option: "B",
    },
    {
        id: "102",
        external_id: "SIM-02",
        subject: "História",
        topic: "Brasil Colônia",
        context: "O ciclo do ouro em Minas Gerais promoveu profundas alterações...",
        statement: "Uma consequência social direta da mineração foi:",
        images: [],
        alternatives: [
            { letter: "A", text: "A diminuição da escravidão" },
            { letter: "B", text: "O surgimento de uma classe média urbana" },
            { letter: "C", text: "A industrialização precoce" },
            { letter: "D", text: "O fim do pacto colonial" },
            { letter: "E", text: "A reforma agrária" }
        ],
        correct_option: "B",
    }
];

export default function SimuladoPage() {
    const router = useRouter();
    const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup');
    
    // Config
    const [subject, setSubject] = useState('Todas');
    const [qty, setQty] = useState(10);

    // Quiz State
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);
    
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

    const startSimulado = () => {
        setLoading(true);
        // Simula delay de API
        setTimeout(() => {
            setTimeLeft(qty * 3 * 60); // 3 min por questão
            setUserAnswers({});
            setCurrentIdx(0);
            setStep('quiz');
            setLoading(false);
        }, 1500);
    };

    const handleSelectOption = (letter: string) => {
        const q = MOCK_SIMULADO[currentIdx];
        setUserAnswers(prev => ({ ...prev, [q.id]: letter }));
    };

    const finishSimulado = () => {
        if (!confirm("Tem certeza que deseja finalizar?")) return;
        setStep('result');
    };

    const calculateScore = () => {
        let correct = 0;
        MOCK_SIMULADO.forEach(q => {
            if (userAnswers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase()) {
                correct++;
            }
        });
        return correct;
    };

    return (
        <>
            {step === 'setup' && (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
                    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 relative">
                        <div className="absolute top-6 left-6">
                            <Link href="/edificar/dashboard" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                        </div>
                        <div className="flex flex-col items-center mb-8 mt-2">
                            {/* Ícone Edificar (Laranja) */}
                            <div className="bg-orange-50 p-4 rounded-2xl mb-4 shadow-sm">
                                <Timer className="text-orange-600 w-10 h-10" strokeWidth={1.5} />
                            </div>
                            <h1 className="text-2xl font-bold text-center text-slate-900">Novo Simulado</h1>
                            <p className="text-center text-slate-500 text-sm mt-1">Treine com questões reais do ENEM.</p>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria</label>
                                <select className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-orange-500 font-semibold text-slate-700 outline-none"
                                        value={subject} onChange={(e) => setSubject(e.target.value)}>
                                    <option value="Todas">📚 Todas as Matérias</option>
                                    <optgroup label="Áreas">
                                        <option value="Matemática">📐 Matemática</option>
                                        <option value="Física">⚡ Física</option>
                                        <option value="Química">🧪 Química</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantidade</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[5, 10, 15, 30].map((val) => (
                                        <button key={val} onClick={() => setQty(val)}
                                            className={`p-2 rounded-xl border font-bold text-sm transition-all ${qty === val ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 hover:bg-orange-50'}`}>
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {/* Botão Preto (Identidade Secundária) */}
                        <button onClick={startSimulado} disabled={loading}
                            className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-70 group">
                            {loading ? 'Gerando...' : <><Play size={20} className="group-hover:translate-x-0.5 transition-transform text-orange-500 fill-orange-500" /> Iniciar Simulado</>}
                        </button>
                    </div>
                </div>
            )}

            {step === 'quiz' && (
                <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
                    {/* Header Quiz */}
                    <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                        <div className="text-sm font-bold text-slate-500 flex items-center gap-2">
                            <LayoutDashboard size={16} className="text-orange-500"/>
                            Questão {currentIdx + 1} / {MOCK_SIMULADO.length}
                        </div>
                        <div className={`font-mono text-xl font-bold px-3 py-1 rounded-md border ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-700'}`}>{formatTime(timeLeft)}</div>
                        <button onClick={finishSimulado} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg uppercase">Finalizar</button>
                    </div>
                    
                    <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">
                        <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                            
                            <div className="flex flex-wrap gap-2 mb-6">
                                <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-100">{MOCK_SIMULADO[currentIdx].subject}</span>
                                {MOCK_SIMULADO[currentIdx].topic && <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">{MOCK_SIMULADO[currentIdx].topic}</span>}
                            </div>
                            
                            {MOCK_SIMULADO[currentIdx].context && (
                                <div className="prose prose-slate max-w-none mb-6 text-slate-600 border-l-4 border-orange-200 pl-4">
                                    <ReactMarkdown>{MOCK_SIMULADO[currentIdx].context}</ReactMarkdown>
                                </div>
                            )}
                            
                            <div className="text-lg md:text-xl text-slate-900 font-medium mb-8 leading-relaxed">{MOCK_SIMULADO[currentIdx].statement}</div>
                            
                            <div className="space-y-3">
                                {MOCK_SIMULADO[currentIdx].alternatives?.map((alt) => {
                                    const isSelected = userAnswers[MOCK_SIMULADO[currentIdx].id] === alt.letter;
                                    return (
                                        <button key={alt.letter} onClick={() => handleSelectOption(alt.letter)}
                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group ${
                                                isSelected 
                                                ? 'bg-orange-50/50 border-orange-500 shadow-sm' 
                                                : 'hover:bg-slate-50 border-slate-100 hover:border-orange-200'
                                            }`}>
                                            <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                                                isSelected 
                                                ? 'bg-orange-500 text-white border-orange-500' 
                                                : 'bg-white text-slate-400 border-slate-200 group-hover:border-orange-300'
                                            }`}>
                                                {alt.letter}
                                            </span>
                                            <span className={`text-base leading-snug ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>{alt.text}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </main>

                    {/* Footer Nav */}
                    <div className="bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 fixed bottom-0 w-full z-20">
                        <div className="max-w-3xl mx-auto flex justify-between items-center">
                            <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="px-4 py-2 text-slate-500 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={16} /> Anterior</button>
                            {currentIdx < MOCK_SIMULADO.length - 1 ? (
                                <button onClick={() => setCurrentIdx(prev => prev + 1)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800">Próxima <ArrowRight size={16} /></button>
                            ) : (
                                <button onClick={finishSimulado} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-green-700">Entregar <CheckCircle2 size={16} /></button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 'result' && (
                <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex items-center justify-center">
                    <div className="max-w-3xl w-full mx-auto space-y-8 pb-20">
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center relative overflow-hidden border border-slate-100">
                             {/* Gradient Bar Edificar */}
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"></div>
                             
                             <h2 className="text-3xl font-bold mb-2 text-slate-900">Resultado Final</h2>
                             <div className="text-8xl font-black my-8 text-slate-900">{calculateScore()} <span className="text-xl text-slate-400 font-bold">/ {MOCK_SIMULADO.length}</span></div>
                             
                             <div className="flex justify-center gap-4">
                                <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                                    <RotateCcw size={18}/> Novo Simulado
                                </button>
                                <button onClick={() => router.push('/edificar/dashboard')} className="border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 text-slate-600">
                                    Dashboard
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}