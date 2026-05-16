'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const response = await fetch(`${api}/api/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });
      if (!response.ok) throw new Error('password-reset-request-failed');

      setSuccess(true);
    } catch {
      setError("Não foi possível processar sua solicitação agora. Tente novamente em alguns instantes.");
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
                  Solicitação recebida
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed">
                  Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.
                </p>
              </div>

              <button 
                onClick={() => router.push('/auth/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao Login</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperação Segura</h2>
              <p className="text-slate-600 max-w-sm">Sua conta está protegida. Siga os passos no e-mail para redefinir sua senha com segurança.</p>
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
                Esqueceu sua senha?
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Digite seu e-mail e enviaremos instruções para redefinir sua senha.
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
                <label className="text-sm font-bold text-slate-700 block" htmlFor="email">E-mail</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    id="email" type="email" placeholder="aluno@studytrack.com" required
                    className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-200 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" disabled={isLoading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Instruções</span>
                    <Mail className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500">
              Lembrou sua senha?{' '}
              <a href="/auth/login" className="font-bold text-blue-600 hover:text-blue-800">
                Voltar ao login
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Recuperação de Senha</h2>
            <p className="text-slate-600 max-w-sm">Não se preocupe! Todos esquecem às vezes. Vamos te ajudar a recuperar o acesso à sua conta.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
