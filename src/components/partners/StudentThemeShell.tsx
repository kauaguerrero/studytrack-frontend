'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useStudentTheme } from '@/contexts/StudentThemeContext'
import { useOrg } from '@/contexts/OrgContext'
import { PartnerLayout } from './PartnerLayout'
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal'
import { ShieldEarnedPopup } from './gamification/ShieldEarnedPopup'
import { QuestionSessionRewardPopup } from './gamification/QuestionSessionRewardPopup'
import { PopupQueueProvider, usePopupQueue } from './gamification/PopupQueueContext'

/**
 * Aplica a classe `dark` em um contêiner isolado para as rotas de aluno.
 *
 * O @custom-variant do Tailwind v4 (`&:is(.dark *)`) propaga o tema escuro
 * para TODOS os descendentes, incluindo componentes shadcn/ui, textos,
 * botões e ícones — sem afetar nenhuma outra rota da aplicação.
 */
function StudentThemeShellContent({
  children,
  mustChangePassword = false,
}: {
  children: ReactNode
  mustChangePassword?: boolean
}) {
  const { resolvedTheme } = useStudentTheme()
  const isDark = resolvedTheme === 'dark'
  const { org } = useOrg()
  const { slug } = org
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)
  const { currentPopup, enqueuePopup, dismissCurrentPopup, holdQueueUntilRouteChange } = usePopupQueue()

  // Controlado localmente: some após troca bem-sucedida sem precisar de reload
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)

  useEffect(() => {
    if (!org.permissions?.monthly_identity_titles_v1) return
    if (!pathname) return
    if (pathname.includes('/student/dashboard')) return

    let cancelled = false

    async function enforceMonthlyCheckIn() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token || cancelled) return

        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'
        const res = await fetch(`${apiBase}/api/partner/gamification/check-in/status`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok || cancelled) return

        const data = await res.json() as { required?: boolean }
        if (data.required && !cancelled) {
          window.location.assign(`/partners/${slug}/student/dashboard?forceCheckIn=1`)
        }
      } catch {
        // Falha silenciosa: não bloqueia o shell, mas o dashboard continua cobrando o check-in.
      }
    }

    void enforceMonthlyCheckIn()
    return () => { cancelled = true }
  }, [org.permissions?.monthly_identity_titles_v1, pathname, slug])

  // Ao sair do banco de questões lê os dois sinais e enfileira os popups
  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = pathname

    window.dispatchEvent(new CustomEvent('student-route-changed', {
      detail: { pathname, previousPathname: prev ?? null },
    }))

    if (prev?.includes('banco-de-questoes') && !pathname?.includes('banco-de-questoes')) {
      const rawPts = sessionStorage.getItem('qsr_pending_points')
      const shieldEarned = sessionStorage.getItem('qsr_shield_earned') === '1'

      const pts = rawPts ? parseInt(rawPts, 10) : 0
      if (pts > 0) sessionStorage.removeItem('qsr_pending_points')
      if (shieldEarned) sessionStorage.removeItem('qsr_shield_earned')

      if (shieldEarned) {
        enqueuePopup({
          kind: 'shield_earned',
          routeScope: 'dashboard',
          dedupeKey: 'shield-earned-current-session',
        })
      }

      if (pts > 0) {
        enqueuePopup({
          kind: 'question_session_reward',
          routeScope: 'dashboard',
          points: pts,
          slug,
          dedupeKey: `question-session-reward:${pts}:${Date.now()}`,
        })
      }
    }
  }, [enqueuePopup, pathname, slug])

  return (
    <div
      className={isDark ? 'dark' : ''}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
      suppressHydrationWarning
    >
      <PartnerLayout variant="student">
        {children}
      </PartnerLayout>

      {showPasswordModal && (
        <ForcePasswordChangeModal onSuccess={() => setShowPasswordModal(false)} />
      )}

      {currentPopup?.kind === 'shield_earned' && (
        <ShieldEarnedPopup onDismiss={dismissCurrentPopup} />
      )}

      {currentPopup?.kind === 'question_session_reward' && (
        <QuestionSessionRewardPopup
          points={currentPopup.points}
          slug={currentPopup.slug}
          onDismiss={dismissCurrentPopup}
          onViewRanking={() => {
            holdQueueUntilRouteChange()
            dismissCurrentPopup()
          }}
        />
      )}
    </div>
  )
}

export function StudentThemeShell({
  children,
  mustChangePassword = false,
}: {
  children: ReactNode
  mustChangePassword?: boolean
}) {
  return (
    <PopupQueueProvider>
      <StudentThemeShellContent mustChangePassword={mustChangePassword}>
        {children}
      </StudentThemeShellContent>
    </PopupQueueProvider>
  )
}
