'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuestionSession } from '@/components/partners/gamification/QuestionSessionContext';
import { QuestionSessionRewardPopup } from '@/components/partners/gamification/QuestionSessionRewardPopup';

export function QuestionRewardListener() {
  const { flushPoints } = useQuestionSession();
  const [points, setPoints] = useState<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const pts = flushPoints();
    if (pts > 0) setPoints(pts);
  }, [pathname, flushPoints]);

  if (points === null) return null;

  return (
    <QuestionSessionRewardPopup
      points={points}
      onContinue={() => setPoints(null)}
    />
  );
}
