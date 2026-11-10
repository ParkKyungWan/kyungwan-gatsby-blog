import matter from 'gray-matter';
import * as yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

const escaped = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}()#+.!|>~-])/g, '\\$1');
const text = (value = '') =>
  escaped(value)
    .replace(/^[ \t]+|[ \t]+$/gm, (spaces) => [...spaces].map((char) => (char === '\t' ? '&#9;' : '&#32;')).join(''))
    .replace(/\n/g, '<br>');
export const publicImage = (postId, imageId) => `/api/posts/${postId}/images/${imageId}`;
export function serializeMarkdown(post) {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(
    new Date(post.publishedAt || post.updatedAt),
  );
  const data = {
    emoji: post.emoji ?? '📝',
    title: post.title,
    date,
    categories: post.category ? [post.category] : ['일상'],
    featured: false,
    draft: false,
  };
  let body = '',
    previous = '';
  for (const block of post.blocks) {
    let line;
    if (/^h[123]$/.test(block.type))
      line = `<!-- heading:section-${block.id} -->\n${'#'.repeat(Number(block.type[1]))} ${text(block.text)}`;
    else if (block.type === 'image')
      line = `${block.width && block.height ? `<!-- image:${block.width}x${block.height} -->\n` : ''}![${text(
        block.alt || '',
      ).replace(/<br>/g, '&#10;')}](${publicImage(post.id, block.src.split('/').pop())})${
        block.text ? `\n*${text(block.text)}*` : ''
      }`;
    else if (block.type === 'quote') line = '> ' + (text(block.text) || '<br>');
    else if (block.type === 'bullet') line = '- ' + text(block.text);
    else if (block.type === 'divider') line = '---';
    else line = block.text ? text(block.text) : '<br>';
    body += (body ? (block.type === 'bullet' && previous === 'bullet' ? '\n' : '\n\n') : '') + line;
    previous = block.type;
  }
  return (
    '---\n' +
    yaml.dump(data, { lineWidth: -1, noRefs: true, forceQuotes: true, quotingType: '"' }) +
    '---\n\n' +
    body +
    '\n'
  );
}
const plain = (node) =>
  node.type === 'html' && node.value === '<br>'
    ? '\n'
    : node.type === 'break'
    ? '\n'
    : node.value ?? (node.children || []).map(plain).join('');
const htmlEscape = (value = '') =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function parseMarkdown(source, imageDetails = {}) {
  const parsed = matter(source, { engines: { yaml: (text) => yaml.load(text, { schema: yaml.JSON_SCHEMA }) } });
  const ast = unified().use(remarkParse).parse(parsed.content);
  let marker, imageSize;
  const blocks = [];
  ast.children = ast.children.filter((node, index) => {
    const matched = node.type === 'html' && /^<!-- heading:(section-[a-zA-Z0-9-]{1,100}) -->$/.exec(node.value);
    if (matched) {
      marker = matched[1];
      return false;
    }
    const size = node.type === 'html' && /^<!-- image:(\d{1,5})x(\d{1,5}) -->$/.exec(node.value);
    if (size) {
      imageSize = { width: Number(size[1]), height: Number(size[2]) };
      return false;
    }
    const id = `md-${index}`;
    if (node.type === 'heading') {
      const headingId = marker || `section-${id}`;
      marker = undefined;
      node.data = { ...node.data, hProperties: { id: headingId } };
      blocks.push({ id: headingId.replace(/^section-/, ''), type: `h${node.depth}`, text: plain(node) });
    } else if (node.type === 'paragraph') {
      const image = node.children.find((child) => child.type === 'image');
      if (image) {
        const size = imageSize || imageDetails[image.url.split('/').pop()];
        imageSize = undefined;
        if (size) image.data = { hProperties: { width: size.width, height: size.height } };
        blocks.push({
          ...(size ? { width: size.width, height: size.height } : {}),
          id,
          type: 'image',
          src: image.url,
          alt: image.alt || '',
          text: node.children
            .filter((child) => child.type === 'emphasis')
            .map(plain)
            .join(''),
        });
      } else blocks.push({ id, type: 'paragraph', text: plain(node) });
    } else if (node.type === 'blockquote')
      blocks.push({
        id,
        type: 'quote',
        text: plain(node) === '\n' && node.children.length === 1 && node.children[0].type === 'html' ? '' : plain(node),
      });
    else if (node.type === 'thematicBreak') blocks.push({ id, type: 'divider', text: '' });
    else if (node.type === 'list')
      for (const [i, item] of node.children.entries())
        blocks.push({ id: `${id}-${i}`, type: 'bullet', text: plain(item) });
    else if (node.type === 'html' && node.value.trim() === '<br>') blocks.push({ id, type: 'paragraph', text: '' });
    return true;
  });
  const decorate = () => (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'img')
          return {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['gatsby-resp-image-wrapper'],
              ...(child.properties.width && child.properties.height
                ? {
                    style: `aspect-ratio:${child.properties.width}/${child.properties.height};max-width:${child.properties.width}px`,
                  }
                : {}),
            },
            children: [{ ...child, properties: { ...child.properties, loading: 'lazy', decoding: 'async' } }],
          };
        return child;
      });
    };
    walk(tree);
    tree.children = tree.children.map((child) =>
      child.type === 'element' && child.tagName === 'br'
        ? { type: 'element', tagName: 'p', properties: {}, children: [child] }
        : child,
    );
  };
  const processor = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: '' })
    .use(decorate)
    .use(rehypeStringify);
  const tree = await processor.run(ast);
  const headings = blocks.filter((block) => /^h[123]$/.test(block.type));
  const toc = headings.length
    ? `<div class="table-of-contents"><ul>${headings
        .map((block) => `<li><p><a href="#section-${htmlEscape(block.id)}">${htmlEscape(block.text)}</a></p></li>`)
        .join('')}</ul></div>`
    : '';
  return { data: parsed.data, blocks, html: toc + processor.stringify(tree) };
}
