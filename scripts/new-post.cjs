const fs = require('node:fs');
const path = require('node:path');
const { ROOT, validate, validSlug } = require('./content.cjs');
function createPost(slug, title, categories = [], root = ROOT, now = new Date()) {
  if (!validSlug(slug) || typeof title !== 'string' || !title.trim())
    throw new Error('사용법: npm run post:new -- my-post "글 제목" "분류" (예약된 페이지 이름은 사용할 수 없습니다.)');
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
  const data = {
    emoji: '📝',
    title,
    date,
    categories: categories.length ? categories : ['일상'],
    featured: false,
    draft: true,
  };
  const errors = validate(data);
  if (errors.length) throw new Error(errors.join('\n'));
  const dir = path.join(root, 'content', slug);
  fs.mkdirSync(dir); // Existing paths must never be overwritten.
  fs.writeFileSync(
    path.join(dir, 'index.md'),
    '---\n' +
      Object.entries(data)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n') +
      '\n---\n\n여기에 글을 작성하세요.\n',
    { flag: 'wx' },
  );
  return dir;
}
module.exports = { createPost };
if (require.main === module) {
  const [slug, title, ...categories] = process.argv.slice(2);
  try {
    createPost(slug, title, categories);
    console.log(`초안 생성: content/${slug}/index.md\n미리보기: npm run dev:drafts\n발행: draft를 false로 변경`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
