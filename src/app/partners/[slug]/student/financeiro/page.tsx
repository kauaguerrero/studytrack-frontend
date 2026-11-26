'use client';

import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { StudentFinance } from '@/components/integrations/StudentFinance';

export default function FinanceiroAlunoPage() {
  return (
    <ModuleGuard permKey="financeiro_enabled" defaultEnabled={false}>
      <StudentFinance />
    </ModuleGuard>
  );
}
