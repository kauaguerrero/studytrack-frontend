import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PROMPT_IMAGES_BUCKET = 'essay-prompt-images';

function ensureSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return null;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  }
  return null;
}

function normalizeSupportItemType(rawType: unknown, rawContent: unknown) {
  if (rawType === 'text' || rawType === 'image' || rawType === 'link') return rawType;
  if (rawType === 'img' || rawType === 'photo' || rawType === 'figure') return 'image';
  if (rawType === 'url') return 'link';
  if (typeof rawContent === 'string' && rawContent.includes('/storage/v1/object/public/')) return 'image';
  return null;
}

function resolveSupportItemContent(item: Record<string, unknown>, admin: ReturnType<typeof createAdminClient>) {
  const directCandidate =
    item.content ?? item.url ?? item.href ?? item.image_url ?? item.imageUrl ?? '';

  if (typeof directCandidate === 'string' && directCandidate.trim()) {
    return directCandidate.trim();
  }

  const storagePathCandidate =
    item.path ?? item.storage_path ?? item.storagePath ?? item.file_path ?? item.filePath ?? '';

  if (typeof storagePathCandidate !== 'string' || !storagePathCandidate.trim()) {
    return '';
  }

  const storagePath = storagePathCandidate.trim().replace(/^\/+/, '');
  const { data } = admin.storage.from(PROMPT_IMAGES_BUCKET).getPublicUrl(storagePath);
  return data?.publicUrl?.trim() || '';
}

function sanitizeSupportItems(items: unknown, admin: ReturnType<typeof createAdminClient>) {
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];

    const rawItem = item as Record<string, unknown>;
    const rawType = rawItem.type ?? null;
    const rawContent = resolveSupportItemContent(rawItem, admin);
    const rawLabel =
      'label' in rawItem ? rawItem.label
      : 'caption' in rawItem ? rawItem.caption
      : 'title' in rawItem ? rawItem.title
      : undefined;

    const type = normalizeSupportItemType(rawType, rawContent);
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : undefined;

    if (!type || !content) return [];

    return [{ type, content, ...(label ? { label } : {}) }];
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    (admin as any).from('organizations').select('id').eq('slug', slug).maybeSingle(),
    (admin as any).from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 });

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder' && profile?.organization_id === org.id;
  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) update.title = String(body.title).trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.support_items !== undefined) update.support_items = sanitizeSupportItems(body.support_items, admin);
  if (body.is_active !== undefined) update.is_active = Boolean(body.is_active);
  if (body.essay_type !== undefined) {
    const VALID_TYPES = ['enem', 'ufu', 'ueg'];
    update.essay_type = VALID_TYPES.includes(String(body.essay_type).toLowerCase())
      ? String(body.essay_type).toLowerCase()
      : 'enem';
  }
  if ('starts_at' in body) update.starts_at = body.starts_at || null;
  if ('ends_at' in body) update.ends_at = body.ends_at || null;

  const { data, error } = await (admin as any)
    .from('essay_prompts')
    .update(update)
    .eq('id', id)
    .eq('org_id', org.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug, id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    (admin as any).from('organizations').select('id').eq('slug', slug).maybeSingle(),
    (admin as any).from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
  ]);

  if (!org) return NextResponse.json({ error: 'Org não encontrada' }, { status: 404 });

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder' && profile?.organization_id === org.id;
  if (!isAdmin && !isFounder) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  const { count } = await (admin as any)
    .from('essay_prompt_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('prompt_id', id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} redação(ões) vinculada(s). Desative o tema em vez de excluir.` },
      { status: 409 },
    );
  }

  await (admin as any).from('essay_prompts').delete().eq('id', id).eq('org_id', org.id);
  return NextResponse.json({ ok: true });
}
