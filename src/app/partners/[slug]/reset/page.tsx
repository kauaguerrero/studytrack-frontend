'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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

export default function PartnerResetPasswordPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();

  const [org, setOrg] = useState<OrgPublicInfo | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [email, setEmail] = useState('');
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const response = await fetch(`${api}/api/partners/${slug}/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      if (!response.ok) throw new Error('password-reset-request-failed');
      setSuccess(true);
    } catch {
      setError('Não foi possível processar sua solicitação agora. Tente novamente em alguns instantes.');
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
              <img src={org.logo_url} alt={org.name} className="h-14 w-14 mx-auto mb-3 rounded-xl object-contain" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 mx-auto mb-3">
                <GraduationCap className="h-7 w-7" />
              </div>
            )}
            <h1 className="text-xl font-bold">
              {loadingOrg ? '\u00A0' : `Recuperar senha — ${org?.name ?? slug}`}
            </h1>
            <p className="text-sm opacity-80 mt-0.5">Plataforma de Estudos StudyTrack</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {success ? (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center">
                  <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                  <p className="text-sm text-emerald-700">
                    Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full text-white"
                  style={{ backgroundColor: primary }}
                  onClick={() => router.push(`/partners/${slug}/login`)}
                >
                  Voltar ao login
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
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 text-white"
                    style={{ backgroundColor: primary }}
                    disabled={isLoading || !email}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? 'Enviando...' : 'Enviar instruções'}
                  </Button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-slate-500 pt-1">
              Lembrou sua senha?{' '}
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
