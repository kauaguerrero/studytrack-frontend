import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Next.js 16 depreciou middleware.ts em favor de proxy.ts (função renomeada
// de `middleware` pra `proxy`). Esse arquivo precisa ficar dentro de src/,
// no mesmo nível de src/app — colocá-lo na raiz do projeto (fora de src/)
// faz o `next dev` nunca registrar/rodar o proxy (middleware-manifest fica
// vazio), mesmo funcionando normalmente em build de produção. Só percebido
// porque rotas públicas de /partners/[slug]/* passaram a exigir login
// incorretamente em dev local.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica o proxy em todas as rotas, exceto arquivos estáticos e imagens.
     * Isso garante que HTML/JSON sejam protegidos, mas o site não fique lento carregando ícones.
     *
     * `api/` também fica de fora: para essas rotas o updateSession já saía cedo
     * (ver o early-return de `path.startsWith('/api')` em lib/supabase/middleware.ts)
     * sem decidir nada, mas ainda pagava uma invocação inteira de proxy — cliente
     * Supabase, parse de cookies e um `auth.getUser()` de rede — por request. Como
     * o proxy roda em runtime nodejs, cada uma dessas era um cold start em potencial
     * competindo com a cota de Active CPU (Fluid) do plano.
     *
     * Seguro porque nenhuma rota de API depende do proxy:
     *   - sessão: as rotas chamam createClient() (lib/supabase/server.ts), cujo
     *     setAll grava os cookies renovados — em route handler isso é permitido,
     *     então o refresh continua acontecendo por conta própria;
     *   - x-pathname: nenhum arquivo em app/api lê esse header (só o layout de
     *     /partners/[slug], que não é rota de API);
     *   - autorização: quem protege as rotas é requireAdmin/requireTaskAccess
     *     (app/api/admin/_utils.ts), não o proxy.
     *
     * Pelo mesmo motivo ficam de fora os arquivos de metadata públicos
     * (robots.txt, sitemap.xml, manifest.webmanifest — gerados por app/robots.ts,
     * app/sitemap.ts e app/manifest.ts) e llms.txt: são anônimos por definição,
     * não têm sessão a renovar e nenhum deles lê x-pathname. llms.txt não existe
     * no projeto e responde 404 — crawlers de IA pedem esse caminho, e sem a
     * exclusão cada 404 desses acordava o proxy só para não decidir nada.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|llms\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
