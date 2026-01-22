'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bot, Sparkles, Loader2, AlertCircle } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                <Bot size={24} />
            </div>
            <div>
                <h4 className="text-xl font-bold text-slate-900">Assistente Gemini</h4>
                <p className="text-sm text-slate-500">Descreva o tema e a IA criará uma questão inédita.</p>
            </div>
        </div>
        
        {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                {error}
            </div>
        )}

        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tópico ou Habilidade</label>
            <textarea 
                autoFocus
                className="w-full p-4 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none h-32 resize-none text-base transition-all placeholder:text-slate-400"
                placeholder="Ex: Crie uma questão sobre a 2ª Lei de Newton aplicada a um bloco em plano inclinado, exigindo decomposição de vetores..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                disabled={loading}
            />
        </div>

        <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nível de Dificuldade</label>
            <div className="flex gap-3">
                {['Fácil', 'Médio', 'Difícil'].map((level) => (
                    <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        disabled={loading}
                        className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
                            difficulty === level 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-slate-200 bg-white text-slate-500 hover:border-purple-200 hover:text-purple-600'
                        }`}
                    >
                        {level}
                    </button>
                ))}
            </div>
        </div>
        
        <button 
            onClick={handleGenerate} 
            disabled={loading || !topic.trim()}
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
            {loading ? (
                <><Loader2 className="animate-spin" size={20}/> Gerando Questão...</>
            ) : (
                <><Sparkles size={20} className="text-purple-300"/> Gerar com Inteligência Artificial</>
            )}
        </button>
    </div>
  );
}