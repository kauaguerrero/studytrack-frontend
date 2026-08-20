import { headers } from 'next/headers';
import PartnerRedacoesClient, { type EssaysOverviewPayload } from './PartnerRedacoesClient';
import { ModuleGuard } from '@/components/partners/ModuleGuard';
import { createClient } from '@/lib/supabase/server';
import { MOCK_ESSAYS_OVERVIEW } from '../../../../../studytrack-tutorial-mock';

export default async function PartnerRedacoesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: org } = await supabase.from('organizations').select('is_mock').eq('slug', slug).maybeSingle();

  if (org?.is_mock) {
    return (
      <ModuleGuard permKey="redacoes_enabled">
        <PartnerRedacoesClient slug={slug} initialOverview={MOCK_ESSAYS_OVERVIEW as unknown as EssaysOverviewPayload} />
      </ModuleGuard>
    );
  }

  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost:3000';
  const proto = headersList.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  let initialOverview: EssaysOverviewPayload | null = null;

  try {
    const res = await fetch(
      `${baseUrl}/api/partners/${slug}/essays/overview?pending_page=1&pending_limit=10&corrected_page=1&corrected_limit=10&essay_type=enem`,
      {
        headers: { cookie },
        cache: 'no-store',
      },
    );
    if (res.ok) {
      initialOverview = await res.json();
    }
  } catch {
    // fallback: client will fetch
  }

  return (
    <ModuleGuard permKey="redacoes_enabled">
      <PartnerRedacoesClient slug={slug} initialOverview={initialOverview} />
    </ModuleGuard>
  );
}
