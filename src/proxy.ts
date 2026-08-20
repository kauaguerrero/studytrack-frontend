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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
