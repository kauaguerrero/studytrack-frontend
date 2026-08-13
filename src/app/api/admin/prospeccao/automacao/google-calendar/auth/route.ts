import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { buildGoogleAuthUrl } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// Passo único de setup: um admin logado visita essa rota, autoriza a conta
// Google no consentimento, e é redirecionado pro /callback abaixo, que
// mostra o refresh_token pra colar nas env vars (GOOGLE_CALENDAR_REFRESH_TOKEN).
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.redirect(buildGoogleAuthUrl());
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro ao montar URL de autorização';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
