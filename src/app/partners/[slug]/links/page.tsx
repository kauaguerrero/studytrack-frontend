'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolLinks } from '@/components/comms/SchoolLinks';

export default function LinksGestorPage() {
  return (
    <ModuleGuard permKey="links_enabled" defaultEnabled={false}>
      <SchoolLinks />
    </ModuleGuard>
  );
}
