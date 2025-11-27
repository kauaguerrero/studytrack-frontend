"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  BookOpen, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User
} from 'lucide-react';

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'free'; // Captura o plano da URL (ex: ?plan=pro)
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Cria o usuário no Auth do Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                full_name: formData.name,
                plan_tier: plan, // Salva o plano escolhido nos metadados
            }
        }
      });

      if (signUpError) throw signUpError;

      // 2. Sucesso -> Redireciona para o Onboarding (Telefone)
      // Nota: Se o Supabase exigir confirmação de email, você deve avisar o usuário aqui.
      // Assumindo que "Confirm Email" está desligado para dev ou o fluxo permite login direto:
      if (data.session) {
          router.push('/onboarding/telefone');
      } else {
          // Caso exija confirmação de e-mail
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
          <div className="w-full max-w-[440px] mx-auto pb-4">
            
            <div className="mb-6"> 
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Crie sua conta 🚀
              </h1>
              <p className="text-slate-500 text-lg">
                Comece a estudar de forma inteligente hoje mesmo.
                {plan !== 'free' && <span className="block text-blue-600 text-sm font-bold mt-1 uppercase">Plano selecionado: {plan}</span>}
              </p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
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
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Criar Conta Grátis"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Já tem conta?{' '}
              <a href="/auth/login" className="font-bold text-blue-600 hover:text-blue-800">
                Fazer Login
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Lado Direito (Pode ser igual ou diferente do Login) */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative items-center justify-center">
         <div className="text-white text-center p-10">
            <h2 className="text-3xl font-bold mb-2">Sua jornada começa agora.</h2>
            <p className="text-slate-400">Junte-se a milhares de estudantes.</p>
         </div>
      </div>
    </div>
  );
}