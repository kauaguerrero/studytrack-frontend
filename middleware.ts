import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Executa a lógica de sessão e proteção de rotas
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas, exceto arquivos estáticos e imagens.
     * Isso garante que HTML/JSON sejam protegidos, mas o site não fique lento carregando ícones.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};