'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';

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

interface OrgPublicInfo {
  name: string;
  logo_url: string | null;
  brand_primary: string;
  brand_secondary: string;
}

export default function PartnerLoginPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [org, setOrg] = useState<OrgPublicInfo | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      const next = searchParams.get('next');
      const safeNextRedirect = (next && next.startsWith('/') && !next.startsWith('//')) ? next : null;

      const isManagementRole = profile?.role === 'founder' || profile?.role === 'admin'
        || profile?.role === 'associate' || profile?.role === 'teacher';
      const nextIsStudentPath = safeNextRedirect?.includes('/student/');

      if (safeNextRedirect && !(isManagementRole && nextIsStudentPath)) {
        router.replace(safeNextRedirect);
        return;
      }

      if (profile?.role === 'founder' || profile?.role === 'admin') {
        router.replace(`/partners/${slug}/dashboard`);
        return;
      }
      if (profile?.role === 'associate' || profile?.role === 'teacher') {
        router.replace(`/partners/${slug}/redacoes`);
        return;
      }
      router.replace(`/partners/${slug}/student/dashboard`);
    }

    void redirectIfAuthenticated();
    return () => { cancelled = true; };
  }, [router, searchParams, slug, supabase]);

  useEffect(() => {
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
        .select('role, organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        throw new Error('Falha ao carregar o perfil após autenticação.');
      }

      const role = profile?.role ?? null;
      const roleTarget =
        role === 'founder' || role === 'admin'
          ? `/partners/${slug}/dashboard`
          : role === 'associate' || role === 'teacher'
            ? `/partners/${slug}/redacoes`
            : `/partners/${slug}/student/dashboard`;

      const isManagementRole = role === 'founder' || role === 'admin' || role === 'associate' || role === 'teacher';
      const nextIsStudentPath = safeNext?.includes('/student/');
      // Impede que um founder/associate caia em rota de aluno via ?next stale
      const target = (safeNext && !(isManagementRole && nextIsStudentPath)) ? safeNext : roleTarget;
      router.refresh();
      router.push(target);
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

  const primary = sanitizeCssHexColor(org?.brand_primary, '#6366f1');
  const secondary = sanitizeCssHexColor(org?.brand_secondary, '#8b5cf6');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}15 100%)` }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white shadow-xl dark:bg-slate-900 overflow-hidden">
          <div
            className="px-8 py-6 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
          >
            {loadingOrg ? (
              <div className="h-14 w-14 rounded-xl bg-white/20 animate-pulse mx-auto mb-3" />
            ) : org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-14 w-14 mx-auto mb-3 rounded-xl object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 mx-auto mb-3">
                <GraduationCap className="h-7 w-7" />
              </div>
            )}
            <h1 className="text-xl font-bold">
              {loadingOrg ? '\u00A0' : `Entrar — ${org?.name ?? slug}`}
            </h1>
            <p className="text-sm opacity-80 mt-0.5">Plataforma de Estudos StudyTrack</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(sanitizeEmailInput(e.target.value))}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  maxLength={EMAIL_MAX_LENGTH}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password" className="text-sm">Senha</Label>
                  <Link
                    href={`/partners/${slug}/reset`}
                    className="text-xs underline hover:opacity-80"
                    style={{ color: primary }}
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 text-white mt-2"
                style={{ backgroundColor: primary }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <Link
              href={`/partners/${slug}/register`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-colors hover:bg-opacity-10"
              style={{ borderColor: primary, color: primary }}
            >
              Não tenho conta — Criar conta
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by{' '}
          <Link href="https://studytrack.com.br" className="underline hover:text-slate-600">
            StudyTrack
          </Link>
        </p>
      </div>
    </div>
  );
}
