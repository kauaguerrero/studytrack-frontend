"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reportError } from '@/lib/reportError';
import Image from 'next/image';
import { 
  Mail, Lock, Eye, EyeOff, Loader2, User, 
  GraduationCap, School, Rocket
} from 'lucide-react';

const PLANS = [
  { id: 'free', name: 'Trial 72h', activeColor: 'text-slate-600' },
  { id: 'basic', name: 'Básico', activeColor: 'text-blue-600' },
  { id: 'pro', name: 'Pro', activeColor: 'text-indigo-600' },
  { id: 'elite', name: 'Elite', activeColor: 'text-violet-600' }
];

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.47 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<'student' | 'school'>('student');
  const [schoolRole, setSchoolRole] = useState<'teacher' | 'secretary' | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlPlan = searchParams.get('plan');
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [selectedPlan, setSelectedPlan] = useState(urlPlan || 'free');
  
  const isPlanLocked = !!urlPlan;
  const supabase = createClient();

  // --- PASSWORD VALIDATION ---
  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%&*]/.test(password)
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password.length > 0;

  // --- PASSWORD CHECKLIST COMPONENT ---
  const PasswordChecklist = () => {
    if (!formData.password) return null;

    const checks = [
      { key: 'length', label: 'Pelo menos 8 caracteres', valid: passwordValidation.length },
      { key: 'uppercase', label: 'Uma letra maiúscula', valid: passwordValidation.uppercase },
      { key: 'lowercase', label: 'Uma letra minúscula', valid: passwordValidation.lowercase },
      { key: 'number', label: 'Um número', valid: passwordValidation.number },
      { key: 'special', label: 'Um caractere especial (!@#$%&*)', valid: passwordValidation.special }
    ];

    return (
      <div className="mt-3 space-y-1">
        {checks.map((check) => (
          <div key={check.key} className="flex items-center gap-2 text-xs">
            {check.valid ? (
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <span className={check.valid ? 'text-green-700' : 'text-slate-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (urlPlan) {
        setSelectedPlan(urlPlan);
        localStorage.setItem('onboarding_plan', urlPlan);
    } else {
        localStorage.setItem('onboarding_plan', selectedPlan);
    }
  }, [urlPlan, selectedPlan]);

  const handleSocialLogin = async (provider: 'google') => {
    try {
        // Salva role e plano nos cookies para recuperar no callback, já que não podemos passar "data" direto
        const actualRole = userType === 'school' ? schoolRole : userType;
        document.cookie = `onboarding_role=${actualRole}; path=/; max-age=300`;
        document.cookie = `onboarding_plan=${selectedPlan}; path=/; max-age=300`;

        const nextPath = userType === 'school'
            ? (schoolRole === 'teacher' ? '/portal/onboarding/teacher/school' : '/portal/onboarding/secretariat/school')
            : '/portal/onboarding/objetivo';

        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
                queryParams: { 
                    access_type: 'offline', 
                    prompt: 'consent' 
                }
            },
        });
    } catch (error) {
        console.error("Erro social auth:", error);
        void reportError("RegisterSocialAuthError", String(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validações
    if (!isPasswordValid) {
      setError("Por favor, crie uma senha que atenda a todos os requisitos de segurança.");
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("As senhas não coincidem. Verifique e tente novamente.");
      setIsLoading(false);
      return;
    }

    if (userType === 'school' && !schoolRole) {
      setError("Selecione seu papel na escola (Professor ou Secretaria).");
      setIsLoading(false);
      return;
    }

    try {
      localStorage.setItem('onboarding_plan', selectedPlan);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                full_name: formData.name,
                plan_tier: userType === 'school' ? 'school_free' : selectedPlan,
                role: userType === 'school' ? schoolRole : 'student'
            }
        }
      });

      if (signUpError) throw signUpError;

      if (data.session) {
          const userId = data.session.user.id;
          router.refresh();

          if (userType === 'school') {
             if (schoolRole === 'teacher') {
               await supabase.from('profiles').upsert({ 
                   id: userId,
                   role: 'teacher',
                   email: formData.email,
                   full_name: formData.name
                 }, { onConflict: 'id' });
               router.push('/portal/onboarding/teacher/school');
             } else if (schoolRole === 'secretary') {
               await supabase.from('profiles').upsert({ 
                   id: userId,
                   role: 'secretariat',
                   email: formData.email,
                   full_name: formData.name
                 }, { onConflict: 'id' });
               router.push('/portal/onboarding/secretariat/school');
             }
          } else {
             await supabase.from('profiles').upsert({ 
                 id: userId,
                 role: 'student',
                 email: formData.email,
                 full_name: formData.name
               }, { onConflict: 'id' });
             router.push('/portal/onboarding/objetivo');
          }
      } else {
          alert("Conta criada! Verifique seu e-mail para confirmar.");
          router.push('/auth/login');
      }

    } catch (err: any) {
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
    <div className="w-full max-w-[440px] mx-auto pb-4 min-w-0">
      <div className="mb-6 min-w-0"> 
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight break-words flex items-center gap-2 flex-wrap">
          Crie sua conta <Rocket className="w-8 h-8 sm:w-9 sm:h-9 text-blue-600 shrink-0" aria-hidden />
        </h1>
        <p className="text-slate-500 text-lg">
          {userType === 'student' 
            ? 'Comece a estudar de forma inteligente.' 
            : 'Gerencie suas turmas e potencialize seus alunos.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-slate-100 rounded-xl">
        <button type="button" onClick={() => { setUserType('student'); setSchoolRole(null); }} className={`flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${userType === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <GraduationCap size={18} aria-hidden /> Conta de Aluno
        </button>
        <button type="button" onClick={() => setUserType('school')} className={`flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-lg text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${userType === 'school' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <School size={18} aria-hidden /> Vinculado à Escola
        </button>
      </div>

      {userType === 'school' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Qual é o seu papel na escola?</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSchoolRole('teacher')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                schoolRole === 'teacher'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <School size={14} /> Professor
            </button>
            <button
              type="button"
              onClick={() => setSchoolRole('secretary')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
                schoolRole === 'secretary'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              <User size={14} /> Secretaria
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button onClick={() => handleSocialLogin('google')} type="button" className="flex items-center justify-center gap-3 h-12 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-200 hover:shadow-md transition-all duration-300 group">
          <div className="group-hover:scale-110 transition-transform"><GoogleIcon /></div>
          <span className="font-semibold text-sm text-slate-700">Criar com Google</span>
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
        <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest"><span className="px-4 bg-white text-slate-400">ou via e-mail</span></div>
      </div>

      {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium animate-pulse">{error}</div>)}

      <form onSubmit={handleSubmit} className="space-y-4">
        {userType === 'student' && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-1 bg-slate-100 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
                   {PLANS.map((plan) => (
                      <button key={plan.id} type="button" onClick={() => !isPlanLocked && setSelectedPlan(plan.id)} disabled={isPlanLocked} className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap ${selectedPlan === plan.id ? `bg-white shadow-sm ring-1 ring-black/5 ${plan.activeColor}` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'} ${isPlanLocked && selectedPlan !== plan.id ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'}`}>
                          {plan.name}
                      </button>
                  ))}
              </div>
              {isPlanLocked && (<p className="text-center text-[10px] text-slate-400 mt-2">Plano selecionado na oferta. <a href="/#planos" className="underline hover:text-blue-600 font-medium">Trocar</a></p>)}
          </div>
        )}

        {userType === 'school' && (
           <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex gap-3">
                 <School className="text-amber-600 shrink-0" size={20} />
                 <div>
                    <h3 className="font-bold text-sm text-amber-900">Validação Necessária</h3>
                    <p className="text-xs text-amber-800 mt-1">Após criar a conta, você precisará do <strong>Código da Escola</strong> ou aguardar aprovação da gestão.</p>
                 </div>
              </div>
           </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 block" htmlFor="name">Nome Completo</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><User className="w-5 h-5" /></div>
            <input id="name" type="text" placeholder="Seu nome" required className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 block" htmlFor="email">E-mail</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-5 h-5" /></div>
            <input id="email" type="email" placeholder={userType === 'school' ? "prof.nome@escola.com" : "aluno@studytrack.com"} required className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700" htmlFor="password">Senha</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-5 h-5" /></div>
            <input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Crie uma senha segura" 
              required 
              className="w-full pl-12 pr-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" 
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
            </button>
          </div>
          <PasswordChecklist />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700" htmlFor="confirmPassword">Confirmar Senha</label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-5 h-5" /></div>
            <input 
              id="confirmPassword" 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Digite a senha novamente" 
              required 
              className={`w-full pl-12 pr-14 h-14 rounded-2xl border bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all ${
                formData.confirmPassword && !passwordsMatch 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-slate-200 focus:border-blue-500'
              }`} 
              value={formData.confirmPassword} 
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
            />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label={showConfirmPassword ? 'Ocultar confirmar senha' : 'Mostrar confirmar senha'}>
              {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
            </button>
          </div>
          {formData.confirmPassword && !passwordsMatch && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              As senhas não coincidem
            </p>
          )}
        </div>

        <button 
          type="submit"
          disabled={isLoading || !isPasswordValid || !passwordsMatch || !formData.name || !formData.email}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[48px] h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 transition-all mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (userType === 'school' ? "Iniciar Validação Escolar" : "Criar Conta de Aluno")}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Já tem conta? <a href="/auth/login" className="font-bold text-blue-600 hover:text-blue-800">Fazer Login</a>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* --- LADO ESQUERDO: INTERATIVO --- */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen min-h-0 relative z-20 bg-white">
        
        <div className="flex-none shrink-0 p-6 lg:p-8">
          <div className="flex items-center gap-0 group cursor-pointer w-fit" onClick={() => router.push('/')}>
             <div className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center -mr-3">
               <Image 
                 src="/logost-transparente-sombra.png" 
                 alt="Logo StudyTrack" 
                 width={80} 
                 height={80} 
                 className="w-20 h-20 object-contain"
                 priority
                 unoptimized
               />
             </div>
             <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
               Study<span className="text-blue-600 group-hover:text-slate-900 transition-colors">Track</span>
             </span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-8 sm:px-12 lg:px-24">
          <div className="min-h-full flex flex-col justify-center py-10 min-w-0">
            <Suspense fallback={<div>Carregando...</div>}><RegisterForm /></Suspense>
          </div>
        </div>
      </div>
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative items-center justify-center">
         <div className="text-white text-center p-10">
            <h2 className="text-3xl font-bold mb-2">Sua jornada começa agora.</h2>
            <p className="text-slate-400">Junte-se a milhares de estudantes e educadores.</p>
         </div>
      </div>
    </div>
  );
}