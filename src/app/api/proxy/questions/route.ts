import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy server-side para /api/questions/ do Flask backend.
 * Elimina erros CORS quando o frontend está em origem diferente do backend.
 * A requisição sai do servidor Next.js → sem restrição de CORS.
 */
export async function GET(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const { searchParams } = new URL(req.url);
  const targetUrl = `${backendUrl}/api/questions/?${searchParams.toString()}`;

  const authHeader = req.headers.get('Authorization');

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[proxy/questions] backend unreachable:', err);
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const targetUrl = `${backendUrl}/api/questions/answer`;
  const authHeader = req.headers.get('Authorization');
  const body = await req.text();

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[proxy/questions:POST] backend unreachable:', err);
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 503 });
  }
}
