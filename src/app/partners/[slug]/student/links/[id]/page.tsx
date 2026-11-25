'use client';

import { useParams } from 'next/navigation';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudentLinkViewer } from '@/components/comms/SchoolLinks';

export default function LinkAlunoPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <ModuleGuard permKey="links_enabled" defaultEnabled={false}>
      <StudentLinkViewer linkId={id} />
    </ModuleGuard>
  );
}
