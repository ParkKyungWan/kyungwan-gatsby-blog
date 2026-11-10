const { applyTextEffects, openTag, letterTag, imageEffects } = require('../../shared/post-effects.cjs');
module.exports = ({ markdownAST }) => {
  applyTextEffects(markdownAST);
  function convert(node) {
    if (!node.children) return;
    const result = [];
    for (const child of node.children) {
      convert(child);
      if (child.type === 'motion-letter') result.push({ type: 'html', value: letterTag(child) });
      else if (child.type === 'motion')
        result.push({ type: 'html', value: openTag(child.effect, child) }, ...child.children, {
          type: 'html',
          value: '</span>',
        });
      else result.push(child);
    }
    node.children = result;
    // A standalone marker applies only to the immediately following image paragraph.
    for (let i = 0; i < node.children.length - 1; i++) {
      if (
        node.children[i].type === 'html' &&
        /^<!--\s*motion:(살랑|날리기)\s*-->$/.test(node.children[i].value.trim())
      ) {
        const next = node.children[i + 1];
        if (next.type === 'paragraph' && next.children?.some((n) => n.type === 'image')) {
          node.children.splice(
            i,
            2,
            {
              type: 'html',
              value: `<div data-post-motion="${
                imageEffects[node.children[i].value.match(/motion:(살랑|날리기)/)[1]]
              }">`,
            },
            next,
            {
              type: 'html',
              value: '</div>',
            },
          );
          i += 2;
        }
      }
    }
  }
  convert(markdownAST);
  return markdownAST;
};
