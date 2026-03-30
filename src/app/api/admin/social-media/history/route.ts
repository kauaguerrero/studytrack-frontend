import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import type { SocialMediaPost } from '@/types/social-media';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const { data, error, count } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .select(
      `
      id, admin_id, format, slide_count, mode, admin_prompt,
      title, theme, template_used, caption, status,
      created_at, updated_at,
      assets:social_media_assets(
        id, asset_type, public_url, slide_number, file_type, width, height
      )
      `,
      { count: 'exact' }
    )
    .eq('admin_id', auth.user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    posts: (data ?? []) as SocialMediaPost[],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  // Salva um post gerado no histórico
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const {
    format, slide_count, mode, admin_prompt,
    title, theme, template_used, caption,
    generated_content,
  } = body as {
    format: string;
    slide_count?: number;
    mode: string;
    admin_prompt?: string;
    title: string;
    theme: string;
    template_used: string;
    caption: string;
    generated_content: object;
  };

  if (!format || !mode || !title || !theme || !template_used || !caption || !generated_content) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  const { data: post, error } = await auth.supabaseAdmin
    .from('social_media_posts' as any)
    .insert({
      admin_id:          auth.user.id,
      format,
      slide_count:       slide_count ?? null,
      mode,
      admin_prompt:      admin_prompt ?? null,
      title,
      theme,
      template_used,
      caption,
      generated_content,
      status:            'generated',
    } as any)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: (post as any).id }, { status: 201 });
}
