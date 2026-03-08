'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redireciona para Ajuda e Suporte, onde o histórico de reports está disponível.
 */
export default function MeusReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/support');
  }, [router]);
  return null;
}
