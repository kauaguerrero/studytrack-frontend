'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Palette, Upload, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BRAND_SWATCHES = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </Label>
      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {/* Swatch grande clicável abre o color picker nativo */}
        <label className="cursor-pointer shrink-0">
          <div
            className="w-12 h-12 rounded-xl shadow-sm border border-black/10 transition-transform hover:scale-105"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>

        {/* Input hex */}
        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-sm uppercase"
            maxLength={7}
            placeholder="#000000"
          />
        </div>

        {/* Paleta de sugestões rápidas */}
        <div className="flex gap-1.5 shrink-0">
          {BRAND_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                borderColor: value === c ? 'white' : 'transparent',
                outline: value === c ? `2px solid ${c}` : 'none',
              }}
              title={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { org, userProfile } = useOrg();

  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [primary, setPrimary] = useState(org.brand_primary);
  const [secondary, setSecondary] = useState(org.brand_secondary);
  const [accent, setAccent] = useState(org.brand_accent);
  const [contactEmail, setContactEmail] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    userProfile.themePreference === 'dark' ? 'dark' : 'light',
  );
  const [themeSaving, setThemeSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fromProfile = userProfile.themePreference === 'dark' ? 'dark' : 'light';
    const stored = localStorage.getItem(`partner-founder-theme-${org.slug}`);
    if (stored === 'dark' || stored === 'light') {
      // Perfil do banco é fonte de verdade; localStorage apenas fallback visual.
      setThemeMode(fromProfile);
      return;
    }
    setThemeMode(fromProfile);
  }, [org.slug, userProfile.themePreference]);

  function applyFounderTheme(next: 'light' | 'dark') {
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = next;
    root.dataset.partnerTheme = next;
    localStorage.setItem(`partner-founder-theme-${org.slug}`, next);
  }

  async function persistThemePreference(next: 'light' | 'dark') {
    setThemeSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Sessão inválida.');

      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: next })
        .eq('id', session.user.id);

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o tema.';
      toast.error(message);
    } finally {
      setThemeSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, SVG ou JPG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setLogoUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeExt = ['png', 'svg', 'jpg', 'jpeg'].includes(ext) ? ext : 'png';
      const path = `${org.id}_logo.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path);
      // Cache-busting para mostrar a nova logo imediatamente
      setLogoUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success('Logo atualizada!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro no upload.');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const body: Record<string, string> = {
        brand_primary:   primary,
        brand_secondary: secondary,
        brand_accent:    accent,
      };
      // Remove cache-buster antes de salvar
      if (logoUrl) body.logo_url = logoUrl.split('?t=')[0];
      if (contactEmail) body.contact_email = contactEmail;

      const res = await fetch(`${api}/api/partners/${org.slug}/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success('Configurações salvas!');
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        toast.error(data.error || 'Erro ao salvar.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PartnerLayout>
      <div className="space-y-6 max-w-xl">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href={`/partners/${org.slug}/dashboard`}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">Personalize a identidade visual do portal</p>
        </div>

        {/* Identidade Visual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" /> Identidade Visual
            </CardTitle>
            <CardDescription>
              Aplicadas no portal dos alunos e na landing page do cursinho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Modo de visualização do Founder
              </Label>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {themeMode === 'dark' ? 'Modo escuro' : 'Modo claro'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Claro</span>
                  <Switch
                    checked={themeMode === 'dark'}
                    disabled={themeSaving}
                    onCheckedChange={async (checked) => {
                      const next = checked ? 'dark' : 'light';
                      setThemeMode(next);
                      applyFounderTheme(next);
                      await persistThemePreference(next);
                    }}
                    aria-label="Alternar modo claro/escuro"
                  />
                  <span className="text-xs text-slate-500">Escuro</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                A preferência é salva no banco de dados e aplicada no portal de parceiros.
              </p>
            </div>

            {/* Upload de logo */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Logo
              </Label>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 overflow-hidden hover:border-[var(--brand-primary)] transition-colors group"
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Upload className="w-6 h-6 mb-1" />
                      <span className="text-xs">Logo</span>
                    </div>
                  )}
                  {logoUploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />

                <p className="text-xs text-slate-400 text-center">
                  PNG, SVG ou JPG · Fundo transparente recomendado · Máx. 2MB
                </p>
              </div>
            </div>

            {/* Seletores de cor */}
            <div className="space-y-4">
              <ColorPicker label="Cor Principal" value={primary} onChange={setPrimary} />
              <ColorPicker label="Cor Secundária" value={secondary} onChange={setSecondary} />
              <ColorPicker label="Cor de Destaque" value={accent} onChange={setAccent} />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Preview
              </Label>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: primary }}>
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-7 w-7 object-contain rounded bg-white/20 p-0.5" />
                  )}
                  <span className="text-white font-semibold text-sm">{org.name}</span>
                  <span className="ml-auto text-white/70 text-xs">Portal</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
                  <div className="h-2 rounded-full w-3/4" style={{ backgroundColor: primary, opacity: 0.15 }} />
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white font-medium"
                      style={{ backgroundColor: primary }}
                    >
                      Banco de Questões
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white font-medium"
                      style={{ backgroundColor: secondary }}
                    >
                      Simulados
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs text-white font-medium"
                      style={{ backgroundColor: accent }}
                    >
                      Destaque
                    </span>
                  </div>
                  <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: secondary, opacity: 0.15 }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="contact_email" className="text-xs">Email de Contato</Label>
              <Input
                id="contact_email"
                type="email"
                placeholder="contato@seucursinho.com.br"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full gap-2 text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          onClick={handleSave}
          disabled={saving || logoUploading}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </PartnerLayout>
  );
}
