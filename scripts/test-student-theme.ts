import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getStudentThemeStorageKey,
  normalizeStudentTheme,
  resolveStudentTheme,
  type ResolvedTheme,
  type StudentTheme,
} from '../src/lib/student-theme'

function bootstrapStudentTheme(
  initialTheme: StudentTheme,
  systemTheme: ResolvedTheme,
) {
  const storageKey = getStudentThemeStorageKey('edificar')
  const storedTheme = initialTheme
  const resolvedTheme = resolveStudentTheme(initialTheme, systemTheme)

  return {
    storageKey,
    storedTheme,
    resolvedTheme,
  }
}

function assertSourceInvariant(filePath: string, pattern: RegExp, message: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  assert.match(content, pattern, message)
}

function assertSourceAbsent(filePath: string, pattern: RegExp, message: string) {
  const content = fs.readFileSync(filePath, 'utf8')
  assert.doesNotMatch(content, pattern, message)
}

const profilePagePath = path.resolve('src/app/partners/[slug]/student/perfil/page.tsx')
const contextPath = path.resolve('src/contexts/StudentThemeContext.tsx')
const layoutPath = path.resolve('src/app/partners/[slug]/student/layout.tsx')

assert.equal(getStudentThemeStorageKey('edificar'), 'partner-student-theme-edificar')

assert.equal(normalizeStudentTheme('light'), 'light')
assert.equal(normalizeStudentTheme('dark'), 'dark')
assert.equal(normalizeStudentTheme('system'), 'system')
assert.equal(normalizeStudentTheme('legacy'), null)
assert.equal(normalizeStudentTheme(null), null)

assert.equal(resolveStudentTheme('light', 'dark'), 'light')
assert.equal(resolveStudentTheme('dark', 'light'), 'dark')
assert.equal(resolveStudentTheme('system', 'dark'), 'dark')
assert.equal(resolveStudentTheme('system', 'light'), 'light')

{
  const result = bootstrapStudentTheme('light', 'dark')
  assert.equal(result.storageKey, 'partner-student-theme-edificar')
  assert.equal(result.storedTheme, 'light')
  assert.equal(result.resolvedTheme, 'light')
}

{
  const result = bootstrapStudentTheme('dark', 'light')
  assert.equal(result.storedTheme, 'dark')
  assert.equal(result.resolvedTheme, 'dark')
}

{
  const result = bootstrapStudentTheme('system', 'dark')
  assert.equal(result.storedTheme, 'system')
  assert.equal(result.resolvedTheme, 'dark')
}

assertSourceInvariant(
  contextPath,
  /const \[theme, setThemeState\] = useState<StudentTheme>\(initialTheme\)/,
  'StudentThemeContext deve inicializar a partir do tema vindo do banco.',
)

assertSourceInvariant(
  contextPath,
  /localStorage\.setItem\(storageKey\(slug\), initialTheme\)/,
  'StudentThemeContext deve sincronizar o localStorage com o tema do banco.',
)

assertSourceInvariant(
  profilePagePath,
  /const \{ theme: studentTheme, setTheme: setStudentTheme \} = useStudentTheme\(\)/,
  'Perfil do aluno deve ler o tema real a partir do StudentThemeContext.',
)

assertSourceInvariant(
  profilePagePath,
  /<Select value=\{studentTheme\}/,
  'Select de tema deve refletir o tema efetivamente aplicado.',
)

assertSourceInvariant(
  profilePagePath,
  /setStudentTheme\(previous\)/,
  'Troca de tema deve reverter o estado visual se a persistência falhar.',
)

assertSourceAbsent(
  profilePagePath,
  /const \[themePref, setThemePref\]/,
  'Perfil do aluno não deve manter estado duplicado de tema.',
)

assertSourceInvariant(
  layoutPath,
  /localStorage\.setItem\(key,theme\)/,
  'Layout do aluno deve popular o cache local com o tema do banco.',
)

console.log('student theme tests: ok')
