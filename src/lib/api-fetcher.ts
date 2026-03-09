/**
 * Fetcher genérico para SWR com Authorization Bearer (token Supabase).
 * Usado para APIs protegidas do backend Flask.
 */
export async function apiFetcher<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string })?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/** Cria headers com token para requisições autenticadas */
export async function authHeaders(
  getToken: () => Promise<string | null>
): Promise<HeadersInit> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
