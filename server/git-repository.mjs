import crypto from 'node:crypto';
import { githubFailure } from './github-api-errors.mjs';
import matter from 'gray-matter';
import * as yaml from 'js-yaml';
const REGISTRY = '.writer/publications.json';
export const failure = (message, status = 409) => Object.assign(new Error(message), { status });
export const safeName = (name) =>
  typeof name === 'string' &&
  name.length <= 240 &&
  !/[\\\x00-\x1f]/.test(name) &&
  !name.startsWith('/') &&
  name
    .split('/')
    .every(
      (part) =>
        part && part !== '.' && part !== '..' && !['.git', '__proto__', 'prototype', 'constructor'].includes(part),
    );
export const gitBlobHash = (bytes) =>
  crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export function frontmatter(markdown) {
  return matter(markdown, { engines: { yaml: (value) => yaml.load(value, { schema: yaml.JSON_SCHEMA }) } });
}
async function batched(values, action) {
  const output = [];
  for (let start = 0; start < values.length; start += 4)
    output.push(...(await Promise.all(values.slice(start, start + 4).map(action))));
  return output;
}
export function createGitRepository({ env = process.env, fetcher = fetch } = {}) {
  const repository = env.WRITE_GITHUB_REPOSITORY?.trim() || 'ParkKyungWan/kyungwan-gatsby-blog';
  const token = env.WRITE_GITHUB_TOKEN?.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw failure('Git 저장소 설정을 확인해 주세요.', 503);
  const base = `https://api.github.com/repos/${repository}`;
  const writable = Boolean(token);
  async function api(path, method = 'GET', body) {
    if (method !== 'GET' && !writable) throw failure('서버에 WRITE_GITHUB_TOKEN을 설정해 주세요.', 503);
    const result = await fetcher(base + path, {
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kyungwan-gatsby-writer',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!result.ok) {
      const details = await result.json().catch(() => ({}));
      const requestId = result.headers
        .get('x-github-request-id')
        ?.replace(/[^a-zA-Z0-9:-]/g, '')
        .slice(0, 80);
      console.error('GitHub request rejected', {
        status: result.status,
        method,
        endpoint: path.split('?')[0],
        requestId,
      });
      throw githubFailure({
        status: result.status,
        method,
        path,
        message: String(details.message || ''),
        remaining: result.headers.get('x-ratelimit-remaining'),
        requestId,
      });
    }
    return result.json();
  }
  async function snapshot() {
    const head = await api('/git/ref/heads/main');
    const commit = await api(`/git/commits/${head.object.sha}`);
    const tree = await api(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw failure('Git 파일 목록이 너무 커요. 저장소를 확인해 주세요.', 503);
    return { sha: head.object.sha, tree: commit.tree.sha, entries: tree.tree };
  }
  async function bytes(entry) {
    const blob = await api(`/git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64') throw failure('지원하지 않는 Git 파일 형식이에요.', 422);
    return Buffer.from(blob.content.replace(/\s/g, ''), 'base64');
  }
  async function registry(state) {
    const entry = state.entries.find((item) => item.path === REGISTRY);
    return entry ? JSON.parse((await bytes(entry)).toString('utf8')) : { version: 1, nextId: 1, posts: {} };
  }
  const folder = (state, slug) => state.entries.find((item) => item.path === `content/${slug}` && item.type === 'tree');
  async function readBundle(slug, state = null) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw failure('글 주소를 확인해 주세요.', 400);
    state ||= await snapshot();
    const directory = folder(state, slug);
    if (!directory) throw failure('글을 찾을 수 없어요.', 404);
    const files = {};
    let size = 0;
    const entries = state.entries.filter((item) => item.path.startsWith(`content/${slug}/`));
    if (entries.length > 150) throw failure('첨부 파일이 너무 많아요.', 413);
    const attachments = entries.filter((item) => item.type === 'blob');
    for (const entry of attachments) {
      const name = entry.path.slice(`content/${slug}/`.length);
      if (!safeName(name) || entry.mode !== '100644') throw failure('안전하게 불러올 수 없는 파일 경로예요.', 422);
      size += entry.size || 0;
    }
    if (size > 25 * 1024 * 1024) throw failure('글 묶음은 25MB 이하여야 해요.', 413);
    await batched(attachments, async (entry) => {
      files[entry.path.slice(`content/${slug}/`.length)] = await bytes(entry);
    });
    if (!files['index.md']) throw failure('index.md가 없는 글이에요.', 422);
    const index = await registry(state);
    const writerId = Object.keys(index.posts).find((id) => index.posts[id].slug === slug);
    return { slug, treeSha: directory.sha, files, writerId };
  }
  async function latestCommit(state, slug) {
    const commits = await api(`/commits?sha=${state.sha}&path=${encodeURIComponent(`content/${slug}`)}&per_page=1`);
    return commits[0]?.sha || state.sha;
  }
  async function publication(id, knownState = null) {
    const state = knownState || (await snapshot());
    const entry = (await registry(state)).posts[id];
    if (!entry || entry.deleted) return null;
    const sha = await latestCommit(state, entry.slug);
    let status = 'pending';
    try {
      const result = await api(`/commits/${sha}/status`);
      const deploys = result.statuses.filter(
        (item) => /netlify/i.test(item.context) && !/preview|branch/i.test(item.context),
      );
      if (deploys.length)
        status = deploys.some((item) => ['failure', 'error'].includes(item.state))
          ? 'failed'
          : deploys.every((item) => item.state === 'success')
          ? 'published'
          : 'pending';
    } catch {
      /* Unknown deployment status remains pending. */
    }
    return {
      slug: `/${entry.slug}/`,
      number: entry.slug,
      revision: entry.revision,
      commitSha: sha,
      publishedAt: entry.publishedAt,
      treeSha: entry.treeSha,
      state: status,
      draft: entry.draft,
      commitUrl: `https://github.com/${repository}/commit/${sha}`,
    };
  }
  return {
    writable,
    snapshot,
    readBundle,
    async list() {
      const state = await snapshot();
      const posts = [];
      for (const entry of state.entries.filter((item) => /^content\/[a-z0-9-]+\/index\.md$/.test(item.path))) {
        const slug = entry.path.split('/')[1];
        const { data } = frontmatter((await bytes(entry)).toString('utf8'));
        posts.push({
          slug,
          title: data.title || slug,
          category: data.categories?.[0] || '',
          date: data.date,
          draft: Boolean(data.draft),
        });
      }
      return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },
    publication,
    async deletePublished(id) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const state = await snapshot();
        const index = await registry(state);
        const previous = index.posts[id];
        if (!previous) return { gitDeleted: false };
        if (previous.deleted) return { gitDeleted: true };
        const directory = folder(state, previous.slug);
        if (directory && directory.sha !== previous.treeSha)
          throw failure('Git에서 이 글이 변경됐어요. 최신 글을 다시 불러온 뒤 발행하고 삭제해 주세요.');
        index.posts[id] = { ...previous, deleted: true };
        const receipt = await api('/git/blobs', 'POST', {
          content: JSON.stringify(index, null, 2) + '\n',
          encoding: 'utf-8',
        });
        const tree = await api('/git/trees', 'POST', {
          base_tree: state.tree,
          tree: [
            ...(directory ? [{ path: `content/${previous.slug}`, mode: '040000', type: 'tree', sha: null }] : []),
            { path: REGISTRY, mode: '100644', type: 'blob', sha: receipt.sha },
          ],
        });
        const commit = await api('/git/commits', 'POST', {
          message: `Delete post ${previous.slug} (draft ${id})`,
          tree: tree.sha,
          parents: [state.sha],
        });
        try {
          await api('/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
          return { gitDeleted: true };
        } catch (error) {
          if (error.status !== 409 || attempt === 3) throw error;
        }
      }
    },
    async publish({ id, revision, files, origin = null, draft = false }) {
      if (!writable) throw failure('서버에 WRITE_GITHUB_TOKEN을 설정해 주세요.', 503);
      const names = Object.keys(files).sort();
      if (!files['index.md'] || names.some((name) => !safeName(name))) throw failure('글 묶음을 확인해 주세요.', 400);
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(names.map((name) => [name, gitBlobHash(files[name])])))
        .digest('hex');
      for (let attempt = 0; attempt < 4; attempt++) {
        const state = await snapshot();
        const index = await registry(state);
        const previous = index.posts[id];
        if (previous?.deleted) throw failure('삭제된 글이에요. 새 글로 작성해 주세요.', 410);
        if (previous?.revision > revision) throw failure('더 최신 초안이 이미 발행됐어요. 다시 불러와 주세요.');
        if (previous?.revision === revision && previous.hash === hash && previous.draft === draft)
          return publication(id, state);
        if (previous?.revision === revision && previous.hash !== hash && previous.draft === draft)
          throw failure('같은 초안 버전의 내용이 달라요. 다시 저장해 주세요.');
        let slug = previous?.slug || origin?.slug;
        if (slug) {
          const expected =
            previous && previous.revision >= (origin?.baseRevision || 0) ? previous.treeSha : origin?.treeSha;
          if (folder(state, slug)?.sha !== expected)
            throw failure('Git에서 이 글이 변경됐어요. 최신 글을 다시 불러와 주세요.');
        } else {
          const used = state.entries
            .filter((item) => /^content\/\d+$/.test(item.path))
            .map((item) => Number(item.path.split('/')[1]));
          slug = String(Math.max(index.nextId || 1, ...used.map((value) => value + 1)));
          if (!Number.isSafeInteger(Number(slug))) throw failure('글 번호 범위를 초과했어요.', 422);
        }
        const entries = await batched(names, async (name) => {
          const blob = await api('/git/blobs', 'POST', { content: files[name].toString('base64'), encoding: 'base64' });
          return { path: name, mode: '100644', type: 'blob', sha: blob.sha };
        });
        const subtree = await api('/git/trees', 'POST', { tree: entries });
        const publishedAt =
          previous?.publishedAt || Date.parse(frontmatter(files['index.md'].toString()).data.date + 'T00:00:00+09:00');
        index.posts[id] = { slug, revision, hash, treeSha: subtree.sha, publishedAt, draft };
        index.nextId = Math.max(index.nextId || 1, /^\d+$/.test(slug) ? Number(slug) + 1 : 1);
        const registryBlob = await api('/git/blobs', 'POST', {
          content: JSON.stringify(index, null, 2) + '\n',
          encoding: 'utf-8',
        });
        const tree = await api('/git/trees', 'POST', {
          base_tree: state.tree,
          tree: [
            { path: `content/${slug}`, mode: '040000', type: 'tree', sha: subtree.sha },
            { path: REGISTRY, mode: '100644', type: 'blob', sha: registryBlob.sha },
          ],
        });
        const commit = await api('/git/commits', 'POST', {
          message: `${draft ? 'Unpublish' : 'Publish'} post ${slug} (draft ${id}, revision ${revision})`,
          tree: tree.sha,
          parents: [state.sha],
        });
        try {
          await api('/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: false });
          return {
            slug: `/${slug}/`,
            number: slug,
            revision,
            commitSha: commit.sha,
            publishedAt,
            treeSha: subtree.sha,
            state: 'pending',
            draft,
            commitUrl: `https://github.com/${repository}/commit/${commit.sha}`,
          };
        } catch (error) {
          if (error.status !== 409 || attempt === 3) throw error;
        }
      }
    },
  };
}
