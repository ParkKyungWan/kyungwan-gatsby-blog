const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseEnv } = require('node:util');
function fileStore(root) {
  let queue = Promise.resolve();
  const filename = (key, raw = false) => {
    if (
      !/^(drafts|draft-assets|draft-files|maintenance)\//.test(key) ||
      key.split('/').some((part) => !part || part === '.' || part === '..') ||
      /[\\\x00-\x1f]/.test(key)
    )
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
    delete: (key) => fs.rm(filename(key, key.startsWith('draft-files/')), { force: true }),
    readBinary: (key) => readBytes(key, true),
    async readText(key) {
      const item = await readBytes(key, true);
      return item && { ...item, data: item.data.toString('utf8') };
    },
    write: (key, data, etag) => writeBytes(key, JSON.stringify(data), etag, false),
    writeText: (key, data, etag) => writeBytes(key, data, etag, true),
    writeBinary: (key, data, etag) => writeBytes(key, data, etag, true),
    async list(prefix) {
      if (
        !/^(drafts|draft-assets|draft-files|maintenance)\//.test(prefix) ||
        !prefix.endsWith('/') ||
        prefix
          .slice(0, -1)
          .split('/')
          .some((part) => !part || part === '.' || part === '..') ||
        /[\\\x00-\x1f]/.test(prefix)
      )
        throw new Error('Invalid prefix');
      const walk = async (dir, base) => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const paths = await Promise.all(
            entries.map(async (entry) =>
              entry.isDirectory()
                ? walk(path.join(dir, entry.name), base + entry.name + '/')
                : entry.isFile()
                ? [base + (prefix.startsWith('draft-files/') ? entry.name : entry.name.replace(/\.json$/, ''))]
                : [],
            ),
          );
          return paths.flat();
        } catch (error) {
          if (error.code === 'ENOENT') return [];
          throw error;
        }
      };
      return walk(path.join(root, prefix), prefix);
    },
  };
}
function installWriter(app, root) {
  const handler = Promise.all([
    import('./writer.mjs'),
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
  ]).then(([{ createWriter }, hosts, env]) => {
    const store = fileStore(root);
    const writer = createWriter({
      store,
      local: true,
      resetLegacy: async () => {
        if (await store.read('maintenance/legacy-reset')) return;
        for (const name of ['drafts', 'images', 'image-meta', 'published', 'indexes'])
          await fs.rm(path.join(root, name), { recursive: true, force: true });
        await store.write('maintenance/legacy-reset', { completed: true });
      },
      env,
      localHosts: Array.isArray(hosts) ? hosts.filter((host) => typeof host === 'string') : [],
    });
    return writer;
  });
  app.use('/api/write', async (req, res) => {
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
