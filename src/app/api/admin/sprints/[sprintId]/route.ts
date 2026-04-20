import { NextResponse } from 'next/server';
import { requireTaskAccess } from '@/app/api/admin/_utils';
import { getSprintDetail } from '../_utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const auth = await requireTaskAccess();
  if (!auth.ok) return auth.response;

  const { sprintId } = await params;
  const sprint = await getSprintDetail(auth.supabaseAdmin, sprintId);
  if (!sprint) return NextResponse.json({ error: 'Sprint não encontrada' }, { status: 404 });
  return NextResponse.json(sprint);
}
