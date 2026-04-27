'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Flame, BookOpen, Zap, Trophy, ShieldCheck,
  TrendingUp, AlertCircle, Brain, ArrowRight,
  MessageCircle, Gamepad2, Target, Layers,
  Calendar, Library, FileEdit,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { brtDateDaysAgo } from '@/lib/brt-date'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    total_questions: number
    accuracy_percentage: number
    current_streak: number
    monthly_points: number
    total_simulados: number
  }
  performance_by_subject: Array<{
    subject: string
    total: number
    correct: number
    accuracy: number
  }>
  activity_history: Array<{
    usage_date: string
    questions_count: number
    simulations_count: number
  }>
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1500, skip = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (skip || target === 0) return
    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, skip])
  return skip ? target : count
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 flex flex-col gap-3 animate-pulse min-h-[130px] border border-slate-100 dark:border-slate-800">
      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
      <div className="w-14 h-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
      <div className="w-24 h-3 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  value: number
  label: string
  suffix?: string
  sublabel?: string
  delay: number
  reducedMotion: boolean
  progress?: number
  accentColor: string
  bgTint: string
}

function StatCard({
  icon: Icon, value, label, suffix = '', sublabel, delay,
  reducedMotion, progress, accentColor, bgTint,
}: StatCardProps) {
  const count = useCounter(value, 1500, reducedMotion)
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`${bgTint} rounded-2xl p-5 flex flex-col gap-2 shadow-sm overflow-hidden border-l-4`}
      style={{ borderLeftColor: accentColor }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
      >
        <Icon size={18} style={{ color: accentColor }} aria-hidden />
      </div>
      <div className="mt-0.5">
        <div className="text-[2.25rem] font-black text-slate-900 dark:text-slate-100 leading-none tabular-nums">
          {count.toLocaleString('pt-BR')}{suffix}
        </div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{sublabel}</div>
        )}
      </div>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
      {progress !== undefined && (
        <div className="w-full h-1 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ delay: delay + 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      )}
    </motion.div>
  )
}

function AccuracyRingCard({ value, delay, reducedMotion }: { value: number; delay: number; reducedMotion: boolean }) {
  const count = useCounter(value, 1500, reducedMotion)
  const size = 72; const sw = 7; const r = (size - sw) / 2; const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 flex flex-col items-center gap-2 shadow-sm border-l-4"
      style={{ borderLeftColor: 'var(--brand-primary)' }}
    >
      <div className="relative">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={sw} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke="var(--brand-primary)" strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: reducedMotion ? 'none' : 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-slate-900 dark:text-slate-100 tabular-nums">{count}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">de precisão</span>
    </motion.div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-px h-10 w-full" aria-hidden>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{
            height: `${Math.max(v > 0 ? (v / max) * 100 : 4, 4)}%`,
            backgroundColor: 'var(--brand-primary)',
            opacity: v > 0 ? 0.3 + (v / max) * 0.7 : 0.1,
          }}
        />
      ))}
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Missão diária no WhatsApp',
    desc: 'Cronograma personalizado enviado todo dia direto no seu celular',
  },
  {
    icon: Gamepad2,
    title: 'SpeedRun de Questões',
    desc: 'Jogo competitivo contra o tempo com ranking ao vivo',
  },
  {
    icon: Target,
    title: 'Painel de Metas',
    desc: 'Crie, acompanhe e conclua metas de estudo com IA',
  },
  {
    icon: Layers,
    title: 'Flashcards Inteligentes',
    desc: 'Sistema de repetição espaçada para fixar conteúdo',
  },
  {
    icon: MessageCircle,
    title: 'Suporte direto com a equipe',
    desc: 'Canal aberto para tirar dúvidas e destravar o uso da plataforma',
  },
  {
    icon: Calendar,
    title: 'Plano de Estudos',
    desc: 'Cronograma semanal gerado por IA com base no seu perfil',
  },
  {
    icon: Library,
    title: 'Biblioteca Digital',
    desc: 'Materiais de apoio por matéria e tópico',
  },
  {
    icon: FileEdit,
    title: 'Correção de Redações IA',
    desc: 'Feedback por competência com nota estimada',
    badge: 'Em breve',
  },
]

// ─── Animation variants ───────────────────────────────────────────────────────

