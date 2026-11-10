const { test } = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../package.json');
const lock = require('../package-lock.json');

test('all Gatsby Sharp dependencies use the pinned npm binary distribution', () => {
  const version = manifest.dependencies.sharp || manifest.devDependencies.sharp;
  assert.equal(manifest.overrides.sharp, '$sharp');
  const entries = Object.entries(lock.packages).filter(([name]) => name.endsWith('/sharp'));
  assert.ok(entries.length > 0);
  for (const [name, entry] of entries) assert.equal(entry.version, version, name);
  assert.equal(lock.packages['node_modules/@img/sharp-linux-x64'].version, version);
  assert.ok(lock.packages['node_modules/@img/sharp-libvips-linux-x64']);
});
