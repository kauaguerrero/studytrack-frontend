'use client';

import { useState } from 'react';

/**
 * Raiz do tema do aluno (`[data-student-theme-root]`, onde mora a classe `dark`).
 * Passe como `container` do DialogContent: o portal monta dentro dela e o modal
 * herda o modo escuro. No servidor (e fora da área do aluno) volta `null` = body.
 */
export function useStudentThemeRoot(): HTMLElement | null {
  const [root] = useState<HTMLElement | null>(() =>
    typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-student-theme-root]'),
  );
  return root;
}
