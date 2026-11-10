import { imageInfo, publicImageData } from './images.mjs';
import { readIndex, readPost, publicSummary } from './content-store.mjs';
import { escapeHTML, renderBlocks, renderPublishedPost } from './generated/published-renderer.mjs';
import staticPosts from './generated/static-posts.mjs';
export { escapeHTML, renderBlocks };
export const publicSlug = (id) => `/p/${id}/`;
export function publicBlocks(post) {
  return post.blocks.map((block) =>
    block.type === 'image' ? { ...block, src: `/api/posts/${post.id}/images/${block.src.split('/').pop()}` } : block,
  );
}
function summary(post) {
  const blocks = publicBlocks(post);
  return {
    id: post.id,
    slug: publicSlug(post.id),
    title: post.title,
    emoji: post.emoji,
    category: post.category,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    excerpt: post.blocks
      .filter((block) => block.type !== 'image')
      .map((block) => block.text)
      .join(' ')
      .slice(0, 240),
    previewImages: blocks
      .filter((block) => block.type === 'image')
      .slice(0, 3)
      .map((block) => block.src),
  };
}
function postNode(post, html = '') {
  return {
    id: post.id,
    excerpt: post.excerpt || '',
    html,
    fields: { slug: post.slug || publicSlug(post.id) },
    frontmatter: {
      title: post.title,
      emoji: post.emoji,
      categories: post.category ? [post.category] : [],
      author: 'KyungWan',
      date: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
        .format(new Date(post.publishedAt))
        .replace(/-/g, '.'),
    },
    previewImages: (post.previewImages || []).map((src) => ({ childImageSharp: { resize: { src } } })),
  };
}
export function renderPostPage(post, origin, neighbors = {}) {
  const info = post.markdownKey ? publicSummary(post) : summary(post);
  const data = {
    cur: postNode(info, post.html ?? renderBlocks(publicBlocks(post))),
    prev: neighbors.prev ? postNode(neighbors.prev) : undefined,
    next: neighbors.next ? postNode(neighbors.next) : undefined,
  };
  const serialized = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const title = escapeHTML(post.title);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ruddhks.my | ${title}</title><meta name="description" content="${escapeHTML(
    info.excerpt,
  )}"><link rel="canonical" href="${escapeHTML(
    origin + info.slug,
  )}"><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeHTML(
    info.excerpt,
  )}"><meta property="og:type" content="article"><meta property="og:url" content="${escapeHTML(origin + info.slug)}">${
    info.previewImages[0] ? `<meta property="og:image" content="${escapeHTML(origin + info.previewImages[0])}">` : ''
  }<link rel="stylesheet" href="/fonts/fonts.css"><link rel="stylesheet" href="/published/post.css"></head><body><div id="published-root">${renderPublishedPost(
    data,
  )}</div><script id="published-data" type="application/json">${serialized}</script><script defer src="/published/post-client.js"></script></body></html>`;
}
async function navigationFor(store, slug) {
  const posts = [...staticPosts, ...Object.values((await readIndex(store)).data.posts).map(publicSummary)].sort(
    (a, b) => b.publishedAt - a.publishedAt || a.slug.localeCompare(b.slug),
  );
  const normalized = slug.replace(/\/+$/, '') + '/';
  const index = posts.findIndex((item) => item.slug === normalized);
  if (index < 0) return null;
  // Match the original Gatsby template: previous is older, next is newer.
  return { prev: posts[index + 1], next: posts[index - 1] };
}

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
export function createPublicPosts({ store }) {
  return async (request) => {
    try {
      const url = new URL(request.url);
      const path = url.pathname
        .replace(/^\/\.netlify\/functions\/posts\/page/, '/p')
        .replace(/^\/\.netlify\/functions\/posts/, '/api/posts')
        .replace(/\/$/, '');
      if (!['GET', 'HEAD'].includes(request.method)) return json({ error: '허용되지 않은 요청입니다.' }, 405);
      if (path === '/api/posts/navigation') {
        const neighbors = await navigationFor(store, url.searchParams.get('slug') || '');
        return neighbors
          ? json({
              prev: neighbors.prev ? postNode(neighbors.prev) : null,
              next: neighbors.next ? postNode(neighbors.next) : null,
            })
          : json({ error: '글을 찾을 수 없어요.' }, 404);
      }
      if (path === '/api/posts') {
        const index = await readIndex(store);
        return json(
          Object.values(index.data.posts)
            .map(publicSummary)
            .sort((a, b) => b.publishedAt - a.publishedAt),
        );
      }
      const match = path.match(/^\/(?:api\/posts|p)\/([a-zA-Z0-9-]{1,100})(?:\/images\/([a-zA-Z0-9-]{1,100}))?$/);
      const entry = match ? (await readIndex(store)).data.posts[match[1]] : null;
      if (!entry)
        return path.startsWith('/p/')
          ? new Response(
              '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>글을 찾을 수 없어요</title><h1>글을 찾을 수 없어요.</h1><p>비공개로 전환되었거나 없는 글이에요.</p><a href="/posts/">글 목록으로 돌아가기</a></html>',
              { status: 404, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } },
            )
          : json({ error: '글을 찾을 수 없어요.' }, 404);

      if (match[2]) {
        if (!entry.imageIds.includes(match[2])) return json({ error: '사진을 찾을 수 없어요.' }, 404);
        const info = await imageInfo(store, match[2]);
        const preview = url.searchParams.get('size') === 'preview';
        const etag = preview ? info?.thumbnailEtag : info?.etag;
        const imageHeaders = {
          ...headers,
          'Cache-Control': 'public, max-age=300, must-revalidate',
          'Netlify-CDN-Cache-Control': 'no-store',
          ...(etag ? { ETag: etag } : {}),
        };
        if (
          etag &&
          request.headers
            .get('if-none-match')
            ?.split(',')
            .map((value) => value.trim().replace(/^W\//, ''))
            .some((value) => value === etag || value === '*')
        )
          return new Response(null, { status: 304, headers: imageHeaders });
        const image = await publicImageData(store, match[2], preview, info);
        return image
          ? new Response(request.method === 'HEAD' ? null : image.data, {
              headers: {
                ...imageHeaders,
                'Content-Type': image.type,
              },
            })
          : json({ error: '사진을 찾을 수 없어요.' }, 404);
      }
      const post = await readPost(store, entry);
      if (path.startsWith('/p/'))
        return new Response(
          request.method === 'HEAD' ? null : renderPostPage(post, url.origin, await navigationFor(store, post.slug)),
          {
            headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
          },
        );
      return json({
        ...publicSummary(entry),
        blocks: publicBlocks(post),
        html: post.html ?? renderBlocks(publicBlocks(post)),
      });
    } catch (error) {
      console.error('Public post read failed:', error.message);
      return json({ error: '글을 불러오지 못했어요.' }, 503);
    }
  };
}
