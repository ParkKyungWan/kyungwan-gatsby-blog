const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
let createWriter;
const { fileStore } = require('../server/writer-local.cjs');
const env = {
  WRITE_PASSWORD: 'long-test-password-only',
  WRITE_SESSION_SECRET: 'a-test-secret-with-at-least-32-characters',
};
const origin = 'https://writer.example';
function request(route, method = 'GET', body, cookie = '', from = origin) {
  return new Request(`${origin}/api/write/${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Origin': from, 'Cookie': cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const draft = {
  id: 'test-draft',
  title: '제목',
  category: '일상',
  blocks: [{ id: 'block-1', type: 'h2', text: '첫 번째 이야기' }],
  revision: 0,
};
async function fixture(t) {
  ({ createWriter } = await import('../server/writer.mjs'));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'writer-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = fileStore(root);
  const handle = createWriter({ store, env });
  const login = await handle(request('session', 'POST', { password: env.WRITE_PASSWORD }));
  const cookie = login.headers.get('set-cookie').split(';')[0];
  return { root, handle, cookie };
}
test('draft API requires authentication, same-origin writes, and production configuration', async (t) => {
  const { handle, cookie, root } = await fixture(t);
  assert.equal((await handle(request('drafts'))).status, 401);
  assert.equal((await handle(request('drafts', 'GET', undefined, cookie, 'https://other.example'))).status, 403);
  assert.equal((await handle(request('session', 'POST', { password: 'wrong' }))).status, 401);
  assert.equal((await handle(request('drafts/test-draft', 'PUT', draft, cookie, 'https://other.example'))).status, 403);
  assert.equal((await handle(request('drafts/test-draft', 'PUT', draft, cookie))).status, 200);
  const unconfigured = createWriter({ store: fileStore(root), env: {} });
  assert.equal((await unconfigured(request('drafts'))).status, 503);
  const local = createWriter({ store: fileStore(root), env: {}, local: true });
  assert.equal((await local(request('drafts'))).status, 403);
  assert.equal((await local(new Request('http://localhost:8000/api/write/session'))).status, 200);
});
test('draft and photo survive a fresh server instance; stale revisions cannot overwrite a draft', async (t) => {
  const { handle, cookie, root } = await fixture(t);
  const result = await handle(request('drafts/test-draft', 'PUT', draft, cookie));
  assert.equal((await result.json()).revision, 1);
  const restarted = createWriter({ store: fileStore(root), env });
  const restored = await (await restarted(request('drafts/test-draft', 'GET', undefined, cookie))).json();
  assert.equal(restored.blocks[0].text, '첫 번째 이야기');
  assert.equal(
    (await restarted(request('drafts/test-draft', 'PUT', { ...draft, title: 'stale' }, cookie))).status,
    409,
  );
  const updates = await Promise.all(
    ['one', 'two'].map((title) => restarted(request('drafts/test-draft', 'PUT', { ...restored, title }, cookie))),
  );
  assert.deepEqual(updates.map((r) => r.status).sort(), [200, 409]);
  const photoBytes = await require('sharp')({ create: { width: 640, height: 480, channels: 3, background: '#abcdef' } })
    .webp()
    .toBuffer();
  const data = 'data:image/webp;base64,' + photoBytes.toString('base64');
  const uploaded = await handle(request('images', 'POST', { data }, cookie));
  assert.equal(uploaded.status, 201);
  const { src } = await uploaded.json();
  const imageRoute = src.replace('/api/write/', '');
  assert.equal((await restarted(request(imageRoute))).status, 401);
  const image = await restarted(request(imageRoute, 'GET', undefined, cookie));
  assert.equal(image.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), photoBytes);
});
test('invalid blocks, image URLs, and malformed bodies never become stored drafts', async (t) => {
  const { handle, cookie } = await fixture(t);
  for (const blocks of [
    [{ type: 'paragraph', text: 'missing id' }],
    [{ id: 'x', type: 'image', text: '', src: 'javascript:alert(1)' }],
    [{ id: 'x', type: 'unknown', text: '' }],
    [
      { id: 'x', type: 'paragraph', text: '' },
      { id: 'x', type: 'paragraph', text: '' },
    ],
  ]) {
    assert.equal((await handle(request('drafts/test-draft', 'PUT', { ...draft, blocks }, cookie))).status, 400);
  }
  assert.equal((await handle(request('images', 'POST', { data: 'data:image/webp;base64,YWJj' }, cookie))).status, 400);
  assert.deepEqual(await (await handle(request('drafts', 'GET', undefined, cookie))).json(), []);
});
test('session cookie is HttpOnly, signed, secure, and expires', async (t) => {
  const { root } = await fixture(t);
  let time = Date.now();
  const handle = createWriter({ store: fileStore(root), env, now: () => time });
  const login = await handle(request('session', 'POST', { password: env.WRITE_PASSWORD }));
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal((await handle(request('drafts', 'GET', undefined, cookie.split(';')[0]))).status, 200);
  time += 8 * 3600000 + 1;
  assert.equal((await handle(request('drafts', 'GET', undefined, cookie.split(';')[0]))).status, 401);
});

test('loopback and allowlisted tailnet hosts require a session; public readers are unaffected', async (t) => {
  const { root } = await fixture(t);
  const local = createWriter({ store: fileStore(root), env, local: true, localHosts: ['100.74.206.81'] });
  for (const host of ['127.0.0.1:8000', 'localhost:8000', '100.74.206.81:8000']) {
    const origin = `http://${host}`;
    const req = (route, method = 'GET', body, cookie = '') =>
      new Request(origin + '/api/write/' + route, {
        method,
        headers: { 'Content-Type': 'application/json', 'Origin': origin, 'Cookie': cookie },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    assert.equal((await (await local(req('session'))).json()).signedIn, false);
    for (const [route, method, body] of [
      ['drafts', 'GET'],
      ['drafts/test-draft', 'GET'],
      ['images/private-photo', 'GET'],
      ['drafts/test-draft/publish', 'POST', { revision: 1 }],
      ['drafts/test-draft', 'PUT', draft],
      ['images', 'POST', {}],
    ]) {
      assert.equal((await local(req(route, method, body))).status, 401);
    }
    const login = await local(req('session', 'POST', { password: env.WRITE_PASSWORD }));
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await local(req('drafts', 'GET', undefined, cookie))).status, 200);
    const logout = await local(req('session', 'DELETE', undefined, cookie));
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await local(req('drafts'))).status, 401);
  }
  assert.equal((await local(new Request('http://other.example/api/write/drafts'))).status, 403);
  const missingConfig = createWriter({ store: fileStore(root), env: {}, local: true });
  assert.equal((await missingConfig(new Request('http://localhost/api/write/drafts'))).status, 503);
  const { createPublicPosts } = await import('../server/public-posts.mjs');
  assert.equal(
    (await createPublicPosts({ store: fileStore(root) })(new Request('https://blog.example/api/posts'))).status,
    200,
  );
});

