/**
 * reportError — helper fire-and-forget para reportar erros ao backend.
 *
 * Regras:
 * - Nunca exibe UI, nunca bloqueia, nunca lança exceção.
 * - Usar `void reportError(...)` (sem await) nos catch que já têm tratamento de UI.
 * - Usar `await reportError(...)` nos catch onde é o único tratamento.
 *
 * O user_id é resolvido automaticamente via sessão Supabase (client-side).
 * Em server actions/components, passe o userId explicitamente se disponível.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function resolveUserId(explicitUserId?: string | null): Promise<string | null> {
  if (explicitUserId !== undefined) return explicitUserId;
  // Só tenta no browser — em SSR/server actions não há sessão de cookie disponível aqui
  if (typeof window === "undefined") return null;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function reportError(
  errorType: string,
  errorMessage: string,
  context: Record<string, unknown> = {},
  userId?: string | null,
): Promise<void> {
  try {
    const resolvedUserId = await resolveUserId(userId);
    await fetch(`${API_URL}/api/monitoring/client-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_type: errorType,
        error_message: String(errorMessage),
        context,
        user_id: resolvedUserId,
      }),
    });
  } catch {
    // Silencia — o helper de monitoring nunca deve propagar erros
  }
}
