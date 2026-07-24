#!/usr/bin/env node
/**
 * Pure logic checks for the current role domain:
 * student, admin, founder, associate, dev.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const ROLE_PERMISSIONS = {
  student: ['view_dashboard', 'view_assignments', 'take_exam'],
  admin: ['all'],
  founder: ['view_org_dashboard', 'manage_students', 'manage_org_settings'],
  associate: ['correct_essays'],
  dev: ['view_tasks', 'update_tasks', 'use_platform'],
};

const ALLOWED_ROLES = ['student', 'admin', 'founder', 'associate', 'dev'];

function normalizeRole(role) {
  if (!role) return null;
  const s = String(role).trim().toLowerCase();
  return ALLOWED_ROLES.includes(s) ? s : null;
}

function adminGuard(path, currentRole) {
  if (!path.startsWith('/portal/admin')) return { action: 'pass' };
  if (currentRole === 'admin') return { action: 'pass' };

  const isTaskDashboardPath = path === '/portal/admin/tasks/dashboard' || path.startsWith('/portal/admin/tasks/dashboard/');
  const isTaskWorkspacePath = !isTaskDashboardPath && (path === '/portal/admin/tasks' || path.startsWith('/portal/admin/tasks/'));
  const isGithubMonitoringPath = path === '/portal/admin/github' || path.startsWith('/portal/admin/github/');

  if (currentRole === 'dev') {
    if (!isTaskWorkspacePath && !isGithubMonitoringPath) {
      return { action: 'redirect', dest: '/portal/admin/tasks' };
    }
    return { action: 'pass' };
  }

  return { action: 'redirect', dest: '/' };
}

function resolveRole(role, pathname) {
  return role === 'dev'
    ? 'dev'
    : pathname.startsWith('/portal/admin')
      ? 'admin'
      : pathname.startsWith('/portal/dev')
        ? 'dev'
        : role;
}

function checkAdminOrDev(user, profileRole, profileErr = false) {
  if (!user) return { ok: false, status: 401 };
  if (profileErr || (profileRole !== 'admin' && profileRole !== 'dev')) {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

function checkAdminOnly(user, profileRole, profileErr = false) {
  if (!user) return { ok: false, status: 401 };
  if (profileErr || profileRole !== 'admin') {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}

test('[roles] only live roles exist', () => {
  assert.deepEqual(Object.keys(ROLE_PERMISSIONS), ALLOWED_ROLES);
});

test('[roles] dev permissions match source', () => {
  assert.deepEqual(ROLE_PERMISSIONS.dev, ['view_tasks', 'update_tasks', 'use_platform']);
  assert.ok(!ROLE_PERMISSIONS.dev.includes('all'));
});

test('[normalizeRole] live roles pass', () => {
  for (const role of ALLOWED_ROLES) {
    assert.equal(normalizeRole(role.toUpperCase()), role);
  }
});

test('[normalizeRole] legacy roles are rejected', () => {
  assert.equal(normalizeRole('teacher'), null);
  assert.equal(normalizeRole('manager'), null);
  assert.equal(normalizeRole('secretariat'), null);
});

test('[adminGuard] dev can access task workspace and GitHub monitoring only', () => {
  assert.equal(adminGuard('/portal/admin/tasks', 'dev').action, 'pass');
  assert.equal(adminGuard('/portal/admin/tasks/abc-123', 'dev').action, 'pass');
  assert.equal(adminGuard('/portal/admin/github', 'dev').action, 'pass');
  assert.equal(adminGuard('/portal/admin/tasks/dashboard', 'dev').dest, '/portal/admin/tasks');
  assert.equal(adminGuard('/portal/admin', 'dev').dest, '/portal/admin/tasks');
  assert.equal(adminGuard('/portal/admin/questions', 'dev').dest, '/portal/admin/tasks');
});

test('[adminGuard] non-admin live roles are redirected away from admin', () => {
  assert.equal(adminGuard('/portal/admin', 'student').dest, '/');
  assert.equal(adminGuard('/portal/admin', 'founder').dest, '/');
  assert.equal(adminGuard('/portal/admin', 'associate').dest, '/');
});

test('[resolveRole] dev has priority, admin path resolves as admin for non-dev', () => {
  assert.equal(resolveRole('dev', '/portal/admin/tasks'), 'dev');
  assert.equal(resolveRole('student', '/portal/admin'), 'admin');
  assert.equal(resolveRole('founder', '/portal'), 'founder');
});

test('[checkAdminOrDev] admin/dev pass; other live roles fail', () => {
  assert.equal(checkAdminOrDev({ id: 'u1' }, 'admin').ok, true);
  assert.equal(checkAdminOrDev({ id: 'u1' }, 'dev').ok, true);
  assert.equal(checkAdminOrDev({ id: 'u1' }, 'student').status, 403);
  assert.equal(checkAdminOrDev({ id: 'u1' }, 'founder').status, 403);
  assert.equal(checkAdminOrDev({ id: 'u1' }, 'associate').status, 403);
  assert.equal(checkAdminOrDev(null, null).status, 401);
});

test('[checkAdminOnly] only admin passes', () => {
  assert.equal(checkAdminOnly({ id: 'u1' }, 'admin').ok, true);
  assert.equal(checkAdminOnly({ id: 'u1' }, 'dev').status, 403);
});

console.log('\nOK: current role-domain tests passed.');
