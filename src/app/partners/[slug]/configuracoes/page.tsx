'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/contexts/OrgContext';
import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Typewriter } from '@/components/ui/typewriter';
import { ArrowLeft, Save, Palette, Upload, Camera, Loader2, Trash2, Plus, X, UsersRound, Clock, Check, Search, TimerReset } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRAZIL_TIMEZONES, DEFAULT_BRAZIL_TIMEZONE } from '@/lib/brazil-timezones';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { onBrandText } from '@/lib/brand-color';
import {
  getOrgTypewriterPreviewKey,
  normalizeOrgTypewriterTagline,
  ORG_TYPEWRITER_LIMITS,
  type OrgTypewriterTagline,
} from '@/lib/org-typewriter-tagline';
import {
  imageHasTransparentPixels,
  normalizeOrgApprovedPhotos,
  ORG_APPROVED_PHOTOS_BUCKET,
  ORG_APPROVED_PHOTOS_LIMITS,
  type OrgApprovedPhoto,
} from '@/lib/org-approved-photos';
import {
  RevealGroup, RevealItem, ElevatedCard, SectionTitle, BrandButton, BrandHero, HERO_ACCENT_COLOR,
} from '@/components/partners/founder-ui';

const BRAND_SWATCHES = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706'];

const WEEKDAY_OPTIONS: { value: string; label: string }[] = [
  { value: 'monday', label: 'Segunda-feira' },
  { value: 'tuesday', label: 'Terça-feira' },
  { value: 'wednesday', label: 'Quarta-feira' },
  { value: 'thursday', label: 'Quinta-feira' },
  { value: 'friday', label: 'Sexta-feira' },
  { value: 'saturday', label: 'Sábado' },
  { value: 'sunday', label: 'Domingo' },
];

