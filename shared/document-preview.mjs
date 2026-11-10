import { unified } from 'unified';
import remarkParse from 'remark-parse';
import effects from './post-effects.cjs';
const parser = unified().use(remarkParse);
const escape = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const safeURL = (value) => /^(https?:\/\/|mailto:|#|\/(?!\/)|\.\.?\/)/i.test(value) && !/[\x00-\x20<>]/.test(value);
export function renderMarkdownDocument(markdown, imageURL = (value) => value) {
  const body = String(markdown).replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const tree = effects.applyTextEffects(parser.parse(body));
  function render(node) {
    const children = () => node.children?.map(render).join('') || '';
    switch (node.type) {
      case 'root': {
        let html = '';
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i],
            next = node.children[i + 1];
          if (
            child.type === 'html' &&
            /^<!--\s*motion:(살랑|날리기)\s*-->$/.test(child.value.trim()) &&
            next?.type === 'paragraph' &&
            next.children.some((n) => n.type === 'image')
          ) {
            html +=
              `<div data-post-motion="${effects.imageEffects[child.value.match(/motion:(살랑|날리기)/)[1]]}">` +
              render(next) +
              '</div>';
            i++;
          } else html += render(child);
        }
        return html;
      }
      case 'text':
        return escape(node.value).replace(/\n/g, '<br>');
      case 'motion-letter':
        return effects.letterTag(node);
      case 'motion':
        return effects.openTag(node.effect, node) + children() + '</span>';
      case 'paragraph':
        return '<p>' + children() + '</p>';
      case 'heading':
        return `<h${node.depth}>${children()}</h${node.depth}>`;
      case 'strong':
        return '<strong>' + children() + '</strong>';
      case 'emphasis':
        return '<em>' + children() + '</em>';
      case 'inlineCode':
        return '<code>' + escape(node.value) + '</code>';
      case 'code':
        return '<pre><code>' + escape(node.value) + '</code></pre>';
      case 'blockquote':
        return '<blockquote>' + children() + '</blockquote>';
      case 'list':
        return node.ordered
          ? `<ol start="${Number(node.start) || 1}">${children()}</ol>`
          : '<ul>' + children() + '</ul>';
      case 'listItem':
        return '<li>' + children() + '</li>';
      case 'thematicBreak':
        return '<hr>';
      case 'break':
        return '<br>';
      case 'link':
        return safeURL(node.url) ? `<a href="${escape(node.url)}">${children()}</a>` : children();
      case 'image': {
        const url = imageURL(node.url);
        return safeURL(url) ? `<img src="${escape(url)}" alt="${escape(node.alt)}" loading="lazy">` : escape(node.alt);
      }
      case 'html':
        return /^<!--/.test(node.value) ? '' : escape(node.value);
      default:
        return children();
    }
  }
  return render(tree);
}
