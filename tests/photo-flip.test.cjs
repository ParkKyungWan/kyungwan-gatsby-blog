const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function(
  'exports',
  ts.transpileModule(
    fs.readFileSync(require('node:path').resolve(__dirname, '../src/components/Banner/photo-flip.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
)(api);

test('card narrows to its edge before revealing the other face', () => {
  const flip = api.createPhotoFlip(false, 0);
  api.stepPhotoFlip(flip, true, 100);
  api.stepPhotoFlip(flip, true, 280);
  const edge = api.photoFlipPose(flip.value);
  assert.ok(edge.scaleX < 0.02);
  assert.equal(api.stepPhotoFlip(flip, true, 460), false);
  assert.equal(api.photoFlipPose(flip.value).front, true);
  assert.equal(api.photoFlipPose(flip.value).scaleX, 1);
});

test('reversing a flip retains its current angle and returns to the back', () => {
  const flip = api.createPhotoFlip(false, 0);
  api.stepPhotoFlip(flip, true, 10);
  api.stepPhotoFlip(flip, true, 130);
  const before = flip.value;
  api.stepPhotoFlip(flip, false, 130);
  assert.equal(flip.value, before);
  assert.equal(api.stepPhotoFlip(flip, false, 490), false);
  assert.equal(flip.value, 0);
});

test('reduced motion changes the face without rotation', () => {
  const flip = api.createPhotoFlip(false, 0);
  assert.equal(api.stepPhotoFlip(flip, true, 1, true), false);
  assert.equal(flip.value, 1);
});
