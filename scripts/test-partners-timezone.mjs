#!/usr/bin/env node

const BRT_TZ = 'America/Sao_Paulo';

function toBrtDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDaysToDateKey(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

function compareDateKeys(a, b) {
  const aMs = Date.UTC(...a.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  const bMs = Date.UTC(...b.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  if (aMs === bMs) return 0;
  return aMs > bMs ? 1 : -1;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: esperado=${expected} recebido=${actual}`);
  }
}

function assertTrue(condition, label) {
  if (!condition) throw new Error(`${label}: condição falhou`);
}

function run() {
  // Virada UTC -> ainda dia anterior no BRT.
  assertEqual(
    toBrtDateKey(new Date('2026-04-27T01:00:00Z')),
    '2026-04-26',
    'BRT key em madrugada UTC',
  );

  // Meio-dia UTC mantém mesmo dia.
  assertEqual(
    toBrtDateKey(new Date('2026-04-27T12:00:00Z')),
    '2026-04-27',
    'BRT key em meio-dia UTC',
  );

  // Expiração por dia civil: +30 dias.
  assertEqual(addDaysToDateKey('2026-04-01', 30), '2026-05-01', 'Soma de 30 dias');

  // Comparação lexicográfica segura por ms UTC.
  assertTrue(compareDateKeys('2026-05-01', '2026-04-30') > 0, 'Comparação de date keys');

  console.log('Timezone checks OK (partners/BRT).');
}

run();
