const fs = require('node:fs');
const path = require('node:path');
const matter = require('gray-matter');
const ROOT = path.resolve(__dirname, '..');
function validSlug(slug) {
  return (
    typeof slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) &&
    !['posts', 'activity', 'hobbies', '404', 'offline-plugin-app-shell-fallback'].includes(slug)
  );
}
function posts(root = path.join(ROOT, 'content')) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? posts(file) : entry.name.endsWith('.md') ? [file] : [];
  });
}
function parse(file) {
  return matter.read(file, {
    engines: { yaml: (text) => require('js-yaml').load(text, { schema: require('js-yaml').JSON_SCHEMA }) },
  });
}
function validate(data) {
  const errors = [];
  if (typeof data.title !== 'string' || !data.title.trim()) errors.push('title에 제목을 입력하세요.');
  const date = data.date;
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    errors.push('date는 유효한 YYYY-MM-DD 문자열이어야 합니다.');
  if (typeof data.draft !== 'boolean') errors.push('draft를 true 또는 false로 지정하세요.');
  if (
    !Array.isArray(data.categories) ||
    !data.categories.length ||
    data.categories.some((c) => typeof c !== 'string' || !c.trim() || c !== c.trim() || c.startsWith('featured-'))
  )
    errors.push('categories는 비어 있지 않은 분류명 배열이어야 하며, 앞뒤 공백과 featured- 접두어는 사용할 수 없습니다.');
  if (Array.isArray(data.categories) && new Set(data.categories).size !== data.categories.length)
    errors.push('중복 카테고리를 제거하세요.');
  if (typeof data.featured !== 'boolean') errors.push('featured를 true 또는 false로 지정하세요.');
  return errors;
}
function validateAll() {
  let failed = false;
  for (const file of posts()) {
    try {
      const errors = validate(parse(file).data);
      if (
        path.basename(file) !== 'index.md' ||
        path.dirname(path.dirname(file)) !== path.join(ROOT, 'content') ||
        !validSlug(path.basename(path.dirname(file)))
      )
        errors.push('글마다 개별 폴더의 index.md를 사용하세요.');
      if (errors.length) {
        console.error(path.relative(ROOT, file), errors.join('\n'));
        failed = true;
      }
    } catch (error) {
      console.error(file, error.message);
      failed = true;
    }
  }
  if (failed) throw new Error('글 메타데이터 검증에 실패했습니다.');
}
function draftIgnores(
  root = path.join(ROOT, 'content'),
  command = process.env.gatsby_executing_command,
  enabled = process.env.BLOG_PREVIEW_DRAFTS,
) {
  const preview = enabled === 'true' && command === 'develop';
  return preview
    ? []
    : posts(root)
        .filter((file) => parse(file).data.draft)
        .map((file) => path.dirname(file) + '/**');
}
module.exports = { ROOT, posts, parse, validate, validateAll, draftIgnores, validSlug };
if (require.main === module) {
  try {
    validateAll();
    console.log('글 메타데이터 검증 완료');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