interface EssayWindowStudent {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface EssayWindowException {
  id: string;
  student_id: string;
  student_name: string | null;
  window_start_at: string;
  extended_until: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

interface EssayWindowExceptionsData {
  essay_window_enabled: boolean;
  current_window_start_at: string | null;
  students: EssayWindowStudent[];
  exceptions: EssayWindowException[];
}

/** Data de "hoje" (AAAA-MM-DD) no fuso da própria org — não no fuso do navegador do founder. */
function getOrgTodayDateString(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** "05/09 20:00" no fuso da org — para exibir horários de exceções sem o founder ter que converter fuso de cabeça. */
function formatInOrgTz(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
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
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
        {/* Swatch grande clicável abre o color picker nativo */}
        <label className="cursor-pointer shrink-0">
          <div
            className="w-12 h-12 rounded-xl shadow-sm transition-transform hover:scale-105"
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
  const initialTagline = normalizeOrgTypewriterTagline(org.typewriter_tagline);
  const [taglineStaticText, setTaglineStaticText] = useState(initialTagline.staticText);
  const [taglineAnimatedTexts, setTaglineAnimatedTexts] = useState<string[]>(initialTagline.animatedTexts);
  const [approvedPhotos, setApprovedPhotos] = useState<OrgApprovedPhoto[]>(() => normalizeOrgApprovedPhotos(org.approved_student_photos));
  const [approvedPhotoUploading, setApprovedPhotoUploading] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    userProfile.themePreference === 'dark' ? 'dark' : 'light',
  );
  const [themeSaving, setThemeSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgTimezone, setOrgTimezone] = useState(org.timezone ?? DEFAULT_BRAZIL_TIMEZONE);
  const [windowEnabled, setWindowEnabled] = useState(org.essay_window_enabled ?? false);
  const [windowStartDay, setWindowStartDay] = useState(org.essay_window_start_day ?? 'wednesday');
  const [windowStartTime, setWindowStartTime] = useState((org.essay_window_start_time ?? '15:00').slice(0, 5));
  const [windowEndDay, setWindowEndDay] = useState(org.essay_window_end_day ?? 'saturday');
  const [windowEndTime, setWindowEndTime] = useState((org.essay_window_end_time ?? '12:00').slice(0, 5));
  const [savingWindow, setSavingWindow] = useState(false);
  const [exceptionsData, setExceptionsData] = useState<EssayWindowExceptionsData | null>(null);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsSaving, setExceptionsSaving] = useState(false);
  const [exceptionsDeletingId, setExceptionsDeletingId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [extendDate, setExtendDate] = useState(() => getOrgTodayDateString(org.timezone ?? DEFAULT_BRAZIL_TIMEZONE));
  const [extendTime, setExtendTime] = useState('20:00');
  const [extendReason, setExtendReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const approvedPhotoInputRef = useRef<HTMLInputElement>(null);
  const avatarCropImageRef = useRef<HTMLImageElement>(null);
  const avatarCropDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const CROP_SIZE = 240;
  const taglinePreview: OrgTypewriterTagline = normalizeOrgTypewriterTagline({
    staticText: taglineStaticText,
    animatedTexts: taglineAnimatedTexts,
  });

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
    const typewriterTagline = {
      staticText: taglineStaticText.trim(),
      animatedTexts: taglineAnimatedTexts.map((text) => text.trim()).filter(Boolean),
    };
    if (!typewriterTagline.staticText) {
      toast.error('Informe o texto fixo da frase do portal.');
      return;
    }
    if (typewriterTagline.staticText.length > ORG_TYPEWRITER_LIMITS.staticTextMax) {
      toast.error(`O texto fixo deve ter no máximo ${ORG_TYPEWRITER_LIMITS.staticTextMax} caracteres.`);
      return;
    }
    if (typewriterTagline.animatedTexts.length < ORG_TYPEWRITER_LIMITS.animatedMin) {
      toast.error('Informe pelo menos uma frase animada.');
      return;
    }
    if (typewriterTagline.animatedTexts.length > ORG_TYPEWRITER_LIMITS.animatedMax) {
      toast.error(`Use no máximo ${ORG_TYPEWRITER_LIMITS.animatedMax} frases animadas.`);
      return;
    }
    if (typewriterTagline.animatedTexts.some((text) => text.length > ORG_TYPEWRITER_LIMITS.animatedTextMax)) {
      toast.error(`Cada frase animada deve ter no máximo ${ORG_TYPEWRITER_LIMITS.animatedTextMax} caracteres.`);
      return;
    }

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
      const payload: Record<string, unknown> = {
        ...body,
        typewriter_tagline: typewriterTagline,
        approved_student_photos: approvedPhotos,
      };
      // Remove cache-buster antes de salvar
      if (logoUrl) payload.logo_url = logoUrl.split('?t=')[0];
      if (contactEmail) payload.contact_email = contactEmail;

      const res = await fetch(`${api}/api/partners/${org.slug}/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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

  async function handleSaveEssayWindow() {
    if (windowEnabled) {
      if (windowStartDay === windowEndDay && windowStartTime === windowEndTime) {
        toast.error('O início e o fim da janela não podem ser idênticos.');
        return;
      }
      if (!windowStartTime || !windowEndTime) {
        toast.error('Informe os horários de abertura e fechamento.');
        return;
      }
    }

    setSavingWindow(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSavingWindow(false);
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timezone: orgTimezone,
          essay_window_enabled: windowEnabled,
          essay_window_start_day: windowStartDay,
          essay_window_start_time: windowStartTime,
          essay_window_end_day: windowEndDay,
          essay_window_end_time: windowEndTime,
        }),
      });

      if (res.ok) {
        toast.success('Janela de envio de redações salva!');
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        toast.error(data.error || 'Erro ao salvar.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setSavingWindow(false);
    }
  }

  async function fetchEssayWindowExceptions() {
    setExceptionsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
      const res = await fetch(`${api}/api/partners/${org.slug}/essay-window-exceptions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setExceptionsData(await res.json());
      }
    } catch {
      // silencioso — a seção de exceções fica vazia, o resto da página segue normal
    } finally {
      setExceptionsLoading(false);
    }
  }

  useEffect(() => {
    void fetchEssayWindowExceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.slug]);

