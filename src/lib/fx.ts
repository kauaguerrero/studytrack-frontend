// Cotação USD→BRL para os cards de custo do painel admin.
//
// A fonte é a awesomeapi (https://docs.awesomeapi.com.br/). A resposta deles já
// é cacheada ~1 min do lado do serviço, então não precisamos de cache no Next.
// Se a chamada falhar, cai no valor fixo histórico do painel (6,00).

export const FALLBACK_USD_BRL = 6.0;

const AWESOMEAPI_URL = 'https://economia.awesomeapi.com.br/json/last/USD-BRL';

export interface UsdBrlQuote {
  /** Reais por 1 dólar. */
  rate: number;
  source: 'awesomeapi' | 'fallback';
  /** Momento da cotação segundo a fonte (string local BR), ou null no fallback. */
  updated_at: string | null;
  /** Mensagem de erro quando caiu no fallback. */
  error?: string;
}

export async function getUsdBrl(): Promise<UsdBrlQuote> {
  try {
    const res = await fetch(AWESOMEAPI_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`awesomeapi HTTP ${res.status}`);

    const data = await res.json();
    const q = data?.USDBRL;
    // `bid` é a cotação de compra; usamos ela, com `ask` como reserva.
    const rate = Number(q?.bid ?? q?.ask);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('cotação inválida');

    return { rate, source: 'awesomeapi', updated_at: q?.create_date ?? null };
  } catch (e) {
    return {
      rate: FALLBACK_USD_BRL,
      source: 'fallback',
      updated_at: null,
      error: e instanceof Error ? e.message : 'erro desconhecido',
    };
  }
}
