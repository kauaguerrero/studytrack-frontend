'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
import { Textarea } from '@/components/ui/textarea'
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
  CreditCard,
  Settings,
  Loader2,
  AlertTriangle,
  Zap,
  GraduationCap,
  Briefcase,
  Camera,
  Clock,
  Smartphone,
  Laptop,
  Mail,
  Download,
  Trash2,
  Palette,
  CheckCircle2,
  Infinity,
  ExternalLink,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'

const UpsellModal = dynamic(
  () => import('@/components/modals/UpsellModal').then((m) => ({ default: m.UpsellModal })),
  { ssr: false }
)

/** Modelo 1:1 com a tabela profiles e resposta GET /api/account/profile */
interface ProfileData {
  id: string
  full_name: string | null
  email: string | null
  cpf: string | null
  whatsapp_phone: string | null
  phone: string | null
  avatar_url: string | null
  role: string
  plan_tier: string
  subscription_status: string
  subscription_plan: string
  subscription_id: string | null
  trial_start_date: string | null
  focus_area: string | null
  study_pace: string | null
  days_per_week: number | null
  hours_per_day: number | null
  birth_date: string | null
  target_course: string | null
  target_university: string | null
  school_year: string | null
  onboarding_completed: boolean
  created_at: string | null
  updated_at: string | null
  email_notifications: boolean
  theme_preference?: string | null
  current_period_end?: string | null
  // Campos de identidade expandida
  username: string | null
  bio: string | null
  pronouns: string | null
  public_profile: boolean
  accessibility_needs: string | null
}

/** Dados consolidados de billing (GET /api/account/billing) */
interface BillingData {
  plan_tier: string
  subscription_status: string
  subscription_plan: string
  usage: {
    questions_today_count: number
    questions_limit: number | null
    simulados_today_count: number
    simulados_limit: number | null
    unlimited: boolean
  }
  monthly_value: number
  next_due_date: string | null
  invoices: Array<{
    id: string
    value: number
    dueDate: string | null
    status: string
    invoiceUrl?: string
    bankSlipUrl?: string
  }>
  asaas_available: boolean
  payment_link?: string | null
}

interface UserData {
  id: string
  email: string
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

/** Sessão do usuário (user_sessions) */
interface UserSession {
  id: string
  user_id: string
  device_info: string | null
  ip_address: string | null
  location: string | null
  last_active_at: string | null
  is_active: boolean
}

type TabKey = 'personal' | 'journey' | 'routine' | 'security' | 'subscription' | 'preferences'

export default function ProfilePage() {
  const router = useRouter()
  const { setTheme } = useTheme()
  const [profileState, setProfileState] = useState<ProfileData | null>(null)
  const [userState, setUserState] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  // States - Identidade (campos permitidos pela API)
  const [fullName, setFullName] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [publicProfile, setPublicProfile] = useState(false)
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // States - Jornada Educacional (alinhado ao onboarding)
  const [targetCourse, setTargetCourse] = useState('')
  const [targetUniversity, setTargetUniversity] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [focusArea, setFocusArea] = useState('')
  const [savingJourney, setSavingJourney] = useState(false)

  // States - Rotina (focus_area, study_pace, days_per_week, hours_per_day - alinhado ao onboarding)
  const [studyPace, setStudyPace] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5)
  const [hoursPerDay, setHoursPerDay] = useState<number>(2)
  const [savingRoutine, setSavingRoutine] = useState(false)

