"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Timer, CheckCircle2, AlertCircle, ArrowRight, X } from "lucide-react";

// Interface ajustada para options ser flexível
interface Question {
  id: string;
  subject: string;
  topic: string;
  question_text: string;
  options: any;
  correct_option: string;
  explanation?: string;
}

export default function SimuladoPage() {
  const [step, setStep] = useState<'config' | 'exam' | 'result'>('config');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  
  const [config, setConfig] = useState({ qty: 10, subject: 'Todas' });
  const [timeLeft, setTimeLeft] = useState(0); 

  const router = useRouter();

  useEffect(() => {
    if (step === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startSimulado = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/questions/simulado?qty=${config.qty}&subject=${config.subject}`);
      const data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        alert("Não há questões suficientes no banco para este filtro.");
        setLoading(false);
        return;
      }

      setQuestions(data);
      setTimeLeft(data.length * 3 * 60); 
      setStep('exam');
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar simulado. Backend está rodando?");
    } finally {
      setLoading(false);
    }
  };

  const finishSimulado = () => {
    if (confirm("Tem certeza que deseja finalizar o simulado?")) {
      setStep('result');
    }
  };

  // Helper para renderizar opções (se for array ou objeto)
  const getOptions = (q: Question) => {
    if (Array.isArray(q.options)) {
       return q.options.map((text, i) => [String.fromCharCode(97 + i), text]);
    }
    return Object.entries(q.options);
  };

  if (step === 'config') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Novo Simulado</h1>
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-600" aria-label="Fechar"><X /></button>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="materia-select" className="block text-sm font-bold text-slate-700 mb-2">Matéria</label>
              <select 
                id="materia-select"
                aria-label="Selecione a matéria"
                className="w-full p-3 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                value={config.subject}
                onChange={(e) => setConfig({...config, subject: e.target.value})}
              >
                <option value="Todas">Mix Geral (Estilo 1º Dia)</option>
                <option value="Matemática">Matemática</option>
                <option value="Português">Linguagens</option>
                <option value="Natureza">Natureza</option>
                <option value="História">História</option>
                <option value="Geografia">Geografia</option>
              </select>
            </div>

            <div>
              <span className="block text-sm font-bold text-slate-700 mb-2">Quantidade de Questões</span>
              <div className="grid grid-cols-3 gap-2">
                {[10, 30, 45, 90].map(q => (
                  <button 
                    key={q}
                    onClick={() => setConfig({...config, qty: q})}
                    className={`py-2 rounded-lg border font-medium transition-colors ${config.qty === q ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={startSimulado} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? "Gerando Prova..." : "Começar Agora"} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'exam') {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 w-full bg-slate-900 text-white p-4 z-50 shadow-md">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="font-mono text-xl font-bold flex items-center gap-2">
              <Timer className={timeLeft < 300 ? "text-red-500 animate-pulse" : "text-blue-400"} />
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-slate-400 hidden sm:block">
              Questão {Object.keys(answers).length} de {questions.length} respondidas
            </div>
            <button onClick={finishSimulado} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors">
              Entregar Prova
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto pt-24 pb-20 px-6 space-y-12">
          {questions.map((q, index) => (
            <div key={q.id} className="border-b border-slate-100 pb-10 last:border-0">
              <div className="flex gap-3 mb-4">
                <span className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded text-sm">{index + 1}</span>
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wide mt-1">{q.subject}</span>
              </div>
              <p className="text-lg text-slate-900 leading-relaxed mb-6 whitespace-pre-wrap">{q.question_text}</p>
              <div className="space-y-3 pl-4 border-l-2 border-slate-100">
                {getOptions(q).map(([key, text]: any) => (
                  <label key={key} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${answers[q.id] === key ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                    <input type="radio" name={q.id} value={key} onChange={() => setAnswers({...answers, [q.id]: key})} className="mt-1"/>
                    <span className="text-slate-700"><strong className="uppercase mr-2 text-slate-400">{key})</strong> {text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'result') {
    const correctCount = questions.filter(q => answers[q.id]?.toLowerCase() === q.correct_option?.toLowerCase()).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 text-center border border-slate-200">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Resultado do Simulado</h2>
            <div className="text-6xl font-extrabold text-blue-600 my-6">{score}%</div>
            <p className="text-slate-500">Você acertou <strong>{correctCount}</strong> de <strong>{questions.length}</strong> questões.</p>
            <div className="flex justify-center gap-4 mt-8">
                <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Voltar ao Início</button>
                <button onClick={() => { setAnswers({}); setStep('config'); }} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Novo Simulado</button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 ml-2">Correção Detalhada</h3>
            {questions.map((q, i) => {
              const userAnswer = answers[q.id]?.toLowerCase();
              const correct = q.correct_option?.toLowerCase();
              const isCorrect = userAnswer === correct;
              return (
                <div key={q.id} className={`bg-white p-6 rounded-xl border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'} shadow-sm`}>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-slate-400">Questão {i+1}</span>
                    {isCorrect ? <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={16}/> Acertou</span> : <span className="text-red-600 font-bold flex items-center gap-1"><AlertCircle size={16}/> Errou</span>}
                  </div>
                  <p className="text-slate-800 mb-4 line-clamp-2">{q.question_text}</p>
                  <div className="text-sm bg-slate-50 p-3 rounded-lg">
                    <p className="mb-1"><span className="font-bold">Sua resposta:</span> <span className="uppercase">{userAnswer || "Em branco"}</span></p>
                    <p className="text-blue-700"><span className="font-bold">Gabarito:</span> <span className="uppercase">{correct}</span></p>
                    {q.explanation && <p className="mt-2 pt-2 border-t border-slate-200 text-slate-600">💡 {q.explanation}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  }
  return null;
}