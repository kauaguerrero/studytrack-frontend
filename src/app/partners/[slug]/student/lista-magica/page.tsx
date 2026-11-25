'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { ListaMagica } from '@/components/lista-magica/ListaMagica';

export default function ListaMagicaPage() {
  return (
    <ModuleGuard permKey="lista_magica_enabled" defaultEnabled={false}>
      <ListaMagica />
    </ModuleGuard>
  );
}
