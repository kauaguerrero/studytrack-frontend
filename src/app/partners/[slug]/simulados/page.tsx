import SimuladosFounderClient from './SimuladosFounderClient';
import { ModuleGuard } from '@/components/partners/ModuleGuard';

export default async function SimuladosFounderPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <ModuleGuard permKey="simulados_enabled">
      <SimuladosFounderClient slug={slug} />
    </ModuleGuard>
  );
}
