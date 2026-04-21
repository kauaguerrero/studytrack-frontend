'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useStudentTheme } from '@/contexts/StudentThemeContext'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertTriangle,
  GraduationCap,
  Camera,
  Clock,
  Laptop,
  Download,
  Trash2,
  Palette,
  CheckCircle2,
  WalletCards,
} from 'lucide-react'

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
  study_period: string | null
  days_per_week: number | null
  hours_per_day: number | null
  free_hours: string | null
  birth_date: string | null
  target_course: string | null
  target_university: string | null
  school_year: string | null
  onboarding_completed: boolean
  created_at: string | null
  updated_at: string | null
  email_notifications: boolean
  theme_preference?: string | null
  username: string | null
  bio: string | null
  pronouns: string | null
  public_profile: boolean
  accessibility_needs: string | null
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

interface StudentCurrentPlan {
  plan_id: string | null
  plan_name: string | null
  plan_description: string | null
  plan_price_cents: number | null
  plan_duration_days: number | null
  plan_assignment_status: 'active' | 'inactive' | null
  plan_last_payment_at: string | null
  essay_credits_limit: number | null
  essay_credits_period: 'week' | 'month' | null
  essay_credits_used: number | null
  essay_credits_remaining: number | null
  profile_plan_tier: string | null
}

type TabKey = 'personal' | 'plan' | 'journey' | 'routine' | 'security' | 'preferences'

// Laranja Edificar
const BRAND = '#FF8C00'

