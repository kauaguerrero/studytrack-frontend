'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // Adicionado do Kauã para navegação melhor
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, XCircle, Play, RotateCcw, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// --- Tipos (Baseado no seu, mas com additions do Kauã) ---
interface Question {
    id: string;
    external_id: string;
    statement: string; // Kauã chamou de question_text, mas seu backend manda statement/question_text. Vamos garantir mapeamento.
    subject: string;
    images: string[];
    options: { [key: string]: string };
    correct_option: string;
    topic?: string;
    explanation?: string; // Ouro do Kauã: Feedback da IA
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

            // Normalização de dados (Garante que funcione mesmo se o backend variar nomes)
            const formattedQuestions: Question[] = data.map((q: any) => ({
                ...q,
                statement: q.question_text || q.statement, // Fallback de segurança
                explanation: q.explanation // Garante que a explicação venha
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
                <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200">
                    <div className="flex justify-center mb-6">
                        <div className="bg-green-100 p-4 rounded-full">
                            <Timer className="text-green-600 w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Novo Simulado</h1>
                    <p className="text-center text-slate-500 mb-8">Configure sua prova e teste seus conhecimentos.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Matéria</label>
                            <select
                                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-green-500 focus:outline-none font-medium"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            >
                                <option value="Todas">Todas as Matérias</option>
                                <optgroup label="Ciências da Natureza">
                                    <option value="Biologia">Biologia</option>
                                    <option value="Física">Física</option>
                                    <option value="Química">Química</option>
                                </optgroup>
                                <optgroup label="Ciências Humanas">
                                    <option value="História">História</option>
                                    <option value="Geografia">Geografia</option>
                                    <option value="Filosofia">Filosofia</option>
                                    <option value="Sociologia">Sociologia</option>
                                </optgroup>
                                <optgroup label="Linguagens">
                                    <option value="Língua Portuguesa">Português</option>
                                    <option value="Literatura">Literatura</option>
                                    <option value="Inglês">Inglês</option>
                                    <option value="Espanhol">Espanhol</option>
                                </optgroup>
                                <optgroup label="Matemática">
                                    <option value="Matemática">Matemática</option>
                                </optgroup>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Quantidade de Questões</label>
                            <select
                                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-green-500 focus:outline-none font-medium"
                                value={qty}
                                onChange={(e) => setQty(Number(e.target.value))}
                            >
                                <option value={5}>5 Questões (Rápido)</option>
                                <option value={10}>10 Questões</option>
                                <option value={30}>30 Questões (Intenso)</option>
                                <option value={45}>45 Questões (Simulado Área)</option>
                                <option value={90}>90 Questões (Modo ENEM)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={startSimulado}
                        disabled={loading}
                        className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-70"
                    >
                        {loading ? 'Gerando...' : (
                            <>
                                <Play size={20} fill="currentColor" />
                                Começar Simulado
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="w-full block text-center mt-4 text-slate-400 text-sm hover:text-slate-600 font-medium"
                    >
                        Voltar ao Dashboard
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
                        Questão {currentIdx + 1} de {questions.length}
                    </div>
                    <div className={`font-mono text-xl font-bold px-3 py-1 rounded-md ${timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={finishSimulado}
                        className="text-red-600 text-sm font-bold hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                    >
                        Finalizar
                    </button>
                </div>

                {/* Content */}
                <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8">
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 min-h-[50vh]">
                        <div className="flex flex-wrap gap-2 mb-6">
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded border border-blue-200">{q.subject}</span>
                            {q.topic && q.topic !== "Geral" && (
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded border border-purple-200">{q.topic}</span>
                            )}
                        </div>

                        <p className="text-lg text-slate-900 leading-relaxed mb-8 whitespace-pre-line font-medium">
                            {q.statement}
                        </p>

                        {q.images && q.images.length > 0 && (
                            <div className="mb-8 flex justify-center">
                                <img src={q.images[0]} className="max-w-full rounded-lg border border-slate-200 shadow-sm" alt="Material de apoio" />
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
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex gap-4 items-start ${isSelected
                                            ? 'bg-blue-50 border-blue-500 shadow-sm'
                                            : 'hover:bg-slate-50 border-slate-100'
                                            }`}
                                    >
                                        <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold uppercase shrink-0 transition-colors ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-300'
                                            }`}>
                                            {letter}
                                        </span>
                                        <span className="text-slate-700 mt-1 leading-snug" dangerouslySetInnerHTML={{ __html: text }}></span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </main>

                {/* Footer Navigation */}
                <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
                    <div className="max-w-3xl mx-auto flex justify-between">
                        <button
                            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                            disabled={currentIdx === 0}
                            className="px-4 py-2 text-slate-600 disabled:opacity-30 font-bold flex items-center gap-2 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={18} /> Anterior
                        </button>

                        {currentIdx < questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentIdx(prev => prev + 1)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-200"
                            >
                                Próxima <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={finishSimulado}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-green-200"
                            >
                                Entregar Prova <CheckCircle2 size={18} />
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
            <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
                <div className="max-w-3xl mx-auto space-y-8">
                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 text-center">
                        <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Resultado Final</h2>
                        <p className="text-slate-500 mb-6">Confira seu desempenho neste simulado.</p>

                        <div className="relative inline-block mb-6">
                            <div className="text-8xl font-black text-blue-600 tracking-tighter">{score}</div>
                            <div className="absolute -bottom-4 left-0 right-0 text-sm font-bold text-slate-400 uppercase tracking-widest">de {questions.length}</div>
                        </div>

                        <div className={`text-lg font-bold px-4 py-2 rounded-full inline-block mb-8 ${percentage >= 70 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            Aproveitamento: {percentage}%
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all"
                            >
                                <RotateCcw size={18} /> Novo Simulado
                            </button>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 transition-all"
                            >
                                Voltar ao Dashboard
                            </button>
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 pl-2 border-l-4 border-blue-600">Gabarito Detalhado</h3>
                    <div className="space-y-4">
                        {questions.map((q, idx) => {
                            const userAnswer = userAnswers[q.id];
                            const isCorrect = userAnswer?.toLowerCase() === q.correct_option.toLowerCase();

                            return (
                                <div key={q.id} className={`bg-white p-6 rounded-2xl border-2 transition-all ${isCorrect ? 'border-green-100' : 'border-red-100'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 p-2 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Questão {idx + 1} • {q.subject}</div>
                                                <div className="text-xs font-bold text-slate-300">#{q.external_id}</div>
                                            </div>

                                            <p className="text-slate-800 font-medium mb-4">{q.statement}</p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                                                <div className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                                    <span className="font-bold block text-xs opacity-70 mb-1">SUA RESPOSTA</span>
                                                    Letra {userAnswer?.toUpperCase() || '-'}
                                                </div>

                                                {!isCorrect && (
                                                    <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 text-slate-800">
                                                        <span className="font-bold block text-xs opacity-70 mb-1">GABARITO OFICIAL</span>
                                                        Letra {q.correct_option.toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* AQUI ESTÁ A INOVAÇÃO: Feedback da IA se disponível */}
                                            {q.explanation && !isCorrect && (
                                                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3 text-sm text-yellow-800">
                                                    <AlertCircle className="shrink-0 w-5 h-5" />
                                                    <div>
                                                        <strong className="block mb-1 font-bold">Dica do Tutor IA:</strong>
                                                        {q.explanation}
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