import { headers } from 'next/headers';
import AulasFounderClient, { type VideoModulesPayload } from './AulasFounderClient';
import { isDemoOrg, MOCK_VIDEO_MODULES } from '../../../../../studytrack-tutorial-mock';

export default async function AulasFounderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isDemoOrg(slug)) {
    return <AulasFounderClient slug={slug} initialData={MOCK_VIDEO_MODULES as unknown as VideoModulesPayload} />;
  }

  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const host =
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    'localhost:3000';
  const proto =
    headersList.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const baseUrl = `${proto}://${host}`;

  let initialData: VideoModulesPayload | null = null;

  try {
    // Chama a rota Flask diretamente com o cookie de sessão — mesmo padrão do redacoes/page.tsx
    const api = process.env.API_URL ?? 'http://127.0.0.1:5000';
    const res = await fetch(`${api}/api/partners/${slug}/videos/modules`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      initialData = await res.json();
    }
  } catch {
    // fallback: AulasFounderClient vai buscar via useEffect
  }

  return <AulasFounderClient slug={slug} initialData={initialData} />;
}
