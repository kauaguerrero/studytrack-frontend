'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminB2BRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/admin');
  }, [router]);
  return null;
}
