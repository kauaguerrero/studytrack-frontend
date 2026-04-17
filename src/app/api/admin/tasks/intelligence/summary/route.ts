import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { buildTaskWorkspaceSummary } from '../../_lib/server';

export async function GET() {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  try {
    const payload = await buildTaskWorkspaceSummary(auth.supabaseAdmin, auth.role);
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao montar o resumo operacional' }, { status: 500 });
  }
}
