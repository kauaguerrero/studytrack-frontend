import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET = 'essay-prompt-images';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

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
    return NextResponse.json({ error: 'Apenas founders podem fazer upload de imagens' }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não suportado. Use: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Imagem maior que 10 MB' }, { status: 400 });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const timestamp = Date.now();
  const storagePath = `orgs/${org.id}/${timestamp}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await (admin as any).storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Falha no upload: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = (admin as any).storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl, path: storagePath });
}
