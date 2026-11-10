const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const sass = require('sass');
const { posts, parse } = require('./content.cjs');
const root = path.resolve(__dirname, '..');
async function main() {
  fs.mkdirSync(path.join(root, 'server/generated'), { recursive: true });
  fs.mkdirSync(path.join(root, 'static/published'), { recursive: true });
  if (!process.argv.includes('--metadata-only')) {
    const common = {
      bundle: true,
      logLevel: 'warning',
      jsx: 'automatic',
      jsxImportSource: '@emotion/react',
      alias: {
        'gatsby': path.join(root, 'src/runtime/gatsby-runtime.tsx'),
        '@/src': path.join(root, 'src'),
        '@/assets': path.join(root, 'assets'),
      },
      loader: { '.scss': 'empty' },
      target: 'es2020',
    };
    await build({
      ...common,
      entryPoints: [path.join(root, 'src/runtime/render.tsx')],
      platform: 'node',
      packages: 'external',
      format: 'esm',
      outfile: path.join(root, 'server/generated/published-renderer.mjs'),
    });
    await build({
      ...common,
      entryPoints: [path.join(root, 'src/runtime/client.tsx')],
      platform: 'browser',
      format: 'iife',
      minify: true,
      define: { 'process.env.NODE_ENV': '"production"' },
      outfile: path.join(root, 'static/published/post-client.js'),
    });
    const css = sass.compile(path.join(root, 'src/layout/style.scss'), {
      style: 'compressed',
      logger: sass.Logger.silent,
    }).css;
    fs.writeFileSync(path.join(root, 'static/published/post.css'), css);
  }
  let rendered = new Map();
  try {
    const result = JSON.parse(fs.readFileSync(path.join(root, 'public/page-data/posts/page-data.json'), 'utf8'));
    rendered = new Map(result.result.data.allMarkdownRemark.edges.map(({ node }) => [node.fields.slug, node]));
  } catch {}
  const entries = posts().flatMap((file) => {
    const { data } = parse(file);
    return data.draft
      ? []
      : [
          {
            id: 'static-' + path.basename(path.dirname(file)),
            slug: '/' + path.basename(path.dirname(file)) + '/',
            title: data.title,
            category: data.categories?.[0] || '',
            emoji: data.emoji || '',
            publishedAt: Date.parse(data.date),
            excerpt: '',
            previewImages: (rendered.get('/' + path.basename(path.dirname(file)) + '/')?.previewImages || []).flatMap(
              (image) => (image.childImageSharp?.resize?.src ? [image.childImageSharp.resize.src] : []),
            ),
          },
        ];
  });
  fs.writeFileSync(
    path.join(root, 'server/generated/static-posts.mjs'),
    'export default ' + JSON.stringify(entries) + ';\n',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
