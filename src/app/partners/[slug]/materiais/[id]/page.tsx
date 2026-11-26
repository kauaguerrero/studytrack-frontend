'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { useParams } from 'next/navigation';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { MaterialViewer } from '@/components/materials/MaterialViewer';

export default function MaterialGestorPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PartnerLayout>
      <ModuleGuard permKey="materiais_enabled" defaultEnabled={false}>
        <MaterialViewer materialId={id} manage />
      </ModuleGuard>
    </PartnerLayout>
  );
}
