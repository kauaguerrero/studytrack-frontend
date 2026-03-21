import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const supabaseAdmin = auth.supabaseAdmin as any;

  const { userId } = (await request.json().catch(() => ({}))) as { userId?: string };
  if (!userId) {
    return NextResponse.json({ error: 'Parâmetro userId é obrigatório' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('admin_actions_log').insert({
    user_id: userId,
    admin_id: auth.user.id,
    action_type: 'conversation_read',
    payload: { read_at: new Date().toISOString() },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
