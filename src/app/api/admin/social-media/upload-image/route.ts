import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

/**
 * POST /api/admin/social-media/upload-image
 *
 * Recebe uma imagem capturada pelo html-to-image (base64 PNG),
 * sobe para Supabase Storage usando admin client (service role),
 * e retorna a URL pública.
 *
 * Body JSON:
 * {
 * post_id:       string,       // para nomear o path corretamente
 * image_base64: string,       // dataURL "data:image/png;base64,..."
 * asset_type:    string,       // "post_image" | "thumbnail"
 * slide_number?: number,      // para carrosséis
 * width:         number,
 * height:        number,
 * }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    post_id:      string;
    image_base64: string;
    asset_type:   string;
    slide_number?: number;
    width:        number;
    height:       number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { post_id, image_base64, asset_type, slide_number, width, height } = body;

  if (!post_id || !image_base64) {
    return NextResponse.json({ error: 'Campos post_id e image_base64 são obrigatórios' }, { status: 400 });
  }

  // Verifica ownership do post - Usando casting para ignorar erro de tipagem no banco
  const { data: post, error: postError } = await (auth.supabaseAdmin
    .from('social_media_posts' as any) as any)
    .select('id')
    .eq('id', post_id)
    .eq('admin_id', auth.user.id)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 });
  }

  // Converte dataURL para Buffer
  const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer     = Buffer.from(base64Data, 'base64');
  const sizeBytes  = buffer.byteLength;

  // Define o path no bucket
  const slideLabel  = slide_number != null ? `-slide${String(slide_number).padStart(2, '0')}` : '';
  const typeLabel   = asset_type === 'thumbnail' ? 'thumb' : 'img';
  const storagePath = `posts/${post_id}/${typeLabel}${slideLabel}.png`;

  // Upload usando admin client (service role bypassa RLS de storage)
  const { error: uploadError } = await auth.supabaseAdmin.storage
    .from('social-media-posts')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert:      true,   // permite re-upload ao regerar variação
    });

  if (uploadError) {
    return NextResponse.json({ error: `Falha no upload: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = auth.supabaseAdmin.storage
    .from('social-media-posts')
    .getPublicUrl(storagePath);

  // Salva o asset no banco - Usando casting duplo para ignorar erro 'never' do upsert
  const { error: assetError } = await (auth.supabaseAdmin
    .from('social_media_assets' as any) as any)
    .upsert(
      {
        post_id,
        storage_path:    storagePath,
        public_url:      publicUrl,
        asset_type,
        file_type:       'png',
        width,
        height,
        file_size_bytes: sizeBytes,
        slide_number:    slide_number ?? null,
      } as any,
      { onConflict: 'post_id, storage_path' }
    );

  if (assetError) {
    // Log mas não falha — imagem já está no Storage, o banco é secundário aqui
    console.error('[SocialMedia] Falha ao salvar asset no banco:', assetError.message);
  }

  return NextResponse.json({ url: publicUrl, path: storagePath, size_bytes: sizeBytes });
}