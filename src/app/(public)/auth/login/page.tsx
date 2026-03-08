"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image'; 
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle
} from 'lucide-react';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      if (errorMsg.includes('Flow state not found')) {
        setError("A conexão expirou. Por favor, tente fazer login novamente.");
      } else {
        setError(decodeURIComponent(errorMsg));
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // O @supabase/ssr já setou os cookies no navegador neste ponto.
      // O código legado do fetch('/api/auth/set-session') foi removido.

      const userId = authData?.user?.id;
      const { data: profile } = userId
        ? await supabase.from('profiles').select('role').eq('id', userId).single()
        : { data: null };
      
      const role = profile?.role ?? null;
      const roleToPath: Record<string, string> = {
        teacher: '/portal/teacher',
        manager: '/portal/manager',
        admin: '/portal/admin',
        secretariat: '/portal/secretariat',
        student: '/portal/student/dashboard',
      };
      
      const target = role && roleToPath[role] ? roleToPath[role] : '/portal';
      
      // Atualiza o cache do roteador do Next.js para que o Middleware leia os novos cookies
      router.refresh(); 
      router.push(target);
      
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('Email not confirmed')) {
        setError("E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else {
        setError("Não foi possível fazer login. Tente novamente em alguns instantes.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    try {
        setIsLoading(true);
        const nextPath = searchParams.get('next') ?? '/portal';
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
    } catch (error) {
        console.error("Erro social auth:", error);
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] min-w-0 mx-auto pb-4 pr-0 box-border">
      <div className="mb-6 min-w-0 overflow-hidden"> 
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight break-words">
          Bem-vindo de volta! <span className="inline-block hover:animate-pulse cursor-default" aria-hidden>👋</span>
        </h1>
        <p className="text-slate-500 text-base sm:text-lg leading-relaxed break-words min-w-0 overflow-hidden">
          Sua meta de hoje está te esperando.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button onClick={() => handleSocialLogin('google')} type="button" className="flex items-center justify-center gap-3 min-h-[48px] h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
          <div className="group-hover:scale-110 transition-transform" aria-hidden><GoogleIcon /></div>
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium flex items-start gap-2 animate-pulse min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 flex-none" />
              <span className="min-w-0 break-words">{error}</span>
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
            <a href="/auth/reset" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">Esqueceu?</a>
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
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
            </button>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[48px] h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <>
              <span>Entrar Agora</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500 break-words min-w-0">
        Não tem conta?{' '}
        <a href="/auth/register?plan=free" className="font-bold text-blue-600 hover:text-blue-800">
          Cadastre-se gratuitamente
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* --- LADO ESQUERDO: INTERATIVO --- */}
      <div className="w-full min-w-0 lg:w-1/2 flex flex-col h-screen min-h-0 relative z-20 bg-white shrink-0">
        
        <div className="flex-none shrink-0 p-4 sm:p-6 lg:p-6 xl:p-8 min-w-0">
          <div className="flex items-center gap-0 group cursor-pointer w-fit min-w-0 max-w-full flex-wrap" onClick={() => router.push('/')}>
             <div className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center -mr-3 shrink-0">
               <Image 
                 src="/logost-transparente-sombra.png" 
                 alt="Logo StudyTrack" 
                 width={80} 
                 height={80} 
                 className="w-20 h-20 object-contain"
                 priority={true}
                 unoptimized
               />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors break-words min-w-0">
               Study<span className="text-blue-600 group-hover:text-slate-900 transition-colors">Track</span>
             </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 min-w-0 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-8 xl:px-12 overflow-y-auto overflow-x-auto custom-scrollbar">
          <Suspense fallback={<div>Carregando...</div>}>
            <LoginForm />
          </Suspense>
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