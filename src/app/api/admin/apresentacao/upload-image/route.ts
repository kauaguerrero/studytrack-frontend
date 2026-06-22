import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { supabaseAdmin } = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const path = formData.get('path') as string | null;

  if (!file || !path) {
    return NextResponse.json({ error: 'file and path are required' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabaseAdmin.storage
    .from('apresentacao')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('apresentacao')
    .getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
