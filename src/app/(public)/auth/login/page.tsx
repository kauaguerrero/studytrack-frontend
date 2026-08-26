"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getGoogleOAuthClient } from '@/lib/supabase/oauth-client';
import { reportError } from '@/lib/reportError';
import Image from 'next/image';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertTriangle,
} from 'lucide-react';
import { LegoApprovalStack } from '@/components/ui/lego-approval-stack';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

function sanitizeEmailInput(value: string): string {
  // Remove espaços e limita tamanho para reduzir payload abusivo.
  return value.replace(/\s+/g, '').slice(0, EMAIL_MAX_LENGTH);
}

function isValidEmail(value: string): boolean {
  // Validação pragmática para login (não bloqueia domínios válidos incomuns).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= EMAIL_MAX_LENGTH;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Painel direito ──────────────────────────────────────────────────────────

function VisualPanel({ progress }: { progress: number }) {
  const pct = Math.round(progress * 100);

  return (
    <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-b from-[#0B1220] via-[#0F172A] to-[#0B1220] min-[901px]:flex">
      {/* Glows de fundo, com respiração sutil pra não ficar chapado */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-25%] top-[-25%] h-[700px] w-[700px] animate-pulse rounded-full bg-blue-600/25 blur-[130px]" />
        <div className="absolute bottom-[-25%] left-[-25%] h-[700px] w-[700px] animate-pulse rounded-full bg-violet-600/20 blur-[130px] [animation-delay:1s]" />
        <div className="absolute bottom-[10%] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[110px]" />
      </div>

      {/* Textura de pontos — mesma linguagem visual dos cards do dashboard */}
      <div className="partner-halftone pointer-events-none absolute inset-0 opacity-[0.25] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_72%)]" />

      {/* Vinheta pra dar profundidade nas bordas */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.45)_100%)]" />

      {/* Sombra de contato no chão, sob a torre */}
      <div className="pointer-events-none absolute bottom-[26%] left-1/2 h-8 w-72 -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl" />

      {/* Torre de habilidades — monta com e-mail/senha e desmonta ao apagar */}
      <LegoApprovalStack progress={progress} className="relative z-10" />

      {/* Barra de progresso da montagem */}
      <div className="absolute bottom-10 left-1/2 z-10 h-1.5 w-full max-w-sm -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


// ─── Formulário (lógica de auth 100% preservada) ─────────────────────────────

function LoginForm({ onProgress }: { onProgress: (p: number) => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const emailOk = isValidEmail(sanitizeEmailInput(formData.email).toLowerCase());
  const passwordOk = formData.password.length >= PASSWORD_MIN_LENGTH;

  // Alimenta a animação do painel de forma gradual, caractere a caractere:
  // metade do progresso vem do e-mail (rampa por tamanho até virar válido,
  // onde trava em 1), a outra metade da senha (rampa linear até o mínimo
  // exigido). Cada bloco cai conforme cruza seu próprio degrau nessa rampa.
  const emailChars = sanitizeEmailInput(formData.email).length;
  const emailProgress = emailOk ? 1 : Math.min(0.85, emailChars / 20);
  const passwordProgress = Math.min(1, formData.password.length / PASSWORD_MIN_LENGTH);
  useEffect(() => {
    onProgress(0.5 * emailProgress + 0.5 * passwordProgress);
  }, [emailProgress, passwordProgress, onProgress]);

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      if (errorMsg.includes('Flow state not found')) {
        setError("A conexão expirou. Por favor, tente fazer login novamente.");
      } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('credential')) {
        setError('E-mail ou senha inválidos.');
      } else {
        // Não reflete texto arbitrário da URL diretamente na UI.
        setError('Não foi possível concluir o login. Tente novamente.');
      }
    }
  }, [searchParams]);

  // Stopgap pra falha intermitente de PKCE no Google (code_verifier perdido
  // em navegador mobile): auth/callback/route.ts detecta esse erro específico
  // e manda o usuário de volta pra cá com ?autoRetryGoogle=1 — reinicia o
  // login do Google sozinho, uma única vez por sessão de aba (evita loop se
  // a 2ª tentativa falhar de novo pelo mesmo motivo).
  const autoRetryAttempted = useRef(false);
  useEffect(() => {
    if (searchParams.get('autoRetryGoogle') !== '1' || autoRetryAttempted.current) return;
    const guardKey = 'st:google-auto-retry-done';
    if (sessionStorage.getItem(guardKey) === '1') return;
    autoRetryAttempted.current = true;
    sessionStorage.setItem(guardKey, '1');
    void handleSocialLogin('google');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const normalizedEmail = sanitizeEmailInput(formData.email).toLowerCase();
      const password = formData.password;

      if (!isValidEmail(normalizedEmail)) {
        setError('Informe um e-mail válido.');
        setIsLoading(false);
        return;
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
        setIsLoading(false);
        return;
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        setError(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
        setIsLoading(false);
        return;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
      if (!authData.user?.id) {
        throw new Error('Sessão não retornada após autenticação.');
      }

      // O @supabase/ssr já setou os cookies no navegador neste ponto.
      // O código legado do fetch('/api/auth/set-session') foi removido.

      const userId = authData.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, organization_id, associate_permissions')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw new Error('Falha ao carregar o perfil após autenticação.');
      }

      // Bloqueia associate desativado antes de qualquer redirecionamento
      if (profile?.role === 'associate') {
        const perms = profile.associate_permissions as { active?: boolean } | null;
        if (perms?.active === false) {
          await supabase.auth.signOut();
          setError('Sua conta está inativa. Entre em contato com o gestor da instituição.');
          setIsLoading(false);
          return;
        }
      }

      const role = profile?.role ?? null;
      const roleToPath: Record<string, string> = {
        admin: '/portal/admin',
        dev: '/portal/admin/tasks',
        // 'student' omitted intentionally: /portal handles B2B routing via organization_id
      };

      // Respeita ?next= se for URL relativa (segurança: evita open redirect para domínio externo)
      const nextParam = searchParams.get('next');
      const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;

      let partnerTarget: string | null = null;
      if (profile?.organization_id && (role === 'student' || role === 'founder' || role === 'admin' || role === 'associate')) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('slug')
          .eq('id', profile.organization_id)
          .maybeSingle();

        if (orgError) {
          throw new Error('Falha ao resolver a organização do usuário.');
        }

        if (org?.slug) {
          partnerTarget =
            role === 'founder' || role === 'admin'
              ? `/partners/${org.slug}/dashboard`
              : role === 'associate'
                ? `/partners/${org.slug}/redacoes`
                : `/partners/${org.slug}/student/dashboard`;
        }
      }

      const roleBasedTarget = partnerTarget ?? (role && roleToPath[role] ? roleToPath[role] : '/portal');
      const target = safeNext ?? roleBasedTarget;

      // Atualiza o cache do roteador do Next.js para que o Middleware leia os novos cookies
      router.refresh();
      router.push(target);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Invalid login credentials') || message.includes('Email not confirmed')) {
        setError("E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (message.includes('Falha ao carregar o perfil') || message.includes('Falha ao resolver a organização')) {
        setError('Login realizado, mas não foi possível concluir o direcionamento da sua conta. Tente novamente.');
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
        // Origem fixa — o Google só aceita redirect_uris pré-cadastradas.
        const canonicalOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        // Client dedicado em implicit flow (não o client normal, PKCE) — os
        // tokens voltam direto no fragment da URL, sem exchange server-side
        // dependente de cookie sobrevivendo ao redirect cross-site pelo provider.
        await getGoogleOAuthClient().auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${canonicalOrigin}/auth/oauth-callback?next=${encodeURIComponent(nextPath)}`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
    } catch (error) {
        console.error("Erro social auth:", error);
        void reportError("LoginSocialAuthError", String(error));
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] min-w-0 mx-auto pb-4 box-border min-[901px]:my-auto">
      <div className="mb-7 min-w-0">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
          Área do aluno e do gestor
        </p>
        <h1 className="font-display text-[30px] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-[36px] xl:text-[40px]">
          Bem-vindo de volta.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Entre para continuar de onde parou.
        </p>
      </div>

      <button
        onClick={() => handleSocialLogin('google')}
        type="button"
        className="mb-6 flex w-full items-center justify-center gap-3 min-h-[48px] h-12 rounded-2xl border border-slate-300 bg-white font-semibold text-sm text-slate-700 transition-all duration-300 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 group"
      >
        <div className="group-hover:scale-110 transition-transform" aria-hidden><GoogleIcon /></div>
        Continuar com Google
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
        <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
          <span className="px-4 bg-white text-slate-500">ou via e-mail</span>
        </div>
      </div>

      {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-5 h-5 shrink-0 flex-none" />
              <span className="min-w-0 break-words">{error}</span>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-bold text-slate-700 block" htmlFor="email">E-mail</label>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${emailOk ? 'text-blue-500' : 'text-slate-400'}`}>
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email" type="email" placeholder="voce@studytrack.com" required
              className="w-full pl-12 pr-4 h-14 rounded-2xl border border-slate-300 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={formData.email}
              maxLength={EMAIL_MAX_LENGTH}
              autoComplete="email"
              inputMode="email"
              onChange={(e) => setFormData({...formData, email: sanitizeEmailInput(e.target.value)})}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-bold text-slate-700" htmlFor="password">Senha</label>
            <a href="/auth/reset" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 hover:underline">Esqueceu?</a>
          </div>
          <div className="relative">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${passwordOk ? 'text-blue-500' : 'text-slate-400'}`}>
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" required
              className="w-full pl-12 pr-14 h-14 rounded-2xl border border-slate-300 bg-slate-50 outline-none text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              value={formData.password}
              minLength={PASSWORD_MIN_LENGTH}
              maxLength={PASSWORD_MAX_LENGTH}
              autoComplete="current-password"
              onChange={(e) => setFormData({...formData, password: e.target.value.slice(0, PASSWORD_MAX_LENGTH)})}
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

      {/* Frase manuscrita — só no mobile, onde o painel visual não existe.
          text-shadow desenha a sombra glifo a glifo, como escrita real sobre o papel. */}
      <p
        className="font-script mt-8 text-center text-[24px] leading-tight text-slate-700 min-[901px]:hidden"
        style={{ textShadow: '2px 3px 3px rgba(15, 23, 42, 0.22)' }}
      >
        Seja <span className="text-blue-900">insistente</span> quando o assunto for{' '}
        <span className="text-violet-600">SONHO</span>
      </p>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(0.25);

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-slate-900 overflow-x-hidden">
      {/* ── Esquerda: formulário ── */}
      <div className="w-full min-w-0 min-[901px]:w-1/2 flex flex-col h-screen min-h-0 relative z-20 bg-white shrink-0">
        <div className="flex-none shrink-0 p-4 sm:p-6 xl:p-8 min-w-0">
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

        <div
          className="flex-1 min-h-0 min-w-0 flex flex-col justify-start pt-2 pb-8 min-[901px]:pt-0 min-[901px]:pb-0 px-4 sm:px-6 md:px-8 xl:px-12 overflow-y-auto custom-scrollbar"
          style={{ overflowAnchor: 'none' }}
        >
          <Suspense fallback={<div>Carregando...</div>}>
            <LoginForm onProgress={setProgress} />
          </Suspense>
        </div>
      </div>

      {/* ── Direita: painel visual com canvas ── */}
      <VisualPanel progress={progress} />
    </div>
  );
}
