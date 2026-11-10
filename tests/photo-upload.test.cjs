const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
  const exports = {};
  let id = 0;
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(require('node:path').join(__dirname, '../src/components/WriteEditor/photo-upload.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
    ).outputText,
    { exports, require: () => ({ makeBlock: () => ({ id: 'tail-' + id++, type: 'paragraph', text: '' }) }) },
  );
  return exports;
}
test('each uploaded photo is committed before the next upload starts, including 60-photo batches', async () => {
  const { attachPhotosSequentially, insertUploadedPhoto } = load();
  let draft = {
    id: 'draft',
    title: '기존 제목',
    category: '일상',
    blocks: [{ id: 'start', type: 'paragraph', text: '' }],
  };
  let saved = 0,
    cursor = 'start';
  const result = await attachPhotosSequentially(
    Array.from({ length: 60 }, (_, i) => i),
    {
      prepare: async (i) => String(i),
      upload: async (data) => {
        assert.equal(saved, Number(data));
        return { src: '/api/write/images/' + data, width: 1280, height: 960 };
      },
      commit: async (file, photo) => {
        const next = insertUploadedPhoto(draft, { id: 'photo-' + file, type: 'image', text: '', ...photo }, cursor);
        cursor = 'photo-' + file;
        draft = next;
        saved++;
        assert.equal(draft.title, '기존 제목');
        assert.equal(draft.blocks.filter((b) => b.type === 'image').length, saved);
      },
      progress() {},
      failure() {
        throw new Error('Unexpected failure');
      },
    },
  );
  assert.equal(result.saved, 60);
  assert.equal(result.stopped, false);
  assert.equal(draft.blocks.filter((b) => b.type === 'paragraph').length, 1);
  assert.deepEqual(
    Array.from(
      draft.blocks.filter((b) => b.type === 'image'),
      (b) => b.id,
    ),
    Array.from({ length: 60 }, (_, i) => 'photo-' + i),
  );
});
test('a save failure stops later uploads; earlier saved attachments survive', async () => {
  const { attachPhotosSequentially } = load();
  const saved = [],
    uploads = [],
    failures = [];
  const result = await attachPhotosSequentially([1, 2, 3], {
    prepare: async (i) => String(i),
    upload: async (value) => {
      uploads.push(value);
      return { src: value, width: 1, height: 1 };
    },
    commit: async (file) => {
      if (file === 2) throw new Error('offline');
      saved.push(file);
    },
    progress() {},
    failure: (file, error) => failures.push(file),
  });
  assert.deepEqual(saved, [1]);
  assert.deepEqual(uploads, ['1', '2']);
  assert.deepEqual(failures, [2]);
  assert.equal(result.stopped, true);
});
test('an unreadable photo is skipped while remaining attachments are committed', async () => {
  const { attachPhotosSequentially } = load();
  const saved = [];
  const result = await attachPhotosSequentially([1, 2, 3], {
    prepare: async (i) => {
      if (i === 2) throw new Error('decode');
      return String(i);
    },
    upload: async (src) => ({ src, width: 1, height: 1 }),
    commit: async (file) => {
      saved.push(file);
    },
    progress() {},
    failure() {},
  });
  assert.deepEqual(saved, [1, 3]);
  assert.equal(result.saved, 2);
  assert.equal(result.stopped, false);
});
