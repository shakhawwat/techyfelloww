import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { hasPermission, grantedPermissions } = require('../dist/auth/permissions.js');
const { AccessGuard } = require('../dist/auth/access.guard.js');
const { cookieName, cookieOptions, readSessionToken } = require('../dist/auth/auth-http.js');
const { validateEnvironment } = require('../dist/config/environment.js');

test('finite permission matrix separates read/edit/publish and denies unknown permissions/roles', () => {
  for (const [role, resources] of [['CONTENT_EDITOR', ['projects', 'team']], ['RESEARCH_EDITOR', ['research', 'publications']], ['ACADEMY_MANAGER', ['courses']]]) {
    for (const resource of ['projects', 'research', 'publications', 'team', 'courses']) {
      assert.equal(hasPermission(role, `${resource}:read`), resources.includes(resource));
      assert.equal(hasPermission(role, `${resource}:edit`), resources.includes(resource));
      assert.equal(hasPermission(role, `${resource}:publish`), false);
      assert.equal(hasPermission('VIEWER', `${resource}:read`), true);
      assert.equal(hasPermission('VIEWER', `${resource}:edit`), false);
      assert.equal(hasPermission('VIEWER', `${resource}:publish`), false);
      assert.equal(hasPermission('SUPER_ADMIN', `${resource}:publish`), true);
    }
  }
  assert.equal(hasPermission('VIEWER', 'admin:access'), false);
  assert.equal(hasPermission('CONTENT_EDITOR', 'users:admin'), false);
  assert.equal(hasPermission('SUPER_ADMIN', 'users:admin'), true);
  assert.equal(hasPermission('SUPER_ADMIN', 'unknown:permission'), false);
  assert.deepEqual(grantedPermissions('__proto__'), []);
});

test('global guard denies missing policy, empty grants and forged roles; explicit reads allow viewer', async () => {
  let policy;
  let role = 'SUPER_ADMIN';
  const guard = new AccessGuard({check:async()=>{}}, { getAllAndOverride: () => policy, get: () => undefined }, { get: () => 'test', getOrThrow: () => [] }, {
    authenticate: async () => ({ user: { id: 'synthetic', role }, sessionId: 'synthetic' }),
  });
  const req = { method: 'GET', headers: {}, query: {}, get: () => undefined };
  const ctx = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader() {} }) }) };
  await assert.rejects(guard.canActivate(ctx), e => e.getStatus() === 403);
  policy = { mode: 'permissions', permissions: [] };
  await assert.rejects(guard.canActivate(ctx), e => e.getStatus() === 403);
  policy = { mode: 'permissions', permissions: ['projects:publish'] };
  role = 'CONTENT_EDITOR';
  await assert.rejects(guard.canActivate(ctx), e => e.getStatus() === 403);
  role = 'VIEWER'; policy.permissions = ['projects:read'];
  assert.equal(await guard.canActivate(ctx), true);
  role = 'INVALID';
  await assert.rejects(guard.canActivate(ctx), e => e.getStatus() === 403);
});

test('cookie settings and strict origin/proxy/lifetime validation', () => {
  assert.equal(cookieName(true), '__Host-techyfellow_session');
  assert.equal(cookieName(true,true),'__Host-techyfellow_member_session');
  const admin='b'.repeat(43),member='c'.repeat(43),both=`techyfellow_session=${admin}; techyfellow_member_session=${member}`;
  assert.equal(readSessionToken({path:'/api/v1/account/me',headers:{cookie:both}},false),member);
  assert.equal(readSessionToken({path:'/api/v1/account/store/state',headers:{cookie:both}},false),member);
  assert.equal(readSessionToken({path:'/api/v1/account/store/state',headers:{cookie:`techyfellow_session=${admin}`}},false),undefined);
  assert.equal(readSessionToken({path:'/api/v1/admin/store/orders',headers:{cookie:both}},false),admin);
  assert.equal(readSessionToken({path:'/api/v1/admin/blog',headers:{cookie:both}},false),admin);
  assert.equal(readSessionToken({path:'/api/v1/academy/admin/orders/id/memo',headers:{cookie:both}},false),admin);
  assert.equal(readSessionToken({path:'/api/v1/academy/cart',headers:{cookie:both}},false),member);
  assert.equal(readSessionToken({path:'/api/v1/account/login',headers:{cookie:`techyfellow_session=${admin}`}},false),undefined);
  assert.equal(readSessionToken({path:'/api/v1/admin/blog',headers:{cookie:`techyfellow_member_session=${member}`}},false),undefined);
  assert.deepEqual(cookieOptions(true), { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  assert.equal(cookieOptions(false).secure, false);
  const token = 'a'.repeat(43);
  assert.equal(readSessionToken({ headers: { cookie: `techyfellow_session=${token}` } }, false), token);
  assert.equal(readSessionToken({ headers: { cookie: `techyfellow_session=${token}; techyfellow_session=${token}` } }, false), undefined);
  const base = { MONGODB_URI: 'mongodb://mongodb:27017/synthetic' };
  const config = validateEnvironment(base);
  assert.deepEqual(config.AUTH_TRUSTED_PROXY_IPS, []);
  assert.equal(config.AUTH_SESSION_TTL_SECONDS, 28800);
  for (const extra of [
    { NODE_ENV: 'production' }, { NODE_ENV: 'production', AUTH_ALLOWED_ORIGINS: 'http://localhost:8080' },
    { AUTH_ALLOWED_ORIGINS: '*' }, { AUTH_ALLOWED_ORIGINS: 'https://example.invalid/path' },
    { AUTH_ALLOWED_ORIGINS: 'https://user:SECRET@example.invalid' }, { AUTH_ALLOWED_ORIGINS: 'null' },
    { AUTH_TRUSTED_PROXY_IPS: 'true' }, { AUTH_TRUSTED_PROXY_IPS: '0.0.0.0/0' },
    { AUTH_SESSION_TTL_SECONDS: 0 }, { AUTH_SESSION_TTL_SECONDS: 86401 },
  ]) assert.throws(() => validateEnvironment({ ...base, ...extra }), e => !e.message.includes('SECRET'));
  assert.deepEqual(validateEnvironment({ ...base, AUTH_ALLOWED_ORIGINS: 'https://example.invalid', NODE_ENV: 'production', AUTH_TRUSTED_PROXY_IPS: '127.0.0.1' }).AUTH_TRUSTED_PROXY_IPS, ['127.0.0.1']);
});


test('public grants are scoped to existing read handlers, not entire controllers', () => {
  const { ACCESS_POLICY } = require('../dist/auth/permissions.js');
  const { HealthController } = require('../dist/health.controller.js');
  const controllers = require('../dist/content/content.controllers.js');
  for (const controller of [HealthController, ...Object.values(controllers)]) {
    assert.equal(Reflect.getMetadata(ACCESS_POLICY, controller), undefined);
    const handlers = controller === HealthController ? ['live', 'ready'] : ['list', 'detail'];
    for (const handler of handlers) assert.equal(Reflect.getMetadata(ACCESS_POLICY, controller.prototype[handler]).mode, 'public');
  }
});
