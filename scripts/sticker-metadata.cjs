const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const ids = ['guinea', 'shoe', 'wine', 'drip'];

async function main() {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const { data, info } = await sharp(path.join(root, 'static/banner', `${id}.png`))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let left = info.width,
        top = info.height,
        right = -1,
        bottom = -1,
        ink = 0;
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const offset = (y * info.width + x) * info.channels;
          const alpha = data[offset + 3] / 255;
          if (alpha <= 16 / 255) continue;
          const luminance = (0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2]) / 255;
          ink += alpha * (0.35 + 0.65 * (1 - luminance));
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      if (right < left) throw new Error(`Empty sticker: ${id}`);
      return [
        id,
        {
          x: left,
          y: top,
          width: right - left + 1,
          height: bottom - top + 1,
          visualWeight: ink / ((right - left + 1) * (bottom - top + 1)),
        },
      ];
    }),
  );
  const file = path.join(root, 'src/components/Banner/sticker-metadata.json');
  const output = JSON.stringify(Object.fromEntries(entries), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output)
      throw new Error('Sticker metadata is stale. Run npm run stickers:prepare.');
  } else if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) {
    fs.writeFileSync(file, output);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
