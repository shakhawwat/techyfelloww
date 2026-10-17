import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { scholarshipInput } = require('../dist/academy/academy-input.js');
const base = { code: 'VALIDATION-ONLY-CODE', label: 'Validation fixture', anyCourse: true, courses: [], kind: 'percentage', amount: 50, startsAt: '2026-01-01T00:00:00Z', totalLimit: 1, perAccountLimit: 1, active: true, revision: 0 };
test('scholarship percentage accepts whole 1–100 and rejects invalid values', () => {
  for (const amount of [1, 50, 99, 100]) assert.equal(scholarshipInput({ ...base, amount }).amount, amount);
  for (const amount of [0, -1, 101, 1.5, NaN, Infinity, '50', null, undefined]) assert.throws(() => scholarshipInput({ ...base, amount }));
  assert.equal(scholarshipInput({ ...base, kind: 'full', amount: 0 }).kind, 'full');
  assert.throws(() => scholarshipInput({ ...base, kind: 'full', amount: 100 }));
});
test('optional recipient restricts by normalized email and never stores plaintext code', () => {
  const unrestricted = scholarshipInput(base);
  assert.equal(unrestricted.recipientEmail, undefined);
  assert.equal(unrestricted.anyCourse, true);
  assert.deepEqual(unrestricted.courses, []);
  assert.equal(unrestricted.totalLimit, 1);
  assert.equal(unrestricted.perAccountLimit, 1);
  assert.equal(unrestricted.expiresAt, undefined);
  assert.equal(Object.hasOwn(unrestricted, 'code'), false);
  assert.notEqual(unrestricted.codeHash, base.code);
  assert.equal(scholarshipInput({ ...base, recipientEmail: 'Recipient@Example.TEST' }).recipientEmail, 'recipient@example.test');
  for (const recipientEmail of ['Name only', 'invalid', 'missing@domain', '']) assert.throws(() => scholarshipInput({ ...base, recipientEmail }));
  assert.throws(() => scholarshipInput({ ...base, anyCourse: true, courses: ['one-course'] }));
  assert.throws(() => scholarshipInput({ ...base, expiresAt: base.startsAt }));
  for (const totalLimit of [0, -1, 1.5]) assert.throws(() => scholarshipInput({ ...base, totalLimit }));
});
