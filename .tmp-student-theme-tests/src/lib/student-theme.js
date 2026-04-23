"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentThemeStorageKey = getStudentThemeStorageKey;
exports.normalizeStudentTheme = normalizeStudentTheme;
exports.resolveStudentTheme = resolveStudentTheme;
function getStudentThemeStorageKey(slug) {
    return `partner-student-theme-${slug}`;
}
function normalizeStudentTheme(value) {
    if (value === 'light' || value === 'dark' || value === 'system')
        return value;
    return null;
}
function resolveStudentTheme(theme, systemTheme) {
    return theme === 'system' ? systemTheme : theme;
}
