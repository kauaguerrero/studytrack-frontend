'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolTimerReport } from '@/components/timer/SchoolTimerReport';

export default function TempoDeEstudoPage() {
  return (
    <ModuleGuard permKey="timer_enabled" defaultEnabled={false}>
      <SchoolTimerReport />
    </ModuleGuard>
  );
}
