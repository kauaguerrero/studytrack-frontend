import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const backend = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
  const authorization = req.headers.get('Authorization');
  try {
    const response = await fetch(`${backend}/api/questions/facets${req.nextUrl.search}`, {
      headers: authorization ? { Authorization: authorization } : {},
      cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Backend indisponível.' }, { status: 503 });
  }
}
