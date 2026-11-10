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
export type Publication = {
  slug: string;
  number: string;
  publishedAt: number;
  revision: number;
  commitSha: string;
  commitUrl: string;
  state: 'pending' | 'published' | 'failed';
  draft: boolean;
};
export type Draft = {
  id: string;
  title: string;
  category: string;
  emoji?: string;
  updatedAt: number;
  revision?: number;
  publication?: Publication | null;
  blocks: Block[];
  markdown?: string;
  origin?: { slug: string; treeSha: string; draft?: boolean } | null;
  files?: Record<string, string>;
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
