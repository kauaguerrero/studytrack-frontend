'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolCalendar } from '@/components/comms/SchoolCalendar';

// Calendário vem ligado; a escola pode desligar (permissions.calendario_enabled = false).
export default function CalendarioAlunoPage() {
  return (
    <ModuleGuard permKey="calendario_enabled" defaultEnabled>
      <SchoolCalendar />
    </ModuleGuard>
  );
}
