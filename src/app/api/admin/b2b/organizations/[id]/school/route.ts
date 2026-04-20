import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createAdminClient } from '@/lib/supabase/admin';

// Desvincula todas as escolas da org (sets organization_id = null)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = createAdminClient() as any;

  const { error } = await db
    .from('schools')
    .update({ organization_id: null })
    .eq('organization_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
