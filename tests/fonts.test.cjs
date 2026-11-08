const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('every font URL resolves to a bundled font with no external request', () => {
  const css = fs.readFileSync(path.join(root, 'static/fonts/fonts.css'), 'utf8');
  assert.ok(!/https?:|@import/.test(css));
  const urls = [...css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]);
  assert.ok(urls.length > 3);
  for (const url of urls) {
    const file = path.join(root, 'static/fonts', url);
    const signature = fs.readFileSync(file).subarray(0, 4).toString();
    assert.ok(['wOFF', 'wOF2'].includes(signature), file);
  }
  assert.ok(fs.existsSync(path.join(root, 'static/fonts/gmarket/LICENSE.txt')));
  assert.ok(fs.existsSync(path.join(root, 'static/fonts/noto-sans-kr/LICENSE.txt')));
});
