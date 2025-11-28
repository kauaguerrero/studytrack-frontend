"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, Mail, Lock, Eye, EyeOff, Loader2, User, CheckCircle
} from 'lucide-react';

// Ícone Google Otimizado (Mesmo do Login)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Componente interno para suspender o uso de useSearchParams
function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPlan = searchParams.get('plan');
  
  // Estado do formulário
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  // Estado do Plano (inicia com o da URL ou 'free', mas permite troca)
  const [selectedPlan, setSelectedPlan] = useState(urlPlan || 'free');

  const supabase = createClient();

  const handleSocialLogin = async (provider: 'google') => {
    try {
        // Salva o plano no localStorage antes de ir pro Google também
        if (typeof window !== 'undefined') {
            localStorage.setItem('onboarding_plan', selectedPlan);
        }

        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
    } catch (error) {
        console.error("Erro social auth:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Cria o usuário no Auth do Supabase salvando o plano escolhido
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                full_name: formData.name,
                plan_tier: selectedPlan, // Usa o plano do estado, não apenas da URL
            }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Sucesso -> Redireciona
      if (data.session) {
          // CORREÇÃO CRÍTICA: Atualiza o localStorage para garantir que a próxima página leia o plano correto
          localStorage.setItem('onboarding_plan', selectedPlan);
          
          router.push('/onboarding/objetivo');
      } else {
          alert("Conta criada! Verifique seu e-mail para confirmar.");
          router.push('/auth/login');
      }

    } catch (err: any) {
      // Tradução amigável do erro comum de usuário existente
      if (err.message?.includes("already registered") || err.message?.includes("already exists")) {
        setError("Este e-mail já está cadastrado. Tente fazer login.");
      } else {
        setError(err.message || "Erro ao criar conta.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] mx-auto pb-4">
      <div className="mb-6"> 
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
          Crie sua conta 🚀
        </h1>
        <p className="text-slate-500 text-lg">
          Comece a estudar de forma inteligente.
        </p>
      </div>

      {/* SOCIAL LOGIN */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        <button onClick={() => handleSocialLogin('google')} type="button" className="flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
          <div className="group-hover:scale-110 transition-transform"><GoogleIcon /></div>
          <span className="font-semibold text-sm text-slate-700">Criar com Google</span>
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
        <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
          <span className="px-4 bg-white text-slate-400">ou via e-mail</span>
        </div>
      </div>

      {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium animate-pulse">
              {error}
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Seleção de Plano (Novo) */}
        <div className="p-1 bg-slate-100 rounded-xl flex gap-1 mb-4">
            {['free', 'basic', 'pro'].map((tier) => (
                <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedPlan(tier)}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                        selectedPlan === tier 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {tier}
                </button>
            ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 block" htmlFor="name">Nome Completo</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input 
              id="name" type="text" placeholder="Seu nome" required
              className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
        </div>

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
          <label className="text-sm font-bold text-slate-700" htmlFor="password">Senha</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input 
              id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" required minLength={6}
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 transition-all mt-6"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <a href="/auth/login" className="font-bold text-blue-600 hover:text-blue-800">
          Fazer Login
        </a>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
      {/* Lado Esquerdo */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
        <div className="flex-none p-6 lg:p-8">
          <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={() => router.push('/')}>
             <div className="bg-blue-600 text-white p-2 rounded-xl">
               <BookOpen className="w-5 h-5" />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900">
               Study<span className="text-blue-600">Track</span>
             </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 sm:px-12 lg:px-24">
          <div className="min-h-full flex flex-col justify-center py-10">
            <Suspense fallback={<div>Carregando...</div>}>
              <RegisterForm />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Lado Direito */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative items-center justify-center">
         <div className="text-white text-center p-10">
            <h2 className="text-3xl font-bold mb-2">Sua jornada começa agora.</h2>
            <p className="text-slate-400">Junte-se a milhares de estudantes.</p>
         </div>
      </div>
    </div>
  );
}