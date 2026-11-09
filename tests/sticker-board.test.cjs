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
const { createBoard, seededRandom, STICKER_OVERHANG, STICKER_AREA_SCALE, LENS } = compiled.exports;
const sources = Array.from({ length: 5 }, (_, i) => ({ id: String(i), width: 200 + i * 35, height: 300 - i * 20 }));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('size reduction preserves aspect ratio and transparent crop scale', () => {
  const board = createBoard(
    [{ id: 'sample', width: 200, height: 100, crop: { x: 20, y: 10, width: 160, height: 80 } }],
    { width: 718, height: 158 },
    () => 0.5,
  );
  const sticker = board.stickers[0];
  close(sticker.width * sticker.height, 118 * 59 * STICKER_AREA_SCALE * 0.8 ** 2 * 1.15 ** 2);
  close(sticker.width / sticker.height, 2);
});

test('complete layouts clear the lens at all widths and avoid crowding on desktop', () => {
  for (const width of [280, 320, 375, 610, 718, 800, 1200])
    for (let seed = 0; seed < 100; seed++) {
      const board = createBoard(sources, { width, height: 160 }, seededRandom(seed));
      assert.equal(board.stickers.length, sources.length, `width=${width}, seed=${seed}`);
      for (const [i, s] of board.stickers.entries()) {
        const dx = width * LENS.position - s.x,
          dy = 80 - s.y;
        const x = dx * Math.cos(s.rotation) + dy * Math.sin(s.rotation);
        const y = -dx * Math.sin(s.rotation) + dy * Math.cos(s.rotation);
        assert.ok(
          Math.hypot(Math.max(0, Math.abs(x) - s.width / 2), Math.max(0, Math.abs(y) - s.height / 2)) >=
            LENS.diameter * 0.4,
        );
        assert.ok(s.x - s.bounds.width / 2 >= width * LENS.position + LENS.diameter / 2 - 8 - 1e-8);
        assert.ok(s.x + s.bounds.width / 2 <= width + STICKER_OVERHANG + 1e-8);
        assert.ok(s.y - s.bounds.height / 2 >= -STICKER_OVERHANG - 1e-8);
        assert.ok(s.y + s.bounds.height / 2 <= 160 + STICKER_OVERHANG + 1e-8);
        for (const other of board.stickers.slice(i + 1)) {
          const gap = Math.hypot(
            Math.max(0, Math.abs(s.x - other.x) - (s.bounds.width + other.bounds.width) / 2),
            Math.max(0, Math.abs(s.y - other.y) - (s.bounds.height + other.bounds.height) / 2),
          );
          if (width >= 610) assert.ok(gap >= 6 - 1e-8, `width=${width}, seed=${seed}, gap=${gap}`);
        }
      }
    }
});

test('seeded layouts are repeatable and preserve sticker character across resizing', () => {
  const first = createBoard(sources, { width: 718, height: 160 }, seededRandom(1));
  assert.deepEqual(first, createBoard(sources, { width: 718, height: 160 }, seededRandom(1)));
  assert.notDeepEqual(first, createBoard(sources, { width: 718, height: 160 }, seededRandom(2)));
  const resized = createBoard(sources, { width: 320, height: 160 }, seededRandom(1));
  const character = (board) =>
    board.stickers.map(({ id, width, height, rotation }) => ({ id, width, height, rotation }));
  assert.deepEqual(character(first), character(resized));
  assert.deepEqual(
    sources.map((s) => s.id),
    ['0', '1', '2', '3', '4'],
  );
});

test('empty sources and constant random sources terminate safely', () => {
  assert.deepEqual(createBoard([], { width: 718, height: 160 }), { width: 718, height: 160, stickers: [] });
  assert.equal(createBoard(sources, { width: 320, height: 160 }, () => 0.5).stickers.length, 5);
});

test('mixed photo and sticker layouts retain every asset and include print margins', () => {
  const photo = { id: 'climbing-photo', kind: 'photo', width: 491, height: 640 };
  for (const width of [280, 375, 720])
    for (let seed = 0; seed < 30; seed++) {
      const board = createBoard([...sources, photo], { width, height: 160 }, seededRandom(seed));
      assert.equal(board.stickers.length, 6);
      const print = board.stickers.find((s) => s.id === photo.id);
      close((print.width - 8) / (print.height - 13), photo.width / photo.height);
      assert.ok(Math.abs(print.rotation) <= 0.13);
      assert.ok(print.x - print.bounds.width / 2 >= width * LENS.position + LENS.diameter / 2 - 8 - 1e-8);
    }
});
