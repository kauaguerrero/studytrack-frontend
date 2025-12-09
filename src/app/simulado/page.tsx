'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Play, RotateCcw, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// --- Tipos ---
interface Question {
    id: string;
    external_id: string;
    statement: string; 
    subject: string;
    images: string[];
    options: { [key: string]: string };
    correct_option: string;
    topic?: string;
    explanation?: string;
}

// --- Componente Principal ---
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

    // Timer
    useEffect(() => {
        if (step === 'quiz' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [step, timeLeft]);

    // Format Timer
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // --- Ações ---

    const startSimulado = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/questions/simulado?qty=${qty}&subject=${encodeURIComponent(subject)}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            if (!Array.isArray(data) || data.length === 0) {
                alert("Não encontramos questões suficientes para essa matéria neste momento.");
                setLoading(false);
                return;
            }

            // Normalização de dados
            const formattedQuestions: Question[] = data.map((q: any) => ({
                ...q,
                statement: q.question_text || q.statement,
                explanation: q.explanation 
            }));

            setQuestions(formattedQuestions);
            setTimeLeft(qty * 3 * 60); // 3 min/questão
            setUserAnswers({});
            setCurrentIdx(0);
            setStep('quiz');
        } catch (e) {
            alert("Erro ao conectar com o servidor. Verifique se o Backend está rodando.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (option: string) => {
        const q = questions[currentIdx];
        setUserAnswers(prev => ({ ...prev, [q.id]: option }));
    };

    const finishSimulado = () => {
        if (!confirm("Tem certeza que deseja finalizar?")) return;
        setStep('result');
    };

    const calculateScore = () => {
        let correct = 0;
        questions.forEach(q => {
            if (userAnswers[q.id]?.toLowerCase() === q.correct_option.toLowerCase()) {
                correct++;
            }
        });
        return correct;
    };

    // --- Renderização ---

    if (step === 'setup') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
                <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 relative">
                    
                    {/* Botão de Voltar - Movido para o Topo (Melhor UX) */}
                    <div className="absolute top-6 left-6">
                        <Link 
                            href="/dashboard" 
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all group"
                            title="Voltar para Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="flex flex-col items-center mb-8 mt-2">
                        <div className="bg-green-50 p-4 rounded-2xl mb-4 shadow-sm">
                            <Timer className="text-green-600 w-10 h-10" strokeWidth={1.5} />
                        </div>
                        <h1 className="text-2xl font-bold text-center text-slate-900">Novo Simulado</h1>
                        <p className="text-center text-slate-500 text-sm mt-1">Configure sua prova e teste seus conhecimentos.</p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Matéria Focada</label>
                            <div className="relative">
                                <select
                                    className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none font-semibold text-slate-700 appearance-none transition-all hover:bg-slate-50"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                >
                                    <option value="Todas">📚 Todas as Matérias</option>
                                    <optgroup label="Ciências da Natureza">
                                        <option value="Biologia">🧬 Biologia</option>
                                        <option value="Física">⚡ Física</option>
                                        <option value="Química">🧪 Química</option>
                                    </optgroup>
                                    <optgroup label="Ciências Humanas">
                                        <option value="História">🏛️ História</option>
                                        <option value="Geografia">🌍 Geografia</option>
                                        <option value="Filosofia">🤔 Filosofia</option>
                                        <option value="Sociologia">👥 Sociologia</option>
                                    </optgroup>
                                    <optgroup label="Linguagens">
                                        <option value="Língua Portuguesa">📖 Português</option>
                                        <option value="Literatura">🎭 Literatura</option>
                                        <option value="Inglês">🇺🇸 Inglês</option>
                                        <option value="Espanhol">🇪🇸 Espanhol</option>
                                    </optgroup>
                                    <optgroup label="Matemática">
                                        <option value="Matemática">📐 Matemática</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Extensão</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[5, 10, 30, 90].map((val) => (
                                    <button
                                        key={val}
                                        onClick={() => setQty(val)}
                                        className={`p-3 rounded-xl border font-bold text-sm transition-all ${
                                            qty === val 
                                            ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-green-300 hover:bg-green-50'
                                        }`}
                                    >
                                        {val} Questões
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={startSimulado}
                        disabled={loading}
                        className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-70 transform hover:-translate-y-0.5"
                    >
                        {loading ? 'Gerando Prova...' : (
                            <>
                                <Play size={20} fill="currentColor" />
                                Começar Agora
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'quiz') {
        const q = questions[currentIdx];

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
                {/* Topbar */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
                    <div className="text-sm font-bold text-slate-500">
                        Questão {currentIdx + 1} <span className="text-slate-300 mx-1">/</span> {questions.length}
                    </div>
                    <div className={`font-mono text-xl font-bold px-3 py-1 rounded-md border ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={finishSimulado}
                        className="text-red-600 text-xs font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors uppercase tracking-wider border border-transparent hover:border-red-100"
                    >
                        Finalizar
                    </button>
                </div>

                {/* Content */}
                <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">
                    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 min-h-[50vh]">
                        <div className="flex flex-wrap gap-2 mb-8">
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">{q.subject}</span>
                            {q.topic && q.topic !== "Geral" && (
                                <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-100">{q.topic}</span>
                            )}
                        </div>

                        <p className="text-lg md:text-xl text-slate-800 leading-relaxed mb-8 whitespace-pre-line font-medium">
                            {q.statement}
                        </p>

                        {q.images && q.images.length > 0 && (
                            <div className="mb-8 flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <img src={q.images[0]} className="max-w-full max-h-[400px] rounded-lg shadow-sm" alt="Material de apoio" />
                            </div>
                        )}

                        <div className="space-y-3">
                            {['a', 'b', 'c', 'd', 'e'].map((letter) => {
                                const text = q.options[letter];
                                if (!text) return null;
                                const isSelected = userAnswers[q.id] === letter;

                                return (
                                    <button
                                        key={letter}
                                        onClick={() => handleSelectOption(letter)}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-center group ${isSelected
                                            ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                                            : 'hover:bg-slate-50 border-slate-100 hover:border-blue-200'
                                            }`}
                                    >
                                        <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold uppercase shrink-0 transition-colors ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 group-hover:border-blue-300 group-hover:text-blue-500'
                                            }`}>
                                            {letter}
                                        </span>
                                        <span className={`text-base leading-snug ${isSelected ? 'text-blue-900 font-medium' : 'text-slate-600'}`} dangerouslySetInnerHTML={{ __html: text }}></span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </main>

                {/* Footer Navigation */}
                <div className="bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 fixed bottom-0 w-full z-20">
                    <div className="max-w-3xl mx-auto flex justify-between items-center">
                        <button
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            className="px-4 py-2 text-slate-500 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-100 rounded-lg transition-colors text-sm"
                        >
                            <ArrowLeft size={16} /> Anterior
                        </button>

                        {currentIdx < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIdx(prev => prev + 1)}
                                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-200 text-sm"
                            >
                                Próxima <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={finishSimulado}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-200 text-sm"
                            >
                                Entregar Prova <CheckCircle2 size={16} />
                            </button>
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
                    <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl border border-slate-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        
                        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Resultado Final</h2>
                        <p className="text-slate-500 mb-10">Confira seu desempenho neste simulado.</p>

                        <div className="flex justify-center items-end gap-2 mb-8">
                            <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">{score}</span>
                            <span className="text-xl font-bold text-slate-400 mb-4">/ {questions.length}</span>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full mb-10 text-sm font-bold uppercase tracking-wide ${percentage >= 70 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            {percentage >= 70 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            Aproveitamento: {percentage}%
                        </div>

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all hover:-translate-y-1"
                            >
                                <RotateCcw size={18} /> Novo Simulado
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-8 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
                            >
                                Voltar ao Dashboard
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pl-4">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gabarito Detalhado</h3>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    
                    <div className="space-y-6">
                        {questions.map((q, idx) => {
                            const userAnswer = userAnswers[q.id];
                            const isCorrect = userAnswer?.toLowerCase() === q.correct_option.toLowerCase();

                            return (
                                <div key={q.id} className={`bg-white p-6 md:p-8 rounded-2xl border-2 transition-all ${isCorrect ? 'border-green-100 shadow-sm' : 'border-red-50 shadow-sm'}`}>
                                    <div className="flex items-start gap-5">
                                        <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Questão {idx + 1} • {q.subject}</div>
                                                <div className="text-xs font-mono text-slate-300">ID: {q.external_id}</div>
                                            </div>

                                            <p className="text-slate-800 font-medium mb-6 text-lg">{q.statement}</p>

                                            <div className="flex flex-col sm:flex-row gap-4 text-sm mb-6">
                                                <div className={`flex-1 p-4 rounded-xl border ${isCorrect ? 'bg-green-50/50 border-green-200 text-green-900' : 'bg-red-50/50 border-red-200 text-red-900'}`}>
                                                    <span className="font-bold block text-xs opacity-60 mb-1 uppercase">Sua Resposta</span>
                                                    <span className="text-lg font-bold">Letra {userAnswer?.toUpperCase() || '-'}</span>
                                                </div>

                                                {!isCorrect && (
                                                    <div className="flex-1 p-4 rounded-xl border bg-slate-50 border-slate-200 text-slate-900">
                                                        <span className="font-bold block text-xs opacity-60 mb-1 uppercase">Gabarito Oficial</span>
                                                        <span className="text-lg font-bold">Letra {q.correct_option.toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Feedback IA */}
                                            {q.explanation && !isCorrect && (
                                                <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-4 text-sm text-amber-900">
                                                    <AlertCircle className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
                                                    <div className="space-y-1">
                                                        <strong className="block font-bold text-amber-800">Dica do Tutor IA</strong>
                                                        <p className="leading-relaxed opacity-90">{q.explanation}</p>
                                                    </div>
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