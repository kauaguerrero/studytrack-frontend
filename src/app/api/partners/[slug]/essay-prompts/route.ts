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

async function getOrgAndRequester(slug: string) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }) };

  const admin = createAdminClient();
  const [{ data: org }, { data: profile }] = await Promise.all([
    (admin as any).from('organizations').select('id').eq('slug', slug).maybeSingle(),
    (admin as any).from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle(),
  ]);

  if (!org) return { error: NextResponse.json({ error: 'Org não encontrada' }, { status: 404 }) };

  const role = profile?.role ?? '';
  const isAdmin = role === 'admin';
  const isFounder = role === 'founder' && profile?.organization_id === org.id;
  const isAssociate = role === 'associate' && profile?.organization_id === org.id;
  const isStudent = role === 'student' && profile?.organization_id === org.id;

  if (!isAdmin && !isFounder && !isAssociate && !isStudent) {
    return { error: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) };
  }

  return { org, user, profile, isAdmin, isFounder, isAssociate, admin };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ctx = await getOrgAndRequester(slug);
  if ('error' in ctx) return ctx.error;

  const { org, admin } = ctx;
  const { data, error } = await (admin as any)
    .from('essay_prompts')
    .select('id, title, description, support_items, is_active, essay_type, starts_at, ends_at, created_at, updated_at, created_by')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    prompts: (data ?? []).map((prompt: any) => ({
      ...prompt,
      support_items: sanitizeSupportItems(prompt.support_items, admin),
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug } = await params;
  const ctx = await getOrgAndRequester(slug);
  if ('error' in ctx) return ctx.error;

  const { org, user, isAdmin, isFounder } = ctx;
  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Apenas founders podem criar coletâneas' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, support_items, essay_type, starts_at, ends_at } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
  }

  const VALID_TYPES = ['enem', 'ufu', 'ueg'];
  const resolvedType = VALID_TYPES.includes(String(essay_type || '').toLowerCase())
    ? String(essay_type).toLowerCase()
    : 'enem';

  const admin = (ctx as any).admin;
  const { data, error } = await admin
    .from('essay_prompts')
    .insert({
      org_id: org.id,
      title: title.trim(),
      description: description?.trim() || null,
      support_items: sanitizeSupportItems(support_items, admin),
      is_active: true,
      essay_type: resolvedType,
      starts_at: starts_at || null,
      ends_at: ends_at || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data }, { status: 201 });
}
