'use client'

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Chama o Supabase para iniciar o fluxo OAuth com Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Onde o usuário vai cair depois de logar no Google
          redirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
      
      // Se der certo, o Supabase redireciona o usuário para o Google automaticamente.
    } catch (error) {
      console.error("Erro ao logar:", error);
      alert("Erro ao conectar com o Google. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6 border border-slate-100">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">
            StudyTrack
          </h1>
          <p className="text-slate-500">
            Seu mentor de inteligência artificial para estudos.
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <img 
                src="https://www.svgrepo.com/show/475656/google-color.svg" 
                alt="Google" 
                className="w-5 h-5" 
              />
            )}
            <span>
              {isLoading ? "Conectando..." : "Continuar com Google"}
            </span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">
                Acesso Seguro
              </span>
            </div>
          </div>

          <p className="text-xs text-center text-slate-400">
            Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}