const textEffects = {
  흔들: 'wiggle',
  형광펜: 'highlight',
  밑줄: 'underline',
  느린파도: 'wave-slow',
  빠른파도: 'wave-fast',
};
const imageEffects = { 살랑: 'photo', 날리기: 'photo-fly' };
const escapeLetter = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const letterTag = (node) =>
  `<span class="motion-letter" style="--wave-order:${node.order}">${escapeLetter(node.value)}</span>`;
const openTag = (effect, node = {}) =>
  `<span data-post-motion="${effect}"${
    node.letterCount
      ? ` data-motion-ms="${node.duration}" style="--wave-step:${node.step}ms;--wave-duration:${node.duration}ms"`
      : ''
  }>`;
function makeMotion(effect, children) {
  const node = { type: 'motion', effect, children };
  if (!effect.startsWith('wave-')) return node;
  const contentText = (items) =>
    items.map((item) => (item.type === 'text' ? item.value : contentText(item.children || []))).join('');
  if (Array.from(contentText(children)).length > 200) return null;
  let count = 0;
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
  const split = (parent) => {
    if (!parent.children || (['inlineCode', 'code', 'html', 'motion'].includes(parent.type) && parent !== node)) return;
    parent.children = parent.children.flatMap((child) => {
      if (child.type !== 'text') {
        split(child);
        return [child];
      }
      const letters = segmenter
        ? Array.from(segmenter.segment(child.value), (part) => part.segment)
        : Array.from(child.value);
      return letters.map((value) =>
        /\s/.test(value) ? { type: 'text', value } : { type: 'motion-letter', value, order: count++ },
      );
    });
  };
  split(node);
  // Keep long selections readable; do not create unbounded animated DOM.

  node.letterCount = count;
  node.step = effect === 'wave-slow' ? 170 : Math.min(28, Math.round(1400 / Math.max(1, count - 1)));
  node.duration = node.step * Math.max(0, count - 1) + (effect === 'wave-slow' ? 130 : 300);
  return node;
}
function applyTextEffects(tree) {
  function walk(node) {
    if (!node.children || ['code', 'inlineCode', 'html', 'motion'].includes(node.type)) return;
    node.children.forEach(walk);
    const children = node.children;
    // Only inline siblings can form a phrase; never span paragraphs or images.
    if (!['paragraph', 'heading', 'emphasis', 'strong', 'link'].includes(node.type)) return;
    for (let i = 0; i < children.length; i++) {
      const first = children[i];
      if (first.type !== 'text') continue;
      const match = /\{\{(흔들|형광펜|밑줄|느린파도|빠른파도):/.exec(first.value);
      if (!match) continue;
      const start = match.index + match[0].length;
      let j = i,
        end = -1;
      for (; j < children.length; j++) {
        if (['image', 'html', 'motion'].includes(children[j].type)) break;
        if (children[j].type === 'text') {
          end = children[j].value.indexOf('}}', j === i ? start : 0);
          if (end >= 0) break;
          if (children[j].value.slice(j === i ? start : 0).includes('{{')) break;
        }
      }
      if (end < 0 || j === children.length) continue;
      const before = first.value.slice(0, match.index),
        after = children[j].value.slice(end + 2);
      const body =
        j === i
          ? [{ type: 'text', value: first.value.slice(start, end) }]
          : [
              { type: 'text', value: first.value.slice(start) },
              ...children.slice(i + 1, j),
              { type: 'text', value: children[j].value.slice(0, end) },
            ];
      if (!body.some((n) => n.type !== 'text' || n.value.trim())) continue;
      if (body.some((n) => n.type === 'text' && /\{\{|\}\}|\n/.test(n.value))) continue;
      const motion = makeMotion(textEffects[match[1]], body);
      if (!motion) continue;
      children.splice(
        i,
        j - i + 1,
        ...(before ? [{ type: 'text', value: before }] : []),
        motion,
        ...(after ? [{ type: 'text', value: after }] : []),
      );
      i += before ? 1 : 0;
    }
  }
  walk(tree);
  return tree;
}
function unwrapEffects(value) {
  return value.replace(/\{\{(?:흔들|형광펜|밑줄|느린파도|빠른파도):([^{}]+)\}\}/g, '$1');
}
function diagnostics(value) {
  const issues = [];
  for (const line of value.split('\n')) {
    const starts = line.match(/\{\{(?:흔들|형광펜|밑줄|느린파도|빠른파도):/g) || [];
    const complete = line.match(/\{\{(?:흔들|형광펜|밑줄|느린파도|빠른파도):[^{}]+\}\}/g) || [];
    if (starts.length !== complete.length)
      issues.push('효과의 닫는 기호 }}와 중첩 여부를 확인해 주세요. 효과는 한 문단 안에서 지정해 주세요.');
  }
  if (/\{\{(?:느린파도|빠른파도):[^{}]{201,}\}\}/u.test(value))
    issues.push('파도 효과는 한 번에 200자 이내로 지정해 주세요.');
  return [...new Set(issues)];
}
module.exports = { textEffects, imageEffects, openTag, letterTag, applyTextEffects, unwrapEffects, diagnostics };
