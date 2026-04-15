'use client';

import { createContext, useContext, useRef, useCallback, useMemo, type ReactNode } from 'react';

interface QuestionSessionCtx {
  /** Acumula pontos ganhos na sessão (chamado a cada acerto). */
  addPoints: (n: number) => void;
  /** Zera o contador — chamar ao montar a página do banco (nova sessão). */
  resetPoints: () => void;
  /** Lê e zera atomicamente — chamar ao exibir o popup. */
  flushPoints: () => number;
}

const QuestionSessionContext = createContext<QuestionSessionCtx>({
  addPoints: () => {},
  resetPoints: () => {},
  flushPoints: () => 0,
});

/**
 * Provê o canal de comunicação entre a página do banco de questões e o
 * QuestionRewardListener no layout. Usa ref (não estado) para que as escritas
 * sejam síncronas e não provoquem re-renders desnecessários.
 *
 * Deve envolver tanto {children} quanto <QuestionRewardListener /> para que
 * ambos acessem a mesma instância do contexto.
 */
export function QuestionSessionProvider({ children }: { children: ReactNode }) {
  const pointsRef = useRef(0);

  const addPoints = useCallback((n: number) => {
    pointsRef.current += n;
  }, []);

  const resetPoints = useCallback(() => {
    pointsRef.current = 0;
  }, []);

  const flushPoints = useCallback((): number => {
    const pts = pointsRef.current;
    pointsRef.current = 0;
    return pts;
  }, []);

  const value = useMemo(
    () => ({ addPoints, resetPoints, flushPoints }),
    [addPoints, resetPoints, flushPoints],
  );

  return (
    <QuestionSessionContext.Provider value={value}>
      {children}
    </QuestionSessionContext.Provider>
  );
}

export function useQuestionSession() {
  return useContext(QuestionSessionContext);
}
