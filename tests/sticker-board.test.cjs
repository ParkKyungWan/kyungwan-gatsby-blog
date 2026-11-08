const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/components/Banner/board.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } })
    .outputText,
  filename,
);
const { createBoard, seededRandom, STICKER_OVERHANG } = compiled.exports;
const sources = Array.from({ length: 5 }, (_, i) => ({ id: String(i), width: 200 + i * 35, height: 300 - i * 20 }));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('fixed board keeps viewport dimensions and uses the midpoint of the two previous sticker sizes', () => {
  const board = createBoard([{ id: 'sample', width: 200, height: 100 }], { width: 718, height: 158 }, () => 0.5);
  assert.equal(board.width, 718);
  assert.equal(board.height, 158);
  const sticker = board.stickers[0];
  // The old midpoint longest edge was 118px, with a 2:1 aspect ratio.
  close(sticker.width * sticker.height, 118 * 59 * 0.5 * (5 / 6) ** 2);
  close(sticker.width / sticker.height, 2);
});

test('stickers stay clustered on the right, with slight overhang and bounded visibility', () => {
  for (const width of [284, 354, 718])
    for (let seed = 1; seed <= 100; seed++) {
      const board = createBoard(sources, { width, height: 158 }, seededRandom(seed));
      assert.equal(board.stickers.length, sources.length);
      assert.equal(new Set(board.stickers.map((s) => s.id)).size, sources.length);
      let overhang = false;
      for (const s of board.stickers) {
        const left = s.x - s.bounds.width / 2,
          right = s.x + s.bounds.width / 2;
        const top = s.y - s.bounds.height / 2,
          bottom = s.y + s.bounds.height / 2;
        assert.ok(left >= -STICKER_OVERHANG - 1e-8 && right <= width + STICKER_OVERHANG + 1e-8);
        assert.ok(top >= -STICKER_OVERHANG - 1e-8 && bottom <= 158 + STICKER_OVERHANG + 1e-8);
        if (left < -1 || right > width + 1 || top < -1 || bottom > 159) overhang = true;
        const original = sources.find((source) => source.id === s.id);
        close(s.width / s.height, original.width / original.height);
      }
      assert.ok(overhang);
      const clusterWidth = Math.min(width, Math.max(170, width * 0.34));
      for (const s of board.stickers) {
        assert.ok(s.x - s.bounds.width / 2 >= width - clusterWidth - STICKER_OVERHANG - 1e-8);
      }
    }
});

test('new seeds change placement and resizing preserves identities, sizes and angles', () => {
  const viewport = { width: 718, height: 158 };
  const first = createBoard(sources, viewport, seededRandom(1));
  assert.notDeepEqual(first.stickers, createBoard(sources, viewport, seededRandom(2)).stickers);
  assert.deepEqual(first, createBoard(sources, viewport, seededRandom(1)));
  const resized = createBoard(sources, { width: 354, height: 158 }, seededRandom(1));
  assert.deepEqual(
    first.stickers.map(({ id, width, height, rotation }) => ({ id, width, height, rotation })),
    resized.stickers.map(({ id, width, height, rotation }) => ({ id, width, height, rotation })),
  );
  assert.deepEqual(
    sources.map((s) => s.id),
    ['0', '1', '2', '3', '4'],
  );
});

test('empty asset list leaves an empty fixed board', () => {
  assert.deepEqual(createBoard([], { width: 718, height: 158 }), { width: 718, height: 158, stickers: [] });
});

test('transparent margins do not prevent edge overhang or change the intended image scale', () => {
  const board = createBoard(
    [{ id: 'padded', width: 200, height: 100, crop: { x: 20, y: 10, width: 160, height: 80 } }],
    { width: 718, height: 158 },
    () => 0.5,
  );
  const sticker = board.stickers[0];
  close(sticker.width * sticker.height, ((160 * 118) / 200) * ((80 * 118) / 200) * 0.5 * (5 / 6) ** 2);
  assert.equal(sticker.rotation, 0);
  const left = sticker.x - sticker.width / 2,
    right = sticker.x + sticker.width / 2;
  const top = sticker.y - sticker.height / 2,
    bottom = sticker.y + sticker.height / 2;
  assert.ok(left <= -8 || right >= 726 || top <= -8 || bottom >= 166);
});

test('coffee straddles the lens rim and remains visible in the magnified portion', () => {
  const { LENS } = compiled.exports;
  const input = [{ id: 'drip', width: 200, height: 240 }, ...sources];
  for (const width of [284, 354, 718])
    for (let seed = 1; seed <= 30; seed++) {
      const board = createBoard(input, { width, height: 158 }, seededRandom(seed));
      const coffee = board.stickers.find((s) => s.id === 'drip');
      const center = width * LENS.position;
      const rim = center + LENS.diameter / 2;
      assert.ok(coffee.x - coffee.width / 2 < center + LENS.diameter / 2 / LENS.zoom);
      assert.ok(coffee.x + coffee.width / 2 > rim);
      close(coffee.y, 79);
      assert.equal(coffee.rotation, 0);
      for (const other of board.stickers.filter((s) => s.id !== 'drip')) assert.ok(other.x > coffee.x);
    }
});
