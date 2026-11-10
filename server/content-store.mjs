import crypto from 'node:crypto';
import { imageInfos } from './images.mjs';
import { serializeMarkdown, parseMarkdown } from './markdown.mjs';
const INDEX = 'indexes/posts';
export async function readImage(store, id) {
  for (const ext of ['webp', 'jpg']) {
    const value = await store.readBinary(`images/${id}.${ext}`);
    if (value) return { ...value, type: ext === 'jpg' ? 'image/jpeg' : 'image/webp' };
  }
  const legacy = await store.read(`images/${id}`);
  if (!legacy) return null;
  return {
    data: Buffer.from(legacy.data.data.split(',')[1], 'base64'),
    type: legacy.data.data.startsWith('data:image/jpeg;') ? 'image/jpeg' : 'image/webp',
  };
}
export async function saveImage(store, id, data, type) {
  return store.writeBinary(`images/${id}.${type === 'image/jpeg' ? 'jpg' : 'webp'}`, data);
}
function metadata(post, markdownKey) {
  const imageIds = [...new Set(post.blocks.filter((b) => b.type === 'image').map((b) => b.src.split('/').pop()))];
  return {
    id: post.id,
    slug: `/p/${post.id}/`,
    title: post.title,
    emoji: post.emoji,
    category: post.category,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    revision: post.revision,
    excerpt: post.blocks
      .filter((b) => b.type !== 'image')
      .map((b) => b.text)
      .join(' ')
      .slice(0, 240),
    previewImages: imageIds.slice(0, 3).map((id) => `/api/posts/${post.id}/images/${id}?size=preview`),
    imageIds,
    imageSizes: Object.fromEntries(
      post.blocks
        .filter((block) => block.type === 'image' && block.width)
        .map((block) => [block.src.split('/').pop(), { width: block.width, height: block.height }]),
    ),
    markdownKey,
  };
}
async function snapshot(store, post) {
  const key = `published/${post.id}-${crypto.randomUUID()}.md`;
  if (!(await store.writeText(key, serializeMarkdown(post)))) throw new Error('Markdown snapshot could not be saved');
  return metadata(post, key);
}
export async function readIndex(store) {
  const current = await store.read(INDEX);
  if (current) return current;
  // Upgrade old JSON publications only once; the index switches readers atomically.
  const posts = {};
  for (const key of await store.list('published/')) {
    if (key.endsWith('.md')) continue;
    const legacy = await store.read(key);
    if (legacy && !legacy.data.unpublished) posts[legacy.data.id] = await snapshot(store, legacy.data);
  }
  if (await store.write(INDEX, { version: 2, posts })) return store.read(INDEX);
  const winner = await store.read(INDEX);
  if (!winner) throw new Error('Publication index could not be created');
  return winner;
}
const conflict = () =>
  Object.assign(new Error('다른 탭에서 공개 글이 변경됐어요. 다시 불러와 주세요.'), { status: 409 });
export async function publishPost(store, post, expected) {
  const entry = await snapshot(store, post);
  for (let retry = 0; retry < 8; retry++) {
    const index = await readIndex(store);
    if (index.data.posts[post.id]?.markdownKey !== expected?.markdownKey) throw conflict();
    if (await store.write(INDEX, { version: 2, posts: { ...index.data.posts, [post.id]: entry } }, index.etag))
      return entry;
  }
  throw conflict();
}
export async function unpublishPost(store, id, revision) {
  for (let retry = 0; retry < 8; retry++) {
    const index = await readIndex(store);
    const previous = index.data.posts[id];
    if (!previous) return;
    if (previous.revision !== revision) throw conflict();
    const posts = { ...index.data.posts };
    delete posts[id];
    if (await store.write(INDEX, { version: 2, posts }, index.etag)) return;
  }
  throw conflict();
}
export async function readPost(store, entry) {
  const source = await store.readText(entry.markdownKey);
  if (!source) throw new Error('Published Markdown is missing');
  let parsed = await parseMarkdown(source.data, entry.imageSizes || {});
  const missing = parsed.blocks
    .filter((block) => block.type === 'image' && !block.width)
    .map((block) => block.src.split('/').pop());
  if (missing.length) {
    const info = await imageInfos(store, [...new Set(missing)]);
    const details = Object.fromEntries(
      Object.entries(info)
        .filter(([, value]) => value)
        .map(([id, value]) => [id, { width: value.width, height: value.height }]),
    );
    parsed = await parseMarkdown(source.data, { ...entry.imageSizes, ...details });
    if (Object.keys(details).length) {
      // Backfill layout metadata once; existing Markdown bytes and publication dates stay intact.
      for (let retry = 0; retry < 3; retry++) {
        const index = await readIndex(store);
        const current = index.data.posts[entry.id];
        if (!current || current.markdownKey !== entry.markdownKey) break;
        const updated = { ...current, imageSizes: { ...current.imageSizes, ...details } };
        if (await store.write(INDEX, { version: 2, posts: { ...index.data.posts, [entry.id]: updated } }, index.etag))
          break;
      }
    }
  }
  return { ...entry, blocks: parsed.blocks, html: parsed.html };
}
export const publicSummary = ({ markdownKey, imageIds, imageSizes, revision, ...entry }) => ({
  ...entry,
  previewImages: (imageIds || []).slice(0, 3).map((id) => `/api/posts/${entry.id}/images/${id}?size=preview`),
});
