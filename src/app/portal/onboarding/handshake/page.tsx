"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, CheckCircle2, Loader2, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingHandshake() {
  const [step, setStep] = useState<'loading_token' | 'error' | 'waiting_click' | 'verifying' | 'success'>('loading_token');
  const [token, setToken] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [botNumber] = useState("5516993118146"); // Pode vir de ENV
  const router = useRouter();
  const supabase = createClient();

  // Função isolada para poder ser chamada no botão "Tentar Novamente"
  const fetchToken = useCallback(async () => {
    setStep('loading_token');
    setErrorMessage("");

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Sessão inválida:", sessionError);
        router.push("/login"); // Redireciona se não estiver logado
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      
      console.log("Tentando conectar em:", `${apiUrl}/api/auth/start-handshake`);

      const response = await fetch(`${apiUrl}/api/auth/start-handshake`, {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId: session.user.id })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.token) {
          setToken(data.token);
          setStep('waiting_click');
      } else {
          throw new Error("API não retornou um token válido.");
      }

    } catch (e: any) {
      console.error("Erro crítico ao gerar token:", e);
      setErrorMessage(e.message || "Erro desconhecido ao comunicar com o servidor.");
      setStep('error');
    }
  }, [router, supabase.auth]);

  // 1. Gera ou Busca o Token ao Iniciar
  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // 2. Polling para verificar se o Webhook processou
  useEffect(() => {
    if (step !== 'waiting_click' && step !== 'verifying') return;

    const interval = setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // IMPORTANTE: Agora buscamos também a 'role' para o redirect correto
        const { data: profile } = await supabase
            .from('profiles')
            .select('handshake_completed, whatsapp_phone, role')
            .eq('id', user.id)
            .single();

        if (profile?.handshake_completed && profile?.whatsapp_phone) {
            clearInterval(interval);
            setStep('success');

            // Lógica de Redirecionamento Dinâmico baseada no cargo (role)
            setTimeout(() => {
                const role = profile.role || 'student';
                
                // Mapeamento de rotas por tipo de usuário
                const dashboardRoutes: Record<string, string> = {
                    student: "/portal/student/dashboard",
                    teacher: "/portal/teacher/dashboard",
                    manager: "/portal/school/dashboard",
                    admin: "/portal/admin",
                };

                const targetRoute = dashboardRoutes[role] || "/portal/student/dashboard";
                
                // Usando window.location para garantir refresh completo dos menus/sidebar
                window.location.href = targetRoute;
            }, 2000);
        }
    }, 3000); // Checa a cada 3s

    return () => clearInterval(interval);
  }, [step, supabase]);

  // URL Mágica do WhatsApp
  const whatsappUrl = `https://wa.me/${botNumber}?text=CONECTAR-${token}`;

  // --- UI DE SUCESSO ---
  if (step === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 animate-in fade-in zoom-in duration-500">
        <div className="bg-white p-10 rounded-[2rem] shadow-xl text-center border border-slate-100 max-w-sm w-full">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200/50">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Conectado!</h1>
            <p className="text-slate-500 font-medium">Seu assistente está pronto.</p>
            <div className="mt-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-xs text-slate-400 mt-2">Redirecionando para seu portal...</p>
            </div>
        </div>
      </div>
    );
  }

  // --- UI PRINCIPAL ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 font-sans relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100 relative z-10 text-center">
        
        <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-lg shadow-emerald-100 transform -rotate-6">
            <Smartphone size={40} strokeWidth={2} />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Ative seu Assistente
        </h2>
        
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Clique no botão abaixo para abrir o WhatsApp e enviar o código de conexão automática.
        </p>

        {step === 'loading_token' && (
            <div className="h-32 flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="animate-spin w-8 h-8 text-emerald-500" /> 
                <span className="text-sm">Gerando seu código de segurança...</span>
            </div>
        )}

        {step === 'error' && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-2 font-bold justify-center">
                    <AlertCircle size={20} />
                    <span>Falha na Conexão</span>
                </div>
                <p className="text-xs mb-4 opacity-80">{errorMessage}</p>
                <button 
                    onClick={fetchToken}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors shadow-sm"
                >
                    Tentar Novamente
                </button>
            </div>
        )}

        {(step === 'waiting_click' || step === 'verifying') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setStep('verifying')}
                    className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#1ebc57] text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-1 transition-all group"
                >
                    CONECTAR AGORA
                    <ExternalLink size={20} className="opacity-80 group-hover:translate-x-1 transition-transform" />
                </a>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-400 text-left">
                    <p className="font-semibold text-slate-500 mb-1 flex items-center gap-2">
                        <RefreshCw size={12} className={step === 'verifying' ? 'animate-spin' : ''} />
                        Status: {step === 'verifying' ? 'Aguardando mensagem...' : 'Aguardando clique'}
                    </p>
                    <p>Código de segurança: <span className="font-mono bg-slate-200 px-1 rounded text-slate-600">{token || '...'}</span></p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}