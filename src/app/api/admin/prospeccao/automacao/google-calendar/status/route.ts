import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { findProductionDeploymentSince } from '@/lib/vercel-api';

export const dynamic = 'force-dynamic';

const TOKEN_LIFETIME_DAYS = 7;
const DEPLOY_STUCK_TIMEOUT_MS = 15 * 60_000;

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

  // Se tem um deploy em andamento, confere se já terminou — correlaciona
  // pelo horário em que foi disparado (o deploy hook não devolve um ID de
  // deployment utilizável, ver vercel-api.ts).
  if (status === 'deploying' && row?.deploying_since) {
    const sinceMs = new Date(row.deploying_since).getTime();
    try {
      const deployment = await findProductionDeploymentSince(sinceMs);
      if (deployment?.state === 'READY') {
        updatedAt = new Date().toISOString();
        status = 'active';
        errorMessage = null;
        await db
          .from('google_calendar_token_status')
          .update({ status, updated_at: updatedAt, deploying_since: null, error_message: null })
          .eq('id', 'singleton');
      } else if (deployment?.state === 'ERROR' || deployment?.state === 'CANCELED') {
        status = 'error';
        errorMessage = `Deploy ${deployment.state === 'ERROR' ? 'falhou' : 'foi cancelado'} na Vercel.`;
        await db
          .from('google_calendar_token_status')
          .update({ status, error_message: errorMessage, deploying_since: null })
          .eq('id', 'singleton');
      } else if (Date.now() - sinceMs > DEPLOY_STUCK_TIMEOUT_MS) {
        // Sem sinal do deployment depois de muito tempo — evita ficar preso
        // pra sempre em "Atualizando...".
        status = 'error';
        errorMessage = 'Não foi possível confirmar o deploy depois de 15 minutos.';
        await db
          .from('google_calendar_token_status')
          .update({ status, error_message: errorMessage, deploying_since: null })
          .eq('id', 'singleton');
      }
      // QUEUED/BUILDING/INITIALIZING (ou ainda não achou o deployment): continua "deploying".
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
