import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { getVercelDeploymentState } from '@/lib/vercel-api';

export const dynamic = 'force-dynamic';

const TOKEN_LIFETIME_DAYS = 7;

export type TokenBadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red';

interface TokenStatusResponse {
  status: 'never_configured' | 'deploying' | 'active' | 'error';
  updated_at: string | null;
  days_left: number | null;
  color: TokenBadgeColor;
  label: string;
  error_message: string | null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = auth.supabaseAdmin as any;

  const { data: row } = await db
    .from('google_calendar_token_status')
    .select('*')
    .eq('id', 'singleton')
    .maybeSingle();

  let status: TokenStatusResponse['status'] = row?.status ?? 'never_configured';
  let updatedAt: string | null = row?.updated_at ?? null;
  let errorMessage: string | null = row?.error_message ?? null;

  // Se tem um deploy pendente, confere se já terminou (tolera falha de config
  // da API da Vercel sem quebrar a rota — só não atualiza o status agora).
  if (status === 'deploying' && row?.pending_deployment_id) {
    try {
      const state = await getVercelDeploymentState(row.pending_deployment_id);
      if (state === 'READY') {
        updatedAt = new Date().toISOString();
        status = 'active';
        errorMessage = null;
        await db
          .from('google_calendar_token_status')
          .update({ status, updated_at: updatedAt, pending_deployment_id: null, error_message: null })
          .eq('id', 'singleton');
      } else if (state === 'ERROR' || state === 'CANCELED') {
        status = 'error';
        errorMessage = `Deploy ${state === 'ERROR' ? 'falhou' : 'foi cancelado'} na Vercel.`;
        await db
          .from('google_calendar_token_status')
          .update({ status, error_message: errorMessage, pending_deployment_id: null })
          .eq('id', 'singleton');
      }
      // QUEUED/BUILDING/INITIALIZING: continua "deploying", sem mudar nada.
    } catch {
      // API da Vercel não configurada/indisponível — mantém o status atual.
    }
  }

  let daysLeft: number | null = null;
  let color: TokenBadgeColor = 'gray';
  let label = 'Nunca configurado';

  if (status === 'deploying') {
    color = 'blue';
    label = 'Atualizando...';
  } else if (status === 'error') {
    color = 'red';
    label = 'Falha ao atualizar';
  } else if (updatedAt) {
    const expiresAt = new Date(updatedAt).getTime() + TOKEN_LIFETIME_DAYS * 86_400_000;
    daysLeft = (expiresAt - Date.now()) / 86_400_000;
    if (daysLeft <= 0) {
      color = 'red';
      label = 'Token expirado';
    } else if (daysLeft < 1) {
      color = 'red';
      label = 'Expira em <1 dia';
    } else if (daysLeft < 3) {
      color = 'yellow';
      label = `Expira em ${Math.floor(daysLeft)}d`;
    } else {
      color = 'green';
      label = `Expira em ${Math.floor(daysLeft)}d`;
    }
  }

  const body: TokenStatusResponse = {
    status,
    updated_at: updatedAt,
    days_left: daysLeft,
    color,
    label,
    error_message: errorMessage,
  };

  return NextResponse.json(body);
}
