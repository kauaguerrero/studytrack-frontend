'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolCalendar } from '@/components/comms/SchoolCalendar';

export default function CalendarioGestorPage() {
  return (
    <ModuleGuard permKey="calendario_enabled" defaultEnabled={false}>
      <SchoolCalendar manage />
    </ModuleGuard>
  );
}
