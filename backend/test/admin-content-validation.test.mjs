import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseContentInput, parseAction, toAdminDto } = require('../dist/admin-content/content-input.js');
const { parseAdminQuery } = require('../dist/admin-content/admin-query.js');
const { contentDefinitions } = require('../dist/content/content.schemas.js');
const { adminContentControllers } = require('../dist/admin-content/admin-content.controllers.js');
const { ACCESS_POLICY, VALIDATED_QUERY } = require('../dist/auth/permissions.js');
const mongoose = require('mongoose');
const bad = fn => assert.throws(fn, e => e.getStatus() === 400);

test('strict bodies reject protected properties, operator objects, coercion and nested unknowns', () => {
  for (const property of ['_id', '__v', 'revision', 'status', 'publishedAt', 'createdAt', 'updatedAt', 'actor', '$set', '__proto__']) {
    bad(() => parseContentInput('projects', { slug: 'synthetic-unit', title: 'Synthetic test', [property]: 1 }, false));
  }
  for (const input of [{ revision: '1', title: 'Synthetic' }, { revision: 0, title: 'Synthetic' }, { revision: 1 }, { revision: 1, title: 2 }, { revision: 1, slug: { $ne: null } }, { revision: 1, slug: null }, { revision: 1, seo: { internal: 'synthetic' } }, { revision: 1, media: [{ reference: 'synthetic', type: 'image', altText: 'Synthetic', internal: true }] }]) bad(() => parseContentInput('projects', input, true));
  bad(() => parseContentInput('team', { slug: 'synthetic', name: 'Synthetic', profileLinks: [{ label: 'Synthetic', url: 'javascript:alert(1)', approved: true }] }, false));
  bad(() => parseContentInput('courses', { slug: 'synthetic', title: 'Synthetic', duration: { value: '2', unit: 'hours' } }, false));
  bad(() => parseAction({ revision: 1, publishedAt: '2026-02-31T00:00:00Z' }, true));
  bad(() => parseAction({ revision: 1, status: 'published' }, true));
  bad(() => parseAction({ revision: 1, publishedAt: '2026-10-06T00:00:00Z' }, false));
  assert.equal(parseAction({ revision: 1, publishedAt: '2026-10-06T00:00:00Z' }, true).publishedAt.toISOString(), '2026-10-06T00:00:00.000Z');
  assert.deepEqual(parseContentInput('projects', { revision: 2, seo: null }, true).changes, { seo: null });
});

test('admin queries allow all statuses with bounded pagination and literal allowlisted filters', () => {
  const parsed = parseAdminQuery('projects', { status: 'draft', category: '{"$ne":null}', page: '2', limit: '1', sort: '-revision' });
  assert.deepEqual(parsed.filter, { category: { $eq: '{"$ne":null}' }, status: { $eq: 'draft' } });
  assert.deepEqual(parsed.sort, { revision: -1, slug: 1 });
  assert.equal(parsed.skip, 1);
  assert.deepEqual(parseAdminQuery('research', {}).filter, {});
  for (const input of [{ limit: '101' }, { page: '0' }, { status: ['draft', 'published'] }, { status: { $ne: null } }, { status: 'unknown' }, { unknown: 'x' }, { sort: '$where' }, { sort: 'title,slug' }, { slug: 'bad slug' }]) bad(() => parseAdminQuery('projects', input));
});

test('incomplete drafts validate, publication requirements validate whole candidates', async () => {
  for (const [kind, definition] of Object.entries(contentDefinitions)) {
    const model = mongoose.model(`SyntheticUnit${kind}`, definition.schema);
    const doc = new model({ slug: 'synthetic-unit', [kind === 'team' ? 'name' : 'title']: 'Synthetic test only' });
    await doc.validate();
    doc.status = 'published'; doc.publishedAt = new Date();
    await assert.rejects(doc.validate(), e => e.name === 'ValidationError');
  }
});

test('every admin route carries a finite explicit permission; only list handlers allow validated queries', () => {
  for (const [index, controller] of adminContentControllers.entries()) {
    const kind = ['projects', 'research', 'publications', 'team', 'courses', 'pages', 'products'][index];
    for (const [handler, action] of [['list', 'read'], ['detail', 'read'], ['create', 'edit'], ['edit', 'edit'], ['publish', 'publish'], ['unpublish', 'publish'], ['archive', 'edit']]) {
      assert.deepEqual(Reflect.getMetadata(ACCESS_POLICY, controller.prototype[handler]), { mode: 'permissions', permissions: [`${kind}:${action}`] });
      assert.equal(Reflect.getMetadata(VALIDATED_QUERY, controller.prototype[handler]), handler === 'list' ? true : undefined);
    }
  }
  const dto = toAdminDto('team', { _id: 'synthetic', __v: 0, status: 'draft', revision: 1, passwordHash: 'synthetic-private', name: 'Synthetic', profileLinks: [{ label: 'Synthetic', url: 'https://example.invalid', approved: false, token: 'synthetic-private' }] });
  assert.ok(!JSON.stringify(dto).includes('synthetic-private'));
  assert.deepEqual(dto.profileLinks, [{ label: 'Synthetic', url: 'https://example.invalid', approved: false }]);
});
