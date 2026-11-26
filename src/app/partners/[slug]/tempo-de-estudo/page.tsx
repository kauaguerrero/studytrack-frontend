'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolTimerReport } from '@/components/timer/SchoolTimerReport';

export default function TempoDeEstudoPage() {
  return (
    <PartnerLayout>
      <ModuleGuard permKey="timer_enabled" defaultEnabled={false}>
        <SchoolTimerReport />
      </ModuleGuard>
    </PartnerLayout>
  );
}
