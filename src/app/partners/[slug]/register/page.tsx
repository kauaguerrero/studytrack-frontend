'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GraduationCap, Eye, EyeOff, Loader2, User, Mail, Lock, KeyRound, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';
import { LayeredText } from '@/components/ui/layered-text';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
function sanitizeCssHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

interface OrgPublicInfo {
  name: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
}

const GoogleIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function PartnerRegisterPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [org, setOrg] = useState<OrgPublicInfo | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Pré-preenche o código vindo da URL (?code=...)
  const [inviteCode, setInviteCode] = useState(() =>
    (searchParams.get('code') ?? '').toUpperCase()
  );
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Retorno do OAuth do Google: `?invite=CODIGO` sinaliza que o usuário já
  // está autenticado (voltou de /auth/callback) e falta só vincular a org.
  const oauthInviteCode = searchParams.get('invite');
  const [joinState, setJoinState] = useState<'linking' | 'error'>('linking');
  const [joinError, setJoinError] = useState('');
  const joinAttempted = useRef(false);

  useEffect(() => {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    fetch(`${api}/api/partners/${slug}/public-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrg(data))
      .catch(() => {})
      .finally(() => setLoadingOrg(false));
  }, [slug]);

  // Vincula a conta recém-autenticada via Google à organização (invite_code).
  async function attemptJoin(code: string) {
    setJoinState('linking');
    setJoinError('');

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setJoinState('error');
      setJoinError('Sessão do Google não encontrada. Tente novamente.');
      return;
    }

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${slug}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ invite_code: code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setJoinState('error');
        setJoinError(data?.error || 'Não foi possível vincular sua conta a esta instituição.');
        return;
      }

      toast.success('Conta criada com sucesso! Bem-vindo(a)!');
      router.push(`/partners/${slug}/student/dashboard`);
    } catch {
      setJoinState('error');
      setJoinError('Erro de conexão. Tente novamente.');
    }
  }

  useEffect(() => {
    if (!oauthInviteCode || joinAttempted.current) return;
    joinAttempted.current = true;
    void attemptJoin(oauthInviteCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthInviteCode]);

  function retryJoin() {
    if (oauthInviteCode) void attemptJoin(oauthInviteCode);
  }

  // Validação em tempo real (feedback positivo enquanto digita, não só erro pós-submit).
  const codeFromUrl = Boolean(searchParams.get('code'));
  const fullNameValid = fullName.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const confirmValid = confirmPassword.length > 0 && confirmPassword === password;
  const inviteValid = inviteCode.trim().length > 0;

  const requiredSteps = [fullNameValid, emailValid, passwordValid, confirmValid, ...(codeFromUrl ? [] : [inviteValid])];
  const formProgress = Math.round((requiredSteps.filter(Boolean).length / requiredSteps.length) * 100);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nome é obrigatório';
    if (!email.trim()) errs.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email inválido';
    if (!password) errs.password = 'Senha é obrigatória';
    else if (password.length < 8) errs.password = 'Mínimo 8 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'As senhas não conferem';
    if (!inviteCode.trim()) errs.inviteCode = 'Código de convite obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          invite_code: inviteCode.trim().toUpperCase(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error ?? 'Email já cadastrado.', {
            action: {
              label: 'Fazer login',
              onClick: () =>
                router.push(`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`),
            },
          });
        } else {
          toast.error(data.error || 'Erro ao criar conta.');
        }
        return;
      }

      // Login automático após registro
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        toast.success('Conta criada! Faça login para continuar.');
        router.push(`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`);
        return;
      }

      toast.success('Conta criada com sucesso! Bem-vindo(a)!');
      router.push(`/partners/${slug}/student/dashboard`);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setErrors((prev) => ({ ...prev, inviteCode: 'Informe o código de convite para continuar com o Google.' }));
      return;
    }
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const nextPath = `/partners/${slug}/register?invite=${encodeURIComponent(code)}`;
      // Origem fixa — mesmo motivo do login: evita perder o cookie do PKCE
      // code_verifier por inconsistência de host entre o início e a volta do OAuth.
      const canonicalOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${canonicalOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    } catch {
      toast.error('Não foi possível iniciar o login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  }

  const primary = sanitizeCssHexColor(org?.brand_primary, '#6366f1');
  const secondary = sanitizeCssHexColor(org?.brand_secondary, '#8b5cf6');

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white font-sans text-slate-900">
      {/* ── Esquerda: formulário ── */}
      <div className="relative z-20 flex h-screen min-h-0 w-full min-w-0 shrink-0 flex-col bg-white min-[901px]:w-1/2">
        <div className="flex-none min-w-0 p-4 sm:p-6 xl:p-8">
          <Link
            href={`/partners/${slug}/dashboard`}
            className="group flex w-fit min-w-0 max-w-full flex-wrap items-center gap-0"
          >
            {loadingOrg ? (
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-100" />
            ) : org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
              >
                <GraduationCap className="h-5 w-5" />
              </div>
            )}
            <span className="ml-2.5 truncate text-lg font-extrabold tracking-tight text-slate-900">
              {loadingOrg ? ' ' : (org?.name ?? slug)}
            </span>
          </Link>
        </div>

        <div
          className="flex min-h-0 flex-1 min-w-0 flex-col justify-start overflow-y-auto px-4 pb-8 pt-2 sm:px-6 md:px-8 min-[901px]:pb-0 min-[901px]:pt-0 xl:px-12"
          style={{ overflowAnchor: 'none' }}
        >
          {/* my-auto (não justify-center no pai) centraliza só quando sobra espaço —
              se o conteúdo for mais alto que a tela, volta pro topo em vez de
              cortar simetricamente topo e rodapé. */}
          <div className="mx-auto w-full max-w-[420px] min-w-0 min-[901px]:my-auto">

            {oauthInviteCode ? (
              // ── Vinculando conta Google à organização ────────────────────
              <div className="flex w-full flex-col items-center gap-4 py-8 text-center">
                {joinState === 'error' ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <p className="text-sm text-slate-600">{joinError}</p>
                    <button
                      type="button"
                      onClick={retryJoin}
                      className="flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold text-white shadow-xl transition-all"
                      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: `0 12px 28px -10px ${primary}80` }}
                    >
                      Tentar novamente
                    </button>
                    <Link
                      href={`/partners/${slug}/register`}
                      className="text-xs text-slate-400 underline hover:text-slate-600"
                    >
                      Cadastrar com email e senha
                    </Link>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin" style={{ color: primary }} />
                    <p className="text-sm text-slate-500">
                      Vinculando sua conta Google à {org?.name ?? 'instituição'}...
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="mb-7 min-w-0">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primary }}>
                    Convite de {loadingOrg ? '...' : (org?.name ?? slug)}
                  </p>
                  <h1 className="font-display text-[30px] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-[34px]">
                    Criar sua conta.
                  </h1>
                </div>

                {/* Progresso do cadastro */}
                <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${formProgress}%`, background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
                  />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Código de convite — primeiro, pois vale tanto pro Google quanto pro form manual */}
                  {codeFromUrl ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <span className="text-xs text-slate-500">Código de convite:</span>
                      <span className="font-mono text-sm font-semibold tracking-widest" style={{ color: primary }}>
                        {inviteCode}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="inviteCode" className="text-[13px] font-bold text-slate-700">Código de convite</Label>
                      <div className="relative">
                        <KeyRound
                          className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                          style={inviteValid ? { color: primary } : undefined}
                        />
                        <Input
                          id="inviteCode"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          placeholder="Ex: CODIGO123"
                          className={`h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 font-mono uppercase tracking-widest focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0 ${errors.inviteCode ? 'border-red-400' : ''}`}
                        />
                      </div>
                      {errors.inviteCode && <p className="text-xs text-red-500">{errors.inviteCode}</p>}
                      <p className="text-xs text-slate-400">Fornecido pelo seu cursinho ou instituição</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={googleLoading}
                    className="group flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {googleLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <div className="transition-transform group-hover:scale-110" aria-hidden><GoogleIcon /></div>}
                    Continuar com Google
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ou com email</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-[13px] font-bold text-slate-700">Nome completo</Label>
                    <div className="relative">
                      <User
                        className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                        style={fullNameValid ? { color: primary } : undefined}
                      />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo"
                        autoComplete="name"
                        className={`h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-10 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0 ${errors.fullName ? 'border-red-400' : ''}`}
                      />
                      {fullNameValid && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                    {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[13px] font-bold text-slate-700">Email</Label>
                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                        style={emailValid ? { color: primary } : undefined}
                      />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        className={`h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-10 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0 ${errors.email ? 'border-red-400' : ''}`}
                      />
                      {emailValid && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-[13px] font-bold text-slate-700">Senha</Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                        style={passwordValid ? { color: primary } : undefined}
                      />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        autoComplete="new-password"
                        className={`h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-12 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0 ${errors.password ? 'border-red-400' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={password} />
                    {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-[13px] font-bold text-slate-700">Confirmar senha</Label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                        style={confirmValid ? { color: primary } : undefined}
                      />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        className={`h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-10 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                      />
                      {confirmValid && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-500" />
                      )}
                    </div>
                    {confirmValid && <p className="text-xs font-medium text-emerald-600">As senhas coincidem</p>}
                    {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: `0 12px 28px -10px ${primary}80` }}
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>

                <p className="pt-4 text-center text-sm text-slate-500">
                  Já tenho conta{' '}
                  <Link
                    href={`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`}
                    className="font-semibold underline hover:opacity-80"
                    style={{ color: primary }}
                  >
                    → Entrar
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Direita: painel visual ── */}
      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-[#0a0e1a] min-[901px]:flex">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-[-15%] h-[560px] w-[560px] -translate-x-1/2 rounded-full blur-[130px]"
            style={{ background: `${primary}30` }}
          />
          <div
            className="absolute bottom-[-20%] right-[-10%] h-[420px] w-[420px] rounded-full blur-[120px]"
            style={{ background: `${secondary}22` }}
          />
        </div>
        <div className="partner-halftone pointer-events-none absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_70%)]" />

        <div className="relative z-10 w-full overflow-hidden px-6">
          <LayeredText className="mx-auto" />
        </div>
      </div>
    </div>
  );
}
