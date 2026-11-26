'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { SchoolLinks } from '@/components/comms/SchoolLinks';

export default function LinksGestorPage() {
  return (
    <PartnerLayout>
      <ModuleGuard permKey="links_enabled" defaultEnabled={false}>
        <SchoolLinks />
      </ModuleGuard>
    </PartnerLayout>
  );
}
