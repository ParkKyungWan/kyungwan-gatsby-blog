const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function(
  'exports',
  ts.transpileModule(
    fs.readFileSync(require('node:path').resolve(__dirname, '../src/utils/recover-markdown-images.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(api);

function fixture({ complete = false, naturalWidth = 0 } = {}) {
  const attributes = new Map([
    ['src', '/static/photo.jpg'],
    ['srcset', '/static/photo-large.jpg 1440w'],
    ['sizes', '100vw'],
  ]);
  const source = {
    setAttribute(key, value) {
      this[key] = value;
    },
  };
  const requests = [];
  const image = {
    tagName: 'IMG',
    complete,
    naturalWidth,
    ownerDocument: { baseURI: 'https://example.test/2/' },
    getAttribute: (key) => attributes.get(key),
    removeAttribute: (key) => attributes.delete(key),
    closest: () => ({ querySelectorAll: () => [source] }),
    set src(value) {
      requests.push(value);
    },
  };
  let error;
  const root = {
    querySelectorAll: () => [image],
    addEventListener(name, callback, capture) {
      assert.equal(name, 'error');
      assert.equal(capture, true);
      error = callback;
    },
    removeEventListener(name, callback, capture) {
      assert.equal(callback, error);
      assert.equal(capture, true);
      error = null;
    },
  };
  return { root, image, requests, attributes, source, fail: () => error?.({ target: image }) };
}

test('successful images make no extra requests', () => {
  const f = fixture({ complete: true, naturalWidth: 720 });
  const cleanup = api.recoverMarkdownImages(f.root);
  assert.equal(f.requests.length, 0);
  assert.ok(f.attributes.has('srcset'));
  cleanup();
});

test('picture failure switches to fallback, retries at most twice and disables overriding sources', async () => {
  const f = fixture();
  const cleanup = api.recoverMarkdownImages(f.root);
  f.fail();
  assert.equal(f.source.media, 'not all');
  assert.equal(f.attributes.has('srcset'), false);
  assert.equal(f.requests[0], 'https://example.test/static/photo.jpg?image-retry=1');
  f.fail();
  f.fail();
  assert.equal(f.requests.length, 1);
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(f.requests.length, 2);
  f.fail();
  assert.equal(f.requests.length, 2);
  cleanup();
});

test('recovers images that failed before effect setup and cancels retries on navigation', async () => {
  const f = fixture({ complete: true });
  const cleanup = api.recoverMarkdownImages(f.root);
  assert.equal(f.requests.length, 1);
  f.fail();
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(f.requests.length, 1);
});
