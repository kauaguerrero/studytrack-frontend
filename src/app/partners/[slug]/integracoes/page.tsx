'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { GalileuSettings } from '@/components/integrations/GalileuSettings';

export default function IntegracoesPage() {
  return (
    <ModuleGuard permKey="integracoes_enabled" defaultEnabled={false}>
      <GalileuSettings />
    </ModuleGuard>
  );
}
