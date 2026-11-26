'use client';

import { PartnerLayout } from '@/components/partners/PartnerLayout';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { GalileuSettings } from '@/components/integrations/GalileuSettings';

export default function IntegracoesPage() {
  return (
    <PartnerLayout>
      <ModuleGuard permKey="integracoes_enabled" defaultEnabled={false}>
        <GalileuSettings />
      </ModuleGuard>
    </PartnerLayout>
  );
}
