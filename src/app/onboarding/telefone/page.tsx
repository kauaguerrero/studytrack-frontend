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
      const messages = ["Conectando com a IA...", "Analisando seu perfil...", "Curando conteúdo...", "Finalizando..."];
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
    setStep('processing');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Sessão expirada.");

      const token = session.access_token;
      const cleanPhone = phone.replace(/\D/g, "");

      // Recupera dados do LocalStorage
      const planTier = localStorage.getItem('onboarding_plan') || 'free';
      const focusArea = localStorage.getItem('onboarding_goal') || 'geral';
      
      // Dados Pro
      const studyPace = localStorage.getItem('onboarding_pace') || 'moderate';
      const daysPerWeek = parseInt(localStorage.getItem('onboarding_days') || '5');
      const hoursPerDay = parseInt(localStorage.getItem('onboarding_hours') || '2');

      // Envia para o Backend
      const response = await fetch('http://127.0.0.1:5000/api/auth/onboarding/complete', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha no backend");
      }

      // Limpeza
      localStorage.removeItem('onboarding_plan');
      localStorage.removeItem('onboarding_goal');
      localStorage.removeItem('onboarding_pace');
      localStorage.removeItem('onboarding_days');
      localStorage.removeItem('onboarding_hours');

      setStep('success');
      setTimeout(() => {
        router.refresh();
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error("Erro:", error);
      alert(`Erro: ${error.message}`);
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
        <style>{loadingStyles}</style>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-pulse-ring"></div>
             <Brain className="w-12 h-12 text-blue-600 animate-pulse relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Gerando seu Plano</h2>
          <p className="text-slate-500 text-lg">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center animate-fade-in-up">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900">Tudo Pronto!</h2>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Phone size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quase lá!</h1>
          <p className="text-slate-500 mt-2">Seu WhatsApp para receber o plano:</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin"/> : "Confirmar e Acessar"} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}