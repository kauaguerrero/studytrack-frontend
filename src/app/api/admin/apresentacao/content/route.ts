import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

const BUCKET = 'apresentacao';
const CONTENT_PATH = 'content/presentation.json';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.supabaseAdmin
    .storage
    .from(BUCKET)
    .download(CONTENT_PATH);

  if (error) {
    return NextResponse.json({ content: null });
  }

  try {
    const content = JSON.parse(await data.text());
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: null });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = body && typeof body === 'object' && 'content' in body
    ? (body as { content: unknown }).content
    : null;

  if (!content || typeof content !== 'object') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const payload = Buffer.from(JSON.stringify(content));
  const { error } = await auth.supabaseAdmin
    .storage
    .from(BUCKET)
    .upload(CONTENT_PATH, payload, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
