'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { MaterialsLibrary } from '@/components/materials/MaterialsLibrary';

export default function MateriaisGestorPage() {
  return (
    <ModuleGuard permKey="materiais_enabled" defaultEnabled={false}>
      <MaterialsLibrary manage />
    </ModuleGuard>
  );
}
