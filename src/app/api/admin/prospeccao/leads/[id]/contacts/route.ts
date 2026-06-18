import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: lead_id } = await params;
  const body = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: contact, error } = await db
    .from('lead_contacts')
    .insert({
      lead_id,
      channel:      body.channel ?? 'whatsapp',
      response:     body.response ?? 'sem_resposta',
      notes:        body.notes || null,
      next_action:  body.next_action || null,
      contacted_by: auth.user.id,
      contact_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Atualiza temperatura se enviada
  if (body.temperature) {
    await db
      .from('leads')
      .update({ temperature: body.temperature, updated_at: new Date().toISOString() })
      .eq('id', lead_id);
  }

  return NextResponse.json({ contact }, { status: 201 });
}
