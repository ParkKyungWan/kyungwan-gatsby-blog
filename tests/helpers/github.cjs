const crypto = require('node:crypto');
const sha = (bytes) => crypto.createHash('sha1').update(bytes).digest('hex');
const blobHash = (bytes) => sha(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));
function github(initial = {}) {
  const blobs = new Map(),
    trees = new Map(),
    commits = new Map(),
    requests = [];
  const blob = (bytes) => {
    bytes = Buffer.from(bytes);
    const id = blobHash(bytes);
    blobs.set(id, bytes);
    return id;
  };
  function tree(flat) {
    const id = sha(JSON.stringify(Object.entries(flat).sort()));
    trees.set(id, { ...flat });
    return id;
  }
  function directory(flat, prefix) {
    return Object.fromEntries(
      Object.entries(flat)
        .filter(([name]) => name.startsWith(prefix))
        .map(([name, value]) => [name.slice(prefix.length), value]),
    );
  }
  function flattenEntries(flat) {
    const result = Object.entries(flat).map(([path, id]) => ({
      path,
      sha: id,
      type: 'blob',
      mode: '100644',
      size: blobs.get(id).length,
    }));
    const dirs = new Set();
    for (const name of Object.keys(flat)) {
      const parts = name.split('/');
      parts.pop();
      while (parts.length) {
        dirs.add(parts.join('/'));
        parts.pop();
      }
    }
    for (const path of dirs)
      result.push({ path, type: 'tree', mode: '040000', sha: tree(directory(flat, path + '/')) });
    return result;
  }
  function makeCommit(treeSha, parents = [], message = 'commit') {
    const id = sha(JSON.stringify({ treeSha, parents, message }));
    commits.set(id, { tree: { sha: treeSha }, parents: parents.map((sha) => ({ sha })), message });
    return id;
  }
  let head = makeCommit(tree(Object.fromEntries(Object.entries(initial).map(([name, bytes]) => [name, blob(bytes)]))));
  const state = {
    requests,
    statuses: [],
    race: null,
    pushes: 0,
    flat: () => trees.get(commits.get(head).tree.sha),
    read: (name) => {
      const id = state.flat()[name];
      return id ? blobs.get(id) : null;
    },
    edit(name, bytes) {
      const files = { ...state.flat() };
      files[name] = blob(bytes);
      head = makeCommit(tree(files), [head], 'External change');
    },
    get head() {
      return head;
    },
  };
  state.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const path = new URL(url).pathname.replace('/repos/test/blog', '');
    const search = new URL(url).searchParams;
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ path, method, body });
    const reply = (value, status = 200) =>
      new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (path === '/git/ref/heads/main') return reply({ object: { sha: head } });
    if (path.startsWith('/git/commits/') && method === 'GET') return reply(commits.get(path.split('/').pop()));
    if (path.startsWith('/git/trees/') && method === 'GET')
      return reply({ tree: flattenEntries(trees.get(path.split('/').pop())), truncated: false });
    if (path.startsWith('/git/blobs/') && method === 'GET')
      return reply({ encoding: 'base64', content: blobs.get(path.split('/').pop()).toString('base64') });
    if (path === '/git/blobs' && method === 'POST')
      return reply({ sha: blob(Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8')) }, 201);
    if (path === '/git/trees' && method === 'POST') {
      const flat = { ...(body.base_tree ? trees.get(body.base_tree) : {}) };
      for (const entry of body.tree) {
        for (const name of Object.keys(flat))
          if (name === entry.path || name.startsWith(entry.path + '/')) delete flat[name];
        if (entry.sha === null) continue;
        if (entry.type === 'tree')
          for (const [name, id] of Object.entries(trees.get(entry.sha))) flat[entry.path + '/' + name] = id;
        else flat[entry.path] = entry.sha;
      }
      return reply({ sha: tree(flat) }, 201);
    }
    if (path === '/git/commits' && method === 'POST')
      return reply({ sha: makeCommit(body.tree, body.parents, body.message) }, 201);
    if (path === '/git/refs/heads/main' && method === 'PATCH') {
      if (state.race) {
        const race = state.race;
        state.race = null;
        race(state);
      }
      if (body.force !== false || commits.get(body.sha).parents[0]?.sha !== head)
        return reply({ message: 'Not a fast forward' }, 422);
      head = body.sha;
      state.pushes++;
      return reply({ object: { sha: head } });
    }
    if (path === '/commits') {
      const prefix = search.get('path') + '/';
      let id = search.get('sha');
      while (commits.get(id).parents.length) {
        const parent = commits.get(id).parents[0].sha;
        const currentFolder = directory(trees.get(commits.get(id).tree.sha), prefix);
        const oldFolder = directory(trees.get(commits.get(parent).tree.sha), prefix);
        if (JSON.stringify(currentFolder) !== JSON.stringify(oldFolder)) break;
        id = parent;
      }
      return reply([{ sha: id }]);
    }
    if (/^\/commits\/[a-f0-9]+\/status$/.test(path)) return reply({ statuses: state.statuses });
    throw new Error(`Unexpected GitHub request: ${method} ${path}`);
  };
  return state;
}
module.exports = { github };
