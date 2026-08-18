'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';
import { LayeredText } from '@/components/ui/layered-text';
import {
  GraduationCap, Eye, EyeOff, Loader2, Mail, Lock, CheckCircle2, ArrowRight, AlertTriangle,
} from 'lucide-react';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

function sanitizeCssHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

function sanitizeEmailInput(value: string): string {
  return value.replace(/\s+/g, '').slice(0, EMAIL_MAX_LENGTH);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= EMAIL_MAX_LENGTH;
}

const GoogleIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

interface OrgPublicInfo {
  name: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
}

export default function PartnerLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const searchParams = useSearchParams();
  const supabase = createClient();

  const [org, setOrg] = useState<OrgPublicInfo | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    fetch(`${api}/api/partners/${slug}/public-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrg(data))
      .catch(() => {})
      .finally(() => setLoadingOrg(false));
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfAuthenticated() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, associate_permissions')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      // Bloqueia associate desativado — encerra sessão e exibe aviso
      if (profile?.role === 'associate') {
        const perms = profile.associate_permissions as { active?: boolean } | null;
        if (perms?.active === false) {
          await supabase.auth.signOut();
          setError('Sua conta está inativa. Entre em contato com o gestor da instituição.');
          return;
        }
      }

      const next = searchParams.get('next');
      const safeNextRedirect = (next && next.startsWith('/') && !next.startsWith('//')) ? next : null;

      const isManagementRole = profile?.role === 'founder' || profile?.role === 'admin'
        || profile?.role === 'associate';
      const nextIsStudentPath = safeNextRedirect?.includes('/student/');

      if (safeNextRedirect && !(isManagementRole && nextIsStudentPath)) {
        window.location.replace(safeNextRedirect);
        return;
      }

      if (profile?.role === 'founder' || profile?.role === 'admin') {
        window.location.replace(`/partners/${slug}/dashboard`);
        return;
      }
      if (profile?.role === 'associate') {
        window.location.replace(`/partners/${slug}/redacoes`);
        return;
      }
      window.location.replace(`/partners/${slug}/student/dashboard`);
    }

    void redirectIfAuthenticated();
    return () => { cancelled = true; };
  }, [searchParams, slug, supabase]);

  useEffect(() => {
    if (searchParams.get('password_changed') === '1') {
      setInfoMessage('Senha atualizada. Entre novamente com sua nova senha.');
    }

    const errorMsg = searchParams.get('error');
    if (!errorMsg) return;

    if (errorMsg.includes('Flow state not found')) {
      setError('A conexão expirou. Por favor, tente fazer login novamente.');
      return;
    }

    if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('credential')) {
      setError('E-mail ou senha inválidos.');
      return;
    }

    setError('Não foi possível concluir o login. Tente novamente.');
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfoMessage(null);

    try {
      const normalizedEmail = sanitizeEmailInput(email).toLowerCase();
      if (!isValidEmail(normalizedEmail)) {
        setError('Informe um e-mail válido.');
        return;
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(`A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres.`);
        return;
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        setError(`A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`);
        return;
      }

      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;
      if (!authData.user?.id) throw new Error('Sessão não retornada após autenticação.');

      const safeNext = (() => {
        const next = searchParams.get('next');
        if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
        return next;
      })();

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
          return;
        }
      }

      const role = profile?.role ?? null;
      const roleTarget =
        role === 'founder' || role === 'admin'
          ? `/partners/${slug}/dashboard`
          : role === 'associate'
            ? `/partners/${slug}/redacoes`
            : `/partners/${slug}/student/dashboard`;

      const isManagementRole = role === 'founder' || role === 'admin' || role === 'associate';
      const nextIsStudentPath = safeNext?.includes('/student/');
      // Impede que um founder/associate caia em rota de aluno via ?next stale
      const target = (safeNext && !(isManagementRole && nextIsStudentPath)) ? safeNext : roleTarget;
      window.location.href = target;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Invalid login credentials') || message.includes('Email not confirmed')) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
      } else if (message.includes('Falha ao carregar o perfil')) {
        setError('Login realizado, mas não foi possível carregar seu perfil. Tente novamente.');
      } else {
        setError('Não foi possível fazer login. Tente novamente em alguns instantes.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const nextPath = searchParams.get('next') ?? '/portal';
      // Origem fixa (não window.location.origin) — evita que o cookie do PKCE
      // code_verifier seja gravado num host (ex: com "www.") e o callback do
      // Supabase devolva o navegador em outro, o que derruba a troca de código
      // com "flow state not found" na primeira tentativa.
      const canonicalOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${canonicalOrigin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError('Não foi possível iniciar o login com Google. Tente novamente.');
      setGoogleLoading(false);
    }
  }

  const primary = sanitizeCssHexColor(org?.brand_primary, '#6366f1');
  const secondary = sanitizeCssHexColor(org?.brand_secondary, '#8b5cf6');

  const emailValid = isValidEmail(sanitizeEmailInput(email).toLowerCase());
  const passwordValid = password.length >= PASSWORD_MIN_LENGTH;

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
            <div className="mb-7 min-w-0">
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primary }}>
                Painel do aluno e do gestor
              </p>
              <h1 className="font-display text-[30px] font-black leading-[1.05] tracking-tight text-slate-900 sm:text-[34px]">
                Bem-vindo de volta.
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                Entre para continuar de onde parou.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={googleLoading}
              className="group mb-6 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <div className="transition-transform group-hover:scale-110" aria-hidden><GoogleIcon /></div>}
              Continuar com Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest">
                <span className="bg-white px-4 text-slate-500">ou via e-mail</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {infoMessage && !error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{infoMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    className="h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-10 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0"
                  />
                  {emailValid && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-[13px] font-bold text-slate-700">Senha</Label>
                  <Link
                    href={`/partners/${slug}/reset`}
                    className="text-[13px] font-semibold hover:underline"
                    style={{ color: primary }}
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors"
                    style={passwordValid ? { color: primary } : undefined}
                  />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    className="h-12 rounded-2xl border-slate-300 bg-slate-50 pl-11 pr-12 font-medium focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:ring-offset-0"
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
              </div>

              <button
                type="submit"
                disabled={submitting || !email || !password}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: `0 12px 28px -10px ${primary}80` }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar Agora</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="pt-4 text-center text-sm text-slate-500">
              Não tenho conta{' '}
              <Link
                href={`/partners/${slug}/register`}
                className="font-semibold underline hover:opacity-80"
                style={{ color: primary }}
              >
                → Criar conta
              </Link>
            </p>
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
