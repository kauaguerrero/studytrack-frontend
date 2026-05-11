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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  let flaskResponse: Response;
  try {
    flaskResponse = await fetch(
      `${BACKEND}/api/partners/${slug}/essays/upload-image/confirm`,
      {
        method: 'POST',
        // Content-Type não é definido manualmente — o runtime define o boundary correto do multipart
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
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
