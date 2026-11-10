const { test } = require('node:test');
const assert = require('node:assert/strict');
test('manual inline Markdown renders and survives Gatsby serialization', async () => {
  const { renderInline, serializeInline } = await import('../shared/inline-markdown.mjs');
  const { serializeDraft } = await import('../server/draft-bundles.mjs');
  const { unified } = await import('unified');
  const { default: parse } = await import('remark-parse');
  const input = '일부 **굵은 글자**와 [링크](https://example.com/path?q=1&b=2), *기울임*';
  const rendered = renderInline(input);
  assert.match(rendered, /<strong>굵은 글자<\/strong>/);
  assert.match(rendered, /<a href="https:\/\/example.com\/path\?q=1&amp;b=2">링크<\/a>/);
  const markdown = serializeDraft({
    id: 'inline',
    title: 'test',
    createdAt: Date.now(),
    category: '일상',
    blocks: [{ type: 'paragraph', text: input }],
  });
  const body = markdown.split('---\n').slice(2).join('---\n');
  const nodes = [];
  const visit = (n) => {
    nodes.push(n);
    (n.children || []).forEach(visit);
  };
  visit(unified().use(parse).parse(body));
  assert.ok(nodes.some((n) => n.type === 'strong'));
  assert.ok(nodes.some((n) => n.type === 'link' && n.url === 'https://example.com/path?q=1&b=2'));
  assert.equal(renderInline('아직 **쓰는 중'), '아직 **쓰는 중');
  assert.match(serializeInline('아직 **쓰는 중'), /\\\*\\\*/);
});
test('preview treats HTML and unsafe links as literal text', async () => {
  const { renderInline, serializeInline } = await import('../shared/inline-markdown.mjs');
  for (const input of ['<img src=x onerror=alert(1)>', '[눌러](javascript:alert%281%29)']) {
    assert.doesNotMatch(renderInline(input), /<(?:img|script|a)\b/);
    assert.doesNotMatch(serializeInline(input), /(?<!\\)\[눌러\]/);
  }
});
