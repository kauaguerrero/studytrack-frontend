'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Loader2, Brain, CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// --- Estilos para animações personalizadas ---
const loadingStyles = `
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  .animate-pulse-ring {
    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

export default function OnboardingTelefone() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
  const [loadingMessage, setLoadingMessage] = useState("Conectando com a IA...");
  
  const router = useRouter();
  const supabase = createClient();

  // Ciclo de mensagens para entreter o usuário durante o loading
  useEffect(() => {
    if (step === 'processing') {
      const messages = [
        "Conectando com a IA...",
        "Analisando seu perfil de estudante...",
        "Curando os melhores vídeos do YouTube...",
        "Montando seu cronograma personalizado...",
        "Quase lá, finalizando os detalhes..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStep('processing'); // Muda para a tela de loading

    try {
      // 1. Pegar a SESSÃO atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      const token = session.access_token;
      const cleanPhone = phone.replace(/\D/g, "");

      // 3. Chamar Backend Flask
      const response = await fetch('http://127.0.0.1:5000/api/auth/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          whatsapp_phone: cleanPhone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao salvar no backend");
      }

      // 4. Sucesso! Mostra tela de conclusão rápida antes de redirecionar
      setStep('success');
      setTimeout(() => {
        router.refresh();
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
      setStep('input'); // Volta para o input em caso de erro
    } finally {
      setLoading(false);
    }
  };

  // --- TELA DE PROCESSAMENTO (CÉREBRO PENSANDO) ---
  if (step === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
        <style>{loadingStyles}</style>
        
        {/* Background decorativo */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
          {/* Animação Central */}
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-pulse-ring"></div>
            <div className="absolute inset-2 bg-blue-500 rounded-full opacity-20 animate-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
            <div className="relative bg-white p-6 rounded-full shadow-xl shadow-blue-500/20 z-10">
               <Brain className="w-12 h-12 text-blue-600 animate-pulse" />
            </div>
            {/* Ícones flutuantes orbitando (opcional/simples) */}
            <div className="absolute -top-4 right-0 animate-bounce" style={{ animationDuration: '3s' }}><Sparkles className="w-6 h-6 text-yellow-400" /></div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Criando seu Plano</h2>
          <p className="text-slate-500 text-lg min-h-[30px] transition-all duration-500 ease-in-out">
            {loadingMessage}
          </p>

          {/* Barra de Progresso Infinita */}
          <div className="w-64 h-2 bg-slate-200 rounded-full mt-8 overflow-hidden">
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
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full animate-fade-in-up transform scale-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Tudo Pronto!</h2>
                <p className="text-slate-500">Seu plano foi gerado com sucesso. Vamos estudar!</p>
            </div>
        </div>
    );
  }

  // --- TELA DE INPUT (PADRÃO) ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Phone size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quase lá!</h1>
          <p className="text-slate-500 mt-2">
            Para o StudyTrack funcionar, precisamos do seu WhatsApp para enviar as atividades.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seu WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          >
            Confirmar e Acessar <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}