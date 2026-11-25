'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudyTimerPage } from '@/components/timer/StudyTimerPage';

export default function StudentTimerPage() {
  return (
    <ModuleGuard permKey="timer_enabled" defaultEnabled={false}>
      <StudyTimerPage />
    </ModuleGuard>
  );
}
