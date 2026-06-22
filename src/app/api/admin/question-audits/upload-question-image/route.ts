import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/app/api/admin/_utils';

const BUCKET_NAME = 'questions_images';
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

function extensionFromContentType(contentType: string): string | null {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/svg+xml') return 'svg';
  if (normalized === 'image/avif') return 'avif';
  return null;
}

function slugifySegment(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'question';
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let imageBytes: Uint8Array | null = null;
  let contentType = '';
  let questionId = '';
  let externalId = '';

  const requestContentType = request.headers.get('content-type') || '';
  if (requestContentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    questionId = String(formData.get('questionId') || '').trim();
    externalId = String(formData.get('externalId') || '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de imagem não enviado.' }, { status: 400 });
    }

    contentType = file.type || '';
    const extension = extensionFromContentType(contentType);
    if (!extension) {
      return NextResponse.json({ error: 'Arquivo de imagem em formato não suportado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    imageBytes = new Uint8Array(arrayBuffer);
  } else {
    let payload: {
      imageUrl?: string;
      questionId?: string;
      externalId?: string;
    };

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const imageUrl = String(payload.imageUrl || '').trim();
    questionId = String(payload.questionId || '').trim();
    externalId = String(payload.externalId || '').trim();

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl é obrigatório.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'URL de imagem inválida.' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'A URL da imagem deve usar http ou https.' }, { status: 400 });
    }

    let upstream: Response;
    try {
      upstream = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
    } catch {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem remota.' }, { status: 502 });
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Falha ao baixar a imagem remota (${upstream.status}).` },
        { status: 502 }
      );
    }

    contentType = upstream.headers.get('content-type') || '';
    const extension = extensionFromContentType(contentType);
    if (!extension) {
      return NextResponse.json({ error: 'A URL informada não retornou uma imagem suportada.' }, { status: 400 });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    imageBytes = new Uint8Array(arrayBuffer);
  }

  if (!questionId) {
    return NextResponse.json(
      { error: 'questionId é obrigatório.' },
      { status: 400 }
    );
  }

  const extension = extensionFromContentType(contentType);
  if (!extension || !imageBytes) {
    return NextResponse.json({ error: 'Imagem inválida.' }, { status: 400 });
  }
  if (imageBytes.byteLength <= 0) {
    return NextResponse.json({ error: 'A imagem veio vazia.' }, { status: 400 });
  }
  if (imageBytes.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: 'A imagem excede o limite de 8 MB.' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const storageKey = `${slugifySegment(externalId || questionId)}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(storageKey, imageBytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Falha ao salvar a imagem no bucket ${BUCKET_NAME}.` },
      { status: 500 }
    );
  }

  const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storageKey);
  return NextResponse.json({
    publicUrl: data.publicUrl,
    storagePath: storageKey,
    bucket: BUCKET_NAME,
  });
}