function formatMoney(cents?: number | null) {
  if (!cents || cents <= 0) return 'Incluso no plano da instituição'
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPlanPeriod(period?: 'week' | 'month' | null) {
  if (period === 'week') return 'por semana'
  return 'por mês'
}

export default function PerfilPage() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const { setTheme: setStudentTheme } = useStudentTheme()
  const [profileState, setProfileState] = useState<ProfileData | null>(null)
  const [userState, setUserState] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  // States - Identidade
  const [fullName, setFullName] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [publicProfile, setPublicProfile] = useState(true)
  const [accessibilityNeeds, setAccessibilityNeeds] = useState('')
  const [savingPersonal, setSavingPersonal] = useState(false)

  // States - Jornada Acadêmica
  const [targetCourse, setTargetCourse] = useState('')
  const [targetUniversity, setTargetUniversity] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [focusArea, setFocusArea] = useState('')
  const [savingJourney, setSavingJourney] = useState(false)

  // States - Rotina
  const [studyPace, setStudyPace] = useState('')
  const [studyPeriod, setStudyPeriod] = useState('')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5)
  const [hoursPerDay, setHoursPerDay] = useState<number>(2)
  const [freeHoursStart, setFreeHoursStart] = useState('19:00')
  const [freeHoursEnd, setFreeHoursEnd] = useState('21:00')
  const [savingRoutine, setSavingRoutine] = useState(false)

  // States - Segurança
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // States - Preferências
  const [themePref, setThemePref] = useState('system')

  // States - Encerrar Conta
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)
  const [deleteAccountReason, setDeleteAccountReason] = useState('')
  const [deleteAccountEmailConfirm, setDeleteAccountEmailConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exportingData, setExportingData] = useState(false)

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
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const cropImageRef = useRef<HTMLImageElement>(null)

  const supabase = createClient()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'

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
        if (!r.ok) throw new Error('Falha ao carregar perfil.')
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

  const profile = profileResponse?.profile ?? profileState
  const user = profileResponse?.user ?? userState
  const isEdificar = slug === 'edificar'

  const {
    data: currentPlan,
    error: currentPlanError,
    isLoading: currentPlanLoading,
  } = useSWR<StudentCurrentPlan>(
    token && isEdificar ? [`${apiUrl}/api/partners/${slug}/student/current-plan`, token] : null,
    profileFetcher,
    { revalidateOnFocus: true }
  )

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
    setPublicProfile(p.public_profile ?? true)
    setAccessibilityNeeds(p.accessibility_needs ?? '')
    setTargetCourse(p.target_course ?? '')
    setTargetUniversity(p.target_university ?? '')
    setSchoolYear(p.school_year ?? '')
    setFocusArea(p.focus_area ?? 'enem_geral')
    setStudyPace(p.study_pace ?? 'moderate')
    setStudyPeriod(p.study_period ?? '')
    setDaysPerWeek(typeof p.days_per_week === 'number' ? Math.min(7, Math.max(1, p.days_per_week)) : 5)
    setHoursPerDay(typeof p.hours_per_day === 'number' ? Math.min(12, Math.max(1, p.hours_per_day)) : 2)
    if (p.free_hours) {
      const firstWindow = p.free_hours.split(',')[0].trim()
      const parts = firstWindow.split('-')
      if (parts.length === 2) {
        setFreeHoursStart(parts[0].trim())
        setFreeHoursEnd(parts[1].trim())
      }
    }
    setThemePref((p as ProfileData & { theme_preference?: string })?.theme_preference ?? 'system')
  }, [profileResponse])

  useEffect(() => {
    if (profileError) toast.error(profileError instanceof Error ? profileError.message : 'Erro ao carregar perfil.')
  }, [profileError])

  useEffect(() => {
    if (currentPlanError) {
      toast.error(currentPlanError instanceof Error ? currentPlanError.message : 'Erro ao carregar plano atual.')
    }
  }, [currentPlanError])

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
      if (!res.ok) throw new Error('Falha ao salvar alterações.')
      toast.success('Perfil atualizado com sucesso.')
      mutateProfile()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.')
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
    ...(slug === 'edificar' ? {} : { accessibility_needs: accessibilityNeeds || null }),
  }, setSavingPersonal)

  const AVATAR_BUCKET = 'avatars'
  const MAX_AVATAR_BYTES = 2 * 1024 * 1024
  const CROP_SIZE = 240

  function getAvatarPathFromPublicUrl(url: string): string | null {
    const match = url.match(/\/avatars\/(.+)$/)
    return match ? match[1] : null
  }

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

  const getCroppedAvatarBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = cropImageRef.current
      const w = avatarCropImageSize?.w ?? img?.naturalWidth ?? 0
      const h = avatarCropImageSize?.h ?? img?.naturalHeight ?? 0
      if (!img || !w || !h) { reject(new Error('Imagem não carregada')); return }
      const scale = avatarCropScale
      const min = Math.min(w, h)
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
      toast.error(e instanceof Error ? e.message : 'Falha no upload.')
    } finally {
      if (avatarCropUrl) URL.revokeObjectURL(avatarCropUrl)
      setAvatarCropUrl(null)
      setAvatarCropFile(null)
      setAvatarUploading(false)
    }
  }

  const handleSaveJourney = () => handleUpdateProfile({
    target_course: targetCourse || null,
    target_university: targetUniversity || null,
    school_year: schoolYear || null,
    focus_area: focusArea || 'enem_geral',
  }, setSavingJourney)

  const handleSaveRoutine = () => {
    const freeHours = freeHoursStart && freeHoursEnd ? `${freeHoursStart}-${freeHoursEnd}` : null
    handleUpdateProfile({
      study_pace: studyPace || 'moderate',
      study_period: studyPeriod || null,
      days_per_week: daysPerWeek,
      hours_per_day: hoursPerDay,
      free_hours: freeHours,
    }, setSavingRoutine)
  }

  const handleSaveTheme = (val: string) => {
    setThemePref(val)
    setStudentTheme(val as 'light' | 'dark' | 'system')
    handleUpdateProfile({ theme_preference: val }, () => {})
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
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleRequestExport = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { toast.error('Sessão inválida.'); return }
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
    if (!deleteAccountReason) { toast.error('Selecione o motivo da saída.'); return }
    if (deleteAccountEmailConfirm !== user?.email) {
      toast.error('E-mail de confirmação incorreto.')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { toast.error('Sessão inválida.'); return }

    setDeletingAccount(true)
    try {
      const res = await fetch(`${apiUrl}/api/account/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ reason: deleteAccountReason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Falha ao desativar conta.')
      toast.success('Conta desativada. Seu acesso foi encerrado.')
      setDeleteAccountModalOpen(false)
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao desativar conta.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const navItems = [
    { id: 'personal' as const,     label: 'Identidade',          icon: User          },
    ...(isEdificar ? [
      { id: 'plan' as const,        label: 'Meu Plano',           icon: WalletCards   },
    ] : []),
    ...(!isEdificar ? [
      { id: 'journey' as const,    label: 'Jornada Acadêmica',   icon: GraduationCap },
      { id: 'routine' as const,    label: 'Rotina de Estudos',   icon: Clock         },
    ] : []),
    { id: 'security' as const,     label: 'Acesso e Segurança',  icon: Shield        },
    { id: 'preferences' as const,  label: 'Preferências',        icon: Settings      },
  ]

  useEffect(() => {
    if (isEdificar && (activeTab === 'journey' || activeTab === 'routine')) {
      setActiveTab('personal')
    }
  }, [activeTab, isEdificar])

  const planBenefits = [
    currentPlan?.essay_credits_limit
      ? `${currentPlan.essay_credits_limit} reda${currentPlan.essay_credits_limit === 1 ? 'ção' : 'ções'} ${formatPlanPeriod(currentPlan.essay_credits_period)}`
      : null,
    typeof currentPlan?.essay_credits_remaining === 'number'
      ? `${currentPlan.essay_credits_remaining} restante(s) no ciclo atual`
      : null,
    currentPlan?.plan_duration_days
      ? `Vigência de ${currentPlan.plan_duration_days} dias por ciclo`
      : null,
  ].filter(Boolean) as string[]

  const PersonalTabSkeleton = () => (
    <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-6 pt-8 px-8">
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
      <CardFooter className="border-t border-slate-100 dark:border-slate-800 px-8 py-5">
        <Skeleton className="h-10 w-40" />
      </CardFooter>
    </Card>
  )

  // Estilos reutilizáveis com a cor brand
  const primaryBtnStyle = { backgroundColor: BRAND, color: '#fff' }
  const focusRingStyle = '[&:focus-visible]:ring-[#FF8C00]'
  const sectionCardClassName = 'overflow-hidden rounded-[24px] border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900'

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950/50">
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:py-12 lg:px-8">

        {/* Header */}
        <div className="mb-6 rounded-[28px] border border-slate-200/70 bg-white/90 px-4 py-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:mb-8 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
                Configurações da conta
              </span>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
                Meu Perfil
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Gerencie suas informações pessoais, segurança e preferências.
              </p>
            </div>
            {user?.email && (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 sm:max-w-[320px] sm:text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">Conta</span>
                <span className="min-w-0 break-all font-mono">{user.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">

          {/* Navegação lateral */}
          <nav className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:w-60 md:flex-shrink-0 md:grid-cols-1 md:overflow-visible md:px-0 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={isActive ? { backgroundColor: BRAND, color: '#fff' } : undefined}
                  className={`group flex min-w-[172px] snap-start items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-200 md:min-w-0 ${
                    isActive
                      ? 'border-transparent shadow-md'
                      : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'
                  }`}
                >
                  <Icon
                    size={17}
                    style={isActive ? { color: 'rgba(255,255,255,0.85)' } : undefined}
                    className={!isActive ? 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 transition-colors' : ''}
                  />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* ── TAB: IDENTIDADE ─────────────────────────────────────── */}
              {activeTab === 'personal' && (
                profileLoading ? <PersonalTabSkeleton /> : (
                  <Card className={sectionCardClassName}>
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
                      <CardTitle className="text-xl font-bold tracking-tight dark:text-slate-50">Identidade Pessoal</CardTitle>
                      <CardDescription className="text-sm mt-1 dark:text-slate-400">
                        Informações básicas da sua conta. Visíveis na plataforma conforme suas configurações de privacidade.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pt-6 sm:px-8 sm:pt-8">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        aria-hidden
                        onChange={handleAvatarFileSelect}
                      />
                      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10 gap-y-8">
                        {/* Coluna esquerda */}
                        <div className="space-y-6">
                          {/* Avatar */}
                          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={avatarUploading}
                              className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-full text-3xl font-bold text-white shadow-xl ring-4 ring-white transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:pointer-events-none disabled:opacity-70"
                              style={{ background: `linear-gradient(135deg, ${BRAND}, #d97706)` }}
                            >
                              {avatarUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                              ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                              ) : (
                                fullName.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'
                              )}
                              {!avatarUploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                                  <Camera className="h-6 w-6 text-white" />
                                </div>
                              )}
                            </button>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:truncate">{fullName || 'Aluno'}</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 text-white" style={{ backgroundColor: BRAND }}>
                                  Aluno
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400 break-all">{user?.email ?? ''}</p>
                              <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                                {profile?.avatar_url && (
                                  <Button type="button" variant="outline" size="sm" className="h-9 w-full rounded-xl text-xs font-semibold sm:h-8 sm:w-auto sm:rounded-lg" onClick={() => setAvatarViewOpen(true)} disabled={avatarUploading}>
                                    Ver foto
                                  </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" className="h-9 w-full rounded-xl text-xs font-semibold sm:h-8 sm:w-auto sm:rounded-lg" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
                                  {avatarUploading ? 'Enviando…' : 'Alterar Avatar'}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Campos primários */}
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="fullName" className="text-slate-700 dark:text-slate-200 font-bold">Nome Completo</Label>
                              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="username" className="text-slate-700 dark:text-slate-200 font-bold">Nome de usuário</Label>
                              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@seunome" className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="pronouns" className="text-slate-700 dark:text-slate-200 font-bold">Pronome</Label>
                              <Input id="pronouns" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="Ex: ele/dele, ela/dela" className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="birthDate" className="text-slate-700 dark:text-slate-200 font-bold">Data de Nascimento</Label>
                              <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="whatsapp_phone" className="text-slate-700 dark:text-slate-200 font-bold">WhatsApp / Telefone</Label>
                              <Input id="whatsapp_phone" value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} placeholder="(11) 99999-9999" className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                            </div>
                          </div>
                        </div>

                        {/* Coluna direita */}
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <Label htmlFor="bio" className="text-slate-700 dark:text-slate-200 font-bold">Biografia</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre você..." maxLength={500} className={`rounded-xl bg-slate-50/50 resize-none min-h-[90px] ${focusRingStyle}`} />
                            <p className="text-xs text-slate-400 text-right">{bio.length}/500</p>
                          </div>
                          {!isEdificar && (
                            <div className="space-y-2">
                              <Label htmlFor="accessibilityNeeds" className="text-slate-700 dark:text-slate-200 font-bold">Necessidade de Acessibilidade</Label>
                              <Textarea id="accessibilityNeeds" value={accessibilityNeeds} onChange={(e) => setAccessibilityNeeds(e.target.value)} placeholder="Ex: dislexia, daltonismo, baixa visão..." maxLength={500} className={`rounded-xl bg-slate-50/50 resize-none min-h-[72px] ${focusRingStyle}`} />
                            </div>
                          )}
                          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-slate-700 dark:text-slate-200 font-bold">Perfil Público</Label>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Quando ativado, seu nome e sua foto aparecem normalmente nos rankings. Quando desativado, você continua ocupando sua posição, mas aparece para outros alunos como usuário secreto, sem nome nem foto.
                              </p>
                            </div>
                            <Switch checked={publicProfile} onCheckedChange={setPublicProfile} aria-label="Perfil público" style={{ ['--switch-checked' as string]: BRAND }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-5 py-4 sm:px-8 sm:py-5 flex justify-end">
                      <Button onClick={handleSavePersonal} disabled={savingPersonal} style={primaryBtnStyle} className="w-full rounded-xl px-8 font-semibold shadow-md transition-all hover:opacity-90 sm:w-auto">
                        {savingPersonal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Salvar Identidade
                      </Button>
                    </CardFooter>
                  </Card>
                )
              )}

              {isEdificar && activeTab === 'plan' && (
                <Card className={sectionCardClassName}>
                  <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-6 dark:border-slate-800 sm:px-8 sm:pb-6 sm:pt-8">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight dark:text-slate-50">
                      <WalletCards className="h-5 w-5" style={{ color: BRAND }} />
                      Meu Plano
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm dark:text-slate-400">
                      As informações abaixo refletem o mesmo plano configurado pelo founder para sua conta.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 px-5 pt-6 sm:px-8 sm:pt-8">
                    {currentPlanLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-24 w-full rounded-2xl" />
                      </div>
                    ) : currentPlan?.plan_id ? (
                      <>
                        <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/40 sm:p-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                              <div className="inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white" style={{ backgroundColor: BRAND }}>
                                {currentPlan.plan_assignment_status === 'active' ? 'Plano ativo' : 'Plano configurado'}
                              </div>
                              <div>
                                <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                                  {currentPlan.plan_name || 'Plano institucional'}
                                </h3>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                  {currentPlan.plan_description || 'Seu founder pode ajustar nome, valor e benefícios deste plano a qualquer momento.'}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Valor do plano</p>
                              <p className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
                                {formatMoney(currentPlan.plan_price_cents)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Redações usadas</p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{currentPlan.essay_credits_used ?? 0}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/70">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Redações restantes</p>
                            <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
                              {typeof currentPlan.essay_credits_remaining === 'number' ? currentPlan.essay_credits_remaining : 'Ilimitado'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/70 sm:p-6">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Benefícios do seu plano</h3>
                          <div className="mt-4 grid gap-3">
                            {planBenefits.length > 0 ? planBenefits.map((benefit) => (
                              <div key={benefit} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND }} />
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{benefit}</p>
                              </div>
                            )) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                Os benefícios deste plano ainda não foram detalhados pelo founder.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <WalletCards className="mx-auto h-8 w-8 text-slate-400" />
                        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">Nenhum plano vinculado</h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Quando a Edificar associar um plano à sua conta, ele aparecerá aqui com valor e benefícios atualizados em tempo real.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── TAB: JORNADA ACADÊMICA ──────────────────────────────── */}
              {!isEdificar && activeTab === 'journey' && (
                <Card className={sectionCardClassName}>
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
                    <CardTitle className="text-xl font-bold tracking-tight dark:text-slate-50">Jornada Acadêmica</CardTitle>
                    <CardDescription className="text-sm mt-1 dark:text-slate-400">
                      Configure seu objetivo, curso alvo e fase de estudo. A IA utiliza esses dados para personalizar seu aprendizado.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 px-5 pt-6 sm:px-8 sm:pt-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Curso Alvo</Label>
                        <Input placeholder="Ex: Ciência da Computação" value={targetCourse} onChange={(e) => setTargetCourse(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Instituição Alvo</Label>
                        <Input placeholder="Ex: UNICAMP, USP" value={targetUniversity} onChange={(e) => setTargetUniversity(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Fase Acadêmica</Label>
                        <Select value={schoolYear} onValueChange={setSchoolYear}>
                          <SelectTrigger className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`}>
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
                          <SelectTrigger className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`}>
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
                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-5 py-4 sm:px-8 sm:py-5 flex justify-end">
                    <Button onClick={handleSaveJourney} disabled={savingJourney} style={primaryBtnStyle} className="w-full rounded-xl px-8 font-semibold shadow-md hover:opacity-90 sm:w-auto">
                      {savingJourney && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Salvar alterações
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ── TAB: ROTINA DE ESTUDOS ──────────────────────────────── */}
              {!isEdificar && activeTab === 'routine' && (
                <Card className={sectionCardClassName}>
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 px-5 pb-5 pt-6 sm:px-8 sm:pb-6 sm:pt-8">
                    <CardTitle className="text-xl font-bold tracking-tight dark:text-slate-50">Rotina de Estudos</CardTitle>
                    <CardDescription className="text-sm mt-1 dark:text-slate-400">
                      Alinhe ritmo, dias e horas ao seu planejamento. Usados pela IA para sugerir cronogramas personalizados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8 px-5 pt-6 sm:px-8 sm:pt-8">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-200 font-bold">Ritmo de Estudo</Label>
                      <Select value={studyPace || 'moderate'} onValueChange={setStudyPace}>
                        <SelectTrigger className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`}>
                          <SelectValue placeholder="Selecione o ritmo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="slow">🐢 Leve — poucas tarefas por dia</SelectItem>
                          <SelectItem value="moderate">⚡ Médio — ritmo equilibrado</SelectItem>
                          <SelectItem value="intense">🔥 Intenso — máximo aproveitamento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Período preferido</Label>
                        <Select value={studyPeriod || ''} onValueChange={setStudyPeriod}>
                          <SelectTrigger className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`}>
                            <SelectValue placeholder="Quando prefere estudar?" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="morning">🌅 Manhã</SelectItem>
                            <SelectItem value="afternoon">☀️ Tarde</SelectItem>
                            <SelectItem value="evening">🌙 Noite</SelectItem>
                            <SelectItem value="flexible">🔄 Flexível</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Dias por semana</Label>
                        <Select value={String(daysPerWeek)} onValueChange={(v) => setDaysPerWeek(parseInt(v, 10))}>
                          <SelectTrigger className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'dia' : 'dias'}/semana</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-200 font-bold">Horas por dia</Label>
                      <Select value={String(hoursPerDay)} onValueChange={(v) => setHoursPerDay(parseInt(v, 10))}>
                        <SelectTrigger className={`w-full rounded-xl bg-slate-50/50 sm:max-w-xs ${focusRingStyle}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} h/dia</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-slate-700 dark:text-slate-200 font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4" style={{ color: BRAND }} />
                          Horário livre para estudar
                        </Label>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Defina a janela de horário disponível. Os lembretes de WhatsApp serão enviados nesse período.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Das</Label>
                          <input
                            type="time"
                            value={freeHoursStart}
                            onChange={(e) => setFreeHoursStart(e.target.value)}
                            className="flex h-10 w-full rounded-xl border border-input bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            style={{ ['--tw-ring-color' as string]: BRAND } as React.CSSProperties}
                          />
                        </div>
                        <div className="text-center text-sm font-medium text-slate-500 select-none sm:pt-5">até</div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Às</Label>
                          <input
                            type="time"
                            value={freeHoursEnd}
                            onChange={(e) => setFreeHoursEnd(e.target.value)}
                            className="flex h-10 w-full rounded-xl border border-input bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                            style={{ ['--tw-ring-color' as string]: BRAND } as React.CSSProperties}
                          />
                        </div>
                      </div>
                      </div>
                      {freeHoursStart && freeHoursEnd && (
                        <p className="text-xs font-medium" style={{ color: BRAND }}>
                          ⏰ Lembretes ativados: {freeHoursStart} às {freeHoursEnd}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-5 py-4 sm:px-8 sm:py-5 flex justify-end">
                    <Button onClick={handleSaveRoutine} disabled={savingRoutine} style={primaryBtnStyle} className="w-full rounded-xl px-8 font-semibold shadow-md hover:opacity-90 sm:w-auto">
                      {savingRoutine ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Salvar Rotina
                    </Button>
                  </CardFooter>
                </Card>
              )}

              {/* ── TAB: ACESSO & SEGURANÇA ─────────────────────────────── */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Credenciais */}
                  <Card className={sectionCardClassName}>
                    <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-6 dark:border-slate-800 sm:px-8 sm:pb-6 sm:pt-8">
                      <CardTitle className="text-xl font-bold tracking-tight dark:text-slate-50">Credenciais de Acesso</CardTitle>
                      <CardDescription className="mt-1 text-sm dark:text-slate-400">
                        <span className="block">E-mail associado:</span>
                        <span className="mt-2 inline-flex max-w-full overflow-hidden rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200 break-all">
                          {user?.email}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="max-w-xl space-y-6 px-5 pt-6 sm:px-8 sm:pt-8">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200 font-bold">Senha Atual</Label>
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200 font-bold">Nova Senha</Label>
                          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200 font-bold">Confirmação</Label>
                          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`rounded-xl bg-slate-50/50 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-100 ${focusRingStyle}`} />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-8 sm:py-5">
                      <Button onClick={handleSavePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword} style={primaryBtnStyle} className="w-full rounded-xl px-8 font-semibold shadow-md hover:opacity-90 sm:w-auto">
                        {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Atualizar Senha
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Sessões Ativas */}
                  <Card className={sectionCardClassName}>
                    <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-6 dark:border-slate-800 sm:px-8">
                      <CardTitle className="text-lg font-bold dark:text-slate-50">Sessões Ativas</CardTitle>
                      <CardDescription className="text-xs mt-1 dark:text-slate-400">Dispositivos logados na sua conta.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pt-6 sm:px-8">
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
                              <div key={s.id} className="flex flex-col gap-3 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between last:border-0 last:pb-0">
                                <div className="flex min-w-0 items-center gap-4">
                                  <div className={`p-2.5 rounded-full ${isCurrent ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`} style={isCurrent ? { backgroundColor: `${BRAND}20`, color: BRAND } : undefined}>
                                    <Laptop size={18} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{s.device_info ?? 'Dispositivo'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {s.location ? `${s.location} • ` : ''}{formatLastActive(s.last_active_at)}
                                    </p>
                                  </div>
                                </div>
                                {isCurrent ? (
                                  <span className="inline-flex w-fit rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-600">Atual</span>
                                ) : (
                                  <Button variant="ghost" size="sm" className="w-full justify-center text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 sm:w-auto" onClick={() => handleRevokeSession(s.id)}>
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

              {/* ── TAB: PREFERÊNCIAS ───────────────────────────────────── */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <Card className={sectionCardClassName}>
                    <CardHeader className="border-b border-slate-100 px-5 pb-5 pt-6 dark:border-slate-800 sm:px-8 sm:pb-6 sm:pt-8">
                      <CardTitle className="text-xl font-bold tracking-tight dark:text-slate-50">Preferências de Interface</CardTitle>
                      <CardDescription className="text-sm mt-1 dark:text-slate-400">Personalize a aparência e notificações.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 px-5 pt-6 sm:px-8 sm:pt-8">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Palette size={18} style={{ color: BRAND }} />
                            Tema da Aplicação
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Substitui o padrão do sistema operacional.</p>
                        </div>
                        <Select value={themePref} onValueChange={handleSaveTheme}>
                          <SelectTrigger className="w-full rounded-xl bg-slate-50 font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:w-[140px]">
                            <SelectValue placeholder="Tema" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="light">Claro</SelectItem>
                            <SelectItem value="dark">Escuro</SelectItem>
                            <SelectItem value="system">Sistema</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </CardContent>
                  </Card>

                  {/* Zona de Risco (LGPD + Encerrar Conta) */}
                  <Card className={`${isEdificar ? sectionCardClassName : 'overflow-hidden rounded-[24px] border border-red-200/50 bg-red-50/20 shadow-sm dark:border-red-900/50 dark:bg-red-950/20'}`}>
                    <CardHeader className="border-b border-red-100/50 px-5 pb-5 pt-6 dark:border-red-900/50 sm:px-8">
                      <CardTitle className={`text-lg font-bold ${isEdificar ? 'text-slate-900 dark:text-slate-100' : 'text-red-700 dark:text-red-400'}`}>
                        {isEdificar ? 'Seus Dados' : 'Zona de Risco'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 px-5 pt-6 sm:px-8">
                      <div className={`flex flex-col items-start justify-between gap-4 rounded-xl border bg-white p-5 dark:bg-slate-800/50 sm:flex-row sm:items-center ${isEdificar ? 'border-slate-200 dark:border-slate-700' : 'border-red-100 dark:border-slate-700'}`}>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">Exportar Dados (LGPD)</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Faça o download de todos os seus dados em JSON.</p>
                        </div>
                        <Button variant="outline" className="w-full rounded-xl border-slate-200 font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 sm:w-auto sm:shrink-0" onClick={handleRequestExport} disabled={exportingData}>
                          {exportingData ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                          Exportar Arquivo
                        </Button>
                      </div>

                      {!isEdificar && (
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-800/50 p-5 rounded-xl">
                          <div>
                            <p className="font-bold text-red-600 dark:text-red-400">Encerrar Conta Permanentemente</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Esta ação é irreversível. Todos os dados serão apagados.</p>
                          </div>
                          <Button variant="destructive" className="w-full rounded-xl bg-red-600 font-semibold hover:bg-red-700 sm:w-auto sm:shrink-0" onClick={() => setDeleteAccountModalOpen(true)}>
                            <Trash2 size={16} className="mr-2" /> Deletar Conta
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Visualizar foto ───────────────────────────────────────── */}
      <Dialog open={avatarViewOpen} onOpenChange={setAvatarViewOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 p-0 overflow-hidden dark:border-slate-700 sm:max-w-md">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold dark:text-slate-100">Sua foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">Visualização em tamanho maior.</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 flex justify-center">
            {profile?.avatar_url && (
              <img src={profile.avatar_url} alt="Foto de perfil" className="w-48 h-48 rounded-full object-cover" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Crop avatar ──────────────────────────────────────────── */}
      <Dialog open={avatarCropOpen} onOpenChange={(open) => !open && closeCropModal()}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 p-0 overflow-hidden dark:border-slate-700 sm:max-w-md">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-bold dark:text-slate-100">Ajustar foto de perfil</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Arraste para posicionar e use o zoom. O que estiver dentro do círculo será sua foto.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-4">
            <div
              ref={cropContainerRef}
              className="mx-auto rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center select-none touch-none"
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
                      width: avatarCropImageSize ? CROP_SIZE * Math.max(1, avatarCropImageSize.w / avatarCropImageSize.h) : CROP_SIZE,
                      height: avatarCropImageSize ? CROP_SIZE * Math.max(1, avatarCropImageSize.h / avatarCropImageSize.w) : CROP_SIZE,
                      transform: `translate(-50%, -50%) translate(${avatarCropPosition.x}px, ${avatarCropPosition.y}px) scale(${avatarCropScale})`,
                      transformOrigin: 'center center',
                    }}
                    draggable={false}
                  />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 shrink-0">Zoom</span>
              <input
                type="range" min={0.5} max={2.5} step={0.05}
                value={avatarCropScale}
                onChange={(e) => setAvatarCropScale(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none bg-slate-200 dark:bg-slate-700"
                style={{ accentColor: BRAND }}
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 w-8">{Math.round(avatarCropScale * 100)}%</span>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 border-t border-slate-100 p-6 pt-2 dark:border-slate-800 sm:flex-row">
            <Button type="button" variant="outline" onClick={closeCropModal} className="w-full rounded-xl dark:border-slate-600 dark:text-slate-200 sm:w-auto">Cancelar</Button>
            <Button type="button" onClick={handleAvatarCropConfirm} style={primaryBtnStyle} className="w-full rounded-xl hover:opacity-90 sm:w-auto">
              Usar esta foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Encerrar Conta ────────────────────────────────────────── */}
      <Dialog open={!isEdificar && deleteAccountModalOpen} onOpenChange={setDeleteAccountModalOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border-0 p-0 shadow-2xl sm:max-w-lg">
          <div className="relative bg-gradient-to-r from-red-700 to-red-600 p-5 text-white sm:p-8">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle size={100} />
            </div>
            <DialogTitle className="relative z-10 flex items-start gap-3 text-xl font-black tracking-tight text-white sm:text-2xl">
              <Trash2 size={28} />
              Encerrar Conta Permanentemente
            </DialogTitle>
            <DialogDescription className="text-red-50 mt-3 text-sm leading-relaxed relative z-10">
              Esta ação é irreversível. Todos os seus dados e histórico serão apagados permanentemente.
            </DialogDescription>
          </div>
          <div className="space-y-6 bg-white p-5 dark:bg-slate-900 sm:p-8">
            <div className="space-y-3">
              <Label htmlFor="deleteReason" className="font-bold text-slate-700 dark:text-slate-200">
                Por que está saindo? <span className="text-red-600">*</span>
              </Label>
              <Select value={deleteAccountReason} onValueChange={setDeleteAccountReason} required>
                <SelectTrigger id="deleteReason" className="rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="atingi_objetivo">Atingi meu objetivo / Fui aprovado</SelectItem>
                  <SelectItem value="plataforma_complexa">Achei a plataforma complexa</SelectItem>
                  <SelectItem value="falta_tempo">Falta de tempo</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 p-5 bg-red-50/50 dark:bg-red-950/30 rounded-2xl border border-red-100 dark:border-red-900/50">
              <Label htmlFor="deleteEmailConfirm" className="text-slate-800 dark:text-slate-200 font-bold block">
                Confirmação de segurança
                <span className="block mt-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                  Digite <span className="text-red-600 font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/50">{user?.email}</span> para confirmar.
                </span>
              </Label>
              <Input
                id="deleteEmailConfirm"
                type="email"
                value={deleteAccountEmailConfirm}
                onChange={(e) => setDeleteAccountEmailConfirm(e.target.value)}
                className="bg-white dark:bg-slate-800 dark:border-red-900 dark:text-slate-100 rounded-xl border-red-200"
                placeholder="Digite seu e-mail"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:justify-end sm:p-6">
            <Button variant="ghost" onClick={() => setDeleteAccountModalOpen(false)} className="w-full rounded-xl font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 sm:w-auto">
              Cancelar
            </Button>
            <Button
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deletingAccount || !deleteAccountReason || deleteAccountEmailConfirm !== user?.email}
              className="w-full rounded-xl bg-red-600 px-6 font-bold shadow-md hover:bg-red-700 sm:w-auto"
            >
              {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Encerrar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
