'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    fetch(`${api}/api/partners/${slug}/public-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setOrg(data))
      .catch(() => {})
      .finally(() => setLoadingOrg(false));
  }, [slug]);

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

  const primary = sanitizeCssHexColor(org?.brand_primary, '#6366f1');
  const secondary = sanitizeCssHexColor(org?.brand_secondary, '#8b5cf6');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primary}15 0%, ${secondary}15 100%)` }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white shadow-xl dark:bg-slate-900 overflow-hidden">

          {/* Header com branding da org */}
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
              {loadingOrg ? '\u00A0' : `Criar conta — ${org?.name ?? slug}`}
            </h1>
            <p className="text-sm opacity-80 mt-0.5">Plataforma de Estudos StudyTrack</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                autoComplete="name"
                className={errors.fullName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.fullName && <p className="text-xs text-red-500">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className={errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={`pr-10 ${errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
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
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                className={errors.confirmPassword ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {searchParams.get('code') ? (
              // Código veio na URL — campo oculto, apenas confirmação visual
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
                <span className="text-xs text-slate-500">Código de convite:</span>
                <span className="font-mono text-sm font-semibold tracking-widest" style={{ color: primary }}>
                  {inviteCode}
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode" className="text-sm">Código de convite</Label>
                <Input
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CODIGO123"
                  className={`font-mono tracking-widest uppercase ${errors.inviteCode ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                {errors.inviteCode && <p className="text-xs text-red-500">{errors.inviteCode}</p>}
                <p className="text-xs text-slate-400">
                  Fornecido pelo seu cursinho ou instituição
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 text-white mt-2"
              style={{ backgroundColor: primary }}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </Button>

            <p className="text-center text-sm text-slate-500 pt-1">
              Já tenho conta{' '}
              <Link
                href={`/partners/${slug}/login?next=/partners/${slug}/student/dashboard`}
                className="underline font-medium hover:opacity-80"
                style={{ color: primary }}
              >
                → Entrar
              </Link>
            </p>
          </form>
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
