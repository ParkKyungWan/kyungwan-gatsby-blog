const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { parse, validate } = require('../scripts/content.cjs');
const { addImage } = require('../scripts/add-image.cjs');
const valid = { title: '테스트', date: '2026-02-28', draft: true, featured: false, categories: ['책과 영화'] };
test('rejects invalid calendar dates and incomplete publishing metadata', () => {
  assert.deepEqual(validate(valid), []);
  for (const patch of [
    { date: '2026-02-30' },
    { date: '2026-13-01' },
    { date: new Date() },
    { title: ' ' },
    { draft: 'false' },
    { categories: '작업' },
    { categories: ['작업', '작업'] },
    { categories: ['featured-작업'] },
    { featured: null },
  ]) {
    assert.ok(validate({ ...valid, ...patch }).length, JSON.stringify(patch));
  }
});
test('parses YAML dates as strings and rejects malformed YAML', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-yaml-'));
  try {
    const file = path.join(dir, 'index.md');
    await fs.writeFile(
      file,
      '---\ntitle: 글\ndate: 2026-02-28\ncategories: [책과 영화]\ndraft: true\nfeatured: false\n---\n본문',
    );
    assert.deepEqual(validate(parse(file).data), []);
    await fs.writeFile(file, '---\ntitle: [\n---\n');
    assert.throws(() => parse(file));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test('image import reduces size, strips metadata, preserves source and safely appends Markdown', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-images-'));
  try {
    const postDir = path.join(dir, 'content', 'sample');
    await fs.mkdir(postDir, { recursive: true });
    await fs.writeFile(path.join(postDir, 'index.md'), '원고\n');
    const source = path.join(dir, 'photo.jpg');
    await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#f1d2b3' } })
      .jpeg()
      .withMetadata()
      .toFile(source);
    const before = await fs.readFile(source);
    const result = await addImage('sample', source, '사진 [설명]', true, dir);
    const metadata = await sharp(path.join(postDir, result.name)).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, 1600);
    assert.equal(metadata.exif, undefined);
    assert.deepEqual(await fs.readFile(source), before);
    assert.ok((await fs.readFile(path.join(postDir, 'index.md'), 'utf8')).includes(result.markdown));
    const again = await addImage('sample', source, '', false, dir);
    assert.equal(again.name, result.name);
    await assert.rejects(addImage('../escape', source, '', false, dir));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('new post starts as draft, uses Korean date and refuses collisions or reserved URLs', async () => {
  const { createPost } = require('../scripts/new-post.cjs');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-post-'));
  try {
    await fs.mkdir(path.join(dir, 'content'));
    const created = createPost('new-post', '제목: "인용"', ['책과 영화'], dir, new Date('2026-11-06T16:00:00Z'));
    const file = path.join(created, 'index.md');
    const original = await fs.readFile(file, 'utf8');
    assert.equal(parse(file).data.date, '2026-11-07');
    assert.equal(parse(file).data.draft, true);
    assert.deepEqual(validate(parse(file).data), []);
    assert.throws(() => createPost('new-post', '덮어쓰기', [], dir));
    assert.equal(await fs.readFile(file, 'utf8'), original);
    for (const slug of ['posts', 'activity', '../escape']) assert.throws(() => createPost(slug, '글', [], dir));
    const { draftIgnores } = require('../scripts/content.cjs');
    const content = path.join(dir, 'content');
    assert.deepEqual(draftIgnores(content, 'build', 'true'), [created + '/**']);
    assert.deepEqual(draftIgnores(content, 'develop', 'true'), []);
    assert.deepEqual(draftIgnores(content, 'develop', undefined), [created + '/**']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
