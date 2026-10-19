'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { ElevatedCard, SectionTitle } from '@/components/partners/founder-ui';

/**
 * Card "Página pública" nas configurações do parceiro.
 *
 * Mínimo necessário para a org operar o recurso sozinha: ligar/desligar e
 * abrir a pré-visualização. O conteúdo em si (textos, imagens, depoimentos) é
 * editado hoje pelo painel admin da StudyTrack — o editor visual por seções é
 * a próxima etapa, e o card diz isso em vez de esconder.
 *
 * O card só aparece quando a org TEM uma página criada: oferecer um toggle que
 * não liga nada (sem conteúdo o backend recusa a publicação) seria pior do que
 * não mostrar nada.
 */

interface SiteState {
  exists: boolean;
  enabled: boolean;
  public_url: string;
  updated_at: string | null;
}

export function OrgPublicSiteCard({ slug, brandPrimary }: { slug: string; brandPrimary: string }) {
  const [state, setState] = useState<SiteState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(`${api}/api/partners/${slug}/public-site/admin`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelado) return;
        const data = await res.json();
        if (!cancelado) setState(data);
      } catch {
        // Card opcional — se o backend não responder, simplesmente não aparece.
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => { cancelado = true; };
  }, [slug]);

  async function toggle(next: boolean) {
    if (!state) return;
    const anterior = state.enabled;
    setState({ ...state, enabled: next });
    setSaving(true);
    try {
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${api}/api/partners/${slug}/public-site/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ enabled: next }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Não foi possível salvar.');
      }
      toast.success(next ? 'Página pública ativada.' : 'Página pública desativada.');
    } catch (err) {
      setState({ ...state, enabled: anterior });
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !state?.exists) return null;

  return (
    <ElevatedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
      <div className="p-5">
        <SectionTitle
          kicker="Página pública"
          title="Site da instituição"
          hex={brandPrimary}
          action={
            <p className="max-w-[220px] text-right text-[11px] text-slate-400 dark:text-white/40">
              Página institucional aberta, no endereço do seu portal.
            </p>
          }
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Página pública ativa
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {state.enabled
                  ? 'Qualquer pessoa com o link vê a página.'
                  : 'Só você e a equipe da StudyTrack veem, em pré-visualização.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              <Switch
                checked={state.enabled}
                disabled={saving}
                onCheckedChange={toggle}
                aria-label="Ativar página pública"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={state.enabled ? state.public_url : `${state.public_url}?preview=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <Globe className="h-4 w-4" />
              {state.enabled ? 'Ver página' : 'Pré-visualizar'}
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-white/40">
            Para alterar textos, fotos, depoimentos ou aprovações da página, fale com a
            equipe da StudyTrack. O editor próprio está a caminho.
          </p>
        </div>
      </div>
    </ElevatedCard>
  );
}
