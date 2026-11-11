import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Mesmo bucket que a curadoria (`/portal/admin/questions`) já usa pra imagem
// de questão — ver src/app/api/admin/question-audits/upload-question-image —
// mas aquele endpoint é gated por requireAdmin() e o founder não pode
// chamá-lo. Este é o equivalente pra "Do zero"/"Criação com IA" do founder,
// mesmo bucket e mesmo contrato de resposta ({ publicUrl }).
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const originError = ensureSameOrigin(request);
  if (originError) return originError;

  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const admin = createAdminClient();
  const [{ data: org }, { data: requester }] = await Promise.all([
    admin.from('organizations').select('id').eq('slug', slug).maybeSingle<{ id: string }>(),
    admin.from('profiles').select('role, organization_id').eq('id', user.id).maybeSingle<{ role: string | null; organization_id: string | null }>(),
  ]);

  if (!org?.id) {
    return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
  }
  if (!requester) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 });
  }
  const role = String(requester.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isOrgStaff = (role === 'founder' || role === 'associate') && requester.organization_id === org.id;
  if (!isAdmin && !isOrgStaff) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  let imageBytes: Uint8Array | null = null;
  let contentType = '';
  let questionId = '';

  const requestContentType = request.headers.get('content-type') || '';
  if (requestContentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    questionId = String(formData.get('questionId') || '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo de imagem não enviado.' }, { status: 400 });
    }

    contentType = file.type || '';
    const extension = extensionFromContentType(contentType);
    if (!extension) {
      return NextResponse.json({ error: 'Arquivo de imagem em formato não suportado.' }, { status: 400 });
    }

    imageBytes = new Uint8Array(await file.arrayBuffer());
  } else {
    let payload: { imageUrl?: string; questionId?: string };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const imageUrl = String(payload.imageUrl || '').trim();
    questionId = String(payload.questionId || '').trim();
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
      // Vários hosts de imagem (ex.: Wikimedia) recusam requisições sem
      // User-Agent — descoberto testando com um link real no navegador
      // (erro 400/403 silencioso virando 502 genérico aqui).
      upstream = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudyTrackBot/1.0; +https://studytrack.com.br)' },
      });
    } catch {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem remota.' }, { status: 502 });
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: `Falha ao baixar a imagem remota (${upstream.status}).` }, { status: 502 });
    }

    contentType = upstream.headers.get('content-type') || '';
    const extension = extensionFromContentType(contentType);
    if (!extension) {
      return NextResponse.json({ error: 'A URL informada não retornou uma imagem suportada.' }, { status: 400 });
    }
    imageBytes = new Uint8Array(await upstream.arrayBuffer());
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

  const storageKey = `${slugifySegment(questionId || slug)}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET_NAME).upload(storageKey, imageBytes, {
    contentType,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ error: `Falha ao salvar a imagem no bucket ${BUCKET_NAME}.` }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET_NAME).getPublicUrl(storageKey);
  return NextResponse.json({ publicUrl: data.publicUrl, storagePath: storageKey, bucket: BUCKET_NAME });
}
