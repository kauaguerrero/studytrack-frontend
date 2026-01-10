"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { School, KeyRound, Search, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function TeacherSchoolValidation() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'code' | 'search'>('code');
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const handleValidation = async () => {
    setIsLoading(true);
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não logado");

        if (mode === 'code') {
            const { data: school, error: schoolError } = await supabase
                .from('schools')
                .select('id, name')
                .eq('invite_code', schoolCode)
                .single();

            if (schoolError || !school) {
                alert("Código de escola inválido ou não encontrado.");
                setIsLoading(false);
                return;
            }

            // Atualiza role e school_id
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    school_id: school.id,
                    role: 'teacher' // REFORÇA O ROLE AQUI
                })
                .eq('id', user.id);

            if (updateError) throw updateError;
            
            alert(`Bem-vindo(a) ao ${school.name}!`);
            
            // --- CORREÇÃO DO CACHE DE LAYOUT ---
            router.refresh(); // Força o layout a buscar o novo role
            router.push('/portal/teacher'); 
            
        } else {
            if (schoolName.length < 3) {
                alert("Digite o nome da escola corretamente.");
                setIsLoading(false);
                return;
            }

            const { error: requestError } = await supabase
                .from('access_requests')
                .insert({ 
                    user_id: user.id, 
                    school_name_typed: schoolName,
                    status: 'pending'
                });

            if (requestError) throw requestError;
            
            router.push('/portal/onboarding/teacher/pending');
        }

    } catch (error: any) {
        console.error(error);
        alert("Erro ao processar: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="mb-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                <School size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Vincule sua Escola</h1>
            <p className="text-slate-500 mt-2">Para acessar o painel docente, precisamos validar seu vínculo com uma instituição parceira.</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
                onClick={() => setMode('code')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'code' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
                Tenho Código
            </button>
            <button 
                onClick={() => setMode('search')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'search' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
                Não tenho Código
            </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
            {mode === 'code' ? (
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 block">Código de Convite</label>
                    <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Ex: PROF-2025"
                            className="w-full pl-12 pr-4 h-14 rounded-xl border-2 border-slate-200 outline-none focus:border-blue-500 focus:bg-blue-50/20 text-lg font-mono uppercase tracking-widest transition-all"
                            value={schoolCode}
                            onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <p className="text-xs text-slate-400 flex gap-1">
                        <AlertCircle size={12} className="mt-0.5" />
                        Este código é fornecido pelo gestor da sua escola.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-700 block">Nome da Instituição</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            placeholder="Digite o nome da escola..."
                            className="w-full pl-12 pr-4 h-14 rounded-xl border-2 border-slate-200 outline-none focus:border-blue-500 focus:bg-blue-50/20 text-lg transition-all"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                        />
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                        Sua solicitação será enviada para análise da nossa equipe e do gestor da escola.
                    </p>
                </div>
            )}
        </div>

        <button
            onClick={handleValidation}
            disabled={isLoading || (mode === 'code' ? !schoolCode : !schoolName)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-900/20"
        >
            {isLoading ? (
                <>
                    <Loader2 className="animate-spin" /> Processando...
                </>
            ) : (
                <>
                    {mode === 'code' ? 'Validar Acesso' : 'Solicitar Acesso'} 
                    <ArrowRight size={20} />
                </>
            )}
        </button>
        
        <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-300">Dev Hint: Use o código <strong>PROF-2025</strong> para testar.</p>
        </div>

      </div>
    </div>
  );
}