const FADE_UP = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudyTrackPage() {
  useParams<{ slug: string }>()
  const reducedMotion = useReducedMotion()

  const [firstName, setFirstName] = useState('Estudante')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [rankingPos, setRankingPos] = useState<number | null>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setAccessToken(session.access_token)
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).single()
      setFirstName(profile?.full_name?.split(' ')[0] || 'Estudante')
      setAuthLoading(false)
    }
    init()
  }, [])

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
    const headers = { Authorization: `Bearer ${accessToken}` }

    Promise.allSettled([
      fetch(`${apiUrl}/api/student/analytics/dashboard`, { headers }),
      fetch(`${apiUrl}/api/simulado/ranking`, { headers }),
    ]).then(async ([analyticsResult, rankingResult]) => {
      if (analyticsResult.status === 'fulfilled' && analyticsResult.value.ok) {
        setAnalytics(await analyticsResult.value.json())
      }
      if (rankingResult.status === 'fulfilled' && rankingResult.value.ok) {
        const r = await rankingResult.value.json()
        setRankingPos(r.user_position ?? null)
      }
      setDataLoading(false)
    })
  }, [accessToken])

  // ── Derived ───────────────────────────────────────────────────────────────
  const ov = analytics?.overview
  const isLoading = authLoading || dataLoading

  const qualifiedSubjects = (analytics?.performance_by_subject || []).filter(s => s.total >= 3)
  const bestSubject = qualifiedSubjects.length > 0
    ? qualifiedSubjects.reduce((a, b) => a.accuracy > b.accuracy ? a : b)
    : null
  const worstSubject = qualifiedSubjects.length > 1
    ? qualifiedSubjects.reduce((a, b) => a.accuracy < b.accuracy ? a : b)
    : null
  const sameSubject = bestSubject && worstSubject && bestSubject.subject === worstSubject.subject

  const activityLast30 = (() => {
    const history = analytics?.activity_history || []
    return Array.from({ length: 30 }, (_, i) => {
      const key = brtDateDaysAgo(29 - i)
      return history.find(r => r.usage_date === key)?.questions_count || 0
    })
  })()
  const hasActivity = activityLast30.some(v => v > 0)

  type StatDef = StatCardProps & { key: string }
  const statCards: StatDef[] = ([
    ov?.current_streak && ov.current_streak > 0
      ? { key: 'streak', icon: Flame, value: ov.current_streak, label: 'Dias Seguidos', delay: 0, accentColor: 'var(--brand-primary)', bgTint: 'bg-orange-50 dark:bg-orange-900/20' }
      : null,
    ov?.total_questions && ov.total_questions > 0
      ? { key: 'questions', icon: BookOpen, value: ov.total_questions, label: 'Questões Respondidas', delay: 0.06, accentColor: '#6366f1', bgTint: 'bg-indigo-50 dark:bg-indigo-900/20' }
      : null,
    ov?.monthly_points && ov.monthly_points > 0
      ? { key: 'points', icon: Zap, value: ov.monthly_points, label: 'Pontos do Mês', delay: 0.12, accentColor: '#8b5cf6', bgTint: 'bg-violet-50 dark:bg-violet-900/20' }
      : null,
    ov?.total_simulados && ov.total_simulados > 0
      ? { key: 'simulados', icon: Brain, value: ov.total_simulados, label: 'Simulados Feitos', delay: 0.18, accentColor: '#0ea5e9', bgTint: 'bg-sky-50 dark:bg-sky-900/20' }
      : null,
    rankingPos
      ? { key: 'ranking', icon: Trophy, value: rankingPos, label: 'No Ranking de Hoje', suffix: 'º', delay: 0.24, accentColor: '#f59e0b', bgTint: 'bg-yellow-50 dark:bg-yellow-900/20' }
      : null,
  ] as (StatDef | null)[]).filter(Boolean) as StatDef[]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-[#F5F5F7] dark:bg-slate-950/50 pb-16">
      <div className="max-w-lg mx-auto">

        {/* ═══════════════════ SEÇÃO 1 — HERO ══════════════════════════════ */}
        <section
          className="relative overflow-hidden rounded-b-[2.5rem] mb-6"
          style={{ background: '#111' }}
        >
          {/* Dot pattern */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Glows */}
          <div
            className="absolute -top-10 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            aria-hidden
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 18%, transparent)' }}
          />
          <div
            className="absolute bottom-0 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none"
            aria-hidden
            style={{ background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' }}
          />

          <div className="relative z-10 px-6 pt-10 pb-12 text-center">
            {/* Edificar tag */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
              style={{
                background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--brand-primary)' }}
              >
                Edificar
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight"
            >
              {isLoading
                ? `Olá, ${firstName}!`
                : 'Olha o que você construiu aqui dentro.'
              }
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.5 }}
              className="mt-3 text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {isLoading
                ? 'Carregando seu progresso...'
                : ov?.current_streak && ov.current_streak > 0
                  ? `${ov.current_streak} ${ov.current_streak === 1 ? 'dia seguido' : 'dias seguidos'}. Isso é disciplina real, ${firstName}.`
                  : `Cada questão é um passo, ${firstName}.`
              }
            </motion.p>
          </div>
        </section>

        <div className="px-4 space-y-7">

          {/* ═══════════════════ SEÇÃO 2 — MÉTRICAS ═════════════════════════ */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-0.5">
              Seu progresso
            </p>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}
              </div>
            ) : statCards.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-500 text-sm shadow-sm border border-slate-100 dark:border-slate-800">
                Nenhuma atividade registrada ainda.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {statCards.map(({ key, ...cardProps }) => (
                  <StatCard key={key} {...cardProps} reducedMotion={reducedMotion} />
                ))}
                {ov && ov.total_questions >= 5 && (
                  <AccuracyRingCard
                    value={ov.accuracy_percentage}
                    delay={0.3}
                    reducedMotion={reducedMotion}
                  />
                )}
              </div>
            )}
          </section>

          {/* ═══════════════════ SEÇÃO 3 — MATÉRIAS ════════════════════════ */}
          {!isLoading && qualifiedSubjects.length > 0 && (
            <motion.section {...(reducedMotion ? {} : FADE_UP)}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-0.5">
                Análise por matéria
              </p>
              {sameSubject ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center shadow-sm border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Responda mais questões para ver seus pontos fortes e fracos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {bestSubject && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 border-l-4 shadow-sm" style={{ borderLeftColor: 'var(--brand-primary)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} style={{ color: 'var(--brand-primary)' }} />
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          Ponto Forte
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{bestSubject.subject}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sua melhor matéria até agora</p>
                      <div className="mt-3 h-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${bestSubject.accuracy}%` }}
                          transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: 'var(--brand-primary)' }}
                        />
                      </div>
                      <p
                        className="text-xs font-bold mt-1.5"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        {bestSubject.accuracy}% de precisão
                      </p>
                    </div>
                  )}
                  {worstSubject && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border-l-4 border-red-400 dark:border-red-500 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-red-500 dark:text-red-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                          Atenção
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{worstSubject.subject}</p>
                      <div className="mt-3 h-1.5 bg-red-100 dark:bg-red-900/40 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${worstSubject.accuracy}%` }}
                          transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full bg-red-400 dark:bg-red-500 rounded-full"
                        />
                      </div>
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-1.5">
                        {worstSubject.accuracy}% de precisão
                      </p>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          )}

          {/* ═══════════════════ SEÇÃO 4 — ATIVIDADE ════════════════════════ */}
          {!isLoading && hasActivity && (
            <motion.section {...(reducedMotion ? {} : FADE_UP)}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-0.5">
                Sua atividade nos últimos 30 dias
              </p>
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                <Sparkline data={activityLast30} />
              </div>
            </motion.section>
          )}

          {/* ═══════════════════ SEÇÃO 5 — ÂNCORA DE PERDA ═════════════════ */}
          <motion.section
            {...(reducedMotion ? {} : FADE_UP)}
            className="rounded-2xl p-6 text-center"
            style={{ background: '#111' }}
          >
            <p className="text-white font-bold text-[15px] leading-relaxed">
              Tudo isso fica salvo. Mas você só está vendo uma parte do que a plataforma oferece.
            </p>
            <div
              className="mt-4 mx-auto w-12 h-0.5 rounded-full"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            />
          </motion.section>

          {/* ═══════════════════ SEÇÃO 6 — FEATURES ════════════════════════ */}
          <motion.section {...(reducedMotion ? {} : FADE_UP)}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-0.5">
              O que a StudyTrack oferece além
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, title, desc, badge }) => (
                <div
                  key={title}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm flex flex-col gap-2 relative border border-slate-100 dark:border-slate-800"
                >
                  {badge && (
                    <span
                      className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', color: 'var(--brand-primary)' }}
                    >
                      {badge}
                    </span>
                  )}
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)' }}
                  >
                    <Icon size={15} style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug pr-6">{title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ═══════════════════ SEÇÃO 7 — CTA FINAL ═══════════════════════ */}
          <motion.section
            {...(reducedMotion ? {} : FADE_UP)}
            className="text-center pb-4"
          >
            <a
              href="https://studytrack.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 px-6 font-black text-white text-base shadow-lg active:scale-[0.98] transition-transform duration-150"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 85%, black) 100%)',
                boxShadow: '0 8px 32px color-mix(in srgb, var(--brand-primary) 35%, transparent)',
              }}
            >
              Quero acesso completo à StudyTrack
              <ArrowRight size={18} />
            </a>
            <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
              Sem fidelidade · Cancele quando quiser
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <ShieldCheck size={13} className="text-slate-300 dark:text-slate-600" />
              Ambiente seguro
            </div>
          </motion.section>

        </div>
      </div>
    </div>
  )
}
