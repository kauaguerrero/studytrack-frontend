'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Save, Palette, Upload, Camera, Loader2, UserPlus, Users, Trash2, Mail, ShieldCheck, KeyRound, Copy } from 'lucide-react';
import { toast } from 'sonner';

const BRAND_SWATCHES = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];

interface AssociateMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  active?: boolean | null;
}

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
  const router = useRouter();

  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? '');
  const [logoUploading, setLogoUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl ?? '');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropUrl, setAvatarCropUrl] = useState<string | null>(null);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [avatarCropScale, setAvatarCropScale] = useState(1);
  const [avatarCropPosition, setAvatarCropPosition] = useState({ x: 0, y: 0 });
  const [avatarCropDragging, setAvatarCropDragging] = useState(false);
  const [avatarCropImageSize, setAvatarCropImageSize] = useState<{ w: number; h: number } | null>(null);
  const [primary, setPrimary] = useState(org.brand_primary);
  const [secondary, setSecondary] = useState(org.brand_secondary);
  const [accent, setAccent] = useState(org.brand_accent);
  const [contactEmail, setContactEmail] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    userProfile.themePreference === 'dark' ? 'dark' : 'light',
  );
  const [associates, setAssociates] = useState<AssociateMember[]>([]);
  const [associatesLoading, setAssociatesLoading] = useState(true);
  const [associateSubmitting, setAssociateSubmitting] = useState(false);
  const [associateBusyId, setAssociateBusyId] = useState<string | null>(null);
  const [generatedAccess, setGeneratedAccess] = useState<{ fullName: string; email: string; password: string } | null>(null);
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const [newAssociateName, setNewAssociateName] = useState('');
  const [newAssociateEmail, setNewAssociateEmail] = useState('');
  const [themeSaving, setThemeSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarCropImageRef = useRef<HTMLImageElement>(null);
  const avatarCropDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const CROP_SIZE = 240;

  useEffect(() => {
    const fromProfile = userProfile.themePreference === 'dark' ? 'dark' : 'light';
    const stored = localStorage.getItem(`partner-founder-theme-${org.slug}`);
    if (stored === 'dark' || stored === 'light') {
      setThemeMode(stored);
      return;
    }
    setThemeMode(fromProfile);
  }, [org.slug, userProfile.themePreference]);

  useEffect(() => {
    return () => {
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
    };
  }, [avatarCropUrl]);

  async function fetchAssociates() {
    setAssociatesLoading(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates`);

      if (!res.ok) {
        setAssociates([]);
        return;
      }

      const data = await res.json() as { associates?: AssociateMember[]; items?: AssociateMember[] };
      const list = Array.isArray(data.associates) ? data.associates : Array.isArray(data.items) ? data.items : [];
      setAssociates(list);
    } catch {
      setAssociates([]);
    } finally {
      setAssociatesLoading(false);
    }
  }

  useEffect(() => {
    fetchAssociates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug]);

  function applyFounderTheme(next: 'light' | 'dark') {
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = next;
    root.dataset.partnerTheme = next;
    localStorage.setItem(`partner-founder-theme-${org.slug}`, next);
  }

  async function persistThemePreference(next: 'light' | 'dark'): Promise<boolean> {
    setThemeSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !session.access_token) throw new Error('Sessão inválida.');
      const userId = session.user.id;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const apiRes = await fetch(`${api}/api/account/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme_preference: next }),
      });

      if (!apiRes.ok) {
        // Fallback direto no Supabase caso API externa esteja indisponível.
        const { error } = await supabase
          .from('profiles')
          .update({ theme_preference: next })
          .eq('id', userId);

        if (error) throw error;
      }

      // Verifica persistência real para evitar falso positivo de sucesso.
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', userId)
        .single();

      if (profileCheckError) throw profileCheckError;
      if (profileCheck?.theme_preference !== next) {
        throw new Error('Não foi possível persistir o tema no banco de dados.');
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar o tema.';
      toast.error(message);
      return false;
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

  function getAvatarPathFromPublicUrl(url: string): string | null {
    const match = url.match(/\/avatars\/(.+)$/);
    return match ? match[1] : null;
  }

  function openAvatarCropModal(file: File) {
    if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
    const url = URL.createObjectURL(file);
    setAvatarCropUrl(url);
    setAvatarCropFile(file);
    setAvatarCropScale(1);
    setAvatarCropPosition({ x: 0, y: 0 });
    setAvatarCropImageSize(null);
    setAvatarCropOpen(true);
  }

  function closeAvatarCropModal() {
    if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl);
    setAvatarCropUrl(null);
    setAvatarCropFile(null);
    setAvatarCropOpen(false);
    setAvatarCropDragging(false);
  }

  function onAvatarCropImageLoad() {
    const img = avatarCropImageRef.current;
    if (img?.naturalWidth) {
      setAvatarCropImageSize({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }

  function handleAvatarCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    avatarCropDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: avatarCropPosition.x,
      posY: avatarCropPosition.y,
    };
    setAvatarCropDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handleAvatarCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!avatarCropDragging) return;
    const dx = e.clientX - avatarCropDragStart.current.x;
    const dy = e.clientY - avatarCropDragStart.current.y;
    setAvatarCropPosition({
      x: avatarCropDragStart.current.posX + dx,
      y: avatarCropDragStart.current.posY + dy,
    });
  }

  function handleAvatarCropPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    setAvatarCropDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function getCroppedAvatarBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = avatarCropImageRef.current;
      const w = avatarCropImageSize?.w ?? img?.naturalWidth ?? 0;
      const h = avatarCropImageSize?.h ?? img?.naturalHeight ?? 0;
      if (!img || !w || !h) {
        reject(new Error('Imagem não carregada'));
        return;
      }

      const scale = avatarCropScale;
      const min = Math.min(w, h);
      const visibleSide = min / scale;
      const centerX = w / 2 - (avatarCropPosition.x * min) / (CROP_SIZE * scale);
      const centerY = h / 2 - (avatarCropPosition.y * min) / (CROP_SIZE * scale);
      const sx = Math.max(0, Math.min(w - visibleSide, centerX - visibleSide / 2));
      const sy = Math.max(0, Math.min(h - visibleSide, centerY - visibleSide / 2));
      const sw = Math.min(visibleSide, w - sx);
      const sh = Math.min(visibleSide, h - sy);

      const canvas = document.createElement('canvas');
      canvas.width = CROP_SIZE;
      canvas.height = CROP_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas não disponível'));
        return;
      }

      ctx.beginPath();
      ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CROP_SIZE, CROP_SIZE);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao gerar imagem'));
      }, 'image/jpeg', 0.92);
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, SVG, JPG ou WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    openAvatarCropModal(file);
  }

  async function handleAvatarCropConfirm() {
    if (!avatarCropFile) return;
    setAvatarUploading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id || !session.access_token) throw new Error('Sessão inválida.');

      const blob = await getCroppedAvatarBlob();
      const ext = avatarCropFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeExt = ['png', 'svg', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'jpg';
      const path = `${session.user.id}_${Date.now()}.${safeExt}`;

      const oldPath = avatarUrl ? getAvatarPathFromPublicUrl(avatarUrl) : null;
      if (oldPath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

      const apiRes = await fetch(`${api}/api/account/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (!apiRes.ok) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', session.user.id);
        if (fallbackError) throw fallbackError;
      }

      setAvatarUrl(publicUrl);
      closeAvatarCropModal();
      toast.success('Foto de perfil atualizada.');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar a foto.';
      toast.error(message);
    } finally {
      setAvatarUploading(false);
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

  async function handleCreateAssociate() {
    const email = newAssociateEmail.trim();
    const fullName = newAssociateName.trim();
    if (!email) {
      toast.error('Informe o e-mail do associado.');
      return;
    }
    if (!fullName) {
      toast.error('Informe o nome do associado.');
      return;
    }

    setAssociateSubmitting(true);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studytrack-csrf': '1',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: 'associate',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error || 'Não foi possível adicionar o associado.');
      }

      toast.success('Associado adicionado com sucesso.');
      setNewAssociateEmail('');
      setNewAssociateName('');
      setGeneratedAccess(null);
      await fetchAssociates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar associado.');
    } finally {
      setAssociateSubmitting(false);
    }
  }

  async function handleToggleAssociate(member: AssociateMember) {
    setAssociateBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-studytrack-csrf': '1',
        },
        body: JSON.stringify({ active: !(member.active ?? true) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error || 'Não foi possível atualizar o associado.');
      }
      toast.success((member.active ?? true) ? 'Associado desativado.' : 'Associado reativado.');
      await fetchAssociates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar associado.');
    } finally {
      setAssociateBusyId(null);
    }
  }

  async function handleRemoveAssociate(member: AssociateMember) {
    setAssociateBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}`, {
        method: 'DELETE',
        headers: {
          'x-studytrack-csrf': '1',
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(data.error || 'Não foi possível remover o associado.');
      }
      toast.success('Associado removido.');
      await fetchAssociates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover associado.');
    } finally {
      setAssociateBusyId(null);
    }
  }

  async function handleGenerateTemporaryPassword(member: AssociateMember) {
    setAssociateBusyId(member.id);
    try {
      const res = await fetch(`/api/partners/${org.slug}/associates/${member.id}/password`, {
        method: 'POST',
        headers: {
          'x-studytrack-csrf': '1',
        },
      });
      const data = await res.json().catch(() => ({} as { error?: string; temporary_password?: string }));
      if (!res.ok || !data.temporary_password) {
        throw new Error(data.error || 'Não foi possível gerar senha temporária.');
      }

      setGeneratedAccess({
        fullName: member.full_name || 'Associado',
        email: member.email || 'sem-email',
        password: data.temporary_password,
      });
      setShowGeneratedPassword(false);
      toast.success('Senha temporária gerada com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar senha temporária.');
    } finally {
      setAssociateBusyId(null);
    }
  }

  return (
    <PartnerLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6">
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
                      const prev = themeMode;
                      const next = checked ? 'dark' : 'light';
                      setThemeMode(next);
                      applyFounderTheme(next);
                      const ok = await persistThemePreference(next);
                      if (!ok) {
                        setThemeMode(prev);
                        applyFounderTheme(prev);
                        return;
                      }
                      router.refresh();
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

            <div className="space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Foto de perfil do Founder
              </Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="group relative h-16 w-16 shrink-0 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition hover:brightness-95 disabled:opacity-70"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Foto do founder" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                      {(userProfile.fullName || 'F').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 hidden items-center justify-center bg-black/30 text-white group-hover:flex">
                    <Camera className="h-4 w-4" />
                  </div>
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {avatarUploading ? 'Enviando foto...' : 'Clique para alterar sua foto'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    PNG, SVG, JPG ou WEBP • Máximo 2MB
                  </p>
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Associados
            </CardTitle>
            <CardDescription>
              Professores associados têm acesso exclusivo para corrigir redações dos alunos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedAccess && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/50 dark:bg-amber-900/20">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                  Senha temporária gerada
                </p>
                <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                  Entregue com segurança para <span className="font-semibold">{generatedAccess.fullName}</span> ({generatedAccess.email}).
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded bg-amber-100 px-2.5 py-1.5 text-sm font-bold text-amber-900 dark:bg-amber-800/40 dark:text-amber-100">
                    {showGeneratedPassword ? generatedAccess.password : '••••••••••••'}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setShowGeneratedPassword((prev) => !prev)}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {showGeneratedPassword ? 'Ocultar' : 'Mostrar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={async () => {
                      await navigator.clipboard.writeText(generatedAccess.password);
                      toast.success('Senha copiada.');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                  O associado será obrigado a trocar a senha no primeiro login.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="associate_name" className="text-xs">Nome do associado</Label>
                <Input
                  id="associate_name"
                  placeholder="Nome completo"
                  value={newAssociateName}
                  onChange={(e) => setNewAssociateName(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 space-y-1.5">
                <Label htmlFor="associate_email" className="text-xs">E-mail</Label>
                <Input
                  id="associate_email"
                  type="email"
                  placeholder="professor@cursinho.com"
                  value={newAssociateEmail}
                  onChange={(e) => setNewAssociateEmail(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button
                  type="button"
                  className="w-full gap-2 text-white"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  disabled={associateSubmitting}
                  onClick={handleCreateAssociate}
                >
                  {associateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Adicionar associado
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700">
              {associatesLoading ? (
                <div className="p-4 text-sm text-slate-500">Carregando associados...</div>
              ) : associates.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Nenhum associado cadastrado.</div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {associates.map((member) => (
                    <div key={member.id} className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {member.full_name || 'Associado'}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {member.email || 'Sem e-mail'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{
                            backgroundColor: (member.active ?? true)
                              ? 'color-mix(in srgb, var(--brand-primary) 14%, white)'
                              : 'rgb(241 245 249)',
                            color: (member.active ?? true) ? 'var(--brand-primary)' : 'rgb(71 85 105)',
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {(member.active ?? true) ? 'Ativo' : 'Inativo'}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={associateBusyId === member.id}
                          onClick={() => handleToggleAssociate(member)}
                        >
                          {(member.active ?? true) ? 'Desativar' : 'Reativar'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={associateBusyId === member.id || !(member.active ?? true)}
                          onClick={() => handleGenerateTemporaryPassword(member)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          Senha temporária
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={associateBusyId === member.id}
                          onClick={() => handleRemoveAssociate(member)}
                          className="text-rose-500 hover:text-rose-600"
                          title="Remover associado"
                        >
                          {associateBusyId === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full gap-2 text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
          onClick={handleSave}
          disabled={saving || logoUploading || avatarUploading}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
      {avatarCropOpen && avatarCropUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ajustar foto de perfil</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Arraste para reposicionar e use o zoom.</p>
            </div>

            <div className="relative mb-3 flex justify-center">
              <div
                className="relative h-[240px] w-[240px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={handleAvatarCropPointerDown}
                onPointerMove={handleAvatarCropPointerMove}
                onPointerUp={handleAvatarCropPointerUp}
                onPointerCancel={handleAvatarCropPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={avatarCropImageRef}
                  src={avatarCropUrl}
                  alt="Prévia para corte"
                  onLoad={onAvatarCropImageLoad}
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    transform: `translate(calc(-50% + ${avatarCropPosition.x}px), calc(-50% + ${avatarCropPosition.y}px)) scale(${avatarCropScale})`,
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            </div>

            <div className="mb-4 space-y-1">
              <Label htmlFor="avatar-zoom" className="text-xs text-slate-500">Zoom</Label>
              <input
                id="avatar-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={avatarCropScale}
                onChange={(e) => setAvatarCropScale(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeAvatarCropModal} disabled={avatarUploading}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAvatarCropConfirm}
                disabled={avatarUploading}
                className="text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {avatarUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}
