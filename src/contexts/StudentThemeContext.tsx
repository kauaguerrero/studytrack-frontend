'use client'

import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  getStudentThemeStorageKey,
  resolveStudentTheme,
  type StudentTheme,
  type ResolvedTheme,
} from '@/lib/student-theme'

interface StudentThemeContextType {
  theme: StudentTheme
  setTheme: (theme: StudentTheme) => void
  resolvedTheme: ResolvedTheme
}

const StudentThemeContext = createContext<StudentThemeContextType | null>(null)

/** Seletor da raiz do tema do aluno, renderizada em student/layout.tsx. */
const THEME_ROOT_SELECTOR = '[data-student-theme-root]'

function storageKey(slug: string) {
  return getStudentThemeStorageKey(slug)
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: StudentTheme): ResolvedTheme {
  return resolveStudentTheme(theme, getSystemTheme())
}

/**
 * Aplica o tema resolvido direto no DOM da raiz do tema.
 *
 * Por que fora do React: o SSR não tem matchMedia, então para o tema "system"
 * o servidor e o cliente discordam do valor inicial. Se a classe `dark` fosse
 * uma prop do React, a hidratação manteria o valor do servidor no DOM enquanto
 * o React acreditaria no do cliente, e a troca seguinte para esse mesmo valor
 * não geraria nenhuma atualização (era exatamente o bug de "escolho Escuro e
 * nada acontece"). Mexendo direto no classList, o DOM sempre reflete o estado.
 */
function applyThemeToDom(resolved: ResolvedTheme) {
  const el = document.querySelector<HTMLElement>(THEME_ROOT_SELECTOR)
  if (!el) return
  el.classList.toggle('dark', resolved === 'dark')
  el.style.colorScheme = resolved
}

// useLayoutEffect evita um frame com o tema antigo ao trocar; no servidor cai
// em useEffect (que não roda lá), sem aviso.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

interface Props {
  children: React.ReactNode
  slug: string
  /** Tema vindo do banco de dados (SSR) — fonte de verdade. */
  initialTheme?: StudentTheme
}

export function StudentThemeProvider({ children, slug, initialTheme = 'system' }: Props) {
  const [theme, setThemeState] = useState<StudentTheme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(initialTheme))

  // O layout re-renderiza com o valor do banco (reload, router.refresh). Sempre
  // que esse valor mudar, ele vence.
  useEffect(() => {
    setThemeState(initialTheme)
    setResolvedTheme(resolve(initialTheme))

    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey(slug), initialTheme)
    }
  }, [initialTheme, slug])

  // Atualiza o resolved quando theme muda.
  useEffect(() => {
    setResolvedTheme(resolve(theme))
  }, [theme])

  // Escuta mudanças do sistema operacional quando mode é 'system'.
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) =>
      setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  // Única fonte que escreve a classe `dark` depois do script inline do layout.
  useIsomorphicLayoutEffect(() => {
    applyThemeToDom(resolvedTheme)
  }, [resolvedTheme])

  // Identidade estável: consumidores usam setTheme em deps de efeitos. Antes
  // ele era recriado a cada render, o que fazia o efeito de sincronização do
  // perfil rodar de novo e reaplicar o valor antigo do cache.
  const setTheme = useCallback((next: StudentTheme) => {
    setThemeState(next)
    setResolvedTheme(resolve(next))
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey(slug), next)
    }
  }, [slug])

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme }), [theme, setTheme, resolvedTheme])

  return (
    <StudentThemeContext.Provider value={value}>
      {children}
    </StudentThemeContext.Provider>
  )
}

export function useStudentTheme() {
  const ctx = useContext(StudentThemeContext)
  if (!ctx) throw new Error('useStudentTheme deve ser usado dentro de StudentThemeProvider')
  return ctx
}
