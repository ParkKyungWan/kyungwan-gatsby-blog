import effects from './post-effects.cjs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
const parser = unified().use(remarkParse);
const html = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const literal = (value = '') => html(value).replace(/([\\`*_[\]{}()#+.!|>~-])/g, '\\$1');
const safeURL = (value) => /^(https?:\/\/|mailto:|#|\/(?!\/)|\.\.?\/)/i.test(value) && !/[\x00-\x20<>]/.test(value);
function convert(value, format) {
  const source = String(value || '');
  const tree = effects.applyTextEffects(parser.parse(source));
  const plain = (value) =>
    format === 'html' ? html(value).replace(/\n/g, '<br>') : literal(value).replace(/\n/g, '<br>');
  function render(node) {
    const raw = node.position ? source.slice(node.position.start.offset, node.position.end.offset) : node.value || '';
    const children = () => (node.children || []).map(render).join('');
    if (node.type === 'motion-letter') return format === 'html' ? effects.letterTag(node) : literal(node.value);
    if (node.type === 'motion') {
      const name = Object.keys(effects.textEffects).find((key) => effects.textEffects[key] === node.effect);
      return format === 'html'
        ? effects.openTag(node.effect, node) + children() + '</span>'
        : '{{' + name + ':' + children() + '}}';
    }
    if (node.type === 'text') return plain(node.value);
    if (node.type === 'strong') return format === 'html' ? `<strong>${children()}</strong>` : `**${children()}**`;
    if (node.type === 'emphasis') return format === 'html' ? `<em>${children()}</em>` : `*${children()}*`;
    if (node.type === 'inlineCode') return format === 'html' ? `<code>${html(node.value)}</code>` : raw;
    if (node.type === 'link' && safeURL(node.url))
      return format === 'html' ? `<a href="${html(node.url)}">${children()}</a>` : `[${children()}](<${node.url}>)`;
    if (node.type === 'break') return '<br>';
    return plain(raw);
  }
  // Block editing owns headings/lists. Only interpret inline syntax within paragraphs.
  let end = 0,
    result = '';
  for (const node of tree.children) {
    result += plain(source.slice(end, node.position.start.offset));
    result +=
      node.type === 'paragraph'
        ? node.children.map(render).join('')
        : plain(source.slice(node.position.start.offset, node.position.end.offset));
    end = node.position.end.offset;
  }
  return result + plain(source.slice(end));
}
export const renderInline = (value) => convert(value, 'html');
export const serializeInline = (value) => convert(value, 'markdown');
