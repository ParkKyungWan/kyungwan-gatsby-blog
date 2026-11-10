const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { github } = require('./helpers/github.cjs');
const { fileStore } = require('../server/writer-local.cjs');
const markdown = (title = '기존 글', extra = '') =>
  `---\nemoji: ☕\ntitle: '${title}'\ndate: '2026-11-10'\ncategories: [일상]\nfeatured: false\ndraft: false\n---\n\n${
    extra || '## 본문\n\n기존 **문법**과 <span>HTML</span>\n'
  }\n`;
const env = {
  WRITE_PASSWORD: 'test-password',
  WRITE_SESSION_SECRET: 'test-secret-with-more-than-32-characters',
  WRITE_GITHUB_TOKEN: 'fake-token',
  WRITE_GITHUB_REPOSITORY: 'test/blog',
};
const origin = 'https://writer.example';
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'git-writer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const remote = github({
    'content/1/index.md': markdown(),
    'content/2/index.md': markdown('두 번째 글'),
    'README.md': 'keep',
  });
  const { createGitRepository } = await import('../server/git-repository.mjs');
  const repo = createGitRepository({ env, fetcher: remote.fetch });
  const { createWriter } = await import('../server/writer.mjs');
  const store = fileStore(root);
  const handle = createWriter({ store, repository: repo, env });
  let cookie = '';
  const req = (route, method = 'GET', data) =>
    new Request(origin + '/api/write/' + route, {
      method,
      headers: { 'Origin': origin, 'Cookie': cookie, 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  const login = await handle(req('session', 'POST', { password: env.WRITE_PASSWORD }));
  cookie = login.headers.get('set-cookie').split(';')[0];
  const call = async (route, method, data, status = 200) => {
    const response = await handle(req(route, method, data));
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  };
  const draft = {
    id: 'new-post',
    title: '새 글',
    category: '일상',
    emoji: '☕',
    blocks: [{ id: 'body', type: 'paragraph', text: '새 본문' }],
    revision: 0,
  };
  return { root, remote, repo, store, handle, req, call, draft };
}
test('drafts keep Gatsby Markdown privately; publish creates one main commit with a numeric folder and photo', async (t) => {
  const f = await fixture(t);
  const image = await require('sharp')({ create: { width: 40, height: 30, channels: 3, background: '#abcdef' } })
    .webp()
    .toBuffer();
  const response = await f.handle(
    new Request(origin + '/api/write/drafts/new-post/images', {
      method: 'POST',
      headers: { 'Origin': origin, 'Cookie': f.req('session').headers.get('cookie'), 'Content-Type': 'image/webp' },
      body: image,
    }),
  );
  assert.equal(response.status, 201);
  const uploaded = await response.json();
  const saved = await f.call('drafts/new-post', 'PUT', {
    ...f.draft,
    blocks: [...f.draft.blocks, { id: 'photo', type: 'image', text: '설명', alt: '사진', ...uploaded }],
  });
  assert.equal(f.remote.pushes, 0);
  const source = await f.store.readText(saved.markdownKey);
  assert.ok(!source.data.includes('/api/'));
  assert.match(source.data, /\.webp>/);
  const published = await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  assert.equal(published.slug, '/3/');
  assert.equal(published.state, 'pending');
  assert.equal(f.remote.pushes, 1);
  assert.match(f.remote.read('content/3/index.md').toString(), /새 본문/);
  const name = Object.keys(saved.files)[0];
  assert.ok(f.remote.read('content/3/' + name));
  assert.equal(f.remote.read('README.md').toString(), 'keep');
  const repeat = await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  assert.equal(repeat.commitSha, published.commitSha);
  assert.equal(f.remote.pushes, 1);
  assert.equal((await f.handle(f.req('drafts/new-post/publish', 'POST', { revision: 0 }))).status, 409);
});
test('autosaving edits never publishes; updating preserves the number and first publication date', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  const original = await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  const update = await f.call('drafts/new-post', 'PUT', { ...saved, title: '수정 제목' });
  assert.equal(f.remote.pushes, 1);
  assert.ok(!f.remote.read('content/3/index.md').toString().includes('수정 제목'));
  const result = await f.call('drafts/new-post/publish', 'POST', { revision: update.revision });
  assert.equal(result.slug, '/3/');
  assert.equal(result.publishedAt, original.publishedAt);
});
test('a concurrent unrelated main commit is retained and the publication retries without force', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  f.remote.race = (remote) => remote.edit('README.md', 'concurrent work');
  const result = await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  assert.equal(result.slug, '/3/');
  assert.equal(f.remote.read('README.md').toString(), 'concurrent work');
  assert.equal(f.remote.pushes, 1);
  assert.ok(f.remote.requests.filter((r) => r.method === 'PATCH').every((r) => r.body.force === false));
});
test('existing Git Markdown and attachments remain byte-for-byte intact; conflicts require explicit reload', async (t) => {
  const f = await fixture(t);
  const original = markdown(
    '기존 글',
    '```js\nconst a = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<span style="opacity:.5">raw</span>',
  );
  f.remote.edit('content/1/index.md', original);
  f.remote.edit('content/1/사진.png', Buffer.from('original-image'));
  const imported = await f.call('posts/1/import', 'POST', {}, 201);
  assert.equal(imported.markdown, original);
  assert.ok(imported.files['사진.png']);
  const saved = await f.call('drafts/' + imported.id, 'PUT', imported);
  assert.equal((await f.store.readText(saved.markdownKey)).data, original);
  f.remote.edit('content/1/index.md', markdown('외부 수정'));
  await f.call('drafts/' + imported.id + '/publish', 'POST', { revision: saved.revision }, 409);
  const reloaded = await f.call('posts/1/import', 'POST', { replace: true }, 201);
  assert.match(reloaded.markdown, /외부 수정/);
  const updated = await f.call('drafts/' + imported.id, 'PUT', {
    ...reloaded,
    markdown: reloaded.markdown.replace('외부 수정', '최종 수정'),
  });
  const published = await f.call('drafts/' + imported.id + '/publish', 'POST', { revision: updated.revision });
  assert.equal(published.slug, '/1/');
  assert.equal(f.remote.read('content/1/사진.png').toString(), 'original-image');
});
test('unpublish changes the Git frontmatter without publishing unfinished draft edits; republish is idempotent', async (t) => {
  const f = await fixture(t);
  let saved = await f.call('drafts/new-post', 'PUT', f.draft);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  saved = await f.call('drafts/new-post', 'PUT', { ...saved, title: '미완성 제목' });
  const hidden = await f.call('drafts/new-post/unpublish', 'POST', { revision: saved.revision });
  assert.equal(hidden.draft, true);
  assert.match(f.remote.read('content/3/index.md').toString(), /draft: true/);
  assert.ok(!f.remote.read('content/3/index.md').toString().includes('미완성 제목'));
  await f.call('drafts/new-post/unpublish', 'POST', { revision: saved.revision });
  assert.equal(f.remote.pushes, 2);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  assert.match(f.remote.read('content/3/index.md').toString(), /draft: false/);
  assert.equal(f.remote.pushes, 3);
});
test('only Netlify deployment success marks a publication complete; legacy public endpoints are gone', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  f.remote.statuses = [{ context: 'Check blog/build', state: 'success' }];
  assert.equal((await f.call('drafts/new-post/publication')).state, 'pending');
  f.remote.statuses = [{ context: 'netlify/site/deploy', state: 'success' }];
  assert.equal((await f.call('drafts/new-post/publication')).state, 'published');
  f.remote.statuses = [{ context: 'netlify/site/deploy', state: 'failure' }];
  assert.equal((await f.call('drafts/new-post/publication')).state, 'failed');
  assert.equal((await f.handle(f.req('unknown'))).status, 404);
});
test('missing local files, unsafe image paths and invalid frontmatter are rejected before main changes', async (t) => {
  const f = await fixture(t);
  await f.call(
    'drafts/new-post',
    'PUT',
    { ...f.draft, blocks: [{ id: 'img', type: 'image', text: '', src: '/api/write/drafts/other/files/1.webp' }] },
    400,
  );
  const missing = await f.call('drafts/new-post', 'PUT', {
    ...f.draft,
    markdown: markdown('bad', '![missing](./missing.webp)'),
  });
  await f.call('drafts/new-post/publish', 'POST', { revision: missing.revision }, 400);
  const saved = await f.call('drafts/new-post', 'PUT', {
    ...f.draft,
    revision: missing.revision,
    markdown: '---\ntitle: incomplete\n---\n\nbody',
  });
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision }, 400);
  assert.equal(f.remote.pushes, 0);
});