  function toggleSelectedStudent(id: string) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]));
  }

  async function handleApplyEssayWindowException() {
    if (selectedStudentIds.length === 0) {
      toast.error('Selecione ao menos um aluno.');
      return;
    }
    if (!extendDate || !extendTime) {
      toast.error('Informe a data e o horário do novo fechamento.');
      return;
    }

    setExceptionsSaving(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setExceptionsSaving(false);
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/essay-window-exceptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_ids: selectedStudentIds,
          extended_until_date: extendDate,
          extended_until_time: extendTime,
          reason: extendReason.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({} as { error?: string }));
      if (res.ok) {
        toast.success(
          selectedStudentIds.length === 1
            ? 'Prazo estendido para o aluno selecionado!'
            : `Prazo estendido para ${selectedStudentIds.length} alunos!`,
        );
        setSelectedStudentIds([]);
        setExtendReason('');
        await fetchEssayWindowExceptions();
      } else {
        toast.error(data.error || 'Erro ao salvar exceção.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setExceptionsSaving(false);
    }
  }

  async function handleDeleteEssayWindowException(studentId: string) {
    setExceptionsDeletingId(studentId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setExceptionsDeletingId(null);
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    try {
      const res = await fetch(`${api}/api/partners/${org.slug}/essay-window-exceptions/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        toast.success('Exceção removida — o aluno volta à janela padrão.');
        await fetchEssayWindowExceptions();
      } else {
        const data = await res.json().catch(() => ({} as { error?: string }));
        toast.error(data.error || 'Erro ao remover exceção.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setExceptionsDeletingId(null);
    }
  }

  function updateAnimatedTagline(index: number, value: string) {
    setTaglineAnimatedTexts((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function addAnimatedTagline() {
    setTaglineAnimatedTexts((prev) => (
      prev.length >= ORG_TYPEWRITER_LIMITS.animatedMax ? prev : [...prev, 'aprovar.']
    ));
  }

  function removeAnimatedTagline(index: number) {
    setTaglineAnimatedTexts((prev) => {
      if (prev.length <= ORG_TYPEWRITER_LIMITS.animatedMin) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleApprovedPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setApprovedPhotoUploading(true);
    try {
      const supabase = createClient();
      const uploaded: OrgApprovedPhoto[] = [];

      for (const file of files) {
        if (!['image/png', 'image/webp'].includes(file.type)) {
          throw new Error('Use apenas PNG ou WEBP com fundo transparente.');
        }
        if (file.size > ORG_APPROVED_PHOTOS_LIMITS.maxFileSizeBytes) {
          throw new Error('Cada imagem deve ter no máximo 2MB.');
        }

        const hasTransparency = await imageHasTransparentPixels(file);
        if (!hasTransparency) {
          toast.warning(`Não consegui confirmar transparência em "${file.name}", mas a foto será enviada.`);
        }

        const ext = file.type === 'image/webp' ? 'webp' : 'png';
        const path = `${org.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(ORG_APPROVED_PHOTOS_BUCKET)
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(ORG_APPROVED_PHOTOS_BUCKET).getPublicUrl(path);
        uploaded.push({
          url: publicUrl,
          path,
          alt: `Aprovado ${approvedPhotos.length + uploaded.length + 1}`,
        });
      }

      setApprovedPhotos((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} foto${uploaded.length === 1 ? '' : 's'} adicionada${uploaded.length === 1 ? '' : 's'}. Salve para publicar.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível enviar as fotos.');
    } finally {
      setApprovedPhotoUploading(false);
    }
  }

  async function handleRemoveApprovedPhoto(photo: OrgApprovedPhoto) {
    setApprovedPhotos((prev) => prev.filter((item) => item.path !== photo.path));
    try {
      const supabase = createClient();
      await supabase.storage.from(ORG_APPROVED_PHOTOS_BUCKET).remove([photo.path]);
    } catch {
      // A lista salva é a fonte de verdade; se o objeto já não existir, a remoção visual continua válida.
    }
  }

  return (
    <PartnerLayout>
      <div className="edificar-page-canvas min-h-full -mx-4 -mt-4 px-4 pt-4 pb-8 md:-mx-8 md:-mt-8 md:px-8 md:pt-8 [--partner-surface-base:#ffffff] dark:[--partner-surface-base:#0f172a]">
        <RevealGroup className="edificar-page-frame mx-auto w-full max-w-4xl p-3 md:p-4">

        <RevealItem className="mb-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
            <Link href={`/partners/${org.slug}/dashboard`}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
        </RevealItem>

        <RevealItem className="mb-5">
          <BrandHero>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
              <Palette className="mr-1.5 inline h-3.5 w-3.5" style={{ color: HERO_ACCENT_COLOR }} />
              Aparência do portal
            </p>
            <h1 className="font-display text-[28px] font-black text-white lg:text-[34px]">Configurações</h1>
            <p className="mt-1 text-[13px] text-white/60">
              Personalize a identidade visual do portal com uma leitura mais quente e elegante.
            </p>
          </BrandHero>
        </RevealItem>

        <div className="flex flex-col gap-5">

        {/* Identidade Visual */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
          <div className="p-5">
            <SectionTitle
              kicker="Identidade Visual"
              title="Marca do cursinho"
              hex={org.brand_primary}
              action={
                <p className="max-w-[220px] text-right text-[11px] text-slate-400 dark:text-white/40">
                  Aplicadas no portal dos alunos e na landing page.
                </p>
              }
            />
            <div className="space-y-6">
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
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

            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Foto de perfil do Founder
              </Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="group relative h-16 w-16 shrink-0 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 transition hover:brightness-95 disabled:opacity-70"
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
                  className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-white/5 overflow-hidden hover:border-[var(--brand-primary)] transition-colors group"
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
              <div className="rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: primary }}>
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-7 w-7 object-contain" />
                  )}
                  <span className="font-semibold text-sm" style={{ color: onBrandText(primary) }}>{org.name}</span>
                  <span className="ml-auto text-xs opacity-70" style={{ color: onBrandText(primary) }}>Portal</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 space-y-3">
                  <div className="h-2 rounded-full w-3/4" style={{ backgroundColor: primary, opacity: 0.15 }} />
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: primary, color: onBrandText(primary) }}
                    >
                      Banco de Questões
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: secondary, color: onBrandText(secondary) }}
                    >
                      Simulados
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: accent, color: onBrandText(accent) }}
                    >
                      Destaque
                    </span>
                  </div>
                  <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: secondary, opacity: 0.15 }} />
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Frase do portal
                  </Label>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Aparece no dashboard do founder e dos alunos da organização.
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-white/40">
                  Preview em tempo real
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tagline_static" className="text-xs">Texto fixo</Label>
                    <Input
                      id="tagline_static"
                      value={taglineStaticText}
                      maxLength={ORG_TYPEWRITER_LIMITS.staticTextMax}
                      onChange={(e) => setTaglineStaticText(e.target.value)}
                      placeholder="Nós nascemos para"
                    />
                    <p className="text-[11px] text-slate-400">
                      {taglineStaticText.trim().length}/{ORG_TYPEWRITER_LIMITS.staticTextMax}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs">Frases animadas</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs"
                        onClick={addAnimatedTagline}
                        disabled={taglineAnimatedTexts.length >= ORG_TYPEWRITER_LIMITS.animatedMax}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {taglineAnimatedTexts.map((text, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={text}
                            maxLength={ORG_TYPEWRITER_LIMITS.animatedTextMax}
                            onChange={(e) => updateAnimatedTagline(index, e.target.value)}
                            placeholder="aprovar."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-slate-400 hover:text-rose-500"
                            title="Remover frase"
                            disabled={taglineAnimatedTexts.length <= ORG_TYPEWRITER_LIMITS.animatedMin}
                            onClick={() => removeAnimatedTagline(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Use de {ORG_TYPEWRITER_LIMITS.animatedMin} a {ORG_TYPEWRITER_LIMITS.animatedMax} frases, até {ORG_TYPEWRITER_LIMITS.animatedTextMax} caracteres cada.
                    </p>
                  </div>
                </div>

                <div
                  className="flex min-h-[180px] items-center rounded-2xl p-4 shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${secondary} 78%, black))`,
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">
                      {org.name}
                    </p>
                    <div
                      className="font-script mt-2 text-[24px] leading-tight text-white sm:text-[28px]"
                      style={{ ['--hero-accent' as string]: HERO_ACCENT_COLOR }}
                    >
                      {taglinePreview.staticText}{' '}
                      <Typewriter
                        key={getOrgTypewriterPreviewKey(taglinePreview)}
                        text={taglinePreview.animatedTexts}
                        speed={95}
                        deleteSpeed={52}
                        waitTime={2600}
                        className="text-[var(--hero-accent)]"
                        cursorClassName="text-[var(--hero-accent)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Fotos de aprovados
                  </Label>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    PNG ou WEBP sem fundo para aparecer no card principal dos alunos.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 self-start"
                  disabled={approvedPhotoUploading}
                  onClick={() => approvedPhotoInputRef.current?.click()}
                >
                  {approvedPhotoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Adicionar fotos
                </Button>
                <input
                  ref={approvedPhotoInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleApprovedPhotoUpload}
                />
              </div>

              {approvedPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {approvedPhotos.map((photo, index) => (
                    <div
                      key={photo.path}
                      className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-900/90 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.alt}
                        className="h-full w-full object-contain p-1.5"
                      />
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7 bg-black/40 text-white opacity-0 hover:bg-black/60 hover:text-white group-hover:opacity-100"
                        title="Remover foto"
                        onClick={() => handleRemoveApprovedPhoto(photo)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Nenhuma foto selecionada. O card do aluno continua sem fotos.
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Depois de adicionar ou remover fotos, clique em salvar configurações.
              </p>
            </div>
            </div>
          </div>
        </ElevatedCard>
        </RevealItem>

        {/* Contato */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-secondary)" className="edificar-major-surface">
          <div className="p-5">
            <SectionTitle kicker="Portal" title="Contato" hex={org.brand_secondary} />
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
          </div>
        </ElevatedCard>
        </RevealItem>

        <RevealItem>
        <ElevatedCard accentColor="var(--brand-accent)" className="edificar-major-surface">
          <div className="p-5 flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `color-mix(in srgb, var(--brand-accent) 14%, white)` }}
            >
              <UsersRound className="h-6 w-6" style={{ color: `var(--brand-accent)` }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gestão de Associados</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                Adicione correctores, configure permissões e acompanhe métricas do time no dashboard de associados.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/partners/${org.slug}/associados`}>
                <UsersRound className="h-3.5 w-3.5" />
                Ir para o Dashboard de Associados
              </Link>
            </Button>
          </div>
        </ElevatedCard>
        </RevealItem>

        {/* Janela de envio de redações */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
          <div className="p-5 space-y-5">
            <div>
              <SectionTitle kicker="Redações" title="Janela de envio de redações" hex={org.brand_primary} />
              <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
                Restrinja os dias e horários em que os alunos podem enviar novas redações. Por padrão, sem restrição, os alunos podem enviar a qualquer momento.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Fuso horário desta escola
              </Label>
              <Select value={orgTimezone} onValueChange={setOrgTimezone}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZIL_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Usado para calcular corretamente a janela abaixo — não observa horário de verão.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Restringir envio de redações</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {windowEnabled ? 'Ativado — só aceita envios dentro da janela abaixo.' : 'Desativado — alunos podem enviar a qualquer hora.'}
                </p>
              </div>
              <Switch checked={windowEnabled} onCheckedChange={setWindowEnabled} />
            </div>

            {windowEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Abre</Label>
                  <Select value={windowStartDay} onValueChange={setWindowStartDay}>
                    <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={windowStartTime}
                    onChange={(e) => setWindowStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Fecha</Label>
                  <Select value={windowEndDay} onValueChange={setWindowEndDay}>
                    <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={windowEndTime}
                    onChange={(e) => setWindowEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSaveEssayWindow}
              disabled={savingWindow}
            >
              <Clock className="h-3.5 w-3.5" />
              {savingWindow ? 'Salvando...' : 'Salvar janela de envio'}
            </Button>
          </div>
        </ElevatedCard>
        </RevealItem>

        {/* Exceções pontuais da janela de envio, por aluno */}
        <RevealItem>
        <ElevatedCard accentColor="var(--brand-primary)" className="edificar-major-surface">
          <div className="p-5 space-y-5">
            <div>
              <SectionTitle kicker="Redações" title="Exceção de prazo por aluno" hex={org.brand_primary} />
              <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
                Estenda o fechamento da janela atual só para alunos específicos (ex: um aluno passou mal e precisa de mais tempo). O início da janela não muda, e a extensão vale só até a próxima abertura — depois disso o aluno volta ao horário padrão de todo mundo.
              </p>
            </div>

            {!windowEnabled ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                Ative e salve a janela de envio acima para poder configurar exceções por aluno.
              </p>
            ) : exceptionsLoading && !exceptionsData ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Carregando...</p>
            ) : (
              <>
                {exceptionsData?.current_window_start_at && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Janela atual abriu em <strong>{formatInOrgTz(exceptionsData.current_window_start_at, orgTimezone)}</strong> — a extensão abaixo estende o fechamento dela.
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Alunos
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Buscar aluno..."
                      className="pl-8"
                    />
                  </div>
                  <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-xl bg-slate-50 p-1.5 dark:bg-white/5">
                    {(exceptionsData?.students || [])
                      .filter((s) => (s.full_name || s.email || '').toLowerCase().includes(studentSearch.trim().toLowerCase()))
                      .map((s) => {
                        const checked = selectedStudentIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleSelectedStudent(s.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors',
                              checked
                                ? 'bg-white font-semibold text-slate-800 shadow-sm dark:bg-white/10 dark:text-white'
                                : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/5',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                checked ? 'border-transparent' : 'border-slate-300 dark:border-white/20',
                              )}
                              style={checked ? { backgroundColor: 'var(--brand-primary)' } : undefined}
                            >
                              {checked && <Check className="h-3 w-3 text-white" />}
                            </span>
                            {s.full_name || s.email || 'Sem nome'}
                          </button>
                        );
                      })}
                    {(exceptionsData?.students || []).length === 0 && (
                      <p className="p-2 text-xs text-slate-400">Nenhum aluno encontrado nesta escola.</p>
                    )}
                  </div>
                  {selectedStudentIds.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedStudentIds.length} aluno{selectedStudentIds.length > 1 ? 's' : ''} selecionado{selectedStudentIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Estender fechamento até</Label>
                    <Input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Horário</Label>
                    <Input type="time" value={extendTime} onChange={(e) => setExtendTime(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Motivo (opcional)</Label>
                  <Input
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="Ex: passou mal durante a aula"
                    maxLength={300}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleApplyEssayWindowException}
                  disabled={exceptionsSaving || selectedStudentIds.length === 0}
                >
                  <TimerReset className="h-3.5 w-3.5" />
                  {exceptionsSaving ? 'Salvando...' : 'Estender prazo'}
                </Button>

                {(exceptionsData?.exceptions.length ?? 0) > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-4 dark:border-white/10">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Exceções ativas nesta janela
                    </Label>
                    <div className="space-y-1.5">
                      {exceptionsData!.exceptions.map((exc) => (
                        <div
                          key={exc.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-white/5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {exc.student_name || 'Aluno removido'}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              Até {formatInOrgTz(exc.extended_until, orgTimezone)}
                              {exc.reason ? ` — ${exc.reason}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteEssayWindowException(exc.student_id)}
                            disabled={exceptionsDeletingId === exc.student_id}
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                            title="Remover exceção"
                          >
                            {exceptionsDeletingId === exc.student_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ElevatedCard>
        </RevealItem>

        <RevealItem>
        <BrandButton
          className="w-full justify-center"
          hex={org.brand_primary}
          onClick={handleSave}
          disabled={saving || logoUploading || avatarUploading}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </BrandButton>
        </RevealItem>

        </div>
        </RevealGroup>
      </div>
      {avatarCropOpen && avatarCropUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
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
              <BrandButton
                type="button"
                onClick={handleAvatarCropConfirm}
                disabled={avatarUploading}
                hex={org.brand_primary}
              >
                {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar
              </BrandButton>
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  );
}
