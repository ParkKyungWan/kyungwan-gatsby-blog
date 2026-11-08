const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const exportsObject = {};
new Function(
  'exports',
  ts.transpileModule(
    fs.readFileSync(require('node:path').resolve(__dirname, '../src/components/Banner/magnet.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(exportsObject);
const { createMagnet, moveMagnet, returnMagnet, selectMagnet, stepMagnet } = exportsObject;

test('mobile taps enter from the left and retarget nearby stickers during movement', () => {
  const state = createMagnet({ x: 80, y: 80 });
  const first = { x: 110, y: 60 };
  const second = { x: 160, y: 95 };
  selectMagnet(state, first, 0, { x: -72, y: 80 });
  assert.equal(state.position.x, -72);
  stepMagnet(state, 110, [first, second]);
  stepMagnet(state, 200, [first, second]);
  assert.ok(state.position.x > -72 && state.position.x < first.x);
  const current = { ...state.position };
  selectMagnet(state, second, 201);
  assert.deepEqual(state.origin, current);
  assert.equal(state.started, 201);
  stepMagnet(state, 311, [first, second]);
  stepMagnet(state, 491, [first, second]);
  stepMagnet(state, 611, [first, second]);
  assert.deepEqual(state.position, second);
  selectMagnet(state, first, 620);
  assert.equal(state.phase, 'resist');
  assert.deepEqual(state.target, first);
});

test('resists briefly before releasing and settles at the pointer', () => {
  const state = createMagnet({ x: 100, y: 80 });
  moveMagnet(state, { x: 400, y: 90 }, 0);
  stepMagnet(state, 100, []);
  assert.ok(state.position.x < 115);
  stepMagnet(state, 110, []);
  stepMagnet(state, 200, []);
  assert.ok(state.position.x > 370);
  assert.equal(stepMagnet(state, 290, []), false);
  assert.deepEqual(state.position, { x: 400, y: 90 });
});

test('finds the closest sticker after the pull, then locks its center', () => {
  const state = createMagnet({ x: 100, y: 80 });
  const stickers = [
    { x: 450, y: 80 },
    { x: 410, y: 90 },
  ];
  moveMagnet(state, { x: 400, y: 80 }, 0);
  stepMagnet(state, 110, stickers);
  stepMagnet(state, 290, stickers);
  assert.deepEqual(state.target, stickers[1]);
  stepMagnet(state, 410, stickers);
  assert.deepEqual(state.position, stickers[1]);
  moveMagnet(state, { x: 430, y: 80 }, 420);
  assert.equal(state.phase, 'idle');
  moveMagnet(state, { x: 550, y: 80 }, 430);
  assert.equal(state.phase, 'resist');
});

test('moving pointers do not restart resistance and leaving cancels a pending snap', () => {
  const state = createMagnet({ x: 100, y: 80 });
  moveMagnet(state, { x: 400, y: 80 }, 0);
  moveMagnet(state, { x: 420, y: 80 }, 60);
  assert.equal(state.started, 0);
  returnMagnet(state, { x: 100, y: 80 }, 70);
  assert.equal(stepMagnet(state, 250, [{ x: 110, y: 80 }]), false);
  assert.deepEqual(state.position, { x: 100, y: 80 });
  assert.equal(state.locked, null);
});

test('reduced motion settles immediately without a continuous animation', () => {
  const state = createMagnet({ x: 100, y: 80 });
  moveMagnet(state, { x: 400, y: 80 }, 0);
  assert.equal(stepMagnet(state, 0, [{ x: 420, y: 90 }], true), false);
  assert.deepEqual(state.position, { x: 420, y: 90 });
  returnMagnet(state, { x: 100, y: 80 }, 1);
  stepMagnet(state, 1, [], true);
  assert.deepEqual(state.position, { x: 100, y: 80 });
});
