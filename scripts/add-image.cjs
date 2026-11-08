const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { ROOT } = require('./content.cjs');
async function addImage(slug, source, alt = '', append = false, root = ROOT) {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !source)
    throw new Error('사용법: npm run image:add -- my-post /사진/원본.jpg "설명" [--append]');
  const dir = path.join(root, 'content', slug);
  const post = path.join(dir, 'index.md');
  await fs.access(post);
  // Auto-orient, strip EXIF/GPS, and cap resolution without enlarging small images.
  const result = await sharp(source, { animated: false })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const name = 'image-' + crypto.createHash('sha256').update(result).digest('hex').slice(0, 16) + '.webp';
  try {
    await fs.writeFile(path.join(dir, name), result, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const safeAlt = alt.replace(/[\\\[\]\r\n]/g, ' ');
  const markdown = `![${safeAlt}](${name})`;
  if (append) await fs.appendFile(post, '\n' + markdown + '\n');
  return { name, markdown, bytes: result.length };
}
module.exports = { addImage };
if (require.main === module) {
  const args = process.argv.slice(2);
  const append = args.includes('--append');
  const [slug, source, alt] = args.filter((arg) => arg !== '--append');
  addImage(slug, source, alt, append)
    .then((result) => console.log(result.markdown + `\n${Math.ceil(result.bytes / 1024)} KB`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
