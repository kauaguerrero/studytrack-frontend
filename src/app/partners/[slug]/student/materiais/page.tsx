'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { MaterialsLibrary } from '@/components/materials/MaterialsLibrary';

export default function MateriaisAlunoPage() {
  return (
    <ModuleGuard permKey="materiais_enabled" defaultEnabled={false}>
      <MaterialsLibrary />
    </ModuleGuard>
  );
}
