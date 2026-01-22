'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, XCircle, Loader2, AlertCircle, Inbox } from 'lucide-react';

export default function AdminQuestionApproval() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    
    try {
        const res = await fetch(`${apiUrl}/api/enterprise/assessment/admin/questions/pending`, {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            setQuestions(data.data || []);
        }
    } catch (e) {
        console.error("Erro ao buscar pendentes", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    
    try {
        const res = await fetch(`${apiUrl}/api/enterprise/assessment/admin/questions/${id}/${action}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });

        if (res.ok) {
            setQuestions(prev => prev.filter(q => q.id !== id));
        } else {
            alert("Erro ao processar ação.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão.");
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
        <div className="max-w-6xl mx-auto space-y-8">
            
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Moderação de Questões</h1>
                    <p className="text-slate-500 mt-2">Valide questões criadas por professores antes de entrarem no banco global.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                    {questions.length} Pendentes
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" size={32}/></div>
            ) : questions.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-slate-500 flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Inbox size={32} className="text-slate-400"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Tudo limpo!</h3>
                    <p>Nenhuma questão aguardando aprovação no momento.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {questions.map(q => (
                        <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-2">
                            {/* Conteúdo da Questão */}
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2 items-center">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{q.subject}</span>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">{q.difficulty}</span>
                                    {q.is_ai_generated && <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-bold uppercase border border-purple-200">IA</span>}
                                    <span className="text-xs text-slate-400 font-mono ml-auto">ID: {q.external_id}</span>
                                </div>
                                
                                {q.context && (
                                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border-l-4 border-slate-300">
                                        {q.context}
                                    </div>
                                )}
                                
                                <p className="font-medium text-lg text-slate-800 leading-relaxed">
                                    {q.alternatives_intro || q.statement}
                                </p>
                                
                                {/* Gabarito Miniatura */}
                                <div className="flex gap-2 pt-2">
                                    {q.alternatives && q.alternatives.map((alt: any) => (
                                        <div key={alt.letter} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${alt.letter === q.correct_alternative ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                            {alt.letter}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex flex-row md:flex-col justify-center gap-3 md:border-l md:pl-6 border-slate-100 min-w-[160px]">
                                <button 
                                    onClick={() => handleAction(q.id, 'approve')}
                                    disabled={!!processingId}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                                >
                                    {processingId === q.id ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                                    Aprovar
                                </button>
                                <button 
                                    onClick={() => handleAction(q.id, 'reject')}
                                    disabled={!!processingId}
                                    className="flex-1 bg-white border border-red-200 text-red-600 font-bold py-3 px-4 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                                >
                                    <XCircle size={18}/>
                                    Rejeitar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}