/**
 * Item 2 (egress): a rota de detalhe da redação deixa de gerar uma signed URL
 * nova a cada abertura e passa a reusar a URL guardada na linha até faltar
 * < 1 dia pra expirar (TTL de 7 dias).
 *
 * ANTES: N aberturas de uma redação = N createSignedUrl (token novo cada) =
 * N URLs distintas = 0% de cache hit na CDN => os ~3 MB da foto saem da origem
 * N vezes.
 *
 * DEPOIS: N aberturas na janela de ~6 dias = 1 createSignedUrl. A mesma URL é
 * devolvida sempre => a CDN cacheia => aberturas repetidas = cache hit.
 *
 * Simulação determinística da decisão `needsFreshSignedUrl` da rota. Rodar:
 *   node scripts/test-signed-url-cache.mjs
 */

const SIGN_TTL_MS = 7 * 24 * 3600 * 1000;
const REFRESH_MARGIN_MS = 24 * 3600 * 1000;

// Réplica exata da condição da rota ([essayId]/route.ts).
function needsFreshSignedUrl({ rawImageUrl, cachedSignedUrl, cachedExpiresAt, now }) {
  return !!rawImageUrl && (!cachedSignedUrl || cachedExpiresAt - now < REFRESH_MARGIN_MS);
}

// Simula uma linha de essay em memória + aberturas ao longo do tempo.
function run({ opens, imageUrl = 'https://x/object/sign/essay-images/a/b/original.jpg' }) {
  const row = { image_url: imageUrl, signed_image_url: null, signed_image_expires_at: null };
  let signCalls = 0;
  const urlsSeen = new Set();

  for (const now of opens) {
    const cachedExpiresAt = row.signed_image_expires_at ? new Date(row.signed_image_expires_at).getTime() : 0;
    if (needsFreshSignedUrl({ rawImageUrl: row.image_url, cachedSignedUrl: row.signed_image_url, cachedExpiresAt, now })) {
      signCalls++;
      row.signed_image_url = `https://x/object/sign/essay-images/a/b/original.jpg?token=SIG${signCalls}`;
      row.signed_image_expires_at = new Date(now + SIGN_TTL_MS).toISOString();
    }
    urlsSeen.add(row.signed_image_url);
  }
  return { signCalls, distinctUrls: urlsSeen.size };
}

const DAY = 24 * 3600 * 1000;
let fail = false;

function check(label, opens, expectSign, expectUrls) {
  const before = opens.length; // ANTES: 1 signCall por abertura
  const r = run({ opens });
  const ok = r.signCalls === expectSign && r.distinctUrls === expectUrls;
  console.log(`\n${label}`);
  console.log(`  aberturas: ${opens.length}`);
  console.log(`  ANTES  createSignedUrl: ${before}   (1 por abertura, ${before} URLs distintas)`);
  console.log(`  DEPOIS createSignedUrl: ${r.signCalls}   (${r.distinctUrls} URL distinta(s) servida(s))`);
  console.log(ok ? '  OK' : `  !! FALHA — esperava sign=${expectSign} urls=${expectUrls}`);
  if (!ok) fail = true;
}

// 20 aberturas no mesmo dia (2ª correção, revisão, refreshes): 1 assinatura.
check('20 aberturas em 1 dia', Array.from({ length: 20 }, (_, i) => i * 3600 * 1000), 1, 1);

// aberturas espalhadas em 5 dias: ainda 1 (dentro da janela de 6 dias úteis).
check('aberturas nos dias 0,1,2,3,5', [0, 1 * DAY, 2 * DAY, 3 * DAY, 5 * DAY], 1, 1);

// dia 0 e dia 6.5: a 2ª cai na margem de refresh (<1 dia p/ expirar) → re-assina.
check('aberturas nos dias 0 e 6.5 (2ª na margem)', [0, 6.5 * DAY], 2, 2);

// dia 0 e dia 30: token velho já expirou → re-assina.
check('aberturas nos dias 0 e 30', [0, 30 * DAY], 2, 2);

// redação sem imagem: nunca assina.
console.log('\nredação sem image_url');
const noImg = run({ opens: [0, DAY, 2 * DAY], imageUrl: null });
console.log(`  createSignedUrl: ${noImg.signCalls} (esperado 0)`);
if (noImg.signCalls !== 0) fail = true;

console.log(fail ? '\nRESULTADO: FALHA' : '\nRESULTADO: OK');
process.exit(fail ? 1 : 0);
