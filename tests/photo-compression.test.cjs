const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(
  fs.readFileSync(require('node:path').resolve(__dirname, '../src/components/WriteEditor/storage.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
function environment({ unsupportedWebp = false, decodeFailure = false } = {}) {
  const calls = [];
  let revoked = false;
  const context = { drawImage() {}, fillRect() {} };
  const canvas = {
    getContext: () => context,
    toBlob(callback, type) {
      calls.push({ width: canvas.width, height: canvas.height, type });
      callback({
        type: unsupportedWebp && type === 'image/webp' ? 'image/png' : type,
        size: calls.length < 3 ? 900000 : 180000,
      });
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => {
        revoked = true;
      },
    },
    Image: class {
      naturalWidth = 6000;
      naturalHeight = 4000;
      async decode() {
        if (decodeFailure) throw new Error('cannot decode');
      }
    },
    document: { createElement: () => canvas },
    FileReader: class {
      readAsDataURL(blob) {
        this.result = `data:${blob.type};base64,test`;
        this.onload();
      }
    },
  });
  return { exports, calls, revoked: () => revoked };
}
test('large originals are reduced before upload without a raw file-size rejection', async () => {
  const env = environment();
  const result = await env.exports.imageBlockSource({ name: 'large.jpg', type: 'image/jpeg', size: 100 * 1024 * 1024 });
  assert.match(result, /^data:image\/webp;/);
  assert.ok(env.calls.length > 1);
  assert.ok(env.calls.every(({ width, height }) => Math.max(width, height) <= 1280));
  assert.ok(env.calls[env.calls.length - 1].width < env.calls[0].width);
  assert.equal(env.revoked(), true);
});
test('browsers without WebP encoding fall back to compressed JPEG', async () => {
  const env = environment({ unsupportedWebp: true });
  assert.match(
    await env.exports.imageBlockSource({ name: 'photo.png', type: 'image/png', size: 25000000 }),
    /^data:image\/jpeg;/,
  );
  assert.ok(env.calls.some(({ type }) => type === 'image/jpeg'));
});
test('unreadable photos release their object URL and report a readable message', async () => {
  const env = environment({ decodeFailure: true });
  await assert.rejects(
    env.exports.imageBlockSource({ name: 'broken.jpg', type: 'image/jpeg' }),
    /사진을 읽을 수 없어요/,
  );
  assert.equal(env.revoked(), true);
});
