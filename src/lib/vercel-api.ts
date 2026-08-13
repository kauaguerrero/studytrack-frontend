import 'server-only';

// Automação do "botão Atualizar Token" em /portal/admin/prospeccao: depois
// que o admin autoriza o Google (passo que nunca dá pra automatizar — exige
// clique humano na tela de consentimento), o callback usa isso pra:
// 1. Atualizar a env var GOOGLE_CALENDAR_REFRESH_TOKEN direto na Vercel
// 2. Disparar um redeploy via deploy hook
// 3. (rota separada) checar quando esse deploy termina

const VERCEL_API_BASE = 'https://api.vercel.com';

// Identificadores fixos do projeto — não são segredo (são só IDs), então
// ficam hardcoded em vez de exigir mais env vars pra configurar.
const PROJECT_ID = 'prj_5nGuHu0PkSoTCbBFMXVTqZcTAo8v';
const TEAM_ID = 'team_OKgO9bbQIAywpD6J5yBDX3L4';

function getApiToken(): string {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) {
    throw new Error('Falta a env var VERCEL_API_TOKEN (Vercel → Account Settings → Tokens).');
  }
  return token;
}

function getDeployHookUrl(): string {
  const url = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!url) {
    throw new Error(
      'Falta a env var VERCEL_DEPLOY_HOOK_URL (Vercel → Project Settings → Git → Deploy Hooks).'
    );
  }
  return url;
}

async function vercelFetch(path: string, init?: RequestInit) {
  const token = getApiToken();
  const url = `${VERCEL_API_BASE}${path}${path.includes('?') ? '&' : '?'}teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Vercel API ${path} falhou (${res.status}): ${body}`);
  }
  return res.json();
}

export async function updateVercelEnvVar(key: string, value: string): Promise<void> {
  const list = (await vercelFetch(`/v10/projects/${PROJECT_ID}/env`)) as {
    envs: { id: string; key: string }[];
  };
  const existing = list.envs.find((e) => e.key === key);

  if (existing) {
    await vercelFetch(`/v10/projects/${PROJECT_ID}/env/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  } else {
    await vercelFetch(`/v10/projects/${PROJECT_ID}/env`, {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production'],
      }),
    });
  }
}

export async function triggerVercelDeploy(): Promise<{ deploymentId: string | null }> {
  const hookUrl = getDeployHookUrl();
  const res = await fetch(hookUrl, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Falha ao disparar deploy hook (${res.status}): ${body}`);
  }
  const json = (await res.json().catch(() => ({}))) as { job?: { id?: string } };
  return { deploymentId: json.job?.id ?? null };
}

export type VercelDeploymentState =
  | 'QUEUED'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED'
  | 'INITIALIZING';

export async function getVercelDeploymentState(deploymentId: string): Promise<VercelDeploymentState> {
  const json = (await vercelFetch(`/v13/deployments/${deploymentId}`)) as {
    readyState: VercelDeploymentState;
  };
  return json.readyState;
}
