const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('shared font head remains present alongside page-specific head links', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { Helmet } = require('react-helmet');
  const ts = require('typescript');
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src/components/SiteFonts/index.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const component = {};
  new Function('require', 'exports', compiled)(require, component);
  for (const route of ['/', '/posts/', '/1/', '/2/']) {
    renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(component.default),
        React.createElement(Helmet, { link: [{ rel: 'canonical', href: `https://ruddhks.my${route}` }] }),
      ),
    );
    const links = Helmet.renderStatic().link.toString();
    assert.equal((links.match(/href="\/fonts\/fonts.css"/g) ?? []).length, 1, route);
    assert.ok(links.includes(`href="https://ruddhks.my${route}"`));
  }
});
test('every font URL resolves to a bundled font with no external request', () => {
  const css = fs.readFileSync(path.join(root, 'static/fonts/fonts.css'), 'utf8');
  assert.ok(!/https?:|@import/.test(css));
  const urls = [...css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map((match) => match[1]);
  assert.ok(urls.length > 3);
  for (const url of urls) {
    const file = path.join(root, 'static/fonts', url);
    const signature = fs.readFileSync(file).subarray(0, 4).toString();
    assert.ok(['wOFF', 'wOF2'].includes(signature), file);
  }
  assert.ok(fs.existsSync(path.join(root, 'static/fonts/gmarket/LICENSE.txt')));
  assert.ok(fs.existsSync(path.join(root, 'static/fonts/noto-sans-kr/LICENSE.txt')));
});
