"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Wifi, MessageCircle, CheckCircle2, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingHandshake() {
  const [verified, setVerified] = useState(false);
  const [userPhone, setUserPhone] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Busca o telefone do usuário para mostrar na tela
    const getProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from("profiles").select("whatsapp_phone").eq("id", user.id).single();
            if (data?.whatsapp_phone) {
                // Formata para visualização (remove 55 e formata)
                const raw = data.whatsapp_phone.replace(/^55/, '');
                setUserPhone(raw);
            }
        }
    }
    getProfile();

    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch("http://127.0.0.1:5000/api/auth/check-handshake", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.verified) {
            setVerified(true);
            clearInterval(intervalId);
            setTimeout(() => router.push("/portal/student/dashboard"), 2000);
          }
        }
      } catch (error) {
        console.error("Erro na verificação:", error);
      }
    };

    intervalId = setInterval(checkStatus, 3000);
    checkStatus();

    return () => clearInterval(intervalId);
  }, [router, supabase]);

  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border border-slate-100 max-w-sm w-full">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200/50 animate-[bounce_0.5s_ease-out]">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Conectado!</h1>
            <p className="text-slate-500 font-medium">Seu WhatsApp foi vinculado.</p>
            <p className="text-xs text-slate-400 mt-6 animate-pulse uppercase tracking-widest">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden font-sans">
      
      {/* Background Decorativo */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100 relative z-10 text-center">
        
        {/* Radar Animation */}
        <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
          <span className="absolute inline-flex h-20 w-20 rounded-full bg-blue-500 opacity-20 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]"></span>
          
          <div className="relative bg-white p-5 rounded-full shadow-xl shadow-blue-500/10 z-10 border-4 border-slate-50">
            <Smartphone className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
                <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
          Validação de Segurança
        </h2>
        
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Para garantir que é você mesmo, precisamos que envie seu número de telefone para o nosso bot.
        </p>

        {/* Action Box */}
        <div className="bg-blue-50/80 rounded-2xl p-6 border border-blue-100 mb-8 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <MessageCircle size={64} />
            </div>
            
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2">Sua Missão:</p>
            <p className="text-slate-700 font-medium mb-1">
              Envie a mensagem abaixo para nosso WhatsApp:
            </p>
            
            <div className="flex items-center gap-2 mt-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                <code className="flex-1 font-mono text-lg font-bold text-slate-800 text-center">
                    {userPhone || "Seu Número"}
                </code>
                {/* Opcional: Botão de copiar se quiser implementar */}
            </div>
        </div>

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold tracking-wider uppercase">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></span>
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></span>
          <span className="ml-2">Aguardando mensagem...</span>
        </div>

      </div>
    </div>
  );
}