'use client'

import { ReactNode } from 'react'
import { useStudentTheme } from '@/contexts/StudentThemeContext'
import { PartnerLayout } from './PartnerLayout'

/**
 * Aplica a classe `dark` em um contêiner isolado para as rotas de aluno.
 *
 * O @custom-variant do Tailwind v4 (`&:is(.dark *)`) propaga o tema escuro
 * para TODOS os descendentes, incluindo componentes shadcn/ui, textos,
 * botões e ícones — sem afetar nenhuma outra rota da aplicação.
 */
export function StudentThemeShell({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useStudentTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div
      className={isDark ? 'dark' : ''}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
    >
      <PartnerLayout variant="student">
        {children}
      </PartnerLayout>
    </div>
  )
}
