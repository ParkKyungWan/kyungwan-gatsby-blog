const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseEnv } = require('node:util');
function fileStore(root) {
  let queue = Promise.resolve();
  const filename = (key, raw = false) => {
    if (!/^(drafts|images|image-meta|published|indexes)\/[a-zA-Z0-9-]{1,160}(?:\.(?:md|webp|jpg))?$/.test(key))
      throw new Error('Invalid key');
    return path.join(root, key + (raw ? '' : '.json'));
  };
  const readBytes = async (key, raw) => {
    try {
      const data = await fs.readFile(filename(key, raw));
      return { data, etag: crypto.createHash('sha256').update(data).digest('hex') };
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  };
  const read = async (key) => {
    const item = await readBytes(key, false);
    return item && { ...item, data: JSON.parse(item.data.toString()) };
  };
  const writeBytes = (key, data, etag, raw) => {
    const task = queue.then(async () => {
      const current = await readBytes(key, raw);
      if (current?.etag !== etag) return false;
      const dest = filename(key, raw);
      await fs.mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
      const temp = dest + '.' + crypto.randomUUID() + '.tmp';
      await fs.writeFile(temp, data, { mode: 0o600 });
      await fs.rename(temp, dest);
      return true;
    });
    queue = task.catch(() => {});
    return task;
  };
  return {
    read,
    readBinary: (key) => readBytes(key, true),
    async readText(key) {
      const item = await readBytes(key, true);
      return item && { ...item, data: item.data.toString('utf8') };
    },
    write: (key, data, etag) => writeBytes(key, JSON.stringify(data), etag, false),
    writeText: (key, data, etag) => writeBytes(key, data, etag, true),
    writeBinary: (key, data, etag) => writeBytes(key, data, etag, true),
    async list(prefix) {
      if (!/^(drafts|images|image-meta|published|indexes)\/$/.test(prefix)) throw new Error('Invalid prefix');
      try {
        return (await fs.readdir(path.join(root, prefix)))
          .filter((name) => /\.(json|md|webp|jpg)$/.test(name))
          .map((name) => prefix + name.replace(/\.json$/, ''));
      } catch (e) {
        if (e.code === 'ENOENT') return [];
        throw e;
      }
    },
  };
}
function installWriter(app, root) {
  const handler = Promise.all([
    Promise.all([import('./writer.mjs'), import('./public-posts.mjs')]),
    fs
      .readFile(path.join(root, 'allowed-hosts.json'), 'utf8')
      .then(JSON.parse)
      .catch((error) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      }),
    fs
      .readFile(path.resolve(root, '../.env.development'), 'utf8')
      .then((text) => ({ ...parseEnv(text), ...process.env }))
      .catch((error) => {
        if (error.code === 'ENOENT') return process.env;
        throw error;
      }),
  ]).then(([[{ createWriter }, { createPublicPosts }], hosts, env]) => {
    const store = fileStore(root);
    const publicPosts = createPublicPosts({ store });
    const writer = createWriter({
      store,
      local: true,
      env,
      localHosts: Array.isArray(hosts) ? hosts.filter((host) => typeof host === 'string') : [],
    });
    return (request) =>
      /^\/(api\/posts|p)(\/|$)/.test(new URL(request.url).pathname) ? publicPosts(request) : writer(request);
  });
  app.use(['/api/write', '/api/posts', '/p'], async (req, res) => {
    try {
      let body;
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.body) body = Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body);
        else {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 4 * 1024 * 1024) {
              res.status(413).json({ error: '첨부 용량이 너무 커요.' });
              return;
            }
            chunks.push(chunk);
          }
          body = Buffer.concat(chunks);
        }
      }
      const result = await (
        await handler
      )(
        new Request(`http://${req.headers.host}${req.originalUrl}`, { method: req.method, headers: req.headers, body }),
      );
      res.status(result.status);
      result.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      res.status(500).json({ error: '로컬 저장 서버에 연결하지 못했어요.' });
    }
  });
}
module.exports = { fileStore, installWriter };
