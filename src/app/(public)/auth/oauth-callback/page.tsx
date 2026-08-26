'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getGoogleOAuthClient } from '@/lib/supabase/oauth-client';

/** Só aceita redirect relativo — `next` vem de query param, controlável por
 * quem monta o link, então nunca deixamos ele apontar pra fora do site. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/portal';
  return next;
}

/** Deriva pra onde mandar o usuário se o login com Google falhar aqui —
 * mesma lógica de extração de slug usada no stopgap de auth/callback/route.ts. */
function fallbackLoginUrl(next: string): string {
  const partnerSlugMatch = next.match(/^\/partners\/([^/]+)\//);
  if (partnerSlugMatch) {
    return `/partners/${partnerSlugMatch[1]}/login?next=${encodeURIComponent(next)}`;
  }
  return `/auth/login?next=${encodeURIComponent(next)}`;
}

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<'linking' | 'error'>('linking');
  const [errorMsg, setErrorMsg] = useState('');
  const next = safeNext(searchParams.get('next'));

  useEffect(() => {
    const oauthClient = getGoogleOAuthClient();
    let settled = false;

    const { data: { subscription } } = oauthClient.auth.onAuthStateChange(async (event, session) => {
      if (settled || event !== 'SIGNED_IN' || !session) return;
      settled = true;
      subscription.unsubscribe();

      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw error;

        window.location.replace(next);
      } catch {
        setState('error');
        setErrorMsg('Não foi possível concluir o login. Tente novamente.');
      }
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      setState('error');
      setErrorMsg('A conexão com o Google expirou. Tente novamente.');
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'error') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <p className="max-w-sm text-sm text-slate-600">{errorMsg}</p>
        <a
          href={fallbackLoginUrl(next)}
          className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
        >
          Tentar novamente
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
      <p className="text-sm text-slate-500">Concluindo login com Google...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallbackContent />
    </Suspense>
  );
}
