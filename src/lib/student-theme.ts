export type StudentTheme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function getStudentThemeStorageKey(slug: string) {
  return `partner-student-theme-${slug}`
}

export function normalizeStudentTheme(value: string | null | undefined): StudentTheme | null {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return null
}

export function resolveStudentTheme(theme: StudentTheme, systemTheme: ResolvedTheme): ResolvedTheme {
  return theme === 'system' ? systemTheme : theme
}
