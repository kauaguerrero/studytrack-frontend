'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bot, Sparkles, Loader2, AlertCircle, BrainCircuit } from 'lucide-react';

interface AiFactoryProps {
  onQuestionGenerated: (question: any) => void;
}

export function AiQuestionFactory({ onQuestionGenerated }: AiFactoryProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    
    setLoading(true);
    setError('');

    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        // CORREÇÃO CRÍTICA: Remove a formatação markdown que estava quebrando a URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        
        const res = await fetch(`${apiUrl}/api/enterprise/assessment/questions/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ 
                topic, 
                difficulty
            })
        });

        const data = await res.json();
        
        if (!res.ok) {
            // Exibe mensagem de erro amigável se vier do backend
            throw new Error(data.error || "Erro desconhecido na geração");
        }

        if (data.success) {
            onQuestionGenerated(data.question);
        } else {
            setError(data.error || "Erro ao processar resposta");
        }
    } catch (err: any) {
        console.error("Erro AI:", err);
        setError(err.message || "Falha de conexão com o servidor de IA.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 mt-8 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header com Gradiente */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={120} />
            </div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                    <Bot size={32} className="text-white" />
                </div>
                <div>
                    <h4 className="text-2xl font-bold">Assistente Pedagógico IA</h4>
                    <p className="text-purple-100 text-lg font-medium opacity-90">Descreva o tema e a IA criará uma questão inédita para você.</p>
                </div>
            </div>
        </div>

        <div className="p-8 md:p-10 space-y-8">
            {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} className="shrink-0" />
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <label className="block text-base font-bold text-slate-800 uppercase tracking-wide">
                    Sobre o que é a questão?
                </label>
                <textarea 
                    autoFocus
                    className="w-full p-5 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:bg-purple-50/30 focus:ring-4 focus:ring-purple-100 outline-none h-40 resize-none text-lg text-slate-700 transition-all placeholder:text-slate-400"
                    placeholder="Ex: Crie uma questão sobre a 2ª Lei de Newton aplicada a um bloco em plano inclinado, exigindo decomposição de vetores e cálculo da força normal..."
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    disabled={loading}
                />
            </div>

            <div className="space-y-3">
                <label className="block text-base font-bold text-slate-800 uppercase tracking-wide">Nível de Dificuldade</label>
                <div className="flex gap-4 md:gap-6">
                    {['Fácil', 'Médio', 'Difícil'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            disabled={loading}
                            className={`
                                flex-1 py-4 px-4 rounded-xl font-bold border-2 transition-all transform active:scale-95 text-lg
                                ${difficulty === level 
                                    ? 'border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105' 
                                    : 'border-slate-200 bg-white text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50'}
                            `}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="pt-4">
                <button 
                    onClick={handleGenerate} 
                    disabled={loading || !topic.trim()}
                    className="w-full py-5 bg-slate-900 text-white text-lg font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1"
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" size={24}/> Criando Questão...</>
                    ) : (
                        <><Sparkles size={24} className="text-purple-300"/> Gerar com Inteligência Artificial</>
                    )}
                </button>
            </div>
        </div>
    </div>
  );
}