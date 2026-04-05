#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Regras de negócio usadas no script:
 * 1) Plano ativo: now <= last_payment_at + duration_days
 * 2) Créditos contam por janela do plano:
 *    - week: blocos de 7 dias desde last_payment_at
 *    - month: blocos mensais desde last_payment_at
 * 3) Envio permitido somente quando plano ativo e remaining > 0
 */

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonths(baseDate, months) {
  const d = new Date(baseDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function isPlanActive({ lastPaymentAt, durationDays, now }) {
  const startedAt = new Date(lastPaymentAt);
  const expiresAt = addDays(startedAt, durationDays);
  return new Date(now).getTime() <= expiresAt.getTime();
}

function getCycleWindow({ period, anchorDate, now }) {
  const anchor = new Date(anchorDate);
  const current = new Date(now);

  if (period === 'week') {
    const diffMs = current.getTime() - anchor.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const cycleIndex = Math.max(0, Math.floor(diffDays / 7));
    const start = addDays(anchor, cycleIndex * 7);
    const end = addDays(start, 7);
    return { start, end };
  }

  const diffMonths =
    (current.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (current.getUTCMonth() - anchor.getUTCMonth());
  const cycleIndex = Math.max(0, diffMonths);
  const start = addMonths(anchor, cycleIndex);
  const end = addMonths(start, 1);
  return { start, end };
}

function computeCreditsStatus({ plan, submissions, now }) {
  const active = isPlanActive({
    lastPaymentAt: plan.lastPaymentAt,
    durationDays: plan.durationDays,
    now,
  });

  if (!active) {
    return { active: false, used: 0, remaining: 0, canSubmit: false };
  }

  const { start, end } = getCycleWindow({
    period: plan.creditsPeriod,
    anchorDate: plan.lastPaymentAt,
    now,
  });

  const used = submissions.filter((submittedAt) => {
    const t = new Date(submittedAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  }).length;

  const remaining = Math.max(plan.creditsLimit - used, 0);
  return {
    active: true,
    used,
    remaining,
    canSubmit: remaining > 0,
  };
}

test('Aluno sem créditos não consegue enviar redação', () => {
  const now = '2026-04-04T15:00:00.000Z';
  const plan = {
    creditsLimit: 2,
    creditsPeriod: 'week',
    durationDays: 30,
    lastPaymentAt: '2026-04-01T00:00:00.000Z',
  };
  const submissions = [
    '2026-04-02T10:00:00.000Z',
    '2026-04-03T18:00:00.000Z',
  ];

  const status = computeCreditsStatus({ plan, submissions, now });

  assert.equal(status.active, true);
  assert.equal(status.used, 2);
  assert.equal(status.remaining, 0);
  assert.equal(status.canSubmit, false);
});

test('Aluno com créditos consegue enviar redação', () => {
  const now = '2026-04-04T15:00:00.000Z';
  const plan = {
    creditsLimit: 3,
    creditsPeriod: 'week',
    durationDays: 30,
    lastPaymentAt: '2026-04-01T00:00:00.000Z',
  };
  const submissions = ['2026-04-02T10:00:00.000Z'];

  const status = computeCreditsStatus({ plan, submissions, now });

  assert.equal(status.active, true);
  assert.equal(status.used, 1);
  assert.equal(status.remaining, 2);
  assert.equal(status.canSubmit, true);
});

test('Créditos semanais renovam corretamente na nova semana', () => {
  const plan = {
    creditsLimit: 2,
    creditsPeriod: 'week',
    durationDays: 90,
    lastPaymentAt: '2026-04-01T00:00:00.000Z',
  };

  const submissions = [
    // Semana 1 (consome tudo)
    '2026-04-02T10:00:00.000Z',
    '2026-04-04T10:00:00.000Z',
    // Semana 2
    '2026-04-09T10:00:00.000Z',
  ];

  const week1Status = computeCreditsStatus({
    plan,
    submissions,
    now: '2026-04-06T10:00:00.000Z',
  });
  assert.equal(week1Status.remaining, 0);
  assert.equal(week1Status.canSubmit, false);

  const week2Status = computeCreditsStatus({
    plan,
    submissions,
    now: '2026-04-10T10:00:00.000Z',
  });
  assert.equal(week2Status.used, 1);
  assert.equal(week2Status.remaining, 1);
  assert.equal(week2Status.canSubmit, true);
});

test('Créditos mensais renovam corretamente no novo mês', () => {
  const plan = {
    creditsLimit: 4,
    creditsPeriod: 'month',
    durationDays: 180,
    lastPaymentAt: '2026-01-15T00:00:00.000Z',
  };

  const submissions = [
    // Janela de abril (15/04 a 15/05): 1 envio
    '2026-04-20T10:00:00.000Z',
    // Janela de maio (15/05 a 15/06): 2 envios
    '2026-05-16T10:00:00.000Z',
    '2026-05-20T10:00:00.000Z',
  ];

  const aprilStatus = computeCreditsStatus({
    plan,
    submissions,
    now: '2026-04-25T12:00:00.000Z',
  });
  assert.equal(aprilStatus.used, 1);
  assert.equal(aprilStatus.remaining, 3);
  assert.equal(aprilStatus.canSubmit, true);

  const mayStatus = computeCreditsStatus({
    plan,
    submissions,
    now: '2026-05-25T12:00:00.000Z',
  });
  assert.equal(mayStatus.used, 2);
  assert.equal(mayStatus.remaining, 2);
  assert.equal(mayStatus.canSubmit, true);
});

test('Plano vencido bloqueia envio mesmo com limite configurado', () => {
  const plan = {
    creditsLimit: 10,
    creditsPeriod: 'month',
    durationDays: 30,
    lastPaymentAt: '2026-01-01T00:00:00.000Z',
  };

  const status = computeCreditsStatus({
    plan,
    submissions: [],
    now: '2026-04-04T00:00:00.000Z',
  });

  assert.equal(status.active, false);
  assert.equal(status.canSubmit, false);
  assert.equal(status.remaining, 0);
});

console.log('OK: testes de regra de negócio de créditos de redação executados.');
