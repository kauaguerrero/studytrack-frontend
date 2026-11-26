/**
 * Valida o `?next=` dos logins e callbacks: só aceita caminho interno do próprio site.
 *
 * Checar só `startsWith('/') && !startsWith('//')` deixava passar `/\evil.com`,
 * `/%5Cevil.com` e `/%09/evil.com`, que o navegador normaliza para `//evil.com`.
 * Aqui o valor é decodificado, recusado se tiver barra invertida ou caractere de
 * controle, e resolvido contra uma origem fictícia: se a origem mudar, é externo.
 */
const PROBE_ORIGIN = 'https://studytrack.invalid';

export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string' || raw.length > 2048) return null;

  let decoded = raw;
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  for (const candidate of [raw, decoded]) {
    if (!candidate.startsWith('/') || candidate.startsWith('//')) return null;
    if (candidate.includes('\\')) return null;
    if (/[\u0000-\u001f\u007f]/.test(candidate)) return null;
  }

  try {
    const url = new URL(raw, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
