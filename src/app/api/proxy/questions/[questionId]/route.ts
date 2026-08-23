import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const targetUrl = `${backendUrl}/api/questions/${questionId}`;
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
    console.error('[proxy/questions/id] backend unreachable:', err);
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 503 });
  }
}
