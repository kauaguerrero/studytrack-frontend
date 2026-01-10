"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const loadingStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  .animate-pulse-ring {
    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }
`;

export default function OnboardingTelefone() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  const [loadingMessage, setLoadingMessage] = useState("Conectando com a IA...");
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (step === 'processing') {
      const messages = [
        "Conectando com a IA...", 
        "Analisando seu perfil...",
        "Gerando plano de estudos...",
        "Buscando melhores recursos...", 
        "Montando cronograma personalizado...",
        "Organizando materiais...",
        "Curando conteúdo...", 
        "Finalizando..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Formatação simples de telefone enquanto digita
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Máscara simples (XX) XXXXX-XXXX
    if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    if (value.length > 10) {
      value = `${value.slice(0, 10)}-${value.slice(10)}`;
    }
    setPhone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStep('processing');

    try {
      // 1. Obter a sessão e o usuário ATUALIZADOS
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      // Variáveis corrigidas e definidas no escopo correto
      const user = session.user;
      const token = session.access_token;
      const cleanPhone = phone.replace(/\D/g, ""); // Remove formatação para enviar apenas números

      // Lógica para obter o nome do usuário (Metadata ou Fallback)
      const nomeUsuario = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Estudante";

      // Recupera dados do LocalStorage
      const planTier = localStorage.getItem('onboarding_plan') || 'free';
      const focusArea = localStorage.getItem('onboarding_goal') || 'geral';
      
      // Dados Pro
      const studyPace = localStorage.getItem('onboarding_pace') || 'moderate';
      const daysPerWeek = parseInt(localStorage.getItem('onboarding_days') || '5');
      const hoursPerDay = parseInt(localStorage.getItem('onboarding_hours') || '2');

      // Define a URL da API (Usa variável de ambiente ou localhost como fallback)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

      // 2. Primeira chamada: Completar Onboarding (Salvar dados no Backend)
      const responseOnboarding = await fetch(`${apiUrl}/api/auth/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          whatsapp_phone: cleanPhone,
          plan_tier: planTier,
          focus_area: focusArea,
          study_pace: studyPace,
          days_per_week: daysPerWeek,
          hours_per_day: hoursPerDay
        })
      });

      if (!responseOnboarding.ok) {
        const errorData = await responseOnboarding.json();
        throw new Error(errorData.error || "Falha ao salvar dados de onboarding");
      }

      // 3. Segunda chamada: Handshake do WhatsApp (Enviar mensagem de boas-vindas)
      await fetch(`${apiUrl}/api/auth/handshake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone, 
          name: nomeUsuario,
          userId: user.id
        })
      });

      // Limpeza do LocalStorage após sucesso
      localStorage.removeItem('onboarding_plan');
      localStorage.removeItem('onboarding_goal');
      localStorage.removeItem('onboarding_pace');
      localStorage.removeItem('onboarding_days');
      localStorage.removeItem('onboarding_hours');

      setStep('success');
      
      setTimeout(() => {
        router.refresh();
        router.push('portal/student/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error("Erro no processo de onboarding:", error);
      // Volta para o input em caso de erro para permitir tentar novamente
      setStep('input');
      alert(`Ocorreu um erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- TELA DE PROCESSAMENTO ---
  if (step === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden font-sans">
        <style>{loadingStyles}</style>
        
        {/* Fundo Decorativo */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full animate-float">
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-pulse-ring"></div>
             <div className="absolute inset-4 bg-blue-500 rounded-full opacity-20 animate-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
             <div className="relative bg-white p-6 rounded-full shadow-xl shadow-blue-500/20 z-10">
               <Brain className="w-12 h-12 text-blue-600 animate-pulse" />
             </div>
             <div className="absolute -top-2 right-0 animate-bounce" style={{ animationDuration: '3s' }}>
                <Sparkles className="w-6 h-6 text-yellow-400 fill-yellow-400" />
             </div>
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Criando seu Plano Personalizado
          </h2>
          <p className="text-slate-500 text-lg min-h-[30px] transition-all duration-500 ease-in-out font-medium">
            {loadingMessage}
          </p>
          
          <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-violet-600 w-1/2 animate-[shimmer_1.5s_infinite_linear]" style={{
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                backgroundSize: '200% 100%',
                width: '100%'
            }}></div>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA DE SUCESSO ---
  if (step === 'success') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
            <div className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/60 text-center animate-fade-in-up max-w-sm w-full border border-slate-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-[bounce_0.5s_ease-out]">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Tudo Pronto!</h2>
                <p className="text-slate-500 font-medium">Seu plano foi gerado com sucesso.</p>
                <p className="text-sm text-slate-400 mt-4">Redirecionando...</p>
            </div>
        </div>
    );
  }

  // --- TELA PRINCIPAL (INPUT) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      <div className="max-w-[480px] w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 p-8 md:p-12 border border-slate-100 relative overflow-hidden">
        
        {/* Elemento decorativo de fundo */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500"></div>

        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm shadow-blue-100">
            <Phone size={32} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            Quase lá!
          </h1>
          <p className="text-slate-500 text-lg leading-relaxed">
            Seu WhatsApp para receber o plano:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full px-5 h-14 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-lg text-slate-900 placeholder:text-slate-400 font-medium text-center tracking-wider"
              required
              maxLength={15}
            />
          </div>

          <button
            type="submit"
            disabled={loading || phone.length < 14}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              <>
                Confirmar e Acessar 
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-8 font-medium">
          Prometemos não enviar spam. Apenas conteúdo relevante.
        </p>
      </div>
    </div>
  );
}