test('explicit reimport after a previous publication accepts the new Git base without changing the post id', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  f.remote.edit('content/3/index.md', markdown('Git 직접 수정'));
  const restored = await f.call('posts/3/import', 'POST', { replace: true }, 201);
  assert.equal(restored.id, 'new-post');
  const update = await f.call('drafts/new-post', 'PUT', {
    ...restored,
    markdown: restored.markdown.replace('Git 직접 수정', '다시 편집'),
  });
  await f.call('drafts/new-post/publish', 'POST', { revision: update.revision });
  assert.match(f.remote.read('content/3/index.md').toString(), /다시 편집/);
});

test('unfinished Markdown autosaves byte-for-byte even when its Frontmatter is temporarily invalid', async (t) => {
  const f = await fixture(t);
  const source = '---\ntitle: "아직 작성 중\n---\n\n![붙이는 중](./';
  const saved = await f.call('drafts/new-post', 'PUT', { ...f.draft, markdown: source });
  assert.equal((await f.store.readText(saved.markdownKey)).data, source);
  assert.equal((await f.call('drafts/new-post')).markdown, source);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision }, 400);
  assert.equal(f.remote.pushes, 0);
});

test('one delete removes only private data when no successful publication exists', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  const imported = await f.call('posts/1/import', 'POST', {}, 201);
  await f.store.writeBinary('draft-files/new-post/assets/photo.json', Buffer.from('private'));
  await f.call('drafts/new-post', 'DELETE', { revision: 0 }, 409);
  const result = await f.call('drafts/new-post', 'DELETE', { revision: saved.revision });
  assert.equal(result.gitDeleted, false);
  assert.equal(f.remote.pushes, 0);
  assert.ok(f.remote.read('content/1/index.md'));
  assert.deepEqual(await f.store.list('draft-files/new-post/'), []);
  assert.equal((await f.call('drafts')).length, 1);
  await f.call('drafts/new-post', 'PUT', saved, 410);
  await f.call('drafts/new-post', 'GET', undefined, 410);
  assert.equal((await f.call('drafts/' + imported.id)).id, imported.id);
});
test('published delete commits folder removal to main and retries without duplicate commits', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  f.remote.race = (remote) => remote.edit('README.md', 'concurrent');
  const result = await f.call('drafts/new-post', 'DELETE', { revision: saved.revision });
  assert.equal(result.gitDeleted, true);
  assert.equal(f.remote.read('content/3/index.md'), null);
  assert.ok(f.remote.read('content/1/index.md'));
  assert.equal(f.remote.read('README.md').toString(), 'concurrent');
  assert.equal(f.remote.pushes, 2);
  await f.call('drafts/new-post', 'DELETE', { revision: saved.revision });
  assert.equal(f.remote.pushes, 2);
  assert.deepEqual(await f.call('drafts'), []);
  assert.equal(await f.call('drafts/new-post/publication'), null);
});
test('Git deletion conflict preserves the private draft for recovery', async (t) => {
  const f = await fixture(t);
  const saved = await f.call('drafts/new-post', 'PUT', f.draft);
  await f.call('drafts/new-post/publish', 'POST', { revision: saved.revision });
  f.remote.edit('content/3/index.md', markdown('external'));
  await f.call('drafts/new-post', 'DELETE', { revision: saved.revision }, 409);
  assert.equal((await f.call('drafts/new-post')).title, saved.title);
  assert.match(f.remote.read('content/3/index.md').toString(), /external/);
});
