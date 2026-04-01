'use client'

import { useState, ReactNode } from 'react'
import { useStudentTheme } from '@/contexts/StudentThemeContext'
import { PartnerLayout } from './PartnerLayout'
import { ForcePasswordChangeModal } from './ForcePasswordChangeModal'

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

  // Controlado localmente: some após troca bem-sucedida sem precisar de reload
  const [showPasswordModal, setShowPasswordModal] = useState(mustChangePassword)

  return (
    <div
      className={isDark ? 'dark' : ''}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
    >
      <PartnerLayout variant="student">
        {children}
      </PartnerLayout>

      {showPasswordModal && (
        <ForcePasswordChangeModal onSuccess={() => setShowPasswordModal(false)} />
      )}
    </div>
  )
}
