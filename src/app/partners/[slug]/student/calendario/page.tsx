'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolCalendar } from '@/components/comms/SchoolCalendar';

export default function CalendarioAlunoPage() {
  return (
    <ModuleGuard permKey="calendario_enabled" defaultEnabled={false}>
      <SchoolCalendar />
    </ModuleGuard>
  );
}
