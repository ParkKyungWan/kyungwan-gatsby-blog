const { test } = require('node:test');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..');
test('upstream failures distinguish invalid credentials, repository permissions, branch rules and rate limits', async () => {
  const { githubFailure } = await import(root + '/server/github-api-errors.mjs');
  const base = { method: 'POST', path: '/git/blobs', message: '' };
  assert.match(githubFailure({ ...base, status: 401 }).message, /토큰 인증/);
  assert.match(githubFailure({ ...base, status: 403 }).message, /쓰기 권한/);
  assert.match(githubFailure({ ...base, status: 403, method: 'GET' }).message, /읽기 권한/);
  assert.match(
    githubFailure({ ...base, status: 403, message: 'Changes must be made through a pull request' }).message,
    /브랜치 보호/,
  );
  assert.equal(githubFailure({ ...base, status: 403, remaining: '0' }).status, 429);
  assert.equal(
    githubFailure({
      ...base,
      status: 422,
      path: '/git/refs/heads/main',
      method: 'PATCH',
      message: 'Not a fast forward',
    }).status,
    409,
  );
  assert.equal(githubFailure({ ...base, status: 422, message: 'Invalid tree' }).status, 422);
  assert.match(
    githubFailure({ ...base, status: 401, requestId: 'ABC:123' }).message,
    /GitHub 401.*POST \/git\/blobs.*ABC:123/,
  );
});
test('Git requests trim environment values and never expose credentials in rejection errors', async () => {
  const { createGitRepository } = await import(root + '/server/git-repository.mjs');
  let authorization, userAgent, url;
  const token = 'fake-secret-token';
  const repository = createGitRepository({
    env: { WRITE_GITHUB_TOKEN: ' ' + token + '\n', WRITE_GITHUB_REPOSITORY: ' test/blog ' },
    fetcher: async (u, options) => {
      url = u;
      authorization = options.headers.Authorization;
      userAgent = options.headers['User-Agent'];
      return new Response(JSON.stringify({ message: token }), {
        status: 401,
        headers: { 'x-github-request-id': 'ABC:123' },
      });
    },
  });
  await assert.rejects(
    repository.snapshot(),
    (error) => error.message.includes('GitHub 401') && !error.message.includes(token),
  );
  assert.equal(authorization, 'Bearer ' + token);
  assert.equal(userAgent, 'kyungwan-gatsby-writer');
  assert.ok(url.startsWith('https://api.github.com/repos/test/blog/'));
  assert.equal(createGitRepository({ env: { WRITE_GITHUB_TOKEN: '  ' } }).writable, false);
});
