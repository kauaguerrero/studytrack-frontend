'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';

function ConfirmResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Verificar se há um token de reset na URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!passwordValidation.isValid) {
      setError("A senha não atende aos requisitos mínimos de segurança.");
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError("Não foi possível redefinir a senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
        <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
          <div className="flex-none p-6 lg:p-8">
            <div className="flex items-center gap-0 group cursor-pointer w-fit" onClick={() => router.push('/')}>
              <div className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center -mr-3">
                <Image 
                  src="/logost-transparente-sombra.png" 
                  alt="StudyTrack Logo" 
                  width={48} 
                  height={48} 
                  className="object-contain"
                />
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">StudyTrack</div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center px-6 lg:px-8">
            <div className="w-full max-w-[440px] mx-auto pb-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                  Senha redefinida!
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed">
                  Sua senha foi alterada com sucesso. Você será redirecionado para o login em alguns segundos.
                </p>
              </div>

              <button 
                onClick={() => router.push('/auth/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all"
              >
                <span>Ir para Login</span>
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Senha Atualizada</h2>
              <p className="text-slate-600 max-w-sm">Sua conta está segura novamente. Use sua nova senha para fazer login.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col h-screen relative z-20 bg-white">
        
        <div className="flex-none p-6 lg:p-8">
          <div className="flex items-center gap-0 group cursor-pointer w-fit" onClick={() => router.push('/')}>
            <div className="group-hover:scale-110 transition-transform duration-300 flex items-center justify-center -mr-3">
              <Image 
                src="/logost-transparente-sombra.png" 
                alt="StudyTrack Logo" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">StudyTrack</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-8">
          <div className="w-full max-w-[440px] mx-auto pb-4">
            
            <div className="mb-6"> 
              <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                Nova senha
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Digite sua nova senha segura.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block" htmlFor="password">Nova senha</label>
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

                {/* Checklist de validação de senha */}
                {formData.password && (
                  <div className="space-y-1 mt-2">
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.minLength ? 'bg-green-600' : 'bg-slate-300'}`}></div>
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasUpperCase ? 'bg-green-600' : 'bg-slate-300'}`}></div>
                      <span>Uma letra maiúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasLowerCase ? 'bg-green-600' : 'bg-slate-300'}`}></div>
                      <span>Uma letra minúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasNumbers ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasNumbers ? 'bg-green-600' : 'bg-slate-300'}`}></div>
                      <span>Um número</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-slate-400'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${passwordValidation.hasSpecialChar ? 'bg-green-600' : 'bg-slate-300'}`}></div>
                      <span>Um caractere especial</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 block" htmlFor="confirmPassword">Confirmar nova senha</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" required
                    className={`w-full pl-12 pr-14 h-14 rounded-2xl border bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all ${
                      formData.confirmPassword && !passwordsMatch ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'
                    }`}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                  <button 
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-600 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button 
                type="submit" disabled={isLoading || !passwordValidation.isValid || !passwordsMatch}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Redefinindo...</span>
                  </>
                ) : (
                  <>
                    <span>Redefinir Senha</span>
                    <Lock className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Segurança em Primeiro Lugar</h2>
            <p className="text-slate-600 max-w-sm">Crie uma senha forte para proteger sua conta e manter seus estudos seguros.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConfirmResetPasswordForm />
    </Suspense>
  );
}