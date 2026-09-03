/**
 * Item 4 (redução de egress): mede o efeito do debounce (trailing coalesce, 3s)
 * na recarga do overview da fila de correção + do heartbeat de lock 30s -> 60s.
 *
 * ANTES: todo UPDATE em `essays` na org (inclui o heartbeat de lock de cada
 * corretor) dispara UM `loadOverview({silent:true})` completo em CADA aba de
 * fila aberta. Durante uma sessão de correção é O(corretores x abas).
 *
 * DEPOIS: heartbeat de lock cai de 30s p/ 60s (metade dos UPDATEs) e as recargas
 * são agrupadas numa janela de 3s por aba (no máx 1 recarga / 3s / aba).
 *
 * Este script NÃO bate em rede — é uma simulação determinística do relógio de
 * eventos, só pra quantificar a diferença. Rodar: node scripts/test-overview-reload-debounce.mjs
 */

function simulate({ sessionSeconds, correctors, openQueueTabs, heartbeatSeconds, debounceMs,
                    correctionEverySeconds = 0 }) {
  const events = [];
  for (let c = 0; c < correctors; c++) {
    // 1) heartbeat de lock (piso): 1 UPDATE em essays por batida.
    const phase = Math.floor((c / correctors) * heartbeatSeconds);
    for (let t = phase; t < sessionSeconds; t += heartbeatSeconds) {
      events.push(t * 1000);
    }
    // 2) fechamento de uma correção (opcional): rajada real de 3 UPDATEs em ~2s
    //    (unlock da atual + mudança de status + lock da próxima).
    if (correctionEverySeconds > 0) {
      const cphase = Math.floor((c / correctors) * correctionEverySeconds);
      for (let t = cphase; t < sessionSeconds; t += correctionEverySeconds) {
        events.push(t * 1000, t * 1000 + 800, t * 1000 + 1700);
      }
    }
  }
  events.sort((a, b) => a - b);

  // Sem debounce: cada evento -> 1 loadOverview por aba aberta.
  const noDebounce = events.length * openQueueTabs;

  // Com debounce trailing coalesce: por aba, um evento agenda recarga p/ +debounceMs;
  // eventos que chegam enquanto há timer pendente são ignorados.
  let perTab = 0;
  let timerUntil = -1;
  for (const ts of events) {
    if (ts >= timerUntil) {
      perTab++;
      timerUntil = ts + debounceMs;
    }
  }
  const withDebounce = perTab * openQueueTabs;

  return { events: events.length, noDebounce, withDebounce };
}

const scenarios = [
  { label: '3 corretores, 3 abas, 10min — só heartbeat de lock',
    sessionSeconds: 600, correctors: 3, openQueueTabs: 3 },
  { label: '3 corretores, 3 abas, 10min — corrigindo 1 redação/2min cada',
    sessionSeconds: 600, correctors: 3, openQueueTabs: 3, correctionEverySeconds: 120 },
  { label: '5 corretores, 4 abas, 20min — corrigindo 1 redação/90s cada (pico)',
    sessionSeconds: 1200, correctors: 5, openQueueTabs: 4, correctionEverySeconds: 90 },
];

let fail = false;
for (const s of scenarios) {
  const before = simulate({ ...s, heartbeatSeconds: 30, debounceMs: 0 });
  const after = simulate({ ...s, heartbeatSeconds: 60, debounceMs: 3000 });
  const reduction = 1 - after.withDebounce / before.noDebounce;
  console.log(`\n${s.label}`);
  console.log(`  ANTES  (heartbeat 30s, sem debounce): ${before.noDebounce} loadOverview`);
  console.log(`  DEPOIS (heartbeat 60s, debounce 3s):  ${after.withDebounce} loadOverview`);
  console.log(`  redução: ${(reduction * 100).toFixed(0)}%`);
  if (!(after.withDebounce < before.noDebounce)) {
    console.log('  !! FALHA: debounce não reduziu as chamadas');
    fail = true;
  }
  // sanidade: com debounce de 3s a fila nunca fica > ~3s desatualizada
  if (after.withDebounce > before.noDebounce) fail = true;
}

// Sanidade do coalesce: 100 eventos em 1s viram 1 recarga.
const burst = simulate({ sessionSeconds: 1, correctors: 100, openQueueTabs: 1, heartbeatSeconds: 1, debounceMs: 3000 });
console.log(`\nburst 100 eventos em 1s -> ${burst.withDebounce} recarga(s) (esperado: 1)`);
if (burst.withDebounce !== 1) { console.log('  !! FALHA'); fail = true; }

console.log(fail ? '\nRESULTADO: FALHA' : '\nRESULTADO: OK');
process.exit(fail ? 1 : 0);
