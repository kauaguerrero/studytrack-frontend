'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GraduationCap, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

function ConfirmResetForm() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [org, setOrg] = useState<OrgPublicInfo | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    fetch(`${api}/api/partners/${slug}/public-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrg(data))
      .catch(() => {})
      .finally(() => setLoadingOrg(false));
  }, [slug]);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      void supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams, supabase.auth]);

  function validatePassword(nextPassword: string) {
    const minLength = nextPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(nextPassword);
    const hasLowerCase = /[a-z]/.test(nextPassword);
    const hasNumbers = /\d/.test(nextPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(nextPassword);
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    };
  }

  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!passwordValidation.isValid) {
      setError('A senha não atende aos requisitos mínimos de segurança.');
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push(`/partners/${slug}/login`);
      }, 3000);
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
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
              <img src={org.logo_url} alt={org.name} className="h-14 w-14 mx-auto mb-3 rounded-xl object-contain bg-white/20 p-1" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 mx-auto mb-3">
                <GraduationCap className="h-7 w-7" />
              </div>
            )}
            <h1 className="text-xl font-bold">
              {loadingOrg ? '\u00A0' : `Nova senha — ${org?.name ?? slug}`}
            </h1>
            <p className="text-sm opacity-80 mt-0.5">Plataforma de Estudos StudyTrack</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {success ? (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    Sua senha foi redefinida com sucesso. Você será redirecionado para o login.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full text-white"
                  style={{ backgroundColor: primary }}
                  onClick={() => router.push(`/partners/${slug}/login`)}
                >
                  Ir para login
                </Button>
              </>
            ) : (
              <>
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua nova senha"
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirmar nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500">
                    <p className={passwordValidation.minLength ? 'text-emerald-600' : ''}>Mínimo 8 caracteres</p>
                    <p className={passwordValidation.hasUpperCase ? 'text-emerald-600' : ''}>Uma letra maiúscula</p>
                    <p className={passwordValidation.hasLowerCase ? 'text-emerald-600' : ''}>Uma letra minúscula</p>
                    <p className={passwordValidation.hasNumbers ? 'text-emerald-600' : ''}>Um número</p>
                    <p className={passwordValidation.hasSpecialChar ? 'text-emerald-600' : ''}>Um caractere especial</p>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-red-600">As senhas não coincidem</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 text-white"
                    style={{ backgroundColor: primary }}
                    disabled={isLoading || !passwordValidation.isValid || !passwordsMatch}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
                  </Button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-slate-500 pt-1">
              <Link
                href={`/partners/${slug}/login`}
                className="underline font-medium hover:opacity-80"
                style={{ color: primary }}
              >
                → Voltar ao login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartnerConfirmResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ConfirmResetForm />
    </Suspense>
  );
}
