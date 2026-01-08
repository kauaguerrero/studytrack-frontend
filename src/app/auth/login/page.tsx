"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Github
} from 'lucide-react';

// Ícone Google Otimizado
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Sucesso: Redireciona para o Dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Falha ao entrar. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
    } catch (error) {
        console.error("Erro social auth:", error);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
      {/* --- LADO ESQUERDO: INTERATIVO --- */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
        
        <div className="flex-none p-6 lg:p-8">
          <div className="flex items-center gap-2 group cursor-pointer w-fit" onClick={() => router.push('/')}>
             <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
               <BookOpen className="w-5 h-5" />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
               Study<span className="text-blue-600 group-hover:text-slate-900 transition-colors">Track</span>
             </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[440px] mx-auto pb-4">
            
            <div className="mb-6"> 
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Bem-vindo de volta! <span className="inline-block hover:animate-pulse cursor-default">👋</span>
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Sua meta de hoje está te esperando.
              </p>
            </div>

            {/* SOCIAL LOGIN */}
            <div className="grid grid-cols-1 gap-4 mb-6">
              <button onClick={() => handleSocialLogin('google')} type="button" className="flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
                <div className="group-hover:scale-110 transition-transform"><GoogleIcon /></div>
                <span className="font-semibold text-sm text-slate-700">Google</span>
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                <span className="px-4 bg-white text-slate-400">ou via e-mail</span>
              </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block" htmlFor="email">E-mail</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    id="email" type="email" placeholder="aluno@studytrack.com" required
                    className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700" htmlFor="password">Senha</label>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">Esqueceu?</a>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                    className="w-full pl-12 pr-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 transition-all mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar na Plataforma</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Não tem conta?{' '}
              <a href="/auth/register?plan=free" className="font-bold text-blue-600 hover:text-blue-800">
                Cadastre-se gratuitamente
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* --- LADO DIREITO (VISUAL) --- */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
           <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
        <div className="relative z-10 max-w-md w-full p-8">
            <h2 className="text-4xl font-bold text-white mb-4">Foco total.</h2>
            <p className="text-slate-400 text-lg">A plataforma que organiza sua vida acadêmica enquanto você dorme.</p>
        </div>
      </div>
    </div>
  );
}