import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createCallEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// Cria o evento no Google Calendar (com Meet embutido) e, só se isso der certo,
// move o lead pra "call_agendado" com os dados da call — atômico o suficiente
// pra nunca deixar um lead em call_agendado sem link de verdade.
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const title = (body.title as string | undefined)?.trim();
  const startISO = body.start as string | undefined;
  const endISO = body.end as string | undefined;
  const timeZone = (body.time_zone as string | undefined)?.trim() || 'America/Sao_Paulo';
  const attendeeEmail = (body.attendee_email as string | undefined)?.trim() || undefined;

  if (!title || !startISO || !endISO) {
    return NextResponse.json({ error: 'title, start e end são obrigatórios' }, { status: 400 });
  }
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: 'start/end inválidos' }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: 'Horário de término deve ser depois do início' }, { status: 400 });
  }

  let event;
  try {
    event = await createCallEvent({
      title,
      description: 'Agendado via CRM de prospecção StudyTrack.',
      startISO,
      endISO,
      timeZone,
      attendeeEmails: attendeeEmail ? [attendeeEmail] : [],
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro ao criar evento no Google Calendar';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;
  const { data: lead, error } = await db
    .from('leads')
    .update({
      status_crm: 'call_agendado',
      call_scheduled_at: startISO,
      call_ends_at: endISO,
      call_title: title,
      call_meet_link: event.meetLink,
      call_calendar_event_id: event.eventId,
      call_outcome: 'pendente',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lead, meet_link: event.meetLink });
}
