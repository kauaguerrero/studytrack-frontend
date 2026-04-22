'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  User,
  Shield,
  Settings,
  Loader2,
  Camera,
  Laptop,
  Mail,
  Palette,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react'

interface ProfileData {
  id: string
  full_name: string | null
  email: string | null
  whatsapp_phone: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  email_notifications: boolean
  theme_preference?: string | null
}

interface UserData {
  id: string
  email: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

interface UserSession {
  id: string
  user_id: string
  device_info: string | null
  ip_address: string | null
  location: string | null
  last_active_at: string | null
  is_active: boolean
}

type TabKey = 'personal' | 'security' | 'preferences'

const CROP_SIZE = 240
const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function getAvatarPathFromPublicUrl(url: string): string | null {
  const match = url.match(/\/avatars\/(.+)$/)
  return match ? match[1] : null
}

export default function AdminProfilePage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [profileState, setProfileState] = useState<ProfileData | null>(null)
  const [userState, setUserState] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  // Personal
  const [fullName, setFullName] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // Security
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [loadingAuthUser, setLoadingAuthUser] = useState(false)
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [newEmailInput, setNewEmailInput] = useState('')
  const [requestingEmailChange, setRequestingEmailChange] = useState(false)
  const [cancelingEmail, setCancelingEmail] = useState(false)

  // Preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [themePref, setThemePref] = useState('system')

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarViewOpen, setAvatarViewOpen] = useState(false)
  const [avatarCropUrl, setAvatarCropUrl] = useState<string | null>(null)
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)
  const [avatarCropPosition, setAvatarCropPosition] = useState({ x: 0, y: 0 })
  const [avatarCropScale, setAvatarCropScale] = useState(1)
  const [avatarCropImageSize, setAvatarCropImageSize] = useState<{ w: number; h: number } | null>(null)
  const [avatarCropDragging, setAvatarCropDragging] = useState(false)
  const cropDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const cropImageRef = useRef<HTMLImageElement>(null)

  // ID copy
  const [copiedId, setCopiedId] = useState(false)

  const supabase = createClient()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null)
    })
  }, [supabase.auth])

  const profileFetcher = useCallback(
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar perfil.')
        return r.json()
      }),
    []
  )

  const { data: profileResponse, isLoading: profileLoading, mutate: mutateProfile } =
    useSWR<{ profile: ProfileData; user: UserData }>(
      token ? [`${apiUrl}/api/account/profile`, token] : null,
      profileFetcher,
      { revalidateOnFocus: false }
    )

  const profile = profileResponse?.profile ?? profileState
  const user = profileResponse?.user ?? userState

  useEffect(() => {
    const p = profileResponse?.profile
    const u = profileResponse?.user
    if (!p) return
    setProfileState(p)
    setUserState(u ?? null)
    setFullName(p.full_name ?? '')
    setWhatsappPhone(p.whatsapp_phone ?? p.phone ?? '')
    setEmailNotifications(p.email_notifications ?? true)
    setThemePref(p.theme_preference ?? 'system')
  }, [profileResponse])

  useEffect(() => {
    if (activeTab !== 'security') return
    let cancelled = false
    setLoadingAuthUser(true)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setAuthUser(user ?? null)
    }).finally(() => { if (!cancelled) setLoadingAuthUser(false) })
    return () => { cancelled = true }
  }, [activeTab, supabase.auth])

  const fetchSessions = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setLoadingSessions(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/sessions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao carregar sessões.')
      const data = await res.json()
      setActiveSessions(data.sessions ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar sessões.')
    } finally {
      setLoadingSessions(false)
    }
  }, [apiUrl, supabase.auth])

  useEffect(() => {
    if (activeTab === 'security') fetchSessions()
  }, [activeTab, fetchSessions])

  const formatLastActive = (iso: string | null): string => {
    if (!iso) return '—'
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `Há ${diffDays} dias`
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const handleUpdateProfile = async (payload: Partial<ProfileData>, loaderSetter: (v: boolean) => void) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    loaderSetter(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Falha ao salvar.')
      toast.success('Perfil atualizado.')
      mutateProfile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      loaderSetter(false)
    }
  }

  const handleSavePersonal = () =>
    handleUpdateProfile({ full_name: fullName || null, whatsapp_phone: whatsappPhone || null }, setSavingPersonal)

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem.'); return }
    if (newPassword.length < 8) { toast.error('Mínimo 8 caracteres.'); return }
    if (!user?.email) return
    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) { toast.error('Senha atual incorreta.'); return }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Senha atualizada.')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleRequestEmailChange = async () => {
    const trimmed = newEmailInput.trim()
    if (!trimmed) { toast.error('Digite o novo e-mail.'); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { toast.error('Sessão inválida.'); return }
    setRequestingEmailChange(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ new_email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Erro ao solicitar troca.')
      toast.success(`Link enviado para ${trimmed}`)
      setNewEmailInput('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao solicitar troca de e-mail.')
    } finally {
      setRequestingEmailChange(false)
    }
  }

  const handleCancelEmailChange = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    setCancelingEmail(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/change-email`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) throw new Error('Falha ao cancelar.')
      toast.success('Solicitação cancelada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro.')
    } finally {
      setCancelingEmail(false)
    }
  }

  const hasGoogleProvider = Boolean(authUser?.identities?.some((i) => i.provider === 'google'))
  const googleIdentity = authUser?.identities?.find((i) => i.provider === 'google')

  const handleLinkGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
    if (error) { toast.error(error.message ?? 'Falha ao vincular.'); return }
    toast.success('Conta Google vinculada.')
    const { data: { user: u } } = await supabase.auth.getUser()
    setAuthUser(u ?? null)
  }

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
    if (error) { toast.error(error.message ?? 'Falha ao desvincular.'); return }
    toast.success('Conta Google desvinculada.')
    const { data: { user: u } } = await supabase.auth.getUser()
    setAuthUser(u ?? null)
  }

  const handleRevokeSession = async (sessionId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch(`${apiUrl}/api/account/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Falha ao revogar.')
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Sessão revogada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao revogar sessão.')
    }
  }

  const handleSavePreferences = (field: 'email' | 'theme', value: string | boolean) => {
    if (field === 'email') {
      setEmailNotifications(value as boolean)
      handleUpdateProfile({ email_notifications: value as boolean }, () => {})
    } else {
      const val = value as string
      setThemePref(val)
      setTheme(val)
      handleUpdateProfile({ theme_preference: val }, () => {})
    }
  }

  // ── Avatar crop logic ──────────────────────────────────────────────────────

  const openCropModal = (file: File) => {
    if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
    setAvatarCropUrl(URL.createObjectURL(file))
    setAvatarCropFile(file)
    setAvatarCropPosition({ x: 0, y: 0 })
    setAvatarCropScale(1)
    setAvatarCropImageSize(null)
    setAvatarCropOpen(true)
  }

  const closeCropModal = () => {
    if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
    setAvatarCropUrl(null)
    setAvatarCropFile(null)
    setAvatarCropOpen(false)
  }

  const handleCropPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    cropDragStart.current = { x: e.clientX, y: e.clientY, posX: avatarCropPosition.x, posY: avatarCropPosition.y }
    setAvatarCropDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!avatarCropDragging) return
    setAvatarCropPosition({
      x: cropDragStart.current.posX + (e.clientX - cropDragStart.current.x),
      y: cropDragStart.current.posY + (e.clientY - cropDragStart.current.y),
    })
  }

  const handleCropPointerUp = (e: React.PointerEvent) => {
    setAvatarCropDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const getCroppedAvatarBlob = (): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = cropImageRef.current
      const w = avatarCropImageSize?.w ?? img?.naturalWidth ?? 0
      const h = avatarCropImageSize?.h ?? img?.naturalHeight ?? 0
      if (!img || !w || !h) { reject(new Error('Imagem não carregada')); return }
      const min = Math.min(w, h)
      const visibleSide = min / avatarCropScale
      const centerX = w / 2 - (avatarCropPosition.x * min) / (CROP_SIZE * avatarCropScale)
      const centerY = h / 2 - (avatarCropPosition.y * min) / (CROP_SIZE * avatarCropScale)
      const sx = Math.max(0, Math.min(w - visibleSide, centerX - visibleSide / 2))
      const sy = Math.max(0, Math.min(h - visibleSide, centerY - visibleSide / 2))
      const sw = Math.min(visibleSide, w - sx)
      const sh = Math.min(visibleSide, h - sy)
      const canvas = document.createElement('canvas')
      canvas.width = CROP_SIZE; canvas.height = CROP_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas indisponível')); return }
      ctx.beginPath()
      ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
      ctx.closePath(); ctx.clip()
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CROP_SIZE, CROP_SIZE)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', 0.92)
    })

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    if (file.size > MAX_AVATAR_BYTES) { toast.error('Imagem deve ter no máximo 2MB.'); return }
    openCropModal(file)
  }

  const handleAvatarCropConfirm = async () => {
    if (!avatarCropFile || !user?.id) return
    setAvatarCropOpen(false)
    setAvatarUploading(true)
    try {
      const blob = await getCroppedAvatarBlob()
      const ext = (['jpg','jpeg','png','webp'].includes(avatarCropFile.name.split('.').pop()?.toLowerCase() ?? ''))
        ? avatarCropFile.name.split('.').pop()!.toLowerCase() : 'jpg'
      const path = `${user.id}_${Date.now()}.${ext}`

      if (profile?.avatar_url) {
        const oldPath = getAvatarPathFromPublicUrl(profile.avatar_url)
        if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão inválida.')

      const res = await fetch(`${apiUrl}/api/account/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })
      if (!res.ok) throw new Error('Falha ao salvar avatar.')

      setProfileState((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null))
      mutateProfile()
      router.refresh()
      toast.success('Foto atualizada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha no upload.')
    } finally {
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
      setAvatarCropUrl(null); setAvatarCropFile(null); setAvatarUploading(false)
    }
  }

  // ── Copy ID ────────────────────────────────────────────────────────────────

  const handleCopyId = () => {
    if (!profile?.id) return
    navigator.clipboard.writeText(profile.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  // ── Tabs config ────────────────────────────────────────────────────────────

  const navItems = [
    { id: 'personal', label: 'Identidade', icon: User },
    { id: 'security', label: 'Acesso & Segurança', icon: Shield },
    { id: 'preferences', label: 'Preferências', icon: Settings },
  ] as const

  const PersonalSkeleton = () => (
    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 mt-2" />
      </CardHeader>
      <CardContent className="space-y-8 pt-8 px-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /><Skeleton className="h-8 w-28 mt-2" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-10 w-full sm:col-span-2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
      <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5">
        <Skeleton className="h-10 w-40" />
      </CardFooter>
    </Card>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/50">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12 lg:px-8">

        <div className="mb-10 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                Admin Profile
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configurações da sua conta de administrador.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:items-start">

          {/* Nav sidebar */}
          <nav className="flex md:w-64 flex-shrink-0 flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible pb-4 md:pb-0 scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 translate-x-1'
                      : 'text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 hover:shadow-sm'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-500 transition-colors'} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

              {/* TAB: IDENTIDADE */}
              {activeTab === 'personal' && (
                profileLoading ? <PersonalSkeleton /> : (
                  <div className="space-y-6">
                    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                        <CardTitle className="text-2xl font-bold tracking-tight">Identidade</CardTitle>
                        <CardDescription className="text-sm mt-1 text-muted-foreground">
                          Dados básicos da sua conta de administrador.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8 pt-8 px-8">
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" aria-hidden onChange={handleAvatarFileSelect} />

                        {/* Avatar */}
                        <div className="flex items-center gap-6">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-3xl font-bold text-white shadow-xl ring-4 ring-white dark:ring-slate-900 transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:pointer-events-none disabled:opacity-70"
                          >
                            {avatarUploading ? (
                              <Loader2 className="h-8 w-8 animate-spin text-white" />
                            ) : profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              fullName.charAt(0)?.toUpperCase() || '?'
                            )}
                            {!avatarUploading && (
                              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                                <Camera className="h-6 w-6 text-white" />
                              </div>
                            )}
                          </button>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg truncate">{fullName || 'Admin'}</h3>
                              <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{user?.email ?? ''}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {profile?.avatar_url && (
                                <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs font-semibold" onClick={() => setAvatarViewOpen(true)} disabled={avatarUploading}>
                                  Ver foto
                                </Button>
                              )}
                              <Button type="button" variant="outline" size="sm" className="rounded-lg h-8 text-xs font-semibold" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
                                {avatarUploading ? 'Enviando…' : 'Alterar Avatar'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Fields */}
                        <div className="grid gap-6 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-200 font-bold">Nome Completo</Label>
                            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500 transition-all" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="phone" className="text-slate-700 dark:text-slate-200 font-bold">WhatsApp / Telefone</Label>
                            <Input id="phone" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="(11) 99999-9999" className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500" />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5 flex justify-end">
                        <Button onClick={handleSavePersonal} disabled={savingPersonal} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-semibold shadow-md transition-all">
                          {savingPersonal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                          Salvar
                        </Button>
                      </CardFooter>
                    </Card>

                    {/* ID Card */}
                    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 pb-5 pt-6 px-8">
                        <CardTitle className="text-base font-bold">Identificadores da Conta</CardTitle>
                        <CardDescription className="text-xs mt-1">Referência interna para operações e debugging.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 px-8 space-y-4">
                        <div className="flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wider">User ID</p>
                            <p className="text-sm font-mono text-slate-700 dark:text-slate-200 truncate">{profile?.id ?? '—'}</p>
                          </div>
                          <button
                            onClick={handleCopyId}
                            className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors"
                            title="Copiar ID"
                          >
                            {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wider">Role</p>
                          <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400">{profile?.role ?? 'admin'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              )}

              {/* TAB: ACESSO & SEGURANÇA */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Senha */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold tracking-tight">Credenciais de Acesso</CardTitle>
                      <CardDescription className="text-sm mt-1 text-muted-foreground">
                        E-mail: <span className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{user?.email}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-8 px-8 max-w-xl">
                      <div className="space-y-2">
                        <Label className="font-bold">Senha Atual</Label>
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Nova Senha</Label>
                          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Confirmação</Label>
                          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5">
                      <Button onClick={handleSavePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-8 shadow-md">
                        {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar Senha
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Troca de e-mail */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold tracking-tight">Endereço de E-mail</CardTitle>
                      <CardDescription className="text-sm mt-1 text-muted-foreground">
                        Atual: <span className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{user?.email}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-8 px-8 max-w-xl">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Um link de confirmação será enviado para o novo endereço. A troca só é efetivada após confirmação.</p>
                      <div className="space-y-2">
                        <Label className="font-bold">Novo E-mail</Label>
                        <Input type="email" placeholder="novoemail@exemplo.com" value={newEmailInput} onChange={(e) => setNewEmailInput(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-indigo-500" />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5 flex items-center gap-3">
                      <Button onClick={handleRequestEmailChange} disabled={requestingEmailChange || !newEmailInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold px-8 shadow-md">
                        {requestingEmailChange && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar link
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelEmailChange} disabled={cancelingEmail} className="text-slate-500 hover:text-red-500 hover:bg-red-50 text-xs font-semibold">
                        {cancelingEmail && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Cancelar solicitação pendente
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Contas conectadas */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 pb-5 pt-6 px-8">
                      <CardTitle className="text-lg font-bold">Contas Conectadas</CardTitle>
                      <CardDescription className="text-xs mt-1">Login com um clique via OAuth.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 px-8">
                      <div className="flex items-center justify-between border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-white dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <Mail className="text-red-500" size={20} />
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">Google</span>
                        </div>
                        {loadingAuthUser ? (
                          <Skeleton className="h-7 w-24 rounded-lg" />
                        ) : hasGoogleProvider ? (
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={handleUnlinkGoogle}>Desconectar</Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleLinkGoogle}>Vincular Google</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sessões ativas */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 pb-5 pt-6 px-8">
                      <CardTitle className="text-lg font-bold">Sessões Ativas</CardTitle>
                      <CardDescription className="text-xs mt-1">Dispositivos logados na conta.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 px-8">
                      {loadingSessions ? (
                        <div className="space-y-4 py-2">
                          <Skeleton className="h-16 w-full rounded-xl" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                      ) : activeSessions.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">Nenhuma sessão registrada.</p>
                      ) : (
                        <div className="space-y-4">
                          {activeSessions.map((s, idx) => {
                            const isCurrent = idx === 0
                            return (
                              <div key={s.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2.5 rounded-full ${isCurrent ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    <Laptop size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.device_info ?? 'Dispositivo'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.location ? `${s.location} • ` : ''}{formatLastActive(s.last_active_at)}</p>
                                  </div>
                                </div>
                                {isCurrent ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full">Atual</span>
                                ) : (
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold" onClick={() => handleRevokeSession(s.id)}>
                                    Revogar
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB: PREFERÊNCIAS */}
              {activeTab === 'preferences' && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                    <CardTitle className="text-2xl font-bold tracking-tight">Preferências de Interface</CardTitle>
                    <CardDescription className="text-sm mt-1 text-muted-foreground">Ajuste o comportamento do cliente.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8 px-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Palette size={18} className="text-indigo-500 dark:text-indigo-400" /> Tema da Aplicação
                        </p>
                        <p className="text-sm text-muted-foreground">Substitui o padrão do sistema operacional.</p>
                      </div>
                      <Select value={themePref} onValueChange={(val) => handleSavePreferences('theme', val)}>
                        <SelectTrigger className="w-[140px] rounded-xl font-semibold bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                          <SelectValue placeholder="Tema" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="light">Claro</SelectItem>
                          <SelectItem value="dark">Escuro</SelectItem>
                          <SelectItem value="system">Sistema</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                          <Mail size={18} className="text-indigo-500 dark:text-indigo-400" /> E-mails Transacionais
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                          Notificações por e-mail sobre atividades da plataforma.
                        </p>
                      </div>
                      <Switch checked={emailNotifications} onCheckedChange={(val) => handleSavePreferences('email', val)} className="data-[state=checked]:bg-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Modal: visualizar foto */}
      <Dialog open={avatarViewOpen} onOpenChange={setAvatarViewOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold">Foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Visualização em tamanho maior.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 flex justify-center">
            {profile?.avatar_url && (
              <img src={profile.avatar_url} alt="Foto" className="w-48 h-48 rounded-full object-cover" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: crop de avatar */}
      <Dialog open={avatarCropOpen} onOpenChange={(open) => !open && closeCropModal()}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold">Ajustar foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Arraste para posicionar e use o zoom. O que estiver dentro do círculo será sua foto.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <div
              className="mx-auto rounded-full overflow-hidden bg-slate-200 flex items-center justify-center select-none touch-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            >
              <div
                className="relative w-full h-full cursor-grab active:cursor-grabbing"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              >
                {avatarCropUrl && (
                  <img
                    ref={cropImageRef}
                    src={avatarCropUrl}
                    alt="Crop preview"
                    draggable={false}
                    onLoad={() => {
                      const img = cropImageRef.current
                      if (img) setAvatarCropImageSize({ w: img.naturalWidth, h: img.naturalHeight })
                    }}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${avatarCropPosition.x}px), calc(-50% + ${avatarCropPosition.y}px)) scale(${avatarCropScale})`,
                      maxWidth: 'none',
                      width: `${CROP_SIZE}px`,
                      height: `${CROP_SIZE}px`,
                      objectFit: 'cover',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label className="text-xs font-semibold text-slate-500">Zoom</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={avatarCropScale}
                onChange={(e) => setAvatarCropScale(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 flex gap-3">
            <Button variant="outline" className="rounded-xl flex-1" onClick={closeCropModal}>Cancelar</Button>
            <Button className="rounded-xl flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" onClick={handleAvatarCropConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
