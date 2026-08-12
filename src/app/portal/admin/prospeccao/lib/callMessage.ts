// Formata a mensagem de convite no estilo que o Google Calendar gera quando
// você copia os detalhes de um evento — usado tanto no ScheduleCallModal
// (logo após criar a call) quanto no LeadDrawer (pra reenviar/copiar depois).

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getMeridiem(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: true, timeZone }).formatToParts(
    date
  );
  return (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase();
}

function formatTimePart(date: Date, timeZone: string, includeMeridiem: boolean): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase();
  return includeMeridiem ? `${hour}:${minute}${dayPeriod}` : `${hour}:${minute}`;
}

export interface CallMessageInput {
  title: string;
  start: Date;
  end: Date;
  timeZone: string;
  meetLink: string;
}

/**
 * Ex.:
 * Reunião Onboarding - Cursinho X x StudyTrack
 * Terça-feira, 18 de agosto 3:30–4:30pm
 * Fuso horário: America/Sao_Paulo
 * Como participar do Google Meet
 * Link da videochamada: https://meet.google.com/xxx-xxxx-xxx
 */
export function formatCallMessage({ title, start, end, timeZone, meetLink }: CallMessageInput): string {
  const weekday = capitalize(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone }).format(start)
  );
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone }).format(
    start
  );

  const sameMeridiem = getMeridiem(start, timeZone) === getMeridiem(end, timeZone);
  const startTime = formatTimePart(start, timeZone, !sameMeridiem);
  const endTime = formatTimePart(end, timeZone, true);

  return [
    title,
    `${weekday}, ${dayMonth} ${startTime}–${endTime}`,
    `Fuso horário: ${timeZone}`,
    'Como participar do Google Meet',
    `Link da videochamada: ${meetLink}`,
  ].join('\n');
}
