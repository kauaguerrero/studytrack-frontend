'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolCalendar } from '@/components/comms/SchoolCalendar';

// Calendário vem ligado; a escola pode desligar (permissions.calendario_enabled = false).
export default function CalendarioGestorPage() {
  return (
    <ModuleGuard permKey="calendario_enabled" defaultEnabled>
      <SchoolCalendar manage />
    </ModuleGuard>
  );
}
