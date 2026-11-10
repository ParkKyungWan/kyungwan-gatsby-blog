// Stop the development server before running this one-time local migration.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileStore } from '../server/writer-local.cjs';
import { readIndex, readPost, readImage, saveImage } from '../server/content-store.mjs';
const root = path.resolve(process.argv[2] || '.writer-data');
const backupRoot = path.resolve(process.argv[3] || '.writer-data-backups');
if (backupRoot === root || backupRoot.startsWith(root + path.sep))
  throw new Error('Backup must be outside the data directory');
await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
const backup = path.join(backupRoot, new Date().toISOString().replace(/[:.]/g, '-'));
await fs.cp(root, backup, { recursive: true, errorOnExist: true, force: false });
const store = fileStore(root);
const drafts = await Promise.all((await store.list('drafts/')).map(async (key) => [key, (await store.read(key)).etag]));
const index = await readIndex(store);
const removable = [];
for (const key of await store.list('images/')) {
  if (/\.(webp|jpg)$/.test(key)) continue;
  const legacy = await store.read(key);
  const id = key.split('/').pop();
  const bytes = Buffer.from(legacy.data.data.split(',')[1], 'base64');
  const type = legacy.data.data.startsWith('data:image/jpeg;') ? 'image/jpeg' : 'image/webp';
  await saveImage(store, id, bytes, type);
  assert.deepEqual((await readImage(store, id)).data, bytes);
  removable.push(key);
}
for (const key of await store.list('published/')) {
  if (key.endsWith('.md')) continue;
  const legacy = (await store.read(key)).data;
  if (!legacy.unpublished) {
    const entry = index.data.posts[legacy.id];
    if (!entry) throw new Error('Published article missing from index');
    const converted = await readPost(store, entry);
    // An already-updated Markdown article can differ from its retained legacy backup.
    if (entry.revision === legacy.revision && entry.updatedAt === legacy.updatedAt) {
      assert.deepEqual(
        converted.blocks.map((b) => [b.type, b.text]),
        legacy.blocks.map((b) => [b.type, b.text]),
      );
      assert.equal(entry.publishedAt, legacy.publishedAt);
    }
  }
  removable.push(key);
}
for (const [key, etag] of drafts) assert.equal((await store.read(key)).etag, etag, 'Draft changed during migration');
// Remove active Base64/JSON copies only after every check; full originals remain in backup.
for (const key of removable) await fs.unlink(path.join(root, key + '.json'));
console.log(
  JSON.stringify({
    backup,
    draftsPreserved: drafts.length,
    published: Object.keys(index.data.posts).length,
    legacyFilesMovedToBackup: removable.length,
  }),
);
