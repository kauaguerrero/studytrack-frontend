import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { buildTaskDashboardPayload } from '../_lib/server';

export async function GET() {
  const auth = await requireTaskAccess({ adminOnly: true });
  if (!auth.ok) return auth.response;

  try {
    const payload = await buildTaskDashboardPayload(auth.supabaseAdmin);
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao montar o dashboard analítico' }, { status: 500 });
  }
}
