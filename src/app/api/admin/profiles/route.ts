import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { listTaskAssignableProfiles } from '@/app/api/admin/tasks/_lib/server';

export async function GET() {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  try {
    const data = await listTaskAssignableProfiles(auth.supabaseAdmin);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao listar perfis' }, { status: 500 });
  }
}
