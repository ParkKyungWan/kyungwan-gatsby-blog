const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { fileStore } = require('../server/writer-local.cjs');
test('approved reset removes all retired store keys once and never deletes new drafts', async (t) => {
  const { resetLegacyStore } = await import('../server/netlify-store.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'writer-reset-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = fileStore(root);
  await store.write('drafts/new-draft', { title: 'keep new content' });
  const deleted = [];
  const old = {
    async *list() {
      yield { blobs: [{ key: 'drafts/old' }, { key: 'images/old.webp' }] };
      yield { blobs: [{ key: 'published/old.md' }] };
    },
    async delete(key) {
      deleted.push(key);
    },
  };
  await resetLegacyStore(store, old);
  assert.deepEqual(deleted.sort(), ['drafts/old', 'images/old.webp', 'published/old.md']);
  assert.equal((await store.read('drafts/new-draft')).data.title, 'keep new content');
  await resetLegacyStore(store, {
    list() {
      throw new Error('Reset must not run twice');
    },
  });
});
test('an interrupted reset never records completion and can be retried', async (t) => {
  const { resetLegacyStore } = await import('../server/netlify-store.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'writer-reset-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = fileStore(root);
  const old = {
    async *list() {
      yield { blobs: [{ key: 'published/old.md' }] };
    },
    async delete() {
      throw new Error('Network failed');
    },
  };
  await assert.rejects(resetLegacyStore(store, old), /Network failed/);
  assert.equal(await store.read('maintenance/legacy-reset'), null);
  old.delete = async () => {};
  await resetLegacyStore(store, old);
  assert.equal((await store.read('maintenance/legacy-reset')).data.completed, true);
});
