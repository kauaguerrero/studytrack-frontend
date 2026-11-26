import { headers } from 'next/headers';
import AulasVivoFounderClient, { type LiveClassesPayload } from './AulasVivoFounderClient';

export default async function AulasVivoFounderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const headersList = await headers();
  const cookie = headersList.get('cookie') ?? '';
  const host =
    headersList.get('x-forwarded-host') ??
    headersList.get('host') ??
    'localhost:3000';
  const proto =
    headersList.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  // baseUrl montado pelo mesmo padrão de aulas/page.tsx; a chamada em si vai
  // direto no backend Flask (API_URL), não por essa URL do próprio Next.
  const baseUrl = `${proto}://${host}`;
  void baseUrl;

  let initialData: LiveClassesPayload | null = null;

  try {
    // Chama a rota Flask diretamente com o cookie de sessão — mesmo padrão do aulas/page.tsx
    const api = process.env.API_URL ?? 'http://127.0.0.1:5000';
    const res = await fetch(`${api}/api/partners/${slug}/live-classes`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      initialData = await res.json();
    }
  } catch {
    // fallback: AulasVivoFounderClient vai buscar via useEffect
  }

  return <AulasVivoFounderClient slug={slug} initialData={initialData} />;
}
