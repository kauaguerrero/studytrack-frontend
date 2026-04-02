'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type StudentTheme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

interface StudentThemeContextType {
  theme: StudentTheme
  setTheme: (theme: StudentTheme) => void
  resolvedTheme: ResolvedTheme
}

const StudentThemeContext = createContext<StudentThemeContextType | null>(null)

function storageKey(slug: string) {
  return `partner-student-theme-${slug}`
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: StudentTheme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme
}

interface Props {
  children: React.ReactNode
  slug: string
  /** Tema inicial vindo do banco de dados (SSR). localStorage tem prioridade após a montagem. */
  initialTheme?: StudentTheme
}

export function StudentThemeProvider({ children, slug, initialTheme = 'system' }: Props) {
  // Inicializa a partir do localStorage (client) ou initialTheme (SSR).
  // Evita flash ao priorizar o valor persistido antes do primeiro paint do React.
  const [theme, setThemeState] = useState<StudentTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey(slug))
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    }
    return initialTheme
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey(slug))
      if (stored === 'light' || stored === 'dark' || stored === 'system') return resolve(stored)
    }
    return resolve(initialTheme)
  })

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
    localStorage.setItem(storageKey(slug), next)
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
