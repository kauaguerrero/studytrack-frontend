import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 120;

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

  // Esta rota é só um repasse pro Flask — não lê nenhum campo do multipart.
  // Antes havia um `await request.formData()` aqui cujo único uso era devolver o
  // FormData ao fetch: isso materializava a foto inteira em memória e remontava o
  // multipart com um boundary novo, ou seja, um decode + encode completo (numa
  // foto de celular de 5 MB, ~10 MB de trabalho de CPU) para repassar bytes
  // intactos. Agora o corpo vai como stream, com o Content-Type original, e o
  // Flask recebe exatamente os mesmos bytes.
  const contentType = request.headers.get('content-type');
  if (!contentType?.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  let flaskResponse: Response;
  try {
    flaskResponse = await fetch(
      `${BACKEND}/api/partners/${slug}/essays/upload-image`,
      {
        method: 'POST',
        // Content-Type repassado na íntegra — carrega o boundary do cliente, que
        // é o mesmo dos bytes que seguem no stream.
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
        body: request.body,
        // Obrigatório no Node quando o body é um stream de leitura.
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
