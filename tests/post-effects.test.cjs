const { test } = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../plugins/gatsby-remark-post-motion');
async function fixture(source) {
  const { unified } = await import('unified');
  const { default: parse } = await import('remark-parse');
  return unified().use(parse).parse(source);
}
function all(node) {
  return [node, ...(node.children || []).flatMap(all)];
}
test('effects preserve inline bold and links identically in preview and published Markdown', async () => {
  const { renderInline, serializeInline } = await import('../shared/inline-markdown.mjs');
  const source = '앞 {{형광펜:**굵게**와 [링크](https://example.com)}} 뒤 {{밑줄:기억}}';
  const html = renderInline(source);
  assert.match(html, /data-post-motion="highlight"><strong>굵게<\/strong>와 <a/);
  assert.match(html, /data-post-motion="underline"/);
  const saved = serializeInline(source);
  assert.match(saved, /\{\{형광펜:\*\*굵게\*\*/);
  const tree = await fixture(saved);
  plugin({ markdownAST: tree });
  const values = all(tree);
  assert.ok(values.some((n) => n.type === 'strong'));
  assert.ok(values.some((n) => n.type === 'link'));
  assert.ok(values.some((n) => n.value === '<span data-post-motion="highlight">'));
});
test('broken or unknown effects remain readable; code and URLs are not interpreted', async () => {
  const { renderInline } = await import('../shared/inline-markdown.mjs');
  for (const source of [
    '{{형광펜:닫기 없음',
    '{{알수없음:글자}}',
    '`{{흔들:코드}}`',
    '[링크](https://example.com/{{흔들:주소}})',
  ]) {
    const tree = await fixture(source);
    plugin({ markdownAST: tree });
    assert.ok(!all(tree).some((n) => n.type === 'html' && /data-post-motion/.test(n.value)));
    assert.doesNotMatch(renderInline(source), /data-post-motion/);
  }
  assert.match(renderInline('{{흔들:<script>alert(1)</script>}}'), /&lt;script&gt;/);
});
test('photo markers retain native Gatsby image nodes and survive serialization', async () => {
  const { serializeDraft } = await import('../server/draft-bundles.mjs');
  const { renderMarkdownDocument } = await import('../shared/document-preview.mjs');
  const saved = serializeDraft({
    id: 'photo',
    createdAt: Date.now(),
    title: 'photo',
    category: '일상',
    blocks: [
      { id: 'img', type: 'image', motion: '살랑', src: '/api/write/drafts/photo/files/a.webp', alt: '사진', text: '' },
    ],
  });
  assert.match(saved, /<!-- motion:살랑 -->\n\n!\[/);
  const body = saved.split('---\n').slice(2).join('---\n');
  const tree = await fixture(body);
  plugin({ markdownAST: tree });
  assert.ok(all(tree).some((n) => n.type === 'image' && n.url === './a.webp'));
  assert.ok(all(tree).some((n) => n.value === '<div data-post-motion="photo">'));
  assert.match(renderMarkdownDocument(saved), /data-post-motion="photo"/);
});

test('wave preserves graphemes, formatting and Markdown while limiting generated elements', async () => {
  const { renderInline, serializeInline } = await import('../shared/inline-markdown.mjs');
  const input = '{{느린파도:가👨‍👩‍👧‍👦 **나다**}}';
  const html = renderInline(input);
  assert.match(html, /data-post-motion="wave-slow"/);
  assert.equal((html.match(/class="motion-letter"/g) || []).length, 4);
  assert.match(html, /<strong><span class="motion-letter"/);
  assert.equal(serializeInline(input), input);
  const tree = await fixture(serializeInline(input));
  plugin({ markdownAST: tree });
  assert.ok(all(tree).some((n) => n.type === 'html' && /data-post-motion="wave-slow"/.test(n.value)));
  assert.doesNotMatch(renderInline('{{빠른파도:' + '가'.repeat(201) + '}}'), /motion-letter/);
});

test('flying photo markers preserve image nodes for Gatsby and match the source preview', async () => {
  const { serializeDraft } = await import('../server/draft-bundles.mjs');
  const { renderMarkdownDocument } = await import('../shared/document-preview.mjs');
  const saved = serializeDraft({
    id: 'fly',
    title: 'fly',
    category: '일상',
    createdAt: Date.now(),
    blocks: [{ id: 'image', type: 'image', motion: '날리기', src: '/api/write/drafts/fly/files/photo.webp', text: '' }],
  });
  assert.match(saved, /<!-- motion:날리기 -->/);
  const tree = await fixture(saved.split('---\n').slice(2).join('---\n'));
  plugin({ markdownAST: tree });
  assert.ok(all(tree).some((n) => n.type === 'image' && n.url === './photo.webp'));
  assert.ok(all(tree).some((n) => n.value === '<div data-post-motion="photo-fly">'));
  assert.match(renderMarkdownDocument(saved), /data-post-motion="photo-fly"/);
});
