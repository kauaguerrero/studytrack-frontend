'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useStudentTheme } from '@/contexts/StudentThemeContext'
import { useOrg } from '@/contexts/OrgContext'
import { PartnerLayout } from './PartnerLayout'
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal'
import { ShieldEarnedPopup } from './gamification/ShieldEarnedPopup'
import { QuestionSessionRewardPopup } from './gamification/QuestionSessionRewardPopup'

/**
 * Aplica a classe `dark` em um contêiner isolado para as rotas de aluno.
 *
 * O @custom-variant do Tailwind v4 (`&:is(.dark *)`) propaga o tema escuro
 * para TODOS os descendentes, incluindo componentes shadcn/ui, textos,
 * botões e ícones — sem afetar nenhuma outra rota da aplicação.
 */
export function StudentThemeShell({
  children,
  mustChangePassword = false,
}: {
  children: ReactNode
  mustChangePassword?: boolean
}) {
  const { resolvedTheme } = useStudentTheme()
  const isDark = resolvedTheme === 'dark'
  const { org: { slug } } = useOrg()
  const pathname = usePathname()
  const prevPathRef = useRef(pathname)

  // Controlado localmente: some após troca bem-sucedida sem precisar de reload
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)
  // Fila de popups pós-sessão: escudo primeiro, pontos depois
  const [showShieldEarned, setShowShieldEarned] = useState(false)
  const [qsrPoints, setQsrPoints] = useState<number | null>(null)
  const pendingPointsRef = useRef<number | null>(null)

  // Ao sair do banco de questões lê os dois sinais e enfileira os popups
  useEffect(() => {
    const prev = prevPathRef.current
    prevPathRef.current = pathname

    if (prev?.includes('banco-de-questoes') && !pathname?.includes('banco-de-questoes')) {
      const rawPts = sessionStorage.getItem('qsr_pending_points')
      const shieldEarned = sessionStorage.getItem('qsr_shield_earned') === '1'

      const pts = rawPts ? parseInt(rawPts, 10) : 0
      if (pts > 0) sessionStorage.removeItem('qsr_pending_points')
      if (shieldEarned) sessionStorage.removeItem('qsr_shield_earned')

      if (shieldEarned) {
        // Escudo primeiro; pontos ficam pendentes para depois que o escudo fechar
        pendingPointsRef.current = pts > 0 ? pts : null
        setTimeout(() => setShowShieldEarned(true), 300)
      } else if (pts > 0) {
        setTimeout(() => setQsrPoints(pts), 300)
      }
    }
  }, [pathname])

  const handleShieldDismiss = () => {
    setShowShieldEarned(false)
    const pending = pendingPointsRef.current
    pendingPointsRef.current = null
    if (pending !== null) setTimeout(() => setQsrPoints(pending), 400)
  }

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

      {showShieldEarned && (
        <ShieldEarnedPopup onDismiss={handleShieldDismiss} />
      )}

      {qsrPoints !== null && (
        <QuestionSessionRewardPopup
          points={qsrPoints}
          slug={slug}
          onContinue={() => setQsrPoints(null)}
        />
      )}
    </div>
  )
}
