const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { fileStore } = require('../server/writer-local.cjs');
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'writer-storage-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return { root, store: fileStore(root), ...(await import('../server/content-store.mjs')) };
}
const post = {
  id: 'storage-test',
  title: '기존 양식: "그대로"',
  emoji: '☕',
  category: '일상',
  revision: 1,
  publishedAt: 1800000000000,
  updatedAt: 1800000000000,
  blocks: [
    { id: 'heading', type: 'h2', text: '제목 <안전> & 기호' },
    { id: 'body', type: 'paragraph', text: '    # 제목이 아닌 본문 **별표** [링크](주소) & <script> 1.\n\n다음 줄  ' },
    { id: 'quote', type: 'quote', text: '인용\n두 번째' },
    { id: 'bullet', type: 'bullet', text: '목록\n다음 줄' },
    { id: 'empty', type: 'paragraph', text: '' },
    { id: 'photo', type: 'image', src: '/api/write/images/photo', alt: '원본 사진', text: '사진 설명' },
    { id: 'rule', type: 'divider', text: '' },
  ],
};
test('Markdown round trip preserves text, headings, captions and existing frontmatter', async () => {
  const { serializeMarkdown, parseMarkdown } = await import('../server/markdown.mjs');
  const source = serializeMarkdown(post);
  assert.match(source, /draft: false/);
  assert.match(source, /categories:/);
  assert.ok(!source.includes('/api/write/'));
  const parsed = await parseMarkdown(source);
  assert.equal(parsed.data.title, post.title);
  assert.deepEqual(parsed.data.categories, ['일상']);
  assert.deepEqual(
    parsed.blocks.map((b) => [b.type, b.text]),
    post.blocks.map((b) => [b.type, b.text]),
  );
  assert.match(parsed.html, /id="section-heading"/);
  assert.match(parsed.html, /gatsby-resp-image-wrapper/);
  assert.ok(!parsed.html.includes('<script>'));
  assert.ok(!(await parseMarkdown('---\ntitle: safe\n---\n<script>alert(1)</script>')).html.includes('<script>'));
});
test('photos are binary files and public lists read the index without downloading article bodies', async (t) => {
  const f = await fixture(t);
  const bytes = Buffer.from('RIFFxxxxWEBPphoto');
  await f.saveImage(f.store, 'photo', bytes, 'image/webp');
  assert.deepEqual(await fs.readFile(path.join(f.root, 'images/photo.webp')), bytes);
  await assert.rejects(fs.access(path.join(f.root, 'images/photo.json')));
  await f.readIndex(f.store);
  const entry = await f.publishPost(f.store, post);
  assert.match(await fs.readFile(path.join(f.root, entry.markdownKey), 'utf8'), /기존 양식/);
  const { createPublicPosts } = await import('../server/public-posts.mjs');
  const forbidden = () => {
    throw new Error('List fetched a body');
  };
  const read = createPublicPosts({
    store: { ...f.store, list: forbidden, readText: forbidden, readBinary: forbidden },
  });
  const response = await read(new Request('https://example.com/api/posts'));
  assert.equal(response.status, 200);
  const list = await response.json();
  assert.equal(list[0].title, post.title);
  assert.ok(!('markdownKey' in list[0]));
});
test('failed or stale index writes leave the previous article intact; unrelated concurrent publications are retained', async (t) => {
  const f = await fixture(t);
  await f.readIndex(f.store);
  const original = await f.publishPost(f.store, post);
  const blocked = { ...f.store, write: async () => false };
  await assert.rejects(f.publishPost(blocked, { ...post, title: '실패할 수정', revision: 2 }, original));
  assert.equal((await f.readIndex(f.store)).data.posts[post.id].title, post.title);
  await Promise.all(['second', 'third'].map((id) => f.publishPost(f.store, { ...post, id })));
  assert.equal(Object.keys((await f.readIndex(f.store)).data.posts).length, 3);
  await f.publishPost(f.store, { ...post, title: '수정', revision: 2 }, original);
  await assert.rejects(f.publishPost(f.store, { ...post, title: '오래된 탭' }, original), { status: 409 });
});
test('legacy JSON data migrates without changing drafts, content, photo bytes or publication URLs', async (t) => {
  const f = await fixture(t);
  await f.store.write('drafts/storage-test', post);
  await f.store.write('published/storage-test', post);
  const bytes = Buffer.from('RIFFxxxxWEBPlegacy');
  await f.store.write('images/photo', { data: 'data:image/webp;base64,' + bytes.toString('base64') });
  const index = await f.readIndex(f.store);
  const entry = index.data.posts[post.id];
  assert.equal(entry.slug, '/p/storage-test/');
  assert.equal(entry.publishedAt, post.publishedAt);
  assert.deepEqual((await f.store.read('drafts/storage-test')).data, post);
  assert.deepEqual((await f.readImage(f.store, 'photo')).data, bytes);
  const restored = await f.readPost(f.store, entry);
  assert.deepEqual(
    restored.blocks.map((b) => b.text),
    post.blocks.map((b) => b.text),
  );
});
test('native binary uploads persist across server instances and reject mismatched MIME types', async (t) => {
  const f = await fixture(t);
  const { createWriter } = await import('../server/writer.mjs');
  const env = {
    WRITE_PASSWORD: 'binary-upload-test-password',
    WRITE_SESSION_SECRET: 'binary-upload-test-secret-at-least-32-characters',
  };
  const write = createWriter({ store: f.store, local: true, env });
  const login = await write(
    new Request('http://127.0.0.1/api/write/session', {
      method: 'POST',
      headers: { 'Origin': 'http://127.0.0.1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: env.WRITE_PASSWORD }),
    }),
  );
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const bytes = await require('sharp')({ create: { width: 640, height: 480, channels: 3, background: '#abcdef' } })
    .webp()
    .toBuffer();
  const upload = (type, body) =>
    write(
      new Request('http://127.0.0.1/api/write/images', {
        method: 'POST',
        headers: { 'Origin': 'http://127.0.0.1', 'Content-Type': type, 'Cookie': cookie },
        body,
      }),
    );
  assert.equal((await upload('image/jpeg', bytes)).status, 400);
  const response = await upload('image/webp', bytes);
  assert.equal(response.status, 201);
  const { src } = await response.json();
  const restarted = createWriter({ store: fileStore(f.root), local: true, env });
  const image = await restarted(new Request('http://127.0.0.1' + src, { headers: { Cookie: cookie } }));
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
  assert.equal((await fs.readdir(path.join(f.root, 'images'))).length, 2);
  assert.ok((await fs.readdir(path.join(f.root, 'images')))[0].endsWith('.webp'));
});
