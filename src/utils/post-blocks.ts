import { Block } from '../components/WriteEditor/model';
export const escapeHTML = (text = '') =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function renderBlocks(blocks: Block[]) {
  const headings = blocks.filter((block) => /^h[123]$/.test(block.type) && block.text.trim());
  let html = headings.length
    ? `<div class="table-of-contents"><ul>${headings
        .map((block) => `<li><p><a href="#section-${escapeHTML(block.id)}">${escapeHTML(block.text)}</a></p></li>`)
        .join('')}</ul></div>`
    : '';
  let list = false;
  for (const block of blocks) {
    if (block.type !== 'bullet' && list) {
      html += '</ul>';
      list = false;
    }
    const text = escapeHTML(block.text).replace(/\n/g, '<br>');
    if (block.type === 'bullet') {
      if (!list) {
        html += '<ul>';
        list = true;
      }
      html += `<li>${text}</li>`;
    } else if (/^h[123]$/.test(block.type))
      html += `<${block.type} id="section-${escapeHTML(block.id)}">${text}</${block.type}>`;
    else if (block.type === 'divider') html += '<hr>';
    else if (block.type === 'image')
      html += `<p><span class="gatsby-resp-image-wrapper"${
        block.width && block.height
          ? ` style="aspect-ratio:${block.width}/${block.height};max-width:${block.width}px"`
          : ''
      }><img${block.width && block.height ? ` width="${block.width}" height="${block.height}"` : ''} src="${escapeHTML(
        block.src,
      )}" alt="${escapeHTML(block.alt || block.text || '첨부 사진')}" loading="lazy" decoding="async"></span>${
        text ? `<em>${text}</em>` : ''
      }</p>`;
    else if (block.type === 'quote') html += `<blockquote><p>${text || '<br>'}</p></blockquote>`;
    else html += `<p>${text || '<br>'}</p>`;
  }
  return html + (list ? '</ul>' : '');
}
