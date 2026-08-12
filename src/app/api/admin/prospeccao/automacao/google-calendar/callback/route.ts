import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/_utils';
import { exchangeCodeForTokens } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

function htmlPage(title: string, bodyHtml: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#1e293b;line-height:1.5}
        code,pre{background:#f1f5f9;padding:2px 6px;border-radius:6px;font-size:13px;word-break:break-all}
        pre{padding:14px;white-space:pre-wrap}
        h1{font-size:20px}
        .warn{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:13px;color:#92400e}
        .err{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;font-size:13px;color:#991b1b}
      </style></head>
      <body>${bodyHtml}</body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');

  if (error) {
    return htmlPage(
      'Autorização cancelada',
      `<h1>Autorização cancelada</h1><div class="err">O Google retornou o erro: <code>${error}</code>. Tente de novo em /api/admin/prospeccao/automacao/google-calendar/auth.</div>`
    );
  }

  if (!code) {
    return htmlPage('Código ausente', `<h1>Faltou o parâmetro "code"</h1><div class="err">Acesse essa rota através do fluxo de autorização (/google-calendar/auth), não diretamente.</div>`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return htmlPage(
        'Sem refresh_token',
        `<h1>O Google não retornou um refresh_token</h1>
         <div class="warn">Isso geralmente acontece quando essa conta já autorizou esse app antes.
         Revogue o acesso em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>
         (procure pelo app do StudyTrack) e tente de novo em
         <a href="/api/admin/prospeccao/automacao/google-calendar/auth">/google-calendar/auth</a>.</div>`
      );
    }

    return htmlPage(
      'Google Calendar conectado',
      `<h1>✅ Autorização concluída</h1>
       <p>Copie o valor abaixo e salve como a env var <code>GOOGLE_CALENDAR_REFRESH_TOKEN</code>
       (no <code>.env</code> local e nas env vars da Vercel), depois faça o redeploy.</p>
       <pre>${tokens.refresh_token}</pre>
       <div class="warn">⚠️ Isso é um segredo equivalente a uma senha — não printe, não cole em chat/PR, e feche essa aba depois de copiar.</div>`
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return htmlPage('Erro ao trocar o code', `<h1>Erro ao trocar o code por tokens</h1><div class="err">${message}</div>`);
  }
}
