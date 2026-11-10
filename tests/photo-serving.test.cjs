const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');
const { fileStore } = require('../server/writer-local.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-regression-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return {
    root,
    store: fileStore(root),
    ...(await import('../server/content-store.mjs')),
    ...(await import('../server/images.mjs')),
  };
}
const post = {
  id: 'photo-post',
  title: '사진 테스트',
  category: '일상',
  emoji: '📷',
  publishedAt: 1800000000000,
  updatedAt: 1800000000000,
  revision: 1,
  blocks: [
    { id: 'photo', type: 'image', src: '/api/write/images/photo', alt: '사진', text: '설명', width: 1280, height: 960 },
  ],
};
test('full-size photos remain intact; previews are small and Markdown retains reserved image space', async (t) => {
  const f = await fixture(t);
  const original = await sharp({ create: { width: 1280, height: 960, channels: 3, background: '#ac9' } })
    .webp()
    .toBuffer();
  const info = await f.prepareImage(f.store, 'photo', original, 'image/webp');
  assert.equal(info.width, 1280);
  assert.equal(info.height, 960);
  assert.deepEqual((await f.readImage(f.store, 'photo')).data, original);
  const thumb = await f.store.readBinary(info.thumbnailKey);
  const meta = await sharp(thumb.data).metadata();
  assert.equal(meta.width, 360);
  assert.equal(meta.height, 440);
  assert.ok(thumb.data.length < original.length);
  const { serializeMarkdown, parseMarkdown } = await import('../server/markdown.mjs');
  const parsed = await parseMarkdown(serializeMarkdown(post));
  assert.equal(parsed.blocks[0].width, 1280);
  assert.match(parsed.html, /width="1280"/);
  assert.match(parsed.html, /height="960"/);
  assert.match(parsed.html, /aspect-ratio:1280\/960/);
  assert.match(parsed.html, /loading="lazy"/);
});
test('legacy JPEGs gain dimensions and previews without rewriting the draft or Markdown snapshot', async (t) => {
  const f = await fixture(t);
  const original = await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#abc' } })
    .jpeg()
    .toBuffer();
  await f.saveImage(f.store, 'photo', original, 'image/jpeg');
  const old = { ...post, blocks: post.blocks.map(({ width, height, ...block }) => block) };
  await f.store.write('drafts/photo-post', old);
  await f.readIndex(f.store);
  const entry = await f.publishPost(f.store, old);
  const before = (await f.store.readText(entry.markdownKey)).etag;
  const restored = await f.readPost(f.store, entry);
  assert.match(restored.html, /aspect-ratio:900\/1200/);
  assert.equal((await f.store.readText(entry.markdownKey)).etag, before);
  assert.deepEqual((await f.store.read('drafts/photo-post')).data, old);
  assert.deepEqual((await f.readImage(f.store, 'photo')).data, original);
});
test('public photos use bounded browser cache and ETags; private photos and unpublished images do not leak', async (t) => {
  const f = await fixture(t);
  const original = await sharp({ create: { width: 1280, height: 960, channels: 3, background: '#ac9' } })
    .webp()
    .toBuffer();
  await f.prepareImage(f.store, 'photo', original, 'image/webp');
  await f.readIndex(f.store);
  await f.publishPost(f.store, post);
  const { createPublicPosts } = await import('../server/public-posts.mjs');
  const read = createPublicPosts({ store: f.store });
  const req = (url, headers = {}) => new Request('https://example.com' + url, { headers });
  const full = '/api/posts/photo-post/images/photo';
  const response = await read(req(full));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /max-age=300/);
  assert.equal(response.headers.get('netlify-cdn-cache-control'), 'no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), original);
  const preview = await read(req(full + '?size=preview'));
  assert.notEqual(response.headers.get('etag'), preview.headers.get('etag'));
  assert.equal((await sharp(Buffer.from(await preview.arrayBuffer())).metadata()).width, 360);
  const noBinary = createPublicPosts({
    store: {
      ...f.store,
      readBinary: () => {
        throw new Error('304 downloaded an image');
      },
    },
  });
  const unchanged = await noBinary(req(full, { 'If-None-Match': response.headers.get('etag') }));
  assert.equal(unchanged.status, 304);
  assert.equal((await unchanged.arrayBuffer()).byteLength, 0);
  const list = await read(req('/api/posts'));
  assert.equal(list.headers.get('cache-control'), 'no-store');
  assert.match((await list.json())[0].previewImages[0], /\?size=preview$/);
  await f.unpublishPost(f.store, post.id, 1);
  assert.equal((await read(req(full, { 'If-None-Match': response.headers.get('etag') }))).status, 404);
  assert.equal((await read(req(full + '?size=preview'))).status, 404);
});
