'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { SchoolAnnouncements } from '@/components/comms/SchoolAnnouncements';

export default function AvisosPage() {
  return (
    <PartnerLayout>
      <SchoolAnnouncements />
    </PartnerLayout>
  );
}
