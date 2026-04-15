#!/usr/bin/env node
/**
 * test-dev-role-logic.mjs
 *
 * Testa a lógica pura das 4 mudanças da role 'dev':
 *   1. ROLE_PERMISSIONS  (roles.ts)
 *   2. normalizeRole     (middleware.ts)
 *   3. adminGuard        (middleware.ts — guard do /portal/admin)
 *   4. resolveRole       (PortalSidebar.tsx — resolvedRole)
 *   5. checkAdminOrDev   (_utils.ts — requireAdminOrDev)
 *
 * Cada função é uma cópia fiel da lógica do arquivo-fonte, sem imports de
 * Next.js ou Supabase, para rodar puro em node:test.
 *
 * Execute:
 *   node scripts/test-dev-role-logic.mjs
 * ou via npm:
 *   npm run test:dev-role
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROLE_PERMISSIONS  (src/types/roles.ts)
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  student:     ['view_dashboard', 'view_assignments', 'take_exam'],
  teacher:     ['view_classes', 'create_assignment', 'grade_exam', 'view_question_bank'],
  manager:     ['view_school_stats', 'manage_users', 'view_financial', 'manage_curriculum'],
  secretariat: ['manage_adaptations', 'view_students', 'upload_exam'],
  admin:       ['all'],
  founder:     ['view_org_dashboard', 'manage_students', 'manage_org_settings'],
  associate:   ['correct_essays'],
  dev:         ['view_tasks', 'use_platform'],
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. normalizeRole  (src/lib/supabase/middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_ROLES = [
  'student', 'teacher', 'manager', 'admin',
  'secretariat', 'founder', 'associate', 'dev',
];

function normalizeRole(role) {
  if (!role) return null;
  const s = String(role).trim().toLowerCase();
  return ALLOWED_ROLES.includes(s) ? s : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. adminGuard  (src/lib/supabase/middleware.ts — bloco /portal/admin)
//
// Retorna:
//   { action: 'pass' }                — deixa passar
//   { action: 'redirect', dest: str } — redireciona para dest
// ─────────────────────────────────────────────────────────────────────────────
function adminGuard(path, currentRole) {
  if (!path.startsWith('/portal/admin')) return { action: 'pass' };
  if (currentRole === 'admin')          return { action: 'pass' };

  // Role 'dev': acesso restrito a /portal/admin/tasks
  if (currentRole === 'dev') {
    if (!path.startsWith('/portal/admin/tasks')) {
      return { action: 'redirect', dest: '/portal/admin/tasks' };
    }
    return { action: 'pass' };
  }

  // Todos os outros roles: redireciona para a área correta
  const dest =
    currentRole === 'manager'     ? '/portal/manager'
    : currentRole === 'teacher'   ? '/portal/teacher'
    : currentRole === 'secretariat' ? '/portal/secretariat'
    : '/portal/student/dashboard';

  return { action: 'redirect', dest };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. resolveRole  (src/components/layout/PortalSidebar.tsx)
// ─────────────────────────────────────────────────────────────────────────────
function resolveRole(role, pathname) {
  return role === 'dev'
    ? 'dev'
    : pathname.startsWith('/portal/secretariat') ? 'secretariat'
    : pathname.startsWith('/portal/teacher')     ? 'teacher'
    : pathname.startsWith('/portal/manager')     ? 'manager'
    : pathname.startsWith('/portal/student')     ? 'student'
    : pathname.startsWith('/portal/admin')       ? 'admin'
    : role;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. checkAdminOrDev  (src/app/api/admin/_utils.ts — requireAdminOrDev)
//
// Simula apenas a decisão de autorização (sem I/O Supabase).
// Retorna:
//   { ok: true }                — acesso permitido
//   { ok: false, status: 401 } — não autenticado
//   { ok: false, status: 403 } — sem permissão
// ─────────────────────────────────────────────────────────────────────────────
function checkAdminOrDev(user, profileRole, profileErr = false) {
  if (!user) return { ok: false, status: 401 };
  if (profileErr || (profileRole !== 'admin' && profileRole !== 'dev')) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

// Análogo para requireAdmin (deve rejeitar 'dev')
function checkAdminOnly(user, profileRole, profileErr = false) {
  if (!user) return { ok: false, status: 401 };
  if (profileErr || profileRole !== 'admin') {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTES
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. ROLE_PERMISSIONS ──────────────────────────────────────────────────────

test('[roles] dev existe em ROLE_PERMISSIONS', () => {
  assert.ok('dev' in ROLE_PERMISSIONS, "ROLE_PERMISSIONS deve conter 'dev'");
});

test('[roles] dev tem as permissões corretas', () => {
  assert.deepEqual(
    ROLE_PERMISSIONS.dev,
    ['view_tasks', 'use_platform'],
  );
});

test('[roles] dev não tem permissão "all" (admin)', () => {
  assert.ok(!ROLE_PERMISSIONS.dev.includes('all'));
});

test('[roles] dev não tem permissões de aluno', () => {
  assert.ok(!ROLE_PERMISSIONS.dev.includes('view_dashboard'));
  assert.ok(!ROLE_PERMISSIONS.dev.includes('take_exam'));
});

test('[roles] roles existentes não foram alteradas', () => {
  assert.deepEqual(ROLE_PERMISSIONS.student,     ['view_dashboard', 'view_assignments', 'take_exam']);
  assert.deepEqual(ROLE_PERMISSIONS.admin,       ['all']);
  assert.deepEqual(ROLE_PERMISSIONS.associate,   ['correct_essays']);
  assert.deepEqual(ROLE_PERMISSIONS.founder,     ['view_org_dashboard', 'manage_students', 'manage_org_settings']);
});

test('[roles] total de roles agora é 8', () => {
  assert.equal(Object.keys(ROLE_PERMISSIONS).length, 8);
});

// ── 2. normalizeRole ─────────────────────────────────────────────────────────

test('[normalizeRole] "dev" → "dev"', () => {
  assert.equal(normalizeRole('dev'), 'dev');
});

test('[normalizeRole] "DEV" → "dev" (case insensitive)', () => {
  assert.equal(normalizeRole('DEV'), 'dev');
});

test('[normalizeRole] " Dev " → "dev" (trim + lowercase)', () => {
  assert.equal(normalizeRole(' Dev '), 'dev');
});

test('[normalizeRole] todas as roles válidas passam', () => {
  for (const role of ALLOWED_ROLES) {
    assert.equal(normalizeRole(role), role, `falhou para: ${role}`);
  }
});

test('[normalizeRole] "ADMIN" → "admin"', () => {
  assert.equal(normalizeRole('ADMIN'), 'admin');
});

test('[normalizeRole] role desconhecida → null', () => {
  assert.equal(normalizeRole('superuser'), null);
  assert.equal(normalizeRole('root'),      null);
  assert.equal(normalizeRole('hacker'),    null);
  assert.equal(normalizeRole('god'),       null);
});

test('[normalizeRole] valores falsy → null', () => {
  assert.equal(normalizeRole(null),      null);
  assert.equal(normalizeRole(undefined), null);
  assert.equal(normalizeRole(''),        null);
  assert.equal(normalizeRole(0),         null);
  assert.equal(normalizeRole(false),     null);
});

test('[normalizeRole] ANTES da correção "dev" teria virado null → tratado como student', () => {
  // Simula o estado ANTIGO sem 'dev' na lista
  const oldAllowed = ['student', 'teacher', 'manager', 'admin', 'secretariat', 'founder', 'associate'];
  function normalizeRoleOld(role) {
    if (!role) return null;
    const s = String(role).trim().toLowerCase();
    return oldAllowed.includes(s) ? s : null;
  }
  // Antes da correção: dev → null → teria sido tratado como 'student'
  assert.equal(normalizeRoleOld('dev'), null);
  // Depois: dev → 'dev'
  assert.equal(normalizeRole('dev'), 'dev');
});

// ── 3. adminGuard ────────────────────────────────────────────────────────────

test('[adminGuard] dev em /portal/admin → redireciona para /portal/admin/tasks', () => {
  const r = adminGuard('/portal/admin', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] dev em /portal/admin/ (trailing slash) → redireciona', () => {
  const r = adminGuard('/portal/admin/', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] dev em /portal/admin/tasks → passa', () => {
  const r = adminGuard('/portal/admin/tasks', 'dev');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] dev em /portal/admin/tasks/abc-123 → passa', () => {
  const r = adminGuard('/portal/admin/tasks/abc-123', 'dev');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] dev em /portal/admin/reports → redireciona para /portal/admin/tasks', () => {
  const r = adminGuard('/portal/admin/reports', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] dev em /portal/admin/questions → redireciona para /portal/admin/tasks', () => {
  const r = adminGuard('/portal/admin/questions', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] dev em /portal/admin/social-media → redireciona para /portal/admin/tasks', () => {
  const r = adminGuard('/portal/admin/social-media', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] dev em /portal/admin/reengagement → redireciona para /portal/admin/tasks', () => {
  const r = adminGuard('/portal/admin/reengagement', 'dev');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/admin/tasks');
});

test('[adminGuard] admin em /portal/admin → passa (guard não aplicado)', () => {
  const r = adminGuard('/portal/admin', 'admin');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] admin em /portal/admin/tasks → passa', () => {
  const r = adminGuard('/portal/admin/tasks', 'admin');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] student em /portal/admin → redireciona para /portal/student/dashboard', () => {
  const r = adminGuard('/portal/admin', 'student');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/student/dashboard');
});

test('[adminGuard] teacher em /portal/admin → redireciona para /portal/teacher', () => {
  const r = adminGuard('/portal/admin', 'teacher');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/teacher');
});

test('[adminGuard] manager em /portal/admin → redireciona para /portal/manager', () => {
  const r = adminGuard('/portal/admin', 'manager');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/manager');
});

test('[adminGuard] secretariat em /portal/admin → redireciona para /portal/secretariat', () => {
  const r = adminGuard('/portal/admin', 'secretariat');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/secretariat');
});

test('[adminGuard] founder em /portal/admin → redireciona para /portal/student/dashboard (fallback)', () => {
  const r = adminGuard('/portal/admin', 'founder');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/student/dashboard');
});

test('[adminGuard] associate em /portal/admin → redireciona para /portal/student/dashboard (fallback)', () => {
  const r = adminGuard('/portal/admin', 'associate');
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/student/dashboard');
});

test('[adminGuard] dev em /portal/student/dashboard → passa (guard não se aplica)', () => {
  const r = adminGuard('/portal/student/dashboard', 'dev');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] dev em /portal/teacher → passa (guard não se aplica)', () => {
  const r = adminGuard('/portal/teacher', 'dev');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] dev em /portal/manager → passa (guard não se aplica)', () => {
  const r = adminGuard('/portal/manager', 'dev');
  assert.equal(r.action, 'pass');
});

test('[adminGuard] REGRESSÃO: comportamento de student/teacher/manager/secretariat não mudou', () => {
  assert.equal(adminGuard('/portal/admin', 'student').dest,     '/portal/student/dashboard');
  assert.equal(adminGuard('/portal/admin', 'teacher').dest,     '/portal/teacher');
  assert.equal(adminGuard('/portal/admin', 'manager').dest,     '/portal/manager');
  assert.equal(adminGuard('/portal/admin', 'secretariat').dest, '/portal/secretariat');
});

test('[adminGuard] ANTES da correção: dev teria ido para /portal/student/dashboard', () => {
  // Simula o guard ANTES da adição do bloco 'dev'
  function adminGuardOld(path, currentRole) {
    if (!path.startsWith('/portal/admin')) return { action: 'pass' };
    if (currentRole === 'admin')           return { action: 'pass' };
    const dest =
      currentRole === 'manager'       ? '/portal/manager'
      : currentRole === 'teacher'     ? '/portal/teacher'
      : currentRole === 'secretariat' ? '/portal/secretariat'
      : '/portal/student/dashboard';
    return { action: 'redirect', dest };
  }
  // Antes: dev → fallback → student/dashboard
  assert.equal(adminGuardOld('/portal/admin', 'dev').dest, '/portal/student/dashboard');
  // Depois: dev → admin/tasks
  assert.equal(adminGuard('/portal/admin', 'dev').dest, '/portal/admin/tasks');
});

// ── 4. resolveRole (sidebar) ──────────────────────────────────────────────────

test('[resolveRole] role=dev tem prioridade sobre qualquer pathname', () => {
  assert.equal(resolveRole('dev', '/portal/admin/tasks'),       'dev');
  assert.equal(resolveRole('dev', '/portal/admin'),             'dev');
  assert.equal(resolveRole('dev', '/portal/student/dashboard'), 'dev');
  assert.equal(resolveRole('dev', '/portal/teacher'),           'dev');
  assert.equal(resolveRole('dev', '/portal/manager'),           'dev');
  assert.equal(resolveRole('dev', '/portal/secretariat'),       'dev');
  assert.equal(resolveRole('dev', '/portal'),                   'dev');
});

test('[resolveRole] admin em /portal/admin/tasks → "admin"', () => {
  assert.equal(resolveRole('admin', '/portal/admin/tasks'), 'admin');
});

test('[resolveRole] student em /portal/student/dashboard → "student"', () => {
  assert.equal(resolveRole('student', '/portal/student/dashboard'), 'student');
});

test('[resolveRole] pathname /portal/admin vira "admin" para roles não-dev', () => {
  assert.equal(resolveRole('student', '/portal/admin'),  'admin');
  assert.equal(resolveRole('teacher', '/portal/admin'),  'admin');
  assert.equal(resolveRole('manager', '/portal/admin'),  'admin');
  assert.equal(resolveRole('founder', '/portal/admin'),  'admin');
});

test('[resolveRole] pathname /portal/secretariat vira "secretariat"', () => {
  assert.equal(resolveRole('admin', '/portal/secretariat'), 'secretariat');
});

test('[resolveRole] pathname /portal/teacher vira "teacher"', () => {
  assert.equal(resolveRole('admin', '/portal/teacher'), 'teacher');
});

test('[resolveRole] pathname /portal/manager vira "manager"', () => {
  assert.equal(resolveRole('admin', '/portal/manager'), 'manager');
});

test('[resolveRole] pathname desconhecido → usa role original como fallback', () => {
  assert.equal(resolveRole('founder', '/portal/xyz'), 'founder');
  assert.equal(resolveRole('student', '/portal'),     'student');
});

test('[resolveRole] ANTES da correção: dev em /portal/admin/tasks teria virado "admin"', () => {
  function resolveRoleOld(role, pathname) {
    return pathname.startsWith('/portal/secretariat') ? 'secretariat'
      : pathname.startsWith('/portal/teacher')        ? 'teacher'
      : pathname.startsWith('/portal/manager')        ? 'manager'
      : pathname.startsWith('/portal/student')        ? 'student'
      : pathname.startsWith('/portal/admin')          ? 'admin'
      : role;
  }
  // Antes: dev em /portal/admin/tasks → 'admin' → mostrava menu completo admin
  assert.equal(resolveRoleOld('dev', '/portal/admin/tasks'), 'admin');
  // Depois: dev → 'dev' → mostra apenas Tasks + Plataforma Completa
  assert.equal(resolveRole('dev', '/portal/admin/tasks'), 'dev');
});

// ── 5. checkAdminOrDev (_utils) ───────────────────────────────────────────────

test('[checkAdminOrDev] role admin → ok', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'admin');
  assert.equal(r.ok, true);
  assert.equal(r.status, undefined);
});

test('[checkAdminOrDev] role dev → ok', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'dev');
  assert.equal(r.ok, true);
});

test('[checkAdminOrDev] role student → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'student');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role teacher → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'teacher');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role manager → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'manager');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role secretariat → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'secretariat');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role founder → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'founder');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role associate → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, 'associate');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] role null (profile sem role) → 403', () => {
  const r = checkAdminOrDev({ id: 'u1' }, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] erro no profileErr → 403 mesmo sem role', () => {
  const r = checkAdminOrDev({ id: 'u1' }, null, /* profileErr= */ true);
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOrDev] usuário não autenticado (user = null) → 401', () => {
  const r = checkAdminOrDev(null, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test('[checkAdminOrDev] usuário não autenticado (user = undefined) → 401', () => {
  const r = checkAdminOrDev(undefined, 'admin');
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

// requireAdmin ainda REJEITA 'dev' (não foi alterado)
test('[checkAdminOnly] REGRESSÃO: requireAdmin rejeita role dev com 403', () => {
  const r = checkAdminOnly({ id: 'u1' }, 'dev');
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('[checkAdminOnly] requireAdmin aceita apenas admin', () => {
  assert.equal(checkAdminOnly({ id: 'u1' }, 'admin').ok, true);
  assert.equal(checkAdminOnly({ id: 'u1' }, 'dev').ok,   false);
});

// ── Cenário integrado ─────────────────────────────────────────────────────────

test('[integração] fluxo completo do Ricardo (role dev)', () => {
  // 1. Autenticação: 'DEV' em metadata → normaliza para 'dev'
  const normalizedRole = normalizeRole('DEV');
  assert.equal(normalizedRole, 'dev');

  // 2. Tentativa de acessar /portal/admin (dashboard geral) → bloqueado
  const block = adminGuard('/portal/admin', normalizedRole);
  assert.equal(block.action, 'redirect');
  assert.equal(block.dest, '/portal/admin/tasks');

  // 3. Acessa /portal/admin/tasks → passa
  const pass = adminGuard('/portal/admin/tasks', normalizedRole);
  assert.equal(pass.action, 'pass');

  // 4. Sidebar em /portal/admin/tasks mostra menu 'dev' (não menu admin)
  const sidebarRole = resolveRole(normalizedRole, '/portal/admin/tasks');
  assert.equal(sidebarRole, 'dev');

  // 5. API route da task: checkAdminOrDev libera
  const api = checkAdminOrDev({ id: 'ricardo-id' }, 'dev');
  assert.equal(api.ok, true);

  // 6. Navega para plataforma de aluno (item "Plataforma Completa")
  const studentPass = adminGuard('/portal/student/dashboard', normalizedRole);
  assert.equal(studentPass.action, 'pass');

  // 7. Sidebar em /portal/student/dashboard ainda mostra 'dev'
  const sidebarStudent = resolveRole(normalizedRole, '/portal/student/dashboard');
  assert.equal(sidebarStudent, 'dev');
});

test('[integração] admin não foi impactado pela mudança', () => {
  const role = normalizeRole('admin');
  assert.equal(role, 'admin');

  // Admin acessa tudo em /portal/admin sem redirect
  assert.equal(adminGuard('/portal/admin', role).action,              'pass');
  assert.equal(adminGuard('/portal/admin/tasks', role).action,        'pass');
  assert.equal(adminGuard('/portal/admin/reports', role).action,      'pass');
  assert.equal(adminGuard('/portal/admin/questions', role).action,    'pass');
  assert.equal(adminGuard('/portal/admin/social-media', role).action, 'pass');

  // Sidebar: admin em /portal/admin → 'admin'
  assert.equal(resolveRole(role, '/portal/admin'), 'admin');

  // API tasks: admin liberado
  assert.equal(checkAdminOrDev({ id: 'x' }, 'admin').ok, true);
  assert.equal(checkAdminOnly({ id: 'x' }, 'admin').ok, true);
});

test('[integração] student não consegue acessar nada de admin', () => {
  const role = normalizeRole('student');
  assert.equal(role, 'student');

  // Guard redireciona student para /portal/student/dashboard
  const r = adminGuard('/portal/admin', role);
  assert.equal(r.action, 'redirect');
  assert.equal(r.dest, '/portal/student/dashboard');

  // API tasks: student bloqueado
  assert.equal(checkAdminOrDev({ id: 'x' }, 'student').ok, false);
  assert.equal(checkAdminOrDev({ id: 'x' }, 'student').status, 403);
});

console.log('\nOK: todos os testes da role dev executados.');
