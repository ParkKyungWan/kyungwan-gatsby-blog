import crypto from 'node:crypto';
import { prepareImage, imageInfo, imageInfos } from './images.mjs';
import { readIndex, publishPost, unpublishPost, readImage } from './content-store.mjs';
const ID = /^[a-zA-Z0-9-]{1,100}$/;
const TYPES = new Set(['paragraph', 'h1', 'h2', 'h3', 'quote', 'bullet', 'divider', 'image']);
const MAX_BODY = 4 * 1024 * 1024;
const response = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
const signature = (value, secret) => crypto.createHmac('sha256', secret).update(value).digest('hex');
const equal = (a, b) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
function authorized(request, secret, now) {
  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)writer_session=([0-9]+\.[a-f0-9]{64})/);
  if (!cookie) return false;
  const [expires, mac] = cookie[1].split('.');
  return Number(expires) > now && Number(expires) <= now + 8 * 3600000 && equal(mac, signature(expires, secret));
}
function validateDraft(input, id) {
  if (
    !input ||
    input.id !== id ||
    !ID.test(id) ||
    typeof input.title !== 'string' ||
    input.title.length > 300 ||
    typeof input.category !== 'string' ||
    input.category.length > 100 ||
    !Array.isArray(input.blocks) ||
    !input.blocks.length ||
    input.blocks.length > 1000
  )
    return null;
  if (input.emoji !== undefined && (typeof input.emoji !== 'string' || input.emoji.length > 32)) return null;
  const ids = new Set();
  const blocks = [];
  for (const b of input.blocks) {
    if (
      !b ||
      typeof b.id !== 'string' ||
      !ID.test(b.id) ||
      ids.has(b.id) ||
      !TYPES.has(b.type) ||
      typeof b.text !== 'string' ||
      b.text.length > 100000
    )
      return null;
    ids.add(b.id);
    const block = { id: b.id, type: b.type, text: b.text };
    if (b.type === 'image') {
      if (!/^\/api\/write\/images\/[a-zA-Z0-9-]{1,100}$/.test(b.src)) return null;
      block.src = b.src;
      block.alt = typeof b.alt === 'string' ? b.alt.slice(0, 300) : '';
      if (
        Number.isInteger(b.width) &&
        b.width > 0 &&
        b.width <= 20000 &&
        Number.isInteger(b.height) &&
        b.height > 0 &&
        b.height <= 20000
      ) {
        block.width = b.width;
        block.height = b.height;
      }
    }
    blocks.push(block);
  }
  return { id, title: input.title, category: input.category, emoji: input.emoji ?? '📝', blocks };
}
function createWriter({ store, env = process.env, local = false, localHosts = [], now = Date.now }) {
  return async function handle(request) {
    try {
      const url = new URL(request.url);
      const route = url.pathname
        .replace(/^\/api\/write\/?/, '')
        .replace(/^\/\.netlify\/functions\/writer\/?/, '')
        .replace(/\/$/, '');
      const requestOrigin = request.headers.get('origin');
      if (requestOrigin && requestOrigin !== url.origin) return response({ error: '허용되지 않은 요청입니다.' }, 403);
      const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      const localAccess = local && (isLoopback || localHosts.includes(url.hostname));
      const configured = Boolean(env.WRITE_PASSWORD?.length >= 8 && env.WRITE_SESSION_SECRET?.length >= 32);
      const secret = env.WRITE_SESSION_SECRET || '';
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (request.headers.get('origin') !== url.origin) return response({ error: '허용되지 않은 요청입니다.' }, 403);
        if (
          !(request.headers.get('content-type') || '').startsWith('application/json') &&
          !(route === 'images' && /^image\/(webp|jpeg)$/.test(request.headers.get('content-type') || ''))
        )
          return response({ error: 'JSON 요청이 필요합니다.' }, 415);
      }
      if (local && !localAccess) return response({ error: '허용된 로컬 또는 테일스케일 주소로 접속해 주세요.' }, 403);
      const signedIn = configured && authorized(request, secret, now());
      if (route === 'session' && request.method === 'GET')
        return response({
          signedIn,
          configured,
          storage: local ? 'local-server' : 'netlify',
        });
      if (!configured) return response({ error: '관리자 비밀번호와 세션 키를 서버에 설정해 주세요.' }, 503);
      const readJSON = async () => {
        const text = await request.text();
        if (Buffer.byteLength(text) > MAX_BODY)
          throw Object.assign(new Error('첨부 용량이 너무 커요. 사진을 줄여 주세요.'), { status: 413 });
        return JSON.parse(text);
      };
      if (route === 'session' && request.method === 'POST') {
        const input = await readJSON();
        if (
          typeof input.password !== 'string' ||
          !equal(signature(input.password, secret), signature(env.WRITE_PASSWORD || '', secret))
        )
          return response({ error: '비밀번호를 확인해 주세요.' }, 401);
        const expires = String(now() + 8 * 3600000);
        return response({ signedIn: true }, 200, {
          'Set-Cookie': `writer_session=${expires}.${signature(
            expires,
            secret,
          )}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}`,
        });
      }
      if (!signedIn) return response({ error: '로그인이 필요해요.' }, 401);
      if (route === 'session' && request.method === 'DELETE')
        return response({ signedIn: false }, 200, {
          'Set-Cookie': 'writer_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        });
      if (route === 'drafts' && request.method === 'GET') {
        const keys = await store.list('drafts/');
        const values = await Promise.all(keys.map((key) => store.read(key)));
        return response(
          values
            .filter(Boolean)
            .map(({ data: d }) => ({ id: d.id, title: d.title, category: d.category, updatedAt: d.updatedAt }))
            .sort((a, b) => b.updatedAt - a.updatedAt),
        );
      }
      const draftMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})$/);
      if (draftMatch) {
        const key = `drafts/${draftMatch[1]}`;
        const previous = await store.read(key);
        if (request.method === 'GET') {
          const published = (await readIndex(store)).data.posts[draftMatch[1]];
          const publication = published
            ? {
                slug: `/p/${draftMatch[1]}/`,
                publishedAt: published.publishedAt,
                revision: published.revision,
              }
            : null;
          const blocks = previous
            ? await Promise.all(
                previous.data.blocks.map(async (block) => {
                  if (block.type !== 'image' || block.width) return block;
                  const info = await imageInfo(store, block.src.split('/').pop());
                  return info ? { ...block, width: info.width, height: info.height } : block;
                }),
              )
            : [];
          return previous
            ? response({ ...previous.data, blocks, publication })
            : response({ error: '글을 찾을 수 없어요.' }, 404);
        }
        if (request.method === 'PUT') {
          const input = await readJSON();
          const draft = validateDraft(input, draftMatch[1]);
          if (!draft) return response({ error: '글 형식을 확인해 주세요.' }, 400);
          if ((input.revision ?? 0) !== (previous?.data.revision ?? 0))
            return response({ error: '다른 탭에서 저장된 글이 있어요. 현재 글을 내보낸 뒤 다시 불러와 주세요.' }, 409);
          const saved = { ...draft, updatedAt: now(), revision: (previous?.data.revision ?? 0) + 1 };
          const modified = await store.write(key, saved, previous?.etag);
          return modified
            ? response(saved)
            : response({ error: '다른 탭의 변경과 겹쳤어요. 현재 글을 내보낸 뒤 다시 불러와 주세요.' }, 409);
        }
      }
      const publicationMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})\/(publish|unpublish)$/);
      if (publicationMatch && request.method === 'POST') {
        const id = publicationMatch[1];
        const input = await readJSON();
        const previous = (await readIndex(store)).data.posts[id];
        if (publicationMatch[2] === 'unpublish') {
          await unpublishPost(store, id, input.revision);
          return response({ unpublished: true });
        }
        const source = await store.read(`drafts/${id}`);
        if (!source) return response({ error: '먼저 글을 저장해 주세요.' }, 404);
        if (input.revision !== source.data.revision)
          return response({ error: '다른 탭에서 글이 변경됐어요. 다시 불러온 후 발행해 주세요.' }, 409);
        const draft = validateDraft(source.data, id);
        if (!draft || !draft.title.trim() || !draft.blocks.some((block) => block.type === 'image' || block.text.trim()))
          return response({ error: '제목과 본문을 작성한 뒤 발행해 주세요.' }, 400);
        const images = [
          ...new Set(draft.blocks.filter((block) => block.type === 'image').map((block) => block.src.split('/').pop())),
        ];
        const details = await imageInfos(store, images);
        if (Object.values(details).some((info) => !info))
          return response({ error: '아직 저장되지 않은 사진이 있어요. 사진을 다시 첨부해 주세요.' }, 400);
        for (const block of draft.blocks.filter((block) => block.type === 'image')) {
          const info = details[block.src.split('/').pop()];
          if (info) {
            block.width = info.width;
            block.height = info.height;
          }
        }
        const published = {
          ...draft,
          title: draft.title.trim(),
          revision: source.data.revision,
          publishedAt: previous ? previous.publishedAt : now(),
          updatedAt: now(),
        };
        await publishPost(store, published, previous);
        return response({ slug: `/p/${id}/`, publishedAt: published.publishedAt, revision: published.revision });
      }
      if (route === 'images' && request.method === 'POST') {
        let image, type;
        if (request.headers.get('content-type')?.startsWith('image/')) {
          image = Buffer.from(await request.arrayBuffer());
          type = request.headers.get('content-type');
        } else {
          const input = await readJSON();
          const match =
            typeof input.data === 'string' && /^data:(image\/(webp|jpeg));base64,[A-Za-z0-9+/=]+$/.exec(input.data);
          if (!match) return response({ error: '지원하지 않는 이미지예요.' }, 400);
          image = Buffer.from(input.data.split(',')[1], 'base64');
          type = match[1];
        }
        if (image.length > MAX_BODY) return response({ error: '사진을 더 작게 변환해 주세요.' }, 413);
        if (
          !(
            type === 'image/webp' &&
            image.subarray(0, 4).toString() === 'RIFF' &&
            image.subarray(8, 12).toString() === 'WEBP'
          ) &&
          !(type === 'image/jpeg' && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff)
        )
          return response({ error: '이미지 파일을 확인해 주세요.' }, 400);
        const id = crypto.randomUUID();
        let info;
        try {
          info = await prepareImage(store, id, image, type);
        } catch (error) {
          if (error.invalidImage) return response({ error: '이미지 파일을 확인해 주세요.' }, 400);
          throw error;
        }
        return response({ src: `/api/write/images/${id}`, width: info.width, height: info.height }, 201);
      }
      const imageMatch = route.match(/^images\/([a-zA-Z0-9-]{1,100})$/);
      if (imageMatch && request.method === 'GET') {
        const image = await readImage(store, imageMatch[1]);
        return image
          ? new Response(image.data, {
              headers: {
                'Content-Type': image.type,
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
              },
            })
          : response({ error: '사진을 찾을 수 없어요.' }, 404);
      }
      return response({ error: '페이지를 찾을 수 없어요.' }, 404);
    } catch (error) {
      if (error instanceof SyntaxError) return response({ error: '요청 내용을 확인해 주세요.' }, 400);
      console.error('Writer request failed:', error.message);
      return response(
        { error: error.status ? error.message : '저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.' },
        error.status || 500,
      );
    }
  };
}
export { createWriter, validateDraft };
