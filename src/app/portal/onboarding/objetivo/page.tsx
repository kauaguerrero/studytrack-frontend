"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Target, ArrowRight, Zap, Calendar, Clock, Crown, CheckCircle2, Lock, Star 
} from "lucide-react";

export default function OnboardingObjetivo() {
  const [planTier, setPlanTier] = useState<'free' | 'basic' | 'pro'>('free');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Evita flash de conteúdo incorreto
  
  // Estados PRO
  const [pace, setPace] = useState<'slow' | 'moderate' | 'intense'>('moderate');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(2);

  const router = useRouter();

  useEffect(() => {
    const storedPlan = localStorage.getItem('onboarding_plan');
    
    // Normaliza o plano
    let currentPlan: 'free' | 'basic' | 'pro' = 'free';
    if (storedPlan === 'pro') currentPlan = 'pro';
    else if (storedPlan === 'basic' || storedPlan === 'standard') currentPlan = 'basic';
    
    setPlanTier(currentPlan);

    // Pré-seleção para Free
    if (currentPlan === 'free') {
        setSelectedGoal('enem_geral');
    }
    
    setIsLoaded(true);
  }, []);

  const handleContinue = () => {
    // Validação
    if (planTier !== 'free' && !selectedGoal) {
        alert("Por favor, selecione uma área de foco.");
        return;
    }

    // Salva configurações
    const finalGoal = planTier === 'free' ? 'enem_geral' : selectedGoal;
    localStorage.setItem('onboarding_goal', finalGoal || 'enem_geral');
    
    // Salva configurações PRO apenas se realmente for Pro
    if (planTier === 'pro') {
        localStorage.setItem('onboarding_pace', pace);
        localStorage.setItem('onboarding_days', daysPerWeek.toString());
        localStorage.setItem('onboarding_hours', hoursPerDay.toString());
    } else {
        localStorage.removeItem('onboarding_pace');
        localStorage.removeItem('onboarding_days');
        localStorage.removeItem('onboarding_hours');
    }

    router.push('/portal/onboarding/telefone');
  };

  const goals = [
    { id: "enem_geral", label: "ENEM Geral", desc: "Todas as áreas (Padrão)", icon: "📚", freeAllowed: true },
    { id: "enem_exatas", label: "Foco Exatas", desc: "Engenharia/TI", icon: "📐", freeAllowed: false },
    { id: "enem_humanas", label: "Foco Humanas", desc: "Direito/História", icon: "⚖️", freeAllowed: false },
    { id: "enem_saude", label: "Foco Saúde", desc: "Biologia/Química", icon: "🧬", freeAllowed: false },
  ];

  if (!isLoaded) return null; // Ou um spinner de loading

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 md:p-12 relative">
        
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                <Target size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
                {planTier === 'free' ? 'Plano Gratuito' : planTier === 'basic' ? 'Escolha seu Foco' : 'Personalização Pro'}
            </h1>
            <p className="text-slate-500">
                {planTier === 'free' 
                    ? "Acesso ao cronograma essencial para o ENEM." 
                    : "Vamos direcionar os estudos para sua área de maior peso."}
            </p>
        </div>

        {/* GRID DE OBJETIVOS */}
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
                            ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-500' 
                            : isLocked 
                                ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed' 
                                : 'border-slate-100 hover:border-slate-300 bg-white'
                        }`}
                    >
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                            <strong className={`block ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{g.label}</strong>
                            <span className="text-xs text-slate-500">{g.desc}</span>
                        </div>
                        
                        {isSelected && <CheckCircle2 className="ml-auto text-blue-600" size={18} />}
                        {isLocked && <Lock className="ml-auto text-slate-400" size={16} />}
                    </button>
                );
            })}
        </div>

        {/* BLOCO EXCLUSIVO PRO */}
        {planTier === 'pro' && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl mb-8 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Crown size={120} />
                </div>
                
                <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                    <Crown size={20} className="text-yellow-400" /> 
                    Ajuste Fino (Pro)
                </h3>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
                            <Zap size={16}/> Ritmo
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Leve', 'Médio', 'Intenso'].map((label, i) => {
                                const val = ['slow', 'moderate', 'intense'][i] as any;
                                return (
                                    <button
                                        key={val}
                                        onClick={() => setPace(val)}
                                        className={`py-2 rounded-lg border text-sm ${pace === val ? 'bg-white text-slate-900 font-bold' : 'border-slate-700 text-slate-400'}`}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-sm text-slate-300 block mb-2"><Calendar size={14} className="inline mr-1"/> Dias/Sem</label>
                            <div className="font-bold text-xl text-blue-400 bg-slate-800 p-3 rounded-lg text-center">
                                {daysPerWeek}
                            </div>
                            <input type="range" min="1" max="7" value={daysPerWeek} onChange={e => setDaysPerWeek(parseInt(e.target.value))} className="w-full mt-2 accent-blue-500"/>
                        </div>
                        <div className="flex-1">
                            <label className="text-sm text-slate-300 block mb-2"><Clock size={14} className="inline mr-1"/> Horas/Dia</label>
                            <div className="font-bold text-xl text-blue-400 bg-slate-800 p-3 rounded-lg text-center">
                                {hoursPerDay}h
                            </div>
                            <input type="range" min="1" max="12" value={hoursPerDay} onChange={e => setHoursPerDay(parseInt(e.target.value))} className="w-full mt-2 accent-blue-500"/>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <button 
            onClick={handleContinue}
            disabled={!selectedGoal && planTier !== 'free'}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
            Continuar <ArrowRight size={20}/>
        </button>

      </div>
    </div>
  );
}