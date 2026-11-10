import crypto from 'node:crypto';
import { deleteStoredDraft } from './draft-deletion.mjs';
import { createGitRepository, frontmatter, safeName, failure } from './git-repository.mjs';
import { assembleBundle, storeDraft, fileURL } from './draft-bundles.mjs';
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
      if (b.motion !== undefined && !['살랑', '날리기'].includes(b.motion)) return null;
      if (b.motion) block.motion = b.motion;
      if (typeof b.src !== 'string' || !b.src.startsWith(fileURL(id, ''))) return null;
      let name;
      try {
        name = decodeURIComponent(b.src.slice(fileURL(id, '').length));
      } catch {
        return null;
      }
      if (!safeName(name) || name === 'index.md') return null;
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
  if (input.markdown !== undefined && (typeof input.markdown !== 'string' || input.markdown.length > 2000000))
    return null;
  return {
    id,
    title: input.title,
    category: input.category,
    emoji: input.emoji ?? '📝',
    blocks,
    ...(input.markdown === undefined ? {} : { markdown: input.markdown }),
  };
}
function createWriter({
  store,
  env = process.env,
  local = false,
  localHosts = [],
  now = Date.now,
  repository = createGitRepository({ env }),
  resetLegacy = async () => {},
}) {
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
          !(
            /^drafts\/[a-zA-Z0-9-]+\/images$/.test(route) &&
            /^image\/(webp|jpeg)$/.test(request.headers.get('content-type') || '')
          )
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
          gitConfigured: repository.writable,
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
        await resetLegacy();
        const expires = String(now() + 8 * 3600000);
        return response({ signedIn: true }, 200, {
          'Set-Cookie': `writer_session=${expires}.${signature(
            expires,
            secret,
          )}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === 'https:' ? '; Secure' : ''}`,
        });
      }
      if (!signedIn) return response({ error: '로그인이 필요해요.' }, 401);
      await resetLegacy();
      if (route === 'session' && request.method === 'DELETE')
        return response({ signedIn: false }, 200, {
          'Set-Cookie': 'writer_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        });
      if (route === 'posts' && request.method === 'GET') return response(await repository.list());
      const importMatch = route.match(/^posts\/([a-z0-9-]+)\/import$/);
      if (importMatch && request.method === 'POST') {
        const slug = importMatch[1];
        const input = await readJSON();
        const bundle = await repository.readBundle(slug);
        const id = bundle.writerId || `git-${slug}`;
        const previous = await store.read(`drafts/${id}`);
        if (previous && !previous.data.deleted && !input.replace) return response(previous.data);
        const markdown = bundle.files['index.md'].toString('utf8');
        const { data } = frontmatter(markdown);
        const files = {};
        for (const [name, bytes] of Object.entries(bundle.files)) {
          if (name === 'index.md') continue;
          const key = `draft-files/${id}/assets/${crypto.randomUUID()}/${name}`;
          if (!(await store.writeBinary(key, bytes))) throw new Error('Could not import file');
          files[name] = key;
        }
        const imported = {
          id,
          title: data.title || slug,
          category: data.categories?.[0] || '',
          emoji: data.emoji || '',
          markdown,
          blocks: [{ id: 'raw-source', type: 'paragraph', text: '' }],
          files,
          origin: {
            slug,
            treeSha: bundle.treeSha,
            draft: Boolean(data.draft),
            baseRevision: (previous?.data.revision || 0) + 1,
          },
          createdAt: Date.parse(data.date + 'T00:00:00+09:00') || now(),
          updatedAt: now(),
        };
        return response(await storeDraft(store, imported, previous), 201);
      }
      if (route === 'drafts' && request.method === 'GET') {
        const values = await Promise.all((await store.list('drafts/')).map((key) => store.read(key)));
        return response(
          values
            .filter((value) => value && !value.data.deleted)
            .map(({ data: d }) => ({ id: d.id, title: d.title, category: d.category, updatedAt: d.updatedAt }))
            .sort((a, b) => b.updatedAt - a.updatedAt),
        );
      }
      const draftMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})$/);
      if (draftMatch) {
        const id = draftMatch[1];
        const previous = await store.read(`drafts/${id}`);
        if (request.method === 'DELETE') {
          const input = await readJSON();
          return response(await deleteStoredDraft(store, id, input.revision ?? 0, repository));
        }
        if (previous?.data.deleted)
          throw failure('삭제된 초안이에요. 새 글을 만들거나 Git에서 다시 불러와 주세요.', 410);
        if (request.method === 'GET')
          return previous ? response(previous.data) : response({ error: '글을 찾을 수 없어요.' }, 404);
        if (request.method === 'PUT') {
          const input = await readJSON();
          const draft = validateDraft(input, id);
          if (!draft) return response({ error: '글 형식을 확인해 주세요.' }, 400);
          if ((input.revision ?? 0) !== (previous?.data.revision ?? 0))
            throw failure('다른 탭에서 저장한 변경이 있어요. 다시 불러와 주세요.');
          const assets = await store.read(`draft-assets/${id}`);
          let files = { ...previous?.data.files, ...assets?.data };
          if (draft.markdown === undefined) {
            const names = draft.blocks
              .filter((block) => block.type === 'image')
              .map((block) => decodeURIComponent(block.src.slice(fileURL(id, '').length)));
            files = Object.fromEntries(Object.entries(files).filter(([name]) => names.includes(name)));
          }
          const saved = await storeDraft(
            store,
            {
              ...draft,
              files,
              origin: previous?.data.origin || null,
              createdAt: previous?.data.createdAt || now(),
              updatedAt: now(),
              publication: previous?.data.publication || null,
            },
            previous,
          );
          return response(saved);
        }
      }
      const publicationMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})\/(publish|unpublish|publication)$/);
      if (publicationMatch) {
        const id = publicationMatch[1];
        if (publicationMatch[2] === 'publication' && request.method === 'GET')
          return response(await repository.publication(id));
        if (request.method === 'POST' && publicationMatch[2] !== 'publication') {
          const input = await readJSON();
          const saved = await store.read(`drafts/${id}`);
          if (!saved || saved.data.deleted) throw failure('먼저 글을 저장해 주세요.', 404);
          if (input.revision !== saved.data.revision) throw failure('다른 탭에서 글이 변경됐어요. 다시 불러와 주세요.');
          const hidden = publicationMatch[2] === 'unpublish';
          if (hidden && !saved.data.origin && !saved.data.publication) throw failure('발행한 글이 없어요.', 400);
          // Unpublishing changes the last Git publication, not any newer unfinished edits.
          let bundle;
          if (hidden) {
            const published = await repository.publication(id);
            const slug = published?.number || saved.data.origin?.slug;
            if (!slug) throw failure('발행한 글이 없어요.', 400);
            bundle = await repository.readBundle(slug);
            const { setDraftFlag, validateMarkdown } = await import('./draft-bundles.mjs');
            bundle.files['index.md'] = Buffer.from(setDraftFlag(bundle.files['index.md'].toString(), true));
            validateMarkdown(bundle.files['index.md'].toString(), Object.keys(bundle.files), true);
          } else bundle = await assembleBundle(store, saved.data, { publish: true });
          const result = await repository.publish({
            id,
            revision: saved.data.revision,
            files: bundle.files,
            origin: saved.data.origin,
            draft: hidden,
          });
          // Git is the publication authority. A lost Blobs acknowledgement can be recovered via /publication.
          await store.write(`drafts/${id}`, { ...saved.data, publication: result }, saved.etag);
          return response(result);
        }
      }
      const uploadMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})\/images$/);
      if (uploadMatch && request.method === 'POST') {
        const id = uploadMatch[1];
        if ((await store.read(`drafts/${id}`))?.data.deleted) throw failure('삭제된 초안이에요.', 410);
        const image = Buffer.from(await request.arrayBuffer());
        if (image.length > MAX_BODY) throw failure('사진을 더 작게 변환해 주세요.', 413);
        const { default: sharp } = await import('sharp');
        let bytes, info;
        try {
          const metadata = await sharp(image, { limitInputPixels: 40000000 }).metadata();
          if (!['webp', 'jpeg'].includes(metadata.format)) throw new Error('Invalid format');
          const output = await sharp(image, { limitInputPixels: 40000000 })
            .rotate()
            .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 72 })
            .toBuffer({ resolveWithObject: true });
          bytes = output.data;
          info = output.info;
          if (bytes.length > 320 * 1024) throw new Error('Too large');
        } catch {
          throw failure('이미지 형식이나 용량을 확인해 주세요.', 400);
        }
        const name = `${crypto.randomUUID()}.webp`;
        const key = `draft-files/${id}/assets/${name}`;
        if (!(await store.writeBinary(key, bytes))) throw new Error('Could not save image');
        let written = false;
        for (let retry = 0; retry < 8 && !written; retry++) {
          const current = await store.read(`draft-assets/${id}`);
          written = await store.write(`draft-assets/${id}`, { ...current?.data, [name]: key }, current?.etag);
        }
        if (!written) throw failure('사진 저장이 겹쳤어요. 다시 첨부해 주세요.');
        if ((await store.read(`drafts/${id}`))?.data.deleted) {
          await store.delete(key);
          await store.delete(`draft-assets/${id}`);
          throw failure('삭제된 초안이에요.', 410);
        }
        return response({ src: fileURL(id, name), width: info.width, height: info.height }, 201);
      }
      const imageMatch = route.match(/^drafts\/([a-zA-Z0-9-]{1,100})\/files\/(.+)$/);
      if (imageMatch && request.method === 'GET') {
        let name;
        try {
          name = decodeURIComponent(imageMatch[2]);
        } catch {
          throw failure('파일 경로를 확인해 주세요.', 400);
        }
        if (!safeName(name) || name === 'index.md') throw failure('파일 경로를 확인해 주세요.', 400);
        const draft = await store.read(`drafts/${imageMatch[1]}`);
        const assets = await store.read(`draft-assets/${imageMatch[1]}`);
        if (draft?.data.deleted) throw failure('삭제된 초안이에요.', 410);
        const key = draft?.data.files?.[name] || assets?.data[name];
        const image = key ? await store.readBinary(key) : null;
        const type = /\.png$/i.test(name)
          ? 'image/png'
          : /\.jpe?g$/i.test(name)
          ? 'image/jpeg'
          : /\.webp$/i.test(name)
          ? 'image/webp'
          : /\.gif$/i.test(name)
          ? 'image/gif'
          : 'application/octet-stream';
        return image
          ? new Response(image.data, {
              headers: {
                'Content-Type': type,
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
              },
            })
          : response({ error: '파일을 찾을 수 없어요.' }, 404);
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