test('main emoji is saved with drafts and preserved on reload', async (t) => {
  const { handle, cookie, root } = await fixture(t);
  const result = await handle(request('drafts/test-draft', 'PUT', { ...draft, emoji: '☕' }, cookie));
  assert.equal(result.status, 200);
  const restarted = createWriter({ store: fileStore(root), env });
  const restored = await (await restarted(request('drafts/test-draft', 'GET', undefined, cookie))).json();
  assert.equal(restored.emoji, '☕');
  assert.equal(
    (await handle(request('drafts/test-draft', 'PUT', { ...restored, emoji: { invalid: true } }, cookie))).status,
    400,
  );
});

test('administrator passwords accept eight characters and reject shorter configuration', async (t) => {
  const { root } = await fixture(t);
  for (const [password, configured] of [
    ['1234567', false],
    ['12345678', true],
  ]) {
    const handle = createWriter({ store: fileStore(root), env: { ...env, WRITE_PASSWORD: password } });
    const state = await (await handle(request('session'))).json();
    assert.equal(state.configured, configured);
    const login = await handle(request('session', 'POST', { password }));
    assert.equal(login.status, configured ? 200 : 503);
    if (configured) {
      const cookie = login.headers.get('set-cookie').split(';')[0];
      assert.equal((await handle(request('drafts', 'GET', undefined, cookie))).status, 200);
    }
  }
});
