/**
 * reportError — helper fire-and-forget para reportar erros ao backend.
 *
 * Regras:
 * - Nunca exibe UI, nunca bloqueia, nunca lança exceção.
 * - Usar `void reportError(...)` (sem await) nos catch que já têm tratamento de UI.
 * - Usar `await reportError(...)` nos catch onde é o único tratamento.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function reportError(
  errorType: string,
  errorMessage: string,
  context: Record<string, unknown> = {},
  userId?: string | null,
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/monitoring/client-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error_type: errorType,
        error_message: String(errorMessage),
        context,
        user_id: userId ?? null,
      }),
    });
  } catch {
    // Silencia — o helper de monitoring nunca deve propagar erros
  }
}
