import { serializeInline } from '../shared/inline-markdown.mjs';
import crypto from 'node:crypto';
import * as yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { frontmatter, safeName, failure } from './git-repository.mjs';
import content from '../scripts/content.cjs';
const escaped = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}()#+.!|>~-])/g, '\\$1');
const text = (value = '') =>
  serializeInline(value)
    .replace(/^[ \t]+|[ \t]+$/gm, (spaces) => [...spaces].map((char) => (char === '\t' ? '&#9;' : '&#32;')).join(''))
    .replace(/\n/g, '<br>');
export const fileURL = (id, name) =>
  `/api/write/drafts/${id}/files/${name.split('/').map(encodeURIComponent).join('/')}`;
export function serializeDraft(draft) {
  if (draft.markdown !== undefined) return draft.markdown;
  const data = {
    emoji: draft.emoji ?? '📝',
    title: draft.title,
    date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(draft.createdAt)),
    categories: draft.category.trim() ? [draft.category.trim()] : ['일상'],
    featured: false,
    draft: false,
  };
  const body = draft.blocks
    .map((block) => {
      if (block.type === 'image') {
        const name = decodeURIComponent(block.src.slice(fileURL(draft.id, '').length));
        return `${block.motion ? `<!-- motion:${block.motion} -->\n\n` : ''}![${escaped(
          block.alt || '',
        )}](<./${name}>)${block.text ? `\n\n*${text(block.text)}*` : ''}`;
      }
      if (/^h[123]$/.test(block.type)) return `${'#'.repeat(Number(block.type[1]))} ${text(block.text)}`;
      if (block.type === 'divider') return '---';
      if (block.type === 'quote') return '> ' + (text(block.text) || '<br>');
      if (block.type === 'bullet') return '- ' + text(block.text);
      return block.text ? text(block.text) : '<br>';
    })
    .join('\n\n');
  return (
    '---\n' +
    yaml.dump(data, { lineWidth: -1, noRefs: true, forceQuotes: true, quotingType: '"' }) +
    '---\n\n' +
    body +
    '\n'
  );
}
export function setDraftFlag(source, value) {
  return source.replace(
    /^(---\r?\n)([\s\S]*?)(\r?\n---)/,
    (all, open, data, close) =>
      open +
      (/^draft\s*:/m.test(data) ? data.replace(/^draft\s*:.*$/m, `draft: ${value}`) : data + `\ndraft: ${value}`) +
      close,
  );
}
export function validateMarkdown(source, names, publish = false) {
  let parsed;
  try {
    parsed = frontmatter(source);
  } catch {
    throw failure('Frontmatter 형식을 확인해 주세요.', 400);
  }
  if (publish) {
    const errors = content.validate(parsed.data);
    if (errors.length) throw failure(errors.join(' '), 400);
    if (!parsed.content.trim()) throw failure('본문을 입력해 주세요.', 400);
  }
  const ast = unified().use(remarkParse).parse(parsed.content);
  const inspectURL = (url, isImage) => {
    if (!isImage && /\/$/.test(url || '')) return;
    if (!url || /^(?:https?:|mailto:|tel:|#|\/)/i.test(url)) {
      if (isImage && /^\/api\/write/.test(url)) throw failure('임시 이미지 주소 대신 상대 경로를 사용해 주세요.', 400);
      return;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) throw failure('지원하지 않는 첨부 주소예요.', 400);
    let name;
    try {
      name = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\.\//, '');
    } catch {
      throw failure('첨부 파일 경로를 확인해 주세요.', 400);
    }
    if (!safeName(name) || !names.includes(name)) throw failure(`첨부 파일이 없어요: ${name}`, 400);
  };
  const visit = (node) => {
    if (['image', 'link', 'definition'].includes(node.type)) inspectURL(node.url, node.type === 'image');
    if (node.type === 'html')
      for (const match of node.value.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi))
        inspectURL(match[1], /src/i.test(match[0]));
    for (const child of node.children || []) visit(child);
  };
  visit(ast);
  return parsed.data;
}
export async function assembleBundle(store, draft, { publish = false, hidden = false } = {}) {
  const files = {};
  for (const [name, key] of Object.entries(draft.files || {})) {
    if (!safeName(name) || name === 'index.md' || !key.startsWith(`draft-files/${draft.id}/`))
      throw failure('첨부 파일 정보를 확인해 주세요.', 400);
    const item = await store.readBinary(key);
    if (!item) throw failure(`첨부 파일이 없어요: ${name}`, 400);
    files[name] = Buffer.from(item.data);
  }
  let source = serializeDraft(draft);
  if (publish) source = setDraftFlag(source, hidden);
  const data = validateMarkdown(source, Object.keys(files), publish);
  files['index.md'] = Buffer.from(source);
  if (Object.values(files).reduce((size, bytes) => size + bytes.length, 0) > 25 * 1024 * 1024)
    throw failure('글 묶음은 25MB 이하여야 해요.', 413);
  return { files, source, data };
}
export async function storeDraft(store, draft, previous) {
  const source = serializeDraft(draft);
  if (draft.markdown === undefined) validateMarkdown(source, Object.keys(draft.files || {}));
  else {
    // Incomplete Frontmatter or a half-typed image link must still be autosaved losslessly.
    // Strict validation belongs to publication, after the author finishes the draft.
    try {
      const { data } = frontmatter(source);
      draft = {
        ...draft,
        title: typeof data.title === 'string' ? data.title : draft.title,
        category:
          Array.isArray(data.categories) && typeof data.categories[0] === 'string'
            ? data.categories[0]
            : draft.category,
        emoji: typeof data.emoji === 'string' ? data.emoji : draft.emoji,
      };
    } catch {
      /* Preserve the exact unfinished source and its last valid display metadata. */
    }
  }
  const version = crypto.randomUUID();
  const markdownKey = `draft-files/${draft.id}/revisions/${version}/index.md`;
  if (!(await store.writeText(markdownKey, source))) throw new Error('Could not save Markdown');
  const saved = { ...draft, markdownKey, revision: (previous?.data.revision || 0) + 1 };
  if (!(await store.write(`drafts/${draft.id}`, saved, previous?.etag))) {
    await store.delete(markdownKey);
    throw failure('다른 탭에서 저장한 변경이 있어요. 다시 불러와 주세요.');
  }
  return saved;
}
