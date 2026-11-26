/**
 * Onde montar portais (Dialog, Sheet, Select, Tooltip) por padrão.
 *
 * O modo escuro do aluno mora na classe `dark` de [data-student-theme-root], não
 * no <html>. Um portal no <body> fica fora dela e abre sempre claro. Dentro da
 * raiz, herda o tema. Fora da área do aluno (gestor, login) não há raiz e o
 * portal vai para o body, onde o `dark` do <html> já vale.
 */
export function themePortalContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLElement>('[data-student-theme-root]') ?? undefined;
}
