"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const student_theme_1 = require("../src/lib/student-theme");
function bootstrapStudentTheme(initialTheme, systemTheme) {
    const storageKey = (0, student_theme_1.getStudentThemeStorageKey)('edificar');
    const storedTheme = initialTheme;
    const resolvedTheme = (0, student_theme_1.resolveStudentTheme)(initialTheme, systemTheme);
    return {
        storageKey,
        storedTheme,
        resolvedTheme,
    };
}
function assertSourceInvariant(filePath, pattern, message) {
    const content = node_fs_1.default.readFileSync(filePath, 'utf8');
    strict_1.default.match(content, pattern, message);
}
function assertSourceAbsent(filePath, pattern, message) {
    const content = node_fs_1.default.readFileSync(filePath, 'utf8');
    strict_1.default.doesNotMatch(content, pattern, message);
}
const profilePagePath = node_path_1.default.resolve('src/app/partners/[slug]/student/perfil/page.tsx');
const contextPath = node_path_1.default.resolve('src/contexts/StudentThemeContext.tsx');
const layoutPath = node_path_1.default.resolve('src/app/partners/[slug]/student/layout.tsx');
strict_1.default.equal((0, student_theme_1.getStudentThemeStorageKey)('edificar'), 'partner-student-theme-edificar');
strict_1.default.equal((0, student_theme_1.normalizeStudentTheme)('light'), 'light');
strict_1.default.equal((0, student_theme_1.normalizeStudentTheme)('dark'), 'dark');
strict_1.default.equal((0, student_theme_1.normalizeStudentTheme)('system'), 'system');
strict_1.default.equal((0, student_theme_1.normalizeStudentTheme)('legacy'), null);
strict_1.default.equal((0, student_theme_1.normalizeStudentTheme)(null), null);
strict_1.default.equal((0, student_theme_1.resolveStudentTheme)('light', 'dark'), 'light');
strict_1.default.equal((0, student_theme_1.resolveStudentTheme)('dark', 'light'), 'dark');
strict_1.default.equal((0, student_theme_1.resolveStudentTheme)('system', 'dark'), 'dark');
strict_1.default.equal((0, student_theme_1.resolveStudentTheme)('system', 'light'), 'light');
{
    const result = bootstrapStudentTheme('light', 'dark');
    strict_1.default.equal(result.storageKey, 'partner-student-theme-edificar');
    strict_1.default.equal(result.storedTheme, 'light');
    strict_1.default.equal(result.resolvedTheme, 'light');
}
{
    const result = bootstrapStudentTheme('dark', 'light');
    strict_1.default.equal(result.storedTheme, 'dark');
    strict_1.default.equal(result.resolvedTheme, 'dark');
}
{
    const result = bootstrapStudentTheme('system', 'dark');
    strict_1.default.equal(result.storedTheme, 'system');
    strict_1.default.equal(result.resolvedTheme, 'dark');
}
assertSourceInvariant(contextPath, /const \[theme, setThemeState\] = useState<StudentTheme>\(initialTheme\)/, 'StudentThemeContext deve inicializar a partir do tema vindo do banco.');
assertSourceInvariant(contextPath, /localStorage\.setItem\(storageKey\(slug\), initialTheme\)/, 'StudentThemeContext deve sincronizar o localStorage com o tema do banco.');
assertSourceInvariant(profilePagePath, /const \{ theme: studentTheme, setTheme: setStudentTheme \} = useStudentTheme\(\)/, 'Perfil do aluno deve ler o tema real a partir do StudentThemeContext.');
assertSourceInvariant(profilePagePath, /<Select value=\{studentTheme\}/, 'Select de tema deve refletir o tema efetivamente aplicado.');
assertSourceInvariant(profilePagePath, /setStudentTheme\(previous\)/, 'Troca de tema deve reverter o estado visual se a persistência falhar.');
assertSourceAbsent(profilePagePath, /const \[themePref, setThemePref\]/, 'Perfil do aluno não deve manter estado duplicado de tema.');
assertSourceInvariant(layoutPath, /localStorage\.setItem\(key,theme\)/, 'Layout do aluno deve popular o cache local com o tema do banco.');
console.log('student theme tests: ok');
