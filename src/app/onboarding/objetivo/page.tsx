"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Target, ArrowRight, Zap, Calendar, Clock, Crown, CheckCircle2, Lock, Star 
} from "lucide-react";

export default function OnboardingObjetivo() {
  // Estados Gerais
  const [planTier, setPlanTier] = useState<'free' | 'basic' | 'pro'>('free');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  
  // Estados PRO (Ritmo e Frequência)
  const [pace, setPace] = useState<'slow' | 'moderate' | 'intense'>('moderate');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const router = useRouter();

  useEffect(() => {
    // Recupera o plano escolhido na etapa anterior
    const storedPlan = localStorage.getItem('onboarding_plan');
    
    console.log("Plano recuperado:", storedPlan); // Debug no console

    if (storedPlan === 'pro') {
        setPlanTier('pro');
    } else if (storedPlan === 'basic' || storedPlan === 'standard') {
        setPlanTier('basic'); 
    } else {
        // Fallback para Free
        setPlanTier('free');
        setSelectedGoal('enem_geral');
    }
  }, []);

  const handleContinue = () => {
    if (!selectedGoal && planTier !== 'free') return;

    // Salva configurações
    const finalGoal = planTier === 'free' ? 'enem_geral' : selectedGoal;
    localStorage.setItem('onboarding_goal', finalGoal || 'enem_geral');
    
    // Salva configurações PRO apenas se for Pro
    if (planTier === 'pro') {
        localStorage.setItem('onboarding_pace', pace);
        localStorage.setItem('onboarding_days', daysPerWeek.toString());
        localStorage.setItem('onboarding_hours', hoursPerDay.toString());
    } else {
        // Limpa configs antigas para evitar sujeira
        localStorage.removeItem('onboarding_pace');
        localStorage.removeItem('onboarding_days');
        localStorage.removeItem('onboarding_hours');
    }

    router.push('/onboarding/telefone');
  };

  const goals = [
    { id: "enem_geral", label: "ENEM Geral", desc: "Todas as áreas (Padrão)", icon: "📚", freeAllowed: true },
    { id: "enem_exatas", label: "Foco Exatas", desc: "Engenharia/TI", icon: "📐", freeAllowed: false },
    { id: "enem_humanas", label: "Foco Humanas", desc: "Direito/História", icon: "⚖️", freeAllowed: false },
    { id: "enem_saude", label: "Foco Saúde", desc: "Biologia/Química", icon: "🧬", freeAllowed: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 relative">
      
      {/* Badge de Debug do Plano (Canto Superior Direito) */}
      <div className="absolute top-6 right-6 hidden md:block">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
            planTier === 'pro' ? 'bg-slate-900 text-yellow-400 border-slate-900' :
            planTier === 'basic' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            'bg-slate-200 text-slate-500 border-slate-300'
        }`}>
            Plano Atual: {planTier}
        </span>
      </div>

      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative overflow-hidden">
        
        {/* Decoração de fundo sutil */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-violet-500 to-orange-500"></div>

        <div className="text-center mb-8 mt-4">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4 shadow-sm shadow-blue-100">
                <Target size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                {planTier === 'free' ? 'Seu Plano Básico' : 'Personalize seu Foco'}
            </h1>
            <p className="text-slate-500">
                {planTier === 'free' 
                    ? "No plano gratuito, você tem acesso ao cronograma essencial para o ENEM." 
                    : "Vamos direcionar os estudos para sua área de maior peso."}
            </p>
        </div>

        {/* SELEÇÃO DE OBJETIVO (GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {goals.map((g) => {
                const isLocked = planTier === 'free' && !g.freeAllowed;
                const isSelected = selectedGoal === g.id;

                return (
                    <button
                        key={g.id}
                        disabled={isLocked}
                        onClick={() => setSelectedGoal(g.id)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 group ${
                            isSelected
                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500 shadow-md' 
                            : isLocked 
                                ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' 
                                : 'border-slate-100 hover:border-slate-300 bg-white hover:shadow-sm'
                        }`}
                    >
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                            <strong className={`block ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{g.label}</strong>
                            <span className="text-xs text-slate-500">{g.desc}</span>
                        </div>
                        
                        {/* Ícones de Estado */}
                        {isSelected && <CheckCircle2 className="ml-auto text-blue-600" size={18} />}
                        {isLocked && <Lock className="ml-auto text-slate-400" size={16} />}
                        
                        {/* Badge 'Apenas Basic/Pro' */}
                        {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
                                    <Star size={10} className="text-yellow-400" /> Basic+
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>

        {/* MENSAGEM PLANO FREE */}
        {planTier === 'free' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex gap-3 items-start animate-fade-in-up">
                <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm"><Target size={16}/></div>
                <div>
                    <h4 className="font-bold text-sm text-blue-900">Modo Geral Ativado</h4>
                    <p className="text-xs text-blue-700 mt-1">
                        O plano Free foca nas competências gerais. Para escolher áreas específicas (Exatas, Saúde), faça um upgrade.
                    </p>
                </div>
            </div>
        )}

        {/* AJUSTE FINO (APENAS PRO - ESTRITAMENTE 'pro') */}
        {planTier === 'pro' && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 relative overflow-hidden animate-fade-in-up shadow-xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Crown size={120} />
                </div>
                
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                    <Crown size={20} className="text-yellow-400" /> 
                    Engenharia de Estudo (Pro)
                </h3>

                <div className="space-y-6 relative z-10">
                    {/* Ritmo */}
                    <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                            <Zap size={16} className="text-blue-400"/> Ritmo de Estudo
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'slow', label: 'Leve', desc: 'Relaxado' }, 
                                { id: 'moderate', label: 'Médio', desc: 'Constante' }, 
                                { id: 'intense', label: 'Intenso', desc: 'Hardcore' }
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setPace(p.id as any)}
                                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                                        pace === p.id 
                                        ? 'bg-white text-slate-900 border-white font-bold shadow-md' 
                                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                                    }`}
                                >
                                    <div className="text-sm">{p.label}</div>
                                    <div className="text-[10px] opacity-70">{p.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Dias por Semana */}
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                                <Calendar size={16} className="text-blue-400"/> Dias / Semana
                            </label>
                            <input 
                                type="range" min="1" max="7" step="1" 
                                value={daysPerWeek}
                                onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />
                            <div className="text-right font-bold text-blue-400 mt-1">{daysPerWeek} dias</div>
                        </div>

                        {/* Horas por Dia */}
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                                <Clock size={16} className="text-blue-400"/> Horas / Dia
                            </label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setHoursPerDay(Math.max(1, hoursPerDay - 1))} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">-</button>
                                <span className="font-bold text-xl min-w-[1.5rem] text-center">{hoursPerDay}h</span>
                                <button onClick={() => setHoursPerDay(Math.min(12, hoursPerDay + 1))} className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center hover:bg-slate-600 transition-colors">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <button 
            onClick={handleContinue}
            disabled={!selectedGoal && planTier !== 'free'}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0"
        >
            {planTier === 'free' ? 'Confirmar Plano Básico' : 'Finalizar Personalização'} <ArrowRight size={20}/>
        </button>

      </div>
    </div>
  );
}