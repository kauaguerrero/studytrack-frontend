'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

/**
 * Editor da Página Pública da Organização, no painel admin da StudyTrack.
 *
 * Edita o `content` como JSON validado: o schema vive no backend
 * (org_public_site_schema.py, pydantic com extra="forbid"), então um campo
 * errado volta como mensagem legível em vez de virar conteúdo silenciosamente
 * ignorado. É deliberadamente a ferramenta do time interno — o editor visual
 * por seções, para a própria org, é a próxima etapa.
 *
 * Mostra o conteúdo CRU, com os campos de consentimento (`consent_obtained`,
 * `is_minor`, `guardian_consent`, `published`) visíveis: é onde a autorização
 * de cada depoimento e aprovação é registrada, e o endpoint público só libera
 * os itens que passam por ela.
 */

interface Props {
  slug: string;
  orgName: string;
  onClose: () => void;
}

interface Payload {
  exists: boolean;
  enabled: boolean;
  template: string;
  content: unknown;
  theme_overrides: unknown;
  seo: unknown;
  public_url: string;
  updated_at: string | null;
}

async function authHeaders() {
  const { data: { session } } = await createClient().auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
}

export function OrgPublicSiteModal({ slug, orgName, onClose }: Props) {
  const [data, setData] = useState<Payload | null>(null);
  const [contentText, setContentText] = useState('');
  const [seoText, setSeoText] = useState('');
  const [themeText, setThemeText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase()}/api/partners/${slug}/public-site/admin`, {
          headers: await authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Falha ao carregar.');
        const body: Payload = await res.json();
        setData(body);
        setContentText(JSON.stringify(body.content ?? {}, null, 2));
        setSeoText(JSON.stringify(body.seo ?? {}, null, 2));
        setThemeText(JSON.stringify(body.theme_overrides ?? null, null, 2));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function salvar(extra: Record<string, unknown> = {}) {
    setErro(null);
    let content: unknown;
    let seo: unknown;
    let theme: unknown;
    try {
      content = JSON.parse(contentText || '{}');
      seo = JSON.parse(seoText || '{}');
      theme = JSON.parse(themeText || 'null');
    } catch (e) {
      setErro(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiBase()}/api/partners/${slug}/public-site/admin`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ content, seo, theme_overrides: theme, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Falha ao salvar.');
      setData((d) => (d ? { ...d, enabled: Boolean(body.enabled), exists: true } : d));
      toast.success('Página pública salva.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = data?.public_url ?? `/partners/${slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-zinc-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Página pública</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              {orgName} · /{slug}
              {data && (
                <>
                  {' · '}
                  <span className={data.enabled ? 'text-emerald-600' : 'text-amber-600'}>
                    {data.enabled ? 'publicada' : 'não publicada'}
                  </span>
                </>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </p>
          )}

          {!loading && data && !data.exists && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              Esta organização ainda não tem página. Cole um `content` válido abaixo e salve
              para criá-la — ela nasce desligada.
            </p>
          )}

          {erro && (
            <p className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {erro}
            </p>
          )}

          {!loading && (
            <>
              <JsonField
                label="Conteúdo (content)"
                hint="Validado contra o schema do template. Campo desconhecido é recusado. Os campos de consentimento dos depoimentos e aprovações ficam aqui — sem eles, o item não aparece na página pública."
                value={contentText}
                onChange={setContentText}
                rows={18}
              />
              <JsonField label="SEO" hint="title, description, og_image_url." value={seoText} onChange={setSeoText} rows={5} />
              <JsonField
                label="Tokens de tema (theme_overrides)"
                hint="null = deriva do branding da org. Só aceita tokens conhecidos com valor hex."
                value={themeText}
                onChange={setThemeText}
                rows={6}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-6 py-4 dark:border-zinc-800">
          <a
            href={data?.enabled ? publicUrl : `${publicUrl}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {data?.enabled ? 'Ver página' : 'Pré-visualizar'}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white">
              Fechar
            </button>
            <button
              onClick={() => salvar()}
              disabled={saving || loading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => salvar({ enabled: !data?.enabled })}
              disabled={saving || loading}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {data?.enabled ? 'Salvar e despublicar' : 'Salvar e publicar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JsonField({
  label,
  hint,
  value,
  onChange,
  rows,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <p className="text-[11px] leading-snug text-slate-400 dark:text-zinc-500">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
      />
    </div>
  );
}
