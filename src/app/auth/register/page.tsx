"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, Mail, Lock, Eye, EyeOff, Loader2, User, CheckCircle
} from 'lucide-react';

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
          router.push('/onboarding/objetivo');
      } else {
          alert("Conta criada! Verifique seu e-mail para confirmar.");
          router.push('/auth/login');
      }

    } catch (err: any) {
      setError(err.message || "Erro ao criar conta.");
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

      {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
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

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 overflow-y-auto custom-scrollbar">
          <Suspense fallback={<div>Carregando...</div>}>
            <RegisterForm />
          </Suspense>
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