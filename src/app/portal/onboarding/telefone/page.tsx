"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, Brain, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { reportError } from '@/lib/reportError';

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
  // Removido o 'success' para evitar tela intermediária
  const [step, setStep] = useState<'input' | 'processing'>('input');
  const [loadingMessage, setLoadingMessage] = useState("Conectando com a IA...");
  const [termsAccepted, setTermsAccepted] = useState(false);

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

      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        throw new Error("Número inválido. Digite um celular com DDD, ex: (11) 99999-9999");
      }

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
          hours_per_day: hoursPerDay,
          terms_accepted: termsAccepted,
          terms_version: "1.0",
        })
      });

      if (!responseOnboarding.ok) {
        const errorData = await responseOnboarding.json();
        throw new Error(errorData.error || "Falha ao salvar dados de onboarding");
      }

      // 3. Segunda chamada: Handshake do WhatsApp
      // Nota: Se a API retornar 405 ou erro aqui, seguimos mesmo assim para a página de handshake
      // pois o usuário pode validar manualmente lá.
      try {
        await fetch(`${apiUrl}/api/auth/handshake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            phone: cleanPhone,
            name: nomeUsuario,
            userId: user.id
          })
        });
      } catch (handshakeError) {
        console.warn("Erro no disparo do handshake (não bloqueante):", handshakeError);
      }

      // Limpeza do LocalStorage após sucesso
      localStorage.removeItem('onboarding_plan');
      localStorage.removeItem('onboarding_goal');
      localStorage.removeItem('onboarding_pace');
      localStorage.removeItem('onboarding_days');
      localStorage.removeItem('onboarding_hours');

      // 4. Redirecionamento IMEDIATO para o Check-Handshake
      // Refresh garante que o middleware pegue o novo status do usuário
      router.refresh();
      router.push('/portal/onboarding/handshake');

    } catch (error: any) {
      console.error("Erro no processo de onboarding:", error);
      await reportError("OnboardingTelefoneError", String(error), { flow: "onboarding_telefone" });
      setStep('input'); // Volta para input apenas se der erro fatal no passo 2
      setLoading(false);
      alert(`Ocorreu um erro: ${error.message}`);
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

          {/* Aceite de Termos de Uso */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="peer sr-only"
                required
              />
              <div className="w-5 h-5 rounded-md border-2 border-slate-200 bg-slate-50 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                {termsAccepted && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-500 leading-relaxed">
              Li e aceito os{" "}
              <a
                href="/termos-de-uso"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                onClick={(e) => e.stopPropagation()}
              >
                Termos de Uso e Política de Privacidade
              </a>
              , incluindo o uso dos meus dados para personalização do plano de estudos.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || phone.length < 14 || !termsAccepted}
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

        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          🔒 Seus dados são protegidos e nunca compartilhados com terceiros.
        </p>
      </div>
    </div>
  );
}