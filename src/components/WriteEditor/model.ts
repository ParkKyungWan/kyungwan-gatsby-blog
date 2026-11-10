export type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'divider' | 'image';
export type Block = {
  id: string;
  type: BlockType;
  text: string;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
};
export type Publication = { slug: string; publishedAt: number; revision: number };
export type Draft = {
  id: string;
  title: string;
  category: string;
  emoji?: string;
  updatedAt: number;
  revision?: number;
  publication?: Publication | null;
  blocks: Block[];
};
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const makeBlock = (type: BlockType = 'paragraph', text = ''): Block => ({ id: uid(), type, text });
export const makeDraft = (): Draft => ({
  id: uid(),
  title: '',
  emoji: '📝',
  category: '',
  updatedAt: Date.now(),
  blocks: [makeBlock()],
});
export const isHeading = (block: Block) => /^h[123]$/.test(block.type);
export const wordCount = (draft: Draft) =>
  [draft.title, ...draft.blocks.map((block) => block.text)].join('').replace(/\s/g, '').length;

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function exportHTML(draft: Draft): string {
  const body = draft.blocks
    .map((block) => {
      const text = escape(block.text).replace(/\n/g, '<br>');
      if (block.type === 'divider') return '<hr>';
      if (block.type === 'image')
        return /^data:image\/(jpeg|png|webp);base64,/.test(block.src ?? '')
          ? `<figure><img src="${block.src}" alt="${escape(block.alt ?? '')}"><figcaption>${text}</figcaption></figure>`
          : '';
      const tag = isHeading(block) ? block.type : block.type === 'quote' ? 'blockquote' : 'p';
      return `<${tag} id="${escape(block.id)}">${block.type === 'bullet' ? '• ' : ''}${text}</${tag}>`;
    })
    .join('\n');
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(
    draft.title || '제목 없는 글',
  )}</title><style>body{max-width:720px;margin:80px auto;padding:0 24px;font-family:system-ui,sans-serif;line-height:1.9;color:#232326;overflow-wrap:anywhere}h1,h2,h3{line-height:1.5;margin-top:2em}img{max-width:100%;height:auto}figure{margin:32px 0}figcaption{color:#808388;font-size:14px;text-align:center}blockquote{border-left:2px solid #ccc;margin:24px 0;padding-left:20px}hr{border:0;border-top:1px solid #ddd;margin:36px 0}</style><article><p>${escape(
    draft.category,
  )}</p><h1>${escape(draft.title || '제목 없는 글')}</h1>${body}</article></html>`;
}
