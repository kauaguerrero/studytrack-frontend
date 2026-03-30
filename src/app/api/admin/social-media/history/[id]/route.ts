import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

// GET /api/admin/social-media/history/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const { data, error } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .select(
      `
      *,
      assets:social_media_assets(*)
      `
    )
    .eq('id', id)
    .eq('admin_id', auth.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/social-media/history/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  // Verifica que o post pertence a este admin antes de deletar
  const { data: existing, error: fetchError } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .select('id')
    .eq('id', id)
    .eq('admin_id', auth.user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  const { error } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/social-media/history/[id]
// Atualiza campos pontuais: status, assets (após upload de imagens geradas)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  // Verifica ownership
  const { data: existing, error: fetchError } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .select('id')
    .eq('id', id)
    .eq('admin_id', auth.user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  const allowedFields = ['status'] as const;
  const update: Record<string, unknown> = {};

  for (const field of allowedFields) {
    const val = (body as Record<string, unknown>)[field];
    if (val !== undefined) update[field] = val;
  }

  // Inserção de assets (imagens geradas pelo frontend via html-to-image)
  const assets = (body as {
    assets?: Array<{
      storage_path: string;
      public_url: string;
      asset_type: string;
      file_type: string;
      width?: number;
      height?: number;
      file_size_bytes?: number;
      slide_number?: number;
    }>
  }).assets;

  if (assets && assets.length > 0) {
    const assetRows = assets.map((a) => ({
      post_id: id,
      storage_path: a.storage_path,
      public_url: a.public_url,
      asset_type: a.asset_type,
      file_type: a.file_type,
      width: a.width ?? null,
      height: a.height ?? null,
      file_size_bytes: a.file_size_bytes ?? null,
      slide_number: a.slide_number ?? null,
    }));

    const { error: assetError } = await auth.supabaseAdmin
      .from('social_media_assets' as any)
      .insert(assetRows as any);

    if (assetError) {
      return NextResponse.json({ error: assetError.message }, { status: 500 });
    }
  }

  if (Object.keys(update).length > 0) {
    const { error: updateError } = await (auth.supabaseAdmin
      .from('social_media_posts') as any) // <-- Adicione o 'as any' aqui
      .update(update)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