  // States - Segurança & Contas
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null)
  const [loadingAuthUser, setLoadingAuthUser] = useState(false)
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // States - Preferências (apenas email_notifications na API)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [themePref, setThemePref] = useState('system')

  // States - Billing (Tier & Infra) - fallback local enquanto SWR carrega
  const [billingState, setBillingState] = useState<BillingData | null>(null)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

  // States - Danger Zone (Cancelar Plano vs Encerrar Conta)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelEmailConfirm, setCancelEmailConfirm] = useState('')
  const [canceling, setCanceling] = useState(false)

  // States - Encerrar Conta (exclusão permanente)
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deleteAccountReason, setDeleteAccountReason] = useState('')
  const [deleteAccountEmailConfirm, setDeleteAccountEmailConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  // Avatar upload (Object Storage)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Avatar crop modal: posição e zoom dentro do círculo
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarViewOpen, setAvatarViewOpen] = useState(false)
  const [avatarCropUrl, setAvatarCropUrl] = useState<string | null>(null)
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)
  const [avatarCropPosition, setAvatarCropPosition] = useState({ x: 0, y: 0 })
  const [avatarCropScale, setAvatarCropScale] = useState(1)
  const [avatarCropImageSize, setAvatarCropImageSize] = useState<{ w: number; h: number } | null>(null)
  const [avatarCropDragging, setAvatarCropDragging] = useState(false)
  const cropDragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const cropImageRef = useRef<HTMLImageElement>(null)

  const supabase = createClient()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

  // Token para SWR (obtido uma vez)
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const t = session?.access_token ?? null
      setToken(t)
      if (!t) toast.error('Sessão inválida. Redirecionando para login.')
    })
  }, [supabase.auth])

  const profileFetcher = useCallback(
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Falha na sincronização do payload.')
        return r.json()
      }),
    []
  )
  const billingFetcher = useCallback(
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar dados de assinatura.')
        return r.json()
      }),
    []
  )

  const {
    data: profileResponse,
    error: profileError,
    isLoading: profileLoading,
    mutate: mutateProfile,
  } = useSWR<{ profile: ProfileData; user: UserData }>(
    token ? [`${apiUrl}/api/account/profile`, token] : null,
    profileFetcher,
    { revalidateOnFocus: false }
  )

  const {
    data: billingResponse,
    error: billingError,
    isLoading: billingLoading,
    mutate: mutateBilling,
  } = useSWR<{ billing: BillingData }>(
    token && activeTab === 'subscription' ? [`${apiUrl}/api/account/billing`, token] : null,
    billingFetcher,
    { revalidateOnFocus: false }
  )

  const profile = profileResponse?.profile ?? profileState
  const user = profileResponse?.user ?? userState
  const billing = billingResponse?.billing ?? billingState

  // Hydration do form quando profile carrega
  useEffect(() => {
    const p = profileResponse?.profile
    const u = profileResponse?.user
    if (!p) return
    setProfileState(p)
    setUserState(u ?? null)
    setFullName(p.full_name ?? '')
    setWhatsappPhone(p.whatsapp_phone ?? p.phone ?? '')
    setBirthDate(p.birth_date ?? '')
    setUsername(p.username ?? '')
    setBio(p.bio ?? '')
    setPronouns(p.pronouns ?? '')
    setPublicProfile(p.public_profile ?? false)
    setAccessibilityNeeds(p.accessibility_needs ?? '')
    setTargetCourse(p.target_course ?? '')
    setTargetUniversity(p.target_university ?? '')
    setSchoolYear(p.school_year ?? '')
    setFocusArea(p.focus_area ?? 'enem_geral')
    setStudyPace(p.study_pace ?? 'moderate')
    setDaysPerWeek(typeof p.days_per_week === 'number' ? Math.min(7, Math.max(1, p.days_per_week)) : 5)
    setHoursPerDay(typeof p.hours_per_day === 'number' ? Math.min(12, Math.max(1, p.hours_per_day)) : 2)
    setEmailNotifications(p.email_notifications ?? true)
    setThemePref((p as ProfileData & { theme_preference?: string })?.theme_preference ?? 'system')
  }, [profileResponse])

  useEffect(() => {
    if (billingResponse?.billing) setBillingState(billingResponse.billing)
  }, [billingResponse])

  useEffect(() => {
    if (profileError) toast.error(profileError instanceof Error ? profileError.message : 'Timeout na conexão.')
  }, [profileError])
  useEffect(() => {
    if (billingError) toast.error(billingError instanceof Error ? billingError.message : 'Erro ao carregar billing.')
  }, [billingError])

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
      setActiveSessions([])
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
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
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

  const handleRevokeSession = async (sessionId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    try {
      const res = await fetch(`${apiUrl}/api/account/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Falha ao revogar.')
      }
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Sessão revogada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao revogar sessão.')
    }
  }

  const handleUpdateProfile = async (payload: Partial<ProfileData>, loaderSetter: (val: boolean) => void) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    loaderSetter(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('A validação de integridade falhou.')
      
      toast.success('Módulo sincronizado na base de dados.')
      mutateProfile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na mutação.')
    } finally {
      loaderSetter(false)
    }
  }

  const handleSavePersonal = () => handleUpdateProfile({
    full_name: fullName || null,
    whatsapp_phone: whatsappPhone || null,
    birth_date: birthDate || null,
    username: username || null,
    bio: bio || null,
    pronouns: pronouns || null,
    public_profile: publicProfile,
    accessibility_needs: accessibilityNeeds || null,
  }, setSavingPersonal)

  const AVATAR_BUCKET = 'avatars'
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB

  /** Extrai o path do arquivo dentro do bucket a partir da URL pública do Supabase. */
  function getAvatarPathFromPublicUrl(url: string): string | null {
    const match = url.match(/\/avatars\/(.+)$/)
    return match ? match[1] : null
  }

  const CROP_SIZE = 240

  const openCropModal = (file: File) => {
    if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
    const url = URL.createObjectURL(file)
    setAvatarCropUrl(url)
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

  const onCropImageLoad = () => {
    const img = cropImageRef.current
    if (img && img.naturalWidth) setAvatarCropImageSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  const handleCropPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    cropDragStart.current = { x: e.clientX, y: e.clientY, posX: avatarCropPosition.x, posY: avatarCropPosition.y }
    setAvatarCropDragging(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!avatarCropDragging) return
    const dx = e.clientX - cropDragStart.current.x
    const dy = e.clientY - cropDragStart.current.y
    setAvatarCropPosition({ x: cropDragStart.current.posX + dx, y: cropDragStart.current.posY + dy })
  }

  const handleCropPointerUp = (e: React.PointerEvent) => {
    setAvatarCropDragging(false)
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  /** Gera um blob da imagem recortada em círculo (canvas). Região visível = círculo no preview. */
  const getCroppedAvatarBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = cropImageRef.current
      const w = avatarCropImageSize?.w ?? img?.naturalWidth ?? 0
      const h = avatarCropImageSize?.h ?? img?.naturalHeight ?? 0
      if (!img || !w || !h) { reject(new Error('Imagem não carregada')); return }
      const scale = avatarCropScale
      const min = Math.min(w, h)
      const displayW = (CROP_SIZE * w) / min
      const displayH = (CROP_SIZE * h) / min
      const visibleSide = min / scale
      const centerX = w / 2 - (avatarCropPosition.x * min) / (240 * scale)
      const centerY = h / 2 - (avatarCropPosition.y * min) / (240 * scale)
      const sx = Math.max(0, Math.min(w - visibleSide, centerX - visibleSide / 2))
      const sy = Math.max(0, Math.min(h - visibleSide, centerY - visibleSide / 2))
      const sw = Math.min(visibleSide, w - sx)
      const sh = Math.min(visibleSide, h - sy)
      const canvas = document.createElement('canvas')
      canvas.width = CROP_SIZE
      canvas.height = CROP_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não disponível')); return }
      ctx.beginPath()
      ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CROP_SIZE, CROP_SIZE)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem'))), 'image/jpeg', 0.92)
    })
  }

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !user?.id) return
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('A imagem deve ter no máximo 2MB.')
      return
    }
    openCropModal(file)
  }

  const handleAvatarCropConfirm = async () => {
    if (!avatarCropFile || !user?.id) return
    setAvatarCropOpen(false)
    setAvatarUploading(true)
    try {
      const blob = await getCroppedAvatarBlob()
      const ext = avatarCropFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg'
      const path = `${user.id}_${Date.now()}.${safeExt}`

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Falha ao salvar avatar no perfil.')
      }

      setProfileState((prev) => (prev ? { ...prev, avatar_url: publicUrl } : null))
      mutateProfile()
      router.refresh()
      toast.success('Foto de perfil atualizada.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha no upload.'
      toast.error(msg)
    } finally {
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
      setAvatarCropUrl(null)
      setAvatarCropFile(null)
      setAvatarUploading(false)
    }
  }

  const handleAvatarUpload = handleAvatarFileSelect

  const handleSaveJourney = () => handleUpdateProfile({
    target_course: targetCourse || null,
    target_university: targetUniversity || null,
    school_year: schoolYear || null,
    focus_area: focusArea || 'enem_geral',
  }, setSavingJourney)

  const handleSaveRoutine = () => handleUpdateProfile({
    study_pace: studyPace || 'moderate',
    days_per_week: daysPerWeek,
    hours_per_day: hoursPerDay,
  }, setSavingRoutine)

  const handleSavePreferences = (field: 'email' | 'theme', value: string | boolean) => {
    if (field === 'email') {
      setEmailNotifications(value as boolean)
      handleUpdateProfile({ email_notifications: value as boolean }, () => {})
    } else if (field === 'theme') {
      const val = value as string
      setThemePref(val)
      setTheme(val)
      handleUpdateProfile({ theme_preference: val }, () => {})
    }
  }

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter no mínimo 8 caracteres.')
      return
    }
    if (!user?.email) return

    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) {
        toast.error('Senha atual incorreta.')
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Senha atualizada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar senha.'
      toast.error(msg)
    } finally {
      setSavingPassword(false)
    }
  }

  const hasGoogleProvider = Boolean(authUser?.identities?.some((i) => i.provider === 'google'))
  const googleIdentity = authUser?.identities?.find((i) => i.provider === 'google')

  const handleLinkGoogle = async () => {
    const { error } = await supabase.auth.linkIdentity({ provider: 'google' })
    if (error) {
      toast.error(error.message ?? 'Falha ao vincular Google.')
      return
    }
    toast.success('Conta Google vinculada.')
    const { data: { user: u } } = await supabase.auth.getUser()
    setAuthUser(u ?? null)
  }

  const handleUnlinkGoogle = async () => {
    if (!googleIdentity) return
    const { error } = await supabase.auth.unlinkIdentity(googleIdentity)
    if (error) {
      toast.error(error.message ?? 'Falha ao desvincular Google.')
      return
    }
    toast.success('Conta Google desvinculada.')
    const { data: { user: u } } = await supabase.auth.getUser()
    setAuthUser(u ?? null)
  }

  const handleRequestExport = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sessão inválida.')
      return
    }
    setExportingData(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/export`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Falha ao exportar.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'studytrack_data_export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Arquivo exportado com sucesso.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar dados.')
    } finally {
      setExportingData(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteAccountReason) {
      toast.error('Selecione o motivo da saída.')
      return
    }
    if (deleteAccountEmailConfirm !== user?.email) {
      toast.error('Check de segurança falhou. E-mail de confirmação divergente.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sessão inválida.')
      return
    }

    setDeletingAccount(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: deleteAccountReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao excluir conta.')

      toast.success('Conta excluída.')
      setDeleteAccountModalOpen(false)
      setDeleteAccountReason('')
      setDeleteAccountEmailConfirm('')
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na exclusão.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (cancelEmailConfirm !== user?.email) {
      toast.error('Check de segurança falhou. E-mail de confirmação divergente.')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      toast.error('Sessão inválida.')
      return
    }

    setCanceling(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao cancelar assinatura.')

      toast.success('Assinatura cancelada com sucesso.')
      setCancelModalOpen(false)
      setCancelReason('')
      setCancelEmailConfirm('')
      mutateProfile()
      mutateBilling()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na comunicação com o serviço de Billing.')
    } finally {
      setCanceling(false)
    }
  }

  const formatCpf = (cpf: string | null) => {
    if (!cpf) return 'Oculto / Não vinculado'
    const d = cpf.replace(/\D/g, '')
    return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf
  }

  const navItems = [
    { id: 'personal', label: 'Identidade', icon: User },
    { id: 'journey', label: 'Jornada Acadêmica', icon: GraduationCap },
    { id: 'routine', label: 'Rotina & Gamificação', icon: Clock },
    { id: 'security', label: 'Acesso & Segurança', icon: Shield },
    { id: 'subscription', label: 'Tier & Infra', icon: CreditCard },
    { id: 'preferences', label: 'Preferências', icon: Settings },
  ] as const

  /** Skeleton granular para aba Identidade (avatar + inputs) */
  const PersonalTabSkeleton = () => (
    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent className="space-y-8 pt-8 px-8">
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-28 mt-2" />
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

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/50">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12 lg:px-8">
      <div className="mb-10 flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
          Account Hub
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Gerencie suas configurações de infraestrutura pessoal, controle de acesso e parametrização do motor de IA.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        {/* Navigation Sidebar */}
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
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg shadow-slate-900/20 translate-x-1'
                    : 'text-slate-600 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-50 hover:shadow-sm'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-blue-500 transition-colors'} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Content Area - layout sempre visível, skeleton granular por aba */}
        <div className="flex-1 min-w-0">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
            
            {/* TAB: IDENTIDADE */}
            {activeTab === 'personal' && (
              profileLoading ? (
                <PersonalTabSkeleton />
              ) : (
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                    <CardTitle className="text-2xl font-bold tracking-tight">Identidade Pessoal</CardTitle>
                    <CardDescription className="text-sm mt-1 text-muted-foreground">
                      Metadados da sua conta. Estas informações podem ser expostas na plataforma dependendo das suas configurações de privacidade.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-8 px-8">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-hidden
                      onChange={handleAvatarUpload}
                    />
                    <div className="flex items-center gap-6">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 text-3xl font-bold text-white shadow-xl ring-4 ring-white transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:pointer-events-none disabled:opacity-70"
                      >
                        {avatarUploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        ) : profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          fullName.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'
                        )}
                        {!avatarUploading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </button>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-slate-50 text-lg truncate">{fullName || 'Estudante'}</h3>
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Membro</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{user?.email ?? ''}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {profile?.avatar_url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-lg h-8 text-xs font-semibold"
                              onClick={() => setAvatarViewOpen(true)}
                              disabled={avatarUploading}
                            >
                              Ver foto
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-lg h-8 text-xs font-semibold"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                          >
                            {avatarUploading ? 'Enviando…' : 'Alterar Avatar'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-200 font-bold">Nome Completo</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-blue-500 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 dark:text-slate-200 font-bold">Nome de Utilizador</Label>
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@seunome" className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pronouns" className="text-slate-700 dark:text-slate-200 font-bold">Pronome</Label>
                        <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="Ex: ele/dele, ela/dela, elu/delu" className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthDate" className="text-slate-700 dark:text-slate-200 font-bold">Data de Nascimento</Label>
                        <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="whatsapp_phone" className="text-slate-700 dark:text-slate-200 font-bold">WhatsApp / Telefone</Label>
                        <Input id="whatsapp_phone" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="(11) 99999-9999" className="rounded-xl bg-slate-50/50 dark:bg-slate-800/50 focus-visible:ring-blue-500" />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="bio" className="text-slate-700 dark:text-slate-200 font-bold">Biografia</Label>
                        <Textarea
                          id="bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Conte um pouco sobre você..."
                          maxLength={500}
                          className="rounded-xl bg-slate-50/50 focus-visible:ring-blue-500 resize-none min-h-[90px]"
                        />
                        <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="accessibilityNeeds" className="text-slate-700 dark:text-slate-200 font-bold">Necessidade de Acessibilidade</Label>
                        <Textarea
                          id="accessibilityNeeds"
                          value={accessibilityNeeds}
                          onChange={(e) => setAccessibilityNeeds(e.target.value)}
                          placeholder="Ex: dislexia, daltonismo, baixa visão..."
                          maxLength={500}
                          className="rounded-xl bg-slate-50/50 focus-visible:ring-blue-500 resize-none min-h-[72px]"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-5 py-4 sm:col-span-2">
                        <div className="space-y-0.5">
                          <Label className="text-slate-700 dark:text-slate-200 font-bold">Perfil Público</Label>
                          <p className="text-xs text-muted-foreground">Permite que outros utilizadores vejam o seu perfil e estatísticas.</p>
                        </div>
                        <Switch
                          checked={publicProfile}
                          onCheckedChange={setPublicProfile}
                          aria-label="Perfil público"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5 flex justify-end">
                    <Button onClick={handleSavePersonal} disabled={savingPersonal} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 font-semibold shadow-md transition-all">
                      {savingPersonal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Sincronizar Identidade
                    </Button>
                  </CardFooter>
                </Card>
              )
            )}

            {/* TAB: JORNADA ACADÊMICA */}
              {activeTab === 'journey' && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                    <CardTitle className="text-2xl font-bold tracking-tight">Arquitetura de Aprendizado</CardTitle>
                    <CardDescription className="text-sm mt-1 text-muted-foreground">
                      Nossa engine de IA consome esses dados para gerar mapas mentais, cronogramas e adaptar a renderização das aulas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-8 px-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Curso Alvo</Label>
                        <Input placeholder="Ex: Ciência da Computação" value={targetCourse} onChange={(e) => setTargetCourse(e.target.value)} className="rounded-xl focus-visible:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Instituição Alvo</Label>
                        <Input placeholder="Ex: UNICAMP, USP" value={targetUniversity} onChange={(e) => setTargetUniversity(e.target.value)} className="rounded-xl focus-visible:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Fase Acadêmica</Label>
                        <Select value={schoolYear} onValueChange={setSchoolYear}>
                          <SelectTrigger className="rounded-xl focus-visible:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                            <SelectValue placeholder="Selecione o estágio atual" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="ef_6">6º Ano (Ensino Fundamental)</SelectItem>
                            <SelectItem value="ef_7">7º Ano (Ensino Fundamental)</SelectItem>
                            <SelectItem value="ef_8">8º Ano (Ensino Fundamental)</SelectItem>
                            <SelectItem value="ef_9">9º Ano (Ensino Fundamental)</SelectItem>
                            <SelectItem value="em_1">1º Ano do Ensino Médio</SelectItem>
                            <SelectItem value="em_2">2º Ano do Ensino Médio</SelectItem>
                            <SelectItem value="em_3">3º Ano do Ensino Médio (Terceirão)</SelectItem>
                            <SelectItem value="cursinho">Cursinho Pré-Vestibular</SelectItem>
                            <SelectItem value="superior">Ensino Superior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Área de Foco</Label>
                        <Select value={focusArea || 'enem_geral'} onValueChange={setFocusArea}>
                          <SelectTrigger className="rounded-xl focus-visible:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                            <SelectValue placeholder="Selecione sua área" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="enem_geral">ENEM Geral</SelectItem>
                            <SelectItem value="enem_exatas">Matemática e suas Tecnologias</SelectItem>
                            <SelectItem value="enem_humanas">Linguagens, Códigos e suas Tecnologias</SelectItem>
                            <SelectItem value="enem_saude">Ciências da Natureza e suas Tecnologias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5 flex justify-end">
                    <Button onClick={handleSaveJourney} disabled={savingJourney} className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl px-8 font-semibold shadow-md transition-all hover:shadow-lg">
                      {savingJourney && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* TAB: ROTINA & GAMIFICAÇÃO */}
              {activeTab === 'routine' && (
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                    <CardTitle className="text-2xl font-bold tracking-tight">Rotina de Estudos</CardTitle>
                    <CardDescription className="text-sm mt-1 text-muted-foreground">
                      Alinhe ritmo, dias e horas ao seu planejamento. Os valores são usados pela engine de IA para sugerir cronogramas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-8 px-8">
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Ritmo de Estudo</Label>
                      <Select value={studyPace || 'moderate'} onValueChange={setStudyPace}>
                        <SelectTrigger className="rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50">
                          <SelectValue placeholder="Selecione o ritmo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="slow">Leve</SelectItem>
                          <SelectItem value="moderate">Médio</SelectItem>
                          <SelectItem value="intense">Intenso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Dias por semana</Label>
                        <Select value={String(daysPerWeek)} onValueChange={(v) => setDaysPerWeek(parseInt(v, 10))}>
                          <SelectTrigger className="rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50">
                            <SelectValue placeholder="1 a 7" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'dia' : 'dias'}/semana</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Horas por dia</Label>
                        <Select value={String(hoursPerDay)} onValueChange={(v) => setHoursPerDay(parseInt(v, 10))}>
                          <SelectTrigger className="rounded-xl focus-visible:ring-indigo-500 bg-slate-50/50">
                            <SelectValue placeholder="1 a 12" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} h/dia</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5 flex justify-end">
                    <Button onClick={handleSaveRoutine} disabled={savingRoutine} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-8 font-semibold shadow-md">
                      {savingRoutine ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Salvar Rotina
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* TAB: ACESSO & SEGURANÇA */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold tracking-tight">Credenciais de Acesso</CardTitle>
                      <CardDescription className="text-sm mt-1 text-muted-foreground">
                        E-mail associado: <span className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{user?.email}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-8 px-8 max-w-xl">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Senha Atual</Label>
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-xl focus-visible:ring-slate-900 bg-slate-50/50 dark:bg-slate-800/50" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200 font-bold">Nova Senha</Label>
                          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl focus-visible:ring-slate-900 bg-slate-50/50 dark:bg-slate-800/50" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200 font-bold">Confirmação</Label>
                          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="rounded-xl focus-visible:ring-slate-900 bg-slate-50/50 dark:bg-slate-800/50" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-8 py-5">
                      <Button onClick={handleSavePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} className="bg-slate-900 text-white rounded-xl font-semibold px-8 shadow-md">
                        {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Atualizar Credencial
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Contas Conectadas (OAuth) - dinâmico via user.identities */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-5 pt-6 px-8">
                      <CardTitle className="text-lg font-bold">Contas Conectadas</CardTitle>
                      <CardDescription className="text-xs mt-1">Faça login com um clique.</CardDescription>
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
                          <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={handleUnlinkGoogle}>
                            Desconectar
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs rounded-lg bg-blue-600 hover:bg-blue-700" onClick={handleLinkGoogle}>
                            Vincular Conta Google
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sessões Ativas - user_sessions */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-5 pt-6 px-8">
                      <CardTitle className="text-lg font-bold">Sessões Ativas</CardTitle>
                      <CardDescription className="text-xs mt-1">Dispositivos logados na sua conta.</CardDescription>
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
                                  <div className={`p-2.5 rounded-full ${isCurrent ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                    <Laptop size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{s.device_info ?? 'Dispositivo'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {s.location ? `${s.location} • ` : ''}{formatLastActive(s.last_active_at)}
                                    </p>
                                  </div>
                                </div>
                                {isCurrent ? (
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full">Atual</span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
                                    onClick={() => handleRevokeSession(s.id)}
                                  >
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

              {/* TAB: ASSINATURA (Tier & Infra) */}
              {activeTab === 'subscription' && (
                <div className="space-y-6">
                  {/* Card Principal - Status */}
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold tracking-tight">Status da Assinatura</CardTitle>
                      <CardDescription className="text-sm mt-1 text-muted-foreground">
                        Plano atual, valor mensal e data de renovação.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 px-8">
                      {billingLoading ? (
                        <div className="flex items-center gap-4 py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                          <span className="text-slate-600">Carregando dados de billing...</span>
                        </div>
                      ) : (
                        <div className="relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-8 shadow-sm">
                          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                          <div className="flex items-center gap-5 z-10">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                              <Briefcase size={32} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Plano Atual</p>
                              <p className="font-black text-2xl text-slate-900 uppercase">
                                {billing?.plan_tier === 'free' ? 'Free' : (billing?.plan_tier ?? 'Free')}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${billing?.subscription_status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                  {billing?.subscription_status === 'active' ? 'Ativo' : billing?.subscription_status === 'inactive' ? 'Inativo' : 'Atrasado'}
                                </span>
                              </div>
                              {billing?.monthly_value ? (
                                <p className="text-sm font-semibold text-slate-700 mt-1">
                                  R$ {billing.monthly_value.toFixed(2).replace('.', ',')}/mês
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="w-full md:w-auto text-left md:text-right bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl border border-indigo-100/50 shadow-sm z-10">
                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">Próxima Cobrança</p>
                            <p className="font-mono text-xl text-slate-900 font-bold">
                              {billing?.next_due_date ? new Date(billing.next_due_date).toLocaleDateString('pt-BR') : billing?.subscription_status === 'active' ? '—' : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Card de Uso - Limites */}
                  {!billingLoading && billing && (
                    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-5 pt-6 px-8">
                        <CardTitle className="text-lg font-bold">Uso e Limites</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Consumo diário de questões e simulados.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 px-8 space-y-6">
                        {billing.usage.unlimited ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                            <Infinity className="h-8 w-8 text-emerald-600" />
                            <div>
                              <p className="font-bold text-emerald-800">Uso Ilimitado</p>
                              <p className="text-sm text-emerald-600">Questões e simulados sem limite diário.</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold text-slate-700">Questões Hoje</span>
                                <span className="text-slate-600">
                                  {billing.usage.questions_today_count}/{billing.usage.questions_limit ?? 15}
                                </span>
                              </div>
                              <Progress value={billing.usage.questions_limit ? (billing.usage.questions_today_count / billing.usage.questions_limit) * 100 : 0} className="h-2" indicatorClassName="bg-indigo-500" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="font-semibold text-slate-700">Simulados Hoje</span>
                                <span className="text-slate-600">
                                  {billing.usage.simulados_today_count}/{billing.usage.simulados_limit ?? 1}
                                </span>
                              </div>
                              <Progress value={billing.usage.simulados_limit ? (billing.usage.simulados_today_count / billing.usage.simulados_limit) * 100 : 0} className="h-2" indicatorClassName="bg-indigo-500" />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Card de Faturas */}
                  {!billingLoading && billing && billing.invoices.length > 0 && (
                    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60">
                      <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-5 pt-6 px-8">
                        <CardTitle className="text-lg font-bold">Últimas Cobranças</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          Status e link para 2ª via/PDF.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 px-8">
                        <div className="space-y-4">
                          {billing.invoices.map((inv: BillingData['invoices'][number]) => {
                            const s = (inv.status || '').toLowerCase()
                            const isPaid = ['confirmed', 'received', 'received_in_cash', 'converted'].includes(s)
                            const url = inv.invoiceUrl || inv.bankSlipUrl
                            return (
                              <div key={inv.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isPaid ? 'Pago' : 'Pendente'}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-slate-900">R$ {inv.value.toFixed(2).replace('.', ',')}</p>
                                    <p className="text-xs text-slate-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : '—'}</p>
                                  </div>
                                </div>
                                {url ? (
                                  <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs" asChild>
                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> 2ª Via
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ações Estratégicas */}
                  <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                    <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-xl font-bold text-base h-12 px-8" onClick={() => setUpgradeModalOpen(true)}>
                      <Zap className="mr-2 h-5 w-5" /> Fazer Upgrade
                    </Button>
                    {billing?.subscription_status === 'active' && billing?.asaas_available && (
                      <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50 rounded-xl font-semibold h-12 px-8" asChild>
                        <a href={billing?.payment_link || 'https://www.asaas.com'} target="_blank" rel="noopener noreferrer">
                          Gerenciar Método de Pagamento
                        </a>
                      </Button>
                    )}
                    {billing?.subscription_status === 'active' && (
                      <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl font-semibold h-12 ml-auto" onClick={() => setCancelModalOpen(true)}>
                        Cancelar Plano
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PREFERÊNCIAS & DANGER ZONE */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
                    <CardHeader className="border-b border-slate-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pb-6 pt-8 px-8">
                      <CardTitle className="text-2xl font-bold tracking-tight">Preferências de Interface</CardTitle>
                      <CardDescription className="text-sm mt-1 text-muted-foreground">Ajuste o comportamento do cliente.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 px-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><Palette size={18} className="text-blue-500 dark:text-blue-400" /> Tema da Aplicação</p>
                          <p className="text-sm text-muted-foreground">Substitui o padrão do sistema operativo.</p>
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
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2"><Mail size={18} className="text-indigo-500 dark:text-indigo-400" /> E-mails Transacionais</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Receber e-mails transacionais. Atenção: Ao desativar, você perderá alertas de metas atingidas, relatórios de revisão espaçada e atualizações críticas do seu cronograma de aprovação.
                          </p>
                        </div>
                        <Switch checked={emailNotifications} onCheckedChange={(val) => handleSavePreferences('email', val)} className="data-[state=checked]:bg-indigo-600" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* DANGER ZONE (LGPD/GDPR) */}
                  <Card className="border-red-200/50 dark:border-red-900/50 shadow-sm dark:shadow-none rounded-2xl overflow-hidden bg-red-50/30 dark:bg-slate-900 dark:border-red-900/50">
                    <CardHeader className="border-b border-red-100/50 dark:border-red-900/50 pb-5 pt-6 px-8">
                      <CardTitle className="text-lg font-bold text-red-700 dark:text-red-400">Zona de Risco</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 px-8 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-red-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 rounded-xl">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-50">Exportar Dados (LGPD)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Faça o download de todos os seus logs, redações e dados analíticos em JSON.</p>
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-xl font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
                          onClick={handleRequestExport}
                          disabled={exportingData}
                        >
                          {exportingData ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                          Requisitar Arquivo
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800/50 p-5 rounded-xl">
                        <div>
                          <p className="font-bold text-red-600 dark:text-red-400">Encerrar Conta Permanentemente</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Esta ação é irreversível. Todos os dados, arquivos e histórico serão apagados.</p>
                        </div>
                        <Button
                          variant="destructive"
                          className="rounded-xl font-semibold bg-red-600 hover:bg-red-700 shrink-0"
                          onClick={() => setDeleteAccountModalOpen(true)}
                        >
                          <Trash2 size={16} className="mr-2" /> Deletar Conta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Modal para visualizar foto de perfil */}
      <Dialog open={avatarViewOpen} onOpenChange={setAvatarViewOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold">Sua foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Visualização em tamanho maior.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 flex justify-center">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt="Foto de perfil"
                className="w-48 h-48 rounded-full object-cover"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de recorte do avatar */}
      <Dialog open={avatarCropOpen} onOpenChange={(open) => !open && closeCropModal()}>
        <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden border border-slate-200">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold">Ajustar foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Arraste a imagem para posicionar e use o zoom. O que estiver dentro do círculo será sua foto.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <div
              ref={cropContainerRef}
              className="mx-auto rounded-full overflow-hidden bg-slate-200 flex items-center justify-center select-none touch-none"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            >
              <div
                className="relative w-full h-full cursor-grab active:cursor-grabbing"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerLeave={() => setAvatarCropDragging(false)}
                style={{ touchAction: 'none' }}
              >
                {avatarCropUrl && (
                  <img
                    ref={cropImageRef}
                    src={avatarCropUrl}
                    alt="Preview"
                    onLoad={onCropImageLoad}
                    className="absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: avatarCropImageSize
                        ? CROP_SIZE * Math.max(1, avatarCropImageSize.w / avatarCropImageSize.h)
                        : CROP_SIZE,
                      height: avatarCropImageSize
                        ? CROP_SIZE * Math.max(1, avatarCropImageSize.h / avatarCropImageSize.w)
                        : CROP_SIZE,
                      transform: `translate(-50%, -50%) translate(${avatarCropPosition.x}px, ${avatarCropPosition.y}px) scale(${avatarCropScale})`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 shrink-0">Zoom</span>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.05}
                value={avatarCropScale}
                onChange={(e) => setAvatarCropScale(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-slate-200 accent-slate-800"
              />
              <span className="text-xs text-slate-500 w-8">{Math.round(avatarCropScale * 100)}%</span>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t border-slate-100 flex gap-2">
            <Button type="button" variant="outline" onClick={closeCropModal} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="button" onClick={handleAvatarCropConfirm} className="rounded-xl bg-slate-900 hover:bg-slate-800">
              Usar esta foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Interrupção Seguro */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-red-600 to-red-500 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={100} />
            </div>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-white relative z-10">
              <AlertTriangle size={28} />
              Interrupção de Serviço
            </DialogTitle>
            <DialogDescription className="text-red-50 mt-3 text-sm leading-relaxed relative z-10">
              Ao confirmar, cortaremos o acesso à engine de IA ao fim do ciclo atual. Isso afetará diretamente a retroalimentação do seu algoritmo de revisão.
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <Label htmlFor="reason" className="font-bold text-slate-700">Por que está nos deixando? (Log interno)</Label>
              <Input id="reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex: Custo elevado, fui aprovado..." className="rounded-xl bg-slate-50 focus-visible:ring-red-500 border-slate-200" />
            </div>
            <div className="space-y-3 p-5 bg-red-50/50 rounded-2xl border border-red-100">
              <Label htmlFor="emailConfirm" className="text-slate-800 font-bold block">
                Validação de Integridade
                <span className="block mt-1 text-sm font-normal text-slate-500">
                  Digite <span className="text-red-600 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-100 shadow-sm">{user?.email}</span> para confirmar.
                </span>
              </Label>
              <Input id="emailConfirm" type="email" value={cancelEmailConfirm} onChange={(e) => setCancelEmailConfirm(e.target.value)} className="bg-white rounded-xl focus-visible:ring-red-500 border-red-200" placeholder="Digite seu e-mail" />
            </div>
          </div>
          <DialogFooter className="bg-slate-50/80 p-6 border-t border-slate-100 flex gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="rounded-xl font-bold text-slate-600 hover:text-slate-900">Cancelar Operação</Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={canceling || cancelEmailConfirm !== user?.email} className="rounded-xl font-bold bg-red-600 hover:bg-red-700 px-6 shadow-md shadow-red-600/20">
              {canceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Encerrar Conta (exclusão permanente - Offboarding) */}
      <Dialog open={deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-red-700 to-red-600 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={100} />
            </div>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tight text-white relative z-10">
              <Trash2 size={28} />
              Encerrar Conta Permanentemente
            </DialogTitle>
            <DialogDescription className="text-red-50 mt-3 text-sm leading-relaxed relative z-10">
              Esta ação é irreversível. Todos os seus dados, arquivos e histórico serão apagados. Assinatura será cancelada imediatamente.
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-3">
              <Label htmlFor="deleteReason" className="font-bold text-slate-700">
                Por que está nos deixando? <span className="text-red-600">*</span>
              </Label>
              <Select value={deleteAccountReason} onValueChange={setDeleteAccountReason} required>
                <SelectTrigger id="deleteReason" className="rounded-xl bg-slate-50 focus-visible:ring-red-500 border-slate-200">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="atingi_objetivo">Atingi meu objetivo / Fui aprovado</SelectItem>
                  <SelectItem value="plataforma_complexa">Achei a plataforma complexa</SelectItem>
                  <SelectItem value="preco_elevado">Preço elevado</SelectItem>
                  <SelectItem value="falta_tempo">Falta de tempo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 p-5 bg-red-50/50 rounded-2xl border border-red-100">
              <Label htmlFor="deleteEmailConfirm" className="text-slate-800 font-bold block">
                Validação de Integridade
                <span className="block mt-1 text-sm font-normal text-slate-500">
                  Digite <span className="text-red-600 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-100 shadow-sm">{user?.email}</span> para confirmar.
                </span>
              </Label>
              <Input
                id="deleteEmailConfirm"
                type="email"
                value={deleteAccountEmailConfirm}
                onChange={(e) => setDeleteAccountEmailConfirm(e.target.value)}
                className="bg-white rounded-xl focus-visible:ring-red-500 border-red-200"
                placeholder="Digite seu e-mail"
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50/80 p-6 border-t border-slate-100 flex gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setDeleteAccountModalOpen(false)} className="rounded-xl font-bold text-slate-600 hover:text-slate-900">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !deleteAccountReason || deleteAccountEmailConfirm !== user?.email}
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700 px-6 shadow-md shadow-red-600/20"
            >
              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Encerrar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Upgrade (Paywall) - reutiliza UpsellModal existente */}
      <UpsellModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        reason="GENERIC_UPSELL"
        userName={profile?.full_name?.split(' ')[0] || 'Estudante'}
        currentPlanTier={profile?.plan_tier}
      />
      </div>
    </div>
  )
}