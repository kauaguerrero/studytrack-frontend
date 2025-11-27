'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Target, ArrowRight, BookOpen, Stethoscope, Code, GraduationCap, 
  Lock, Sparkles, CheckCircle2 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingObjetivo() {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [planTier, setPlanTier] = useState<string>("free");
  
  const router = useRouter();
  const supabase = createClient();

  // Busca o plano do usuário ao carregar
  useEffect(() => {
    async function fetchUserTier() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.plan_tier) {
                setPlanTier(user.user_metadata.plan_tier);
            }
        } finally {
            setFetchingUser(false);
        }
    }
    fetchUserTier();
  }, []);

  const predefinedGoals = [
    { id: "Medicina", label: "Medicina", desc: "Foco em alta concorrência", icon: Stethoscope, color: "text-rose-500", bg: "bg-rose-50" },
    { id: "ENEM Geral", label: "ENEM Geral", desc: "Todas as áreas do conhecimento", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "TI", label: "Programação / TI", desc: "Lógica e Exatas aplicada", icon: Code, color: "text-violet-500", bg: "bg-violet-50" },
    { id: "Concurso", label: "Concurso Público", desc: "Direito e Raciocínio Lógico", icon: GraduationCap, color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  const isTrial = planTier === 'trial';
  const isPro = planTier === 'pro';

  const handleContinue = async () => {
    let finalGoal = selectedGoal === 'custom' ? customGoal : selectedGoal;
    
    // Se for Trial, forçamos o plano básico independente da seleção visual (fallback de segurança)
    if (isTrial) finalGoal = "Plano Básico (Trial)";

    if ((!finalGoal || (selectedGoal === 'custom' && !customGoal.trim())) && !isTrial) { 
        alert("Por favor, selecione ou digite um objetivo."); 
        return; 
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        data: { plan_goal: finalGoal } 
      });
      
      if (error) throw error;
      router.push('/onboarding/telefone');
      
    } catch (err: any) {
      console.error(err);
      alert("Erro ao salvar objetivo. Tente novamente.");
    } finally { 
      setLoading(false); 
    }
  };

  // State de Loading Inicial (Skeleton Screen) para evitar "piscada" de conteúdo
  if (fetchingUser) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="h-16 w-16 bg-slate-200 rounded-full"></div>
                <div className="h-6 w-48 bg-slate-200 rounded"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-3xl w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-8 md:p-12 relative overflow-hidden border border-slate-100">
        
        {/* Background Decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none opacity-50"></div>

        {/* Badge do Plano Atual */}
        <div className="absolute top-8 right-8 hidden sm:block">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border shadow-sm ${
                isPro 
                ? "bg-slate-900 text-white border-slate-900" 
                : isTrial 
                    ? "bg-orange-50 text-orange-600 border-orange-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
            }`}>
                {isPro && <Sparkles size={12} className="text-yellow-400" />}
                Plano: {planTier}
            </div>
        </div>

        {/* Cabeçalho */}
        <div className="text-center mb-10 mt-4">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-6 shadow-sm shadow-blue-100">
                <Target size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
                Qual é o seu foco?
            </h1>
            <p className="text-slate-500 text-lg max-w-lg mx-auto leading-relaxed">
                {isTrial 
                    ? "Para o período de teste, preparamos uma rotina essencial para você conhecer a metodologia."
                    : "Nossa IA vai criar um cronograma adaptado exatamente para sua necessidade."
                }
            </p>
        </div>

        <div className="space-y-6">
            
            {/* --- MODO TRIAL (Layout Simplificado) --- */}
            {isTrial ? (
                <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                    <div className="mb-4 inline-flex p-3 bg-white rounded-full shadow-sm text-slate-400">
                        <Lock size={24} />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg">Seleção Automática</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                        No plano Trial, definimos um objetivo padrão para demonstrar o potencial da plataforma.
                    </p>
                    <button 
                        onClick={() => setSelectedGoal("trial")}
                        className={`w-full py-4 px-6 rounded-xl border-2 flex items-center justify-between transition-all group cursor-default ${
                            selectedGoal === "trial" || !selectedGoal // Auto-selecionado visualmente
                            ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                            : "border-slate-200 bg-white"
                        }`}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <span className="block font-bold text-slate-800 text-lg">Rotina Básica (Demonstração)</span>
                                <span className="text-slate-500 text-sm">Matemática, Português e Atualidades</span>
                            </div>
                        </div>
                        <div className="h-6 w-6 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white" />
                        </div>
                    </button>
                </div>
            ) : (
                /* --- MODO PADRÃO (Grid de Cards) --- */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predefinedGoals.map((goal) => {
                        const isSelected = selectedGoal === goal.id;
                        return (
                            <button 
                                key={goal.id} 
                                onClick={() => setSelectedGoal(goal.id)} 
                                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-200 group hover:-translate-y-1 hover:shadow-lg ${
                                    isSelected 
                                    ? `border-blue-600 bg-blue-50/30 shadow-md ring-1 ring-blue-500/20` 
                                    : 'border-slate-100 bg-white hover:border-blue-200'
                                }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2.5 rounded-xl ${goal.bg} ${goal.color} transition-transform group-hover:scale-110`}>
                                        <goal.icon size={24} strokeWidth={2.5} />
                                    </div>
                                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isSelected ? "border-blue-600 bg-blue-600" : "border-slate-200"
                                    }`}>
                                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                    </div>
                                </div>
                                <div>
                                    <span className={`block font-bold text-lg mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                        {goal.label}
                                    </span>
                                    <span className="text-sm text-slate-500 font-medium">
                                        {goal.desc}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* --- SEÇÃO PERSONALIZADA (Bloqueada para não-PRO) --- */}
            {!isTrial && (
                <div className={`relative mt-6 rounded-2xl transition-all duration-300 overflow-hidden ${
                    isPro 
                    ? `p-1 ${selectedGoal === 'custom' ? 'bg-gradient-to-r from-blue-500 to-violet-500 shadow-md' : 'bg-slate-100'}` 
                    : 'p-6 border-2 border-dashed border-slate-200 bg-slate-50/50'
                }`}>
                    
                    {/* Overlay de Bloqueio (Vidro Fosco) */}
                    {!isPro && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 cursor-not-allowed">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-xl transform hover:scale-105 transition-transform">
                                <Lock size={14} /> Exclusivo Plano Pro
                            </div>
                            <p className="text-xs text-slate-500 mt-2 font-medium">Personalize 100% seu cronograma</p>
                        </div>
                    )}

                    <div className={`bg-white rounded-xl p-5 ${!isPro ? 'opacity-50' : ''}`}>
                        <label className="flex items-center gap-3 mb-4 cursor-pointer group">
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                selectedGoal === 'custom' && isPro ? "border-blue-600 bg-blue-600" : "border-slate-300 group-hover:border-blue-400"
                            }`}>
                                <input 
                                    type="radio" 
                                    checked={selectedGoal === 'custom'} 
                                    onChange={() => isPro && setSelectedGoal('custom')} 
                                    disabled={!isPro} 
                                    className="hidden"
                                />
                                {selectedGoal === 'custom' && isPro && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold text-lg ${selectedGoal === 'custom' ? 'text-slate-900' : 'text-slate-600'}`}>
                                    Objetivo Personalizado
                                </span>
                                {isPro && <span className="px-2 py-0.5 bg-gradient-to-r from-violet-100 to-blue-100 text-violet-700 text-[10px] font-bold uppercase rounded-full tracking-wide border border-violet-200">IA Power</span>}
                            </div>
                        </label>
                        
                        <input 
                            type="text" 
                            disabled={!isPro || selectedGoal !== 'custom'} 
                            value={customGoal} 
                            onChange={(e) => setCustomGoal(e.target.value)} 
                            placeholder="Ex: Quero aprender Mandarim básico em 1 semana..." 
                            className={`w-full px-4 py-3.5 rounded-xl border outline-none transition-all text-slate-800 placeholder:text-slate-400 font-medium ${
                                selectedGoal === 'custom' && isPro
                                ? 'border-blue-200 bg-blue-50/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10' 
                                : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                            }`}
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="mt-10">
            <button 
                onClick={handleContinue} 
                disabled={loading || (!selectedGoal && !isTrial)} 
                className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/20 hover:shadow-blue-600/30 hover:-translate-y-1 active:translate-y-0"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Salvando Preferências...</span>
                    </>
                ) : (
                    <>
                        <span>Gerar Meu Plano</span>
                        <ArrowRight size={20} />
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
}