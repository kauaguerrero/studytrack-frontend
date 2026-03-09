/**
 * Cookie SSR-safe para estado da sidebar colapsável.
 * Lido no servidor (layout) e escrito no cliente para Zero Layout Shift.
 */
export const SIDEBAR_COOKIE_NAME = 'studytrack-sidebar-collapsed';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

export function parseSidebarCollapsedCookie(value: string | undefined): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false; // default: expandida
}

/** Escreve o cookie no cliente (apenas browser). */
export function setSidebarCollapsedCookie(collapsed: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${collapsed ? 'true' : 'false'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}
