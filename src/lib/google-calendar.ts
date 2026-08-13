import 'server-only';

// Integração leve com a Google Calendar API via fetch direto (sem SDK) —
// usa um refresh token de uma conta Google autorizada uma vez (fluxo OAuth2
// em /api/admin/prospeccao/automacao/google-calendar/auth) pra criar eventos
// com Google Meet embutido (conferenceData). Ver env vars no fim do arquivo.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function getOAuthCreds() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'Integração com Google Calendar não configurada: faltam GOOGLE_CALENDAR_CLIENT_ID / GOOGLE_CALENDAR_CLIENT_SECRET.'
    );
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getOAuthCreds();
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      'Integração com Google Calendar não configurada: falta GOOGLE_CALENDAR_REFRESH_TOKEN. ' +
        'Complete o fluxo em /api/admin/prospeccao/automacao/google-calendar/auth.'
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Falha ao renovar token do Google (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface CreateCallEventInput {
  title: string;
  description?: string;
  /** ISO 8601, ex: "2026-08-18T15:30:00-03:00" */
  startISO: string;
  endISO: string;
  timeZone: string;
  attendeeEmails?: string[];
}

export interface CreateCallEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
}

export async function createCallEvent(
  input: CreateCallEventInput
): Promise<CreateCallEventResult> {
  const accessToken = await getAccessToken();
  const requestId =
    typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `req-${Date.now()}`;

  const res = await fetch(`${CALENDAR_EVENTS_URL}?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startISO, timeZone: input.timeZone },
      end: { dateTime: input.endISO, timeZone: input.timeZone },
      attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Falha ao criar evento no Google Calendar (${res.status}): ${body}`);
  }

  const event = (await res.json()) as {
    id: string;
    htmlLink: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };

  const meetEntry = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  const meetLink = meetEntry?.uri ?? event.hangoutLink ?? '';

  return { eventId: event.id, meetLink, htmlLink: event.htmlLink };
}

// ── Fluxo de autorização única (setup manual, feito uma vez pelo admin) ──────
//
// Env vars necessárias:
//   GOOGLE_CALENDAR_CLIENT_ID       — OAuth Client ID (Google Cloud Console)
//   GOOGLE_CALENDAR_CLIENT_SECRET   — OAuth Client Secret
//   GOOGLE_CALENDAR_REDIRECT_URI    — URL de callback registrada no client
//                                      (ex: https://www.studytrack.com.br/api/admin/prospeccao/automacao/google-calendar/callback)
//   GOOGLE_CALENDAR_REFRESH_TOKEN   — obtido uma vez visitando .../google-calendar/auth
//                                      logado como admin e completando o consentimento

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function buildGoogleAuthUrl(): string {
  const { clientId } = getOAuthCreds();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error('Falta a env var GOOGLE_CALENDAR_REDIRECT_URI.');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ refresh_token?: string; access_token: string }> {
  const { clientId, clientSecret } = getOAuthCreds();
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error('Falta a env var GOOGLE_CALENDAR_REDIRECT_URI.');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Falha ao trocar code por tokens (${res.status}): ${body}`);
  }

  return res.json() as Promise<{ refresh_token?: string; access_token: string }>;
}
