const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { fileStore } = require('../server/writer-local.cjs');
async function fixture(t) {
  const { createWriter } = await import('../server/writer.mjs');
  const { createPublicPosts } = await import('../server/public-posts.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'writer-publish-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = fileStore(root);
  let time = 1800000000000;
  const writer = createWriter({
    store,
    env: {
      WRITE_PASSWORD: 'publication-test-password',
      WRITE_SESSION_SECRET: 'publication-test-secret-at-least-32-chars',
    },
    now: () => time++,
  });
  const read = createPublicPosts({ store });
  const request = (route, method = 'GET', body, cookie = '') =>
    new Request(`https://blog.example${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Origin': 'https://blog.example', 'Cookie': cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const login = await writer(request('/api/write/session', 'POST', { password: 'publication-test-password' }));
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const write = (route, body, method = 'POST') => writer(request('/api/write/' + route, method, body, cookie));
  const image =
    'data:image/webp;base64,' +
    (
      await require('sharp')({ create: { width: 640, height: 480, channels: 3, background: '#abcdef' } })
        .webp()
        .toBuffer()
    ).toString('base64');
  const visibleImage = await (await write('images', { data: image })).json();
  const privateImage = await (await write('images', { data: image })).json();
  const draft = {
    id: 'public-test',
    title: '<script>alert("x")</script>',
    category: '커피',
    emoji: '☕',
    blocks: [
      { id: 'heading', type: 'h2', text: '목차 제목' },
      { id: 'body', type: 'paragraph', text: '처음 공개한 본문' },
      { id: 'photo', type: 'image', src: visibleImage.src, text: '사진 설명', alt: '사진' },
    ],
  };
  const saved = await (await write('drafts/public-test', draft, 'PUT')).json();
  return { writer, read, write, request, draft: saved, visibleImage, privateImage };
}
test('publishing exposes a snapshot and only its photos; drafts stay private', async (t) => {
  const f = await fixture(t);
  assert.deepEqual(await (await f.read(f.request('/api/posts'))).json(), []);
  assert.equal((await f.read(f.request('/p/public-test/'))).status, 404);
  assert.equal(
    (await f.writer(f.request('/api/write/drafts/public-test/publish', 'POST', { revision: 1 }))).status,
    401,
  );
  assert.equal((await f.write('drafts/public-test/publish', { revision: 0 })).status, 409);
  const publication = await (await f.write('drafts/public-test/publish', { revision: 1 })).json();
  assert.equal(publication.slug, '/p/public-test/');
  const list = await (await f.read(f.request('/api/posts'))).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].emoji, '☕');
  const publicPost = await (await f.read(f.request('/api/posts/public-test'))).json();
  assert.ok(publicPost.blocks[2].src.startsWith('/api/posts/public-test/images/'));
  assert.equal((await f.read(f.request(publicPost.blocks[2].src))).status, 200);
  assert.equal(
    (await f.read(f.request('/api/posts/public-test/images/' + f.privateImage.src.split('/').pop()))).status,
    404,
  );
  const html = await (await f.read(f.request('/p/public-test/'))).text();
  assert.ok(html.includes('처음 공개한 본문'));
  assert.ok(html.includes('href="#section-heading"'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert("x")</script>'));
  assert.ok(!html.includes('/api/write/images/'));
  assert.ok(html.includes('rel="canonical"'));
});
test('autosaving edits does not change a published post until update, and unpublishing removes public access', async (t) => {
  const f = await fixture(t);
  const original = await (await f.write('drafts/public-test/publish', { revision: 1 })).json();
  const modified = {
    ...f.draft,
    title: '수정한 제목',
    blocks: [{ id: 'new-body', type: 'paragraph', text: '아직 비공개인 수정' }],
  };
  assert.equal((await f.write('drafts/public-test', modified, 'PUT')).status, 200);
  assert.equal((await (await f.read(f.request('/api/posts/public-test'))).json()).title, f.draft.title);
  const updated = await (await f.write('drafts/public-test/publish', { revision: 2 })).json();
  assert.equal(updated.publishedAt, original.publishedAt);
  assert.equal((await (await f.read(f.request('/api/posts/public-test'))).json()).title, '수정한 제목');
  assert.equal((await f.write('drafts/public-test/unpublish', { revision: 1 })).status, 409);
  assert.equal((await f.write('drafts/public-test/unpublish', { revision: 2 })).status, 200);
  assert.deepEqual(await (await f.read(f.request('/api/posts'))).json(), []);
  assert.equal((await f.read(f.request('/p/public-test/'))).status, 404);
  assert.equal(
    (await f.read(f.request('/api/posts/public-test/images/' + f.visibleImage.src.split('/').pop()))).status,
    404,
  );
  const restored = await f.write('drafts/public-test', undefined, 'GET');
  const privateDraft = await restored.json();
  assert.equal(privateDraft.title, '수정한 제목');
  assert.equal(privateDraft.publication, null);
});
test('direct requests and rewritten Netlify function paths serve the same public article', async (t) => {
  const f = await fixture(t);
  await f.write('drafts/public-test/publish', { revision: 1 });
  for (const route of ['/p/public-test/', '/.netlify/functions/posts/page/public-test/']) {
    const response = await f.read(f.request(route));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /처음公开|처음 공개한 본문/);
  }
  assert.equal((await f.read(f.request('/.netlify/functions/posts/public-test'))).status, 200);
  assert.equal((await (await f.read(f.request('/.netlify/functions/posts'))).json()).length, 1);
  assert.equal((await f.read(f.request('/api/posts', 'POST', {}))).status, 405);
});

test('all old and new articles share chronological previous/next navigation, including unpublishing', async (t) => {
  const f = await fixture(t);
  await f.write('drafts/public-test/publish', { revision: 1 });
  const get = async (slug) =>
    (await f.read(f.request('/api/posts/navigation?slug=' + encodeURIComponent(slug)))).json();
  const current = await get('/p/public-test/');
  assert.equal(current.prev.fields.slug, '/2/');
  assert.equal(current.next, null);
  const older = await get('/2/');
  assert.equal(older.prev.fields.slug, '/1/');
  assert.equal(older.next.fields.slug, '/p/public-test/');
  const oldest = await get('/1/');
  assert.equal(oldest.prev, null);
  assert.equal(oldest.next.fields.slug, '/2/');
  const html = await (await f.read(f.request('/p/public-test/'))).text();
  assert.match(html, /class="prev[^>]*href="\/2\/"|href="\/2\/"[^>]*class="prev/);
  assert.equal((await f.read(f.request('/api/posts/navigation?slug=/missing/'))).status, 404);
  await f.write('drafts/public-test/unpublish', { revision: 1 });
  assert.equal((await get('/2/')).next, null);
});
