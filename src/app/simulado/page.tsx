'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Play, RotateCcw, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

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
        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
            const res = await fetch(`${apiUrl}/api/questions/simulado?qty=${qty}&subject=${encodeURIComponent(subject)}`);
            const data = await res.json();

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

    if (step === 'setup') {
         return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 relative">
                    <div className="absolute top-6 left-6">
                        <Link href="/dashboard" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </div>
                    <div className="flex flex-col items-center mb-8 mt-2">
                        <div className="bg-green-50 p-4 rounded-2xl mb-4 shadow-sm">
                            <Timer className="text-green-600 w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <h1 className="text-2xl font-bold text-center text-slate-900">Novo Simulado</h1>
                        <p className="text-center text-slate-500 text-sm mt-1">Treine com questões reais do ENEM.</p>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria</label>
                            <select className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-green-500 font-semibold text-slate-700"
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantidade</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[5, 10, 15, 30].map((val) => (
                                    <button key={val} onClick={() => setQty(val)}
                                        className={`p-2 rounded-xl border font-bold text-sm transition-all ${qty === val ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 hover:bg-green-50'}`}>
                                        {val}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={startSimulado} disabled={loading}
                        className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-70">
                        {loading ? 'Gerando...' : <><Play size={20} /> Iniciar Simulado</>}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'quiz') {
        const q = questions[currentIdx];
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
                <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                    <div className="text-sm font-bold text-slate-500">Questão {currentIdx + 1} / {questions.length}</div>
                    <div className={`font-mono text-xl font-bold px-3 py-1 rounded-md border ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-700'}`}>{formatTime(timeLeft)}</div>
                    <button onClick={finishSimulado} className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg uppercase">Finalizar</button>
                </div>
                <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">
                    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">{q.subject}</span>
                            {q.topic && <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">{q.topic}</span>}
                        </div>
                        {q.context && (
                            <div className="prose prose-slate max-w-none mb-6 text-slate-600 border-l-4 border-slate-200 pl-4">
                                <ReactMarkdown>{q.context}</ReactMarkdown>
                            </div>
                        )}
                        <div className="text-lg md:text-xl text-slate-900 font-medium mb-8 leading-relaxed">{q.statement}</div>
                        <div className="space-y-3">
                            {q.alternatives?.map((alt) => {
                                const isSelected = userAnswers[q.id] === alt.letter;
                                return (
                                    <button key={alt.letter} onClick={() => handleSelectOption(alt.letter)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group ${isSelected ? 'bg-blue-50/50 border-blue-500 shadow-sm' : 'hover:bg-slate-50 border-slate-100'}`}>
                                        <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200'}`}>{alt.letter}</span>
                                        <span className={`text-base leading-snug ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-600'}`}>{alt.text}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </main>
                <div className="bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 fixed bottom-0 w-full z-20">
                    <div className="max-w-3xl mx-auto flex justify-between items-center">
                        <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0} className="px-4 py-2 text-slate-500 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={16} /> Anterior</button>
                        {currentIdx < questions.length - 1 ? (
                            <button onClick={() => setCurrentIdx(prev => prev + 1)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800">Próxima <ArrowRight size={16} /></button>
                        ) : (
                            <button onClick={finishSimulado} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-green-700">Entregar <CheckCircle2 size={16} /></button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'result') {
        const score = calculateScore();
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
                <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center relative overflow-hidden border border-slate-100">
                         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                         <h2 className="text-3xl font-bold mb-2">Resultado Final</h2>
                         <div className="text-8xl font-black my-8">{score} <span className="text-xl text-slate-400 font-bold">/ {questions.length}</span></div>
                         <div className={`inline-block px-6 py-2 rounded-full font-bold mb-8 ${percentage >= 70 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>Aproveitamento: {percentage}%</div>
                         <div className="flex justify-center gap-4">
                            <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex gap-2 items-center hover:bg-slate-800"><RotateCcw size={18}/> Novo Simulado</button>
                            <button onClick={() => router.push('/dashboard')} className="border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50">Dashboard</button>
                         </div>
                    </div>
                    <div className="space-y-6">
                        {questions.map((q, idx) => {
                            const userAnswer = userAnswers[q.id];
                            const isCorrect = userAnswer?.toUpperCase() === q.correct_option?.toUpperCase();
                            return (
                                <div key={q.id} className={`bg-white p-6 rounded-2xl border-2 ${isCorrect ? 'border-green-100' : 'border-red-50'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Questão {idx + 1}</div>
                                            <p className="font-medium mb-4">{q.statement}</p>
                                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                                <div className={`flex-1 p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                                                    <span className="text-xs opacity-70 block uppercase font-bold">Sua Resposta</span>
                                                    <span className="font-bold text-lg">Letra {userAnswer || '-'}</span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="flex-1 p-3 rounded-lg border bg-slate-50 border-slate-200">
                                                        <span className="text-xs opacity-70 block uppercase font-bold">Gabarito</span>
                                                        <span className="font-bold text-lg">Letra {q.correct_option}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {q.explanation && !isCorrect && (
                                                <div className="p-4 bg-amber-50 rounded-xl text-amber-900 text-sm flex gap-3 items-start">
                                                    <AlertCircle className="shrink-0 w-5 h-5" />
                                                    <div><strong className="block mb-1">Explicação</strong>{q.explanation}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    }
    return null;
}