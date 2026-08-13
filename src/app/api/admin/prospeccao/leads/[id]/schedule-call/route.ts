import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { createCallEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

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

  let meetLink: string | null = null;
  let eventId: string | null = null;
  let calendarCreated = false;

  if (isCalendarConfigured()) {
    try {
      const event = await createCallEvent({
        title,
        description: 'Agendado via CRM de prospecção StudyTrack.',
        startISO,
        endISO,
        timeZone,
        attendeeEmails: attendeeEmail ? [attendeeEmail] : [],
      });
      meetLink = event.meetLink;
      eventId = event.eventId;
      calendarCreated = true;
    } catch (e: unknown) {
      console.error('[schedule-call] Google Calendar error (non-fatal):', e instanceof Error ? e.message : e);
    }
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
      call_meet_link: meetLink,
      call_calendar_event_id: eventId,
      call_outcome: 'pendente',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lead, meet_link: meetLink, calendar_created: calendarCreated });
}
