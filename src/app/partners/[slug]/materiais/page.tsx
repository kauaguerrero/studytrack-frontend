'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { MaterialsLibrary } from '@/components/materials/MaterialsLibrary';

export default function MateriaisGestorPage() {
  return (
    <PartnerLayout>
      <ModuleGuard permKey="materiais_enabled" defaultEnabled={false}>
        <MaterialsLibrary manage />
      </ModuleGuard>
    </PartnerLayout>
  );
}
