"use client";

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  MessageCircle,
  Github
} from 'lucide-react';

// --- ESTILOS MANTIDOS ORIGINALMENTE ---
const advancedStyles = `
  @keyframes slideUpFade {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .animate-enter {
    animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
  }

  .delay-0 { animation-delay: 0ms; }
  .delay-100 { animation-delay: 100ms; }
  .delay-200 { animation-delay: 200ms; }
  .delay-300 { animation-delay: 300ms; }
  .delay-400 { animation-delay: 400ms; }

  .input-group:focus-within label { color: #2563EB; transform: translateX(2px); }
  .input-group:focus-within svg { color: #2563EB; }
  
  /* Scroll suave customizado */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 20px; }
`;

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
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => setMounted(true), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
      <style>{advancedStyles}</style>
      
      {/* --- LADO ESQUERDO: INTERATIVO --- */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
        
        {/* HEADER (Reduzido padding de p-8 para p-6 para ganhar espaço) */}
        <div className="flex-none p-6 lg:p-8 animate-enter delay-0">
          <div className="flex items-center gap-2 group cursor-pointer w-fit">
             <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
               <BookOpen className="w-5 h-5" />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
               Study<span className="text-blue-600 group-hover:text-slate-900 transition-colors">Track</span>
             </span>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-[440px] mx-auto pb-4">
            
            {/* TEXTOS (Reduzido mb-10 para mb-6) */}
            <div className="mb-6 animate-enter delay-100"> 
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Bem-vindo de volta! <span className="inline-block hover:animate-pulse cursor-default">👋</span>
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Sua meta de hoje está te esperando. Vamos lá?
              </p>
            </div>

            {/* SOCIAL LOGIN (Reduzido mb-8 para mb-6) */}
            <div className="grid grid-cols-2 gap-4 mb-6 animate-enter delay-200">
              <button className="flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
                <div className="group-hover:scale-110 transition-transform"><GoogleIcon /></div>
                <span className="font-semibold text-sm text-slate-700">Google</span>
              </button>
              <button className="flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
                <div className="group-hover:scale-110 transition-transform"><Github className="w-5 h-5" /></div>
                <span className="font-semibold text-sm text-slate-700">GitHub</span>
              </button>
            </div>

            {/* SEPARADOR (Reduzido mb-8 para mb-6) */}
            <div className="relative mb-6 animate-enter delay-200">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                <span className="px-4 bg-white text-slate-400">ou via e-mail</span>
              </div>
            </div>

            {/* FORMULÁRIO (Reduzido space-y-5 para space-y-4) */}
            <form onSubmit={handleSubmit} className="space-y-4 animate-enter delay-300">
              
              <div className="space-y-1.5 input-group">
                <label className="text-sm font-bold text-slate-700 transition-all duration-300 block" htmlFor="email">E-mail</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    id="email" type="email" placeholder="aluno@studytrack.com" required
                    className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium placeholder:text-slate-400 transition-all duration-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-lg focus:-translate-y-0.5"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5 input-group">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 transition-all duration-300" htmlFor="password">Senha</label>
                  <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline decoration-2 underline-offset-4 transition-all">Esqueceu?</a>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
                    className="w-full pl-12 pr-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium placeholder:text-slate-400 transition-all duration-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:shadow-lg focus:-translate-y-0.5"
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
                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-800 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-1 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
              >
                <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-white/20 skew-x-[20deg] group-hover:animate-[shine_0.75s_infinite_linear]" style={{ animation: 'none' }}></div>
                
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Acessando...</span>
                  </>
                ) : (
                  <>
                    <span className="relative z-10">Entrar na Plataforma</span>
                    <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* CADASTRE-SE (Reduzido mt-10 para mt-5 para garantir visibilidade) */}
            <p className="mt-5 text-center text-sm text-slate-500 animate-enter delay-400">
              Não tem conta?{' '}
              <a href="/auth/register" className="font-bold text-blue-600 hover:text-blue-800 relative inline-block after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-blue-600 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">
                Cadastre-se gratuitamente
              </a>
            </p>
          </div>
        </div>

        {/* FOOTER (Reduzido p-6 para p-4 para ganhar espaço no fundo) */}
        <div className="flex-none p-4 lg:p-6 text-center lg:text-left animate-enter delay-400">
           <p className="text-xs text-slate-400 font-medium">© 2024 StudyTrack. Protegido e Seguro.</p>
        </div>
      </div>

      {/* --- LADO DIREITO: MANTIDO EXATAMENTE IGUAL --- */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
           <div className="absolute top-[-20%] right-[-20%] w-[800px] h-[800px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-[-20%] left-[-20%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

        <div className="relative z-10 max-w-md w-full p-8 perspective-1000">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl transform transition-all duration-700 hover:scale-[1.02] hover:rotate-1 cursor-default group">
            <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/30 transform group-hover:-translate-y-2 transition-transform duration-500">
                <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div className="mt-4">
                <div className="flex gap-1 mb-6">
                    {[1,2,3,4,5].map(i => (
                        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current transform transition-transform hover:scale-125 hover:rotate-12 delay-75" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    ))}
                </div>
                <p className="text-2xl font-medium text-white leading-relaxed mb-8 font-heading">
                  "Antes eu só usava o WhatsApp pra conversar, agora uso como <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 font-bold">ferramenta de estudo</span>. Me ajuda muito a parar de procrastinar!"
                </p>
                <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                  <img src="\images\student.png" className="w-12 h-12 rounded-full border-2 border-blue-500/50" alt="Avatar" />
                  <div>
                    <p className="text-white font-bold text-lg">Marcos Vinícius</p>
                    <p className="text-slate-400 text-sm">Aprovado em Engenharia (UFMG)</p>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}