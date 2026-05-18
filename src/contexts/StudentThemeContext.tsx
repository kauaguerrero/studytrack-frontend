'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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

interface Props {
  children: React.ReactNode
  slug: string
  /** Tema inicial vindo do banco de dados (SSR). localStorage tem prioridade após a montagem. */
  initialTheme?: StudentTheme
}

export function StudentThemeProvider({ children, slug, initialTheme = 'system' }: Props) {
  // O banco é a fonte de verdade. O inline script do layout já gravou o valor
  // correto em window.__pst[slug] antes da hidratação, mas como não podemos
  // aplicar a classe dark no wrapper div antes do React montar, usamos o
  // initialTheme do SSR diretamente para inicializar o estado sem discrepância.
  const [theme, setThemeState] = useState<StudentTheme>(initialTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolve(initialTheme))

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

  const setTheme = (next: StudentTheme) => {
    setThemeState(next)
    setResolvedTheme(resolve(next))
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey(slug), next)
    }
  }

  return (
    <StudentThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </StudentThemeContext.Provider>
  )
}

export function useStudentTheme() {
  const ctx = useContext(StudentThemeContext)
  if (!ctx) throw new Error('useStudentTheme deve ser usado dentro de StudentThemeProvider')
  return ctx
}
