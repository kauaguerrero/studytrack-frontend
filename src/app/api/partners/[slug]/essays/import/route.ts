import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const BACKEND = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  // Repasse puro pro Flask: nenhum campo do multipart é lido aqui, então o corpo
  // vai como stream em vez de passar por um formData() que só o desmontava para
  // remontá-lo com outro boundary. Importação manda várias redações de uma vez,
  // então era justamente aqui que esse decode+encode pesava mais.
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  let flaskResponse: Response;
  try {
    flaskResponse = await fetch(
      `${BACKEND}/api/partners/${slug}/essays/import`,
      {
        method: 'POST',
        // Content-Type repassado na íntegra — carrega o boundary do cliente.
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
        body: request.body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' },
    );
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conectar ao servidor. Tente novamente.' },
      { status: 502 },
    );
  }

  const data = await flaskResponse.json().catch(() => null);
  return NextResponse.json(
    data ?? { error: 'Resposta inválida do servidor.' },
    { status: flaskResponse.status },
  );
}
