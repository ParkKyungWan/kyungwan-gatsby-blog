import type { Actions, GatsbyNode } from 'gatsby';
import { createFilePath } from 'gatsby-source-filesystem';
import path from 'path';

import { AllMarkdownRemark } from './src/type';

export const onCreateWebpackConfig: GatsbyNode['onCreateWebpackConfig'] = ({ getConfig, actions }) => {
  const output = getConfig().output || {};

  actions.setWebpackConfig({
    output,
    resolve: {
      alias: {
        '@/src': path.resolve(__dirname, 'src/'),
        '@/assets': path.resolve(__dirname, 'assets/'),
      },
    },
  });
};

type CreatePagesFuncProps = {
  createPage: Actions['createPage'];
  edges: AllMarkdownRemark['edges'];
};

const createPost = ({ createPage, edges }: CreatePagesFuncProps) => {
  const post = path.resolve(`./src/templates/post-template/index.tsx`);

  edges.forEach(({ node }, index) => {
    const prevSlug = index === edges.length - 1 ? null : edges[index + 1].node.fields.slug;
    const nextSlug = index === 0 ? null : edges[index - 1].node.fields.slug;

    createPage({
      path: node.fields.slug,
      component: post,
      context: {
        slug: node.fields.slug,
        prevSlug,
        nextSlug,
      },
    });
  });
};

export const createPages: GatsbyNode['createPages'] = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions;

  // Get all markdown blog posts sorted by date
  const result: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors?: any;
    data?: {
      allMarkdownRemark: AllMarkdownRemark;
    };
  } = await graphql(`
    {
      allMarkdownRemark(sort: { frontmatter: { date: DESC } }, filter: { fields: { isPost: { eq: true } } }) {
        edges {
          node {
            id
            excerpt(pruneLength: 500, truncate: true)
            fields {
              slug
            }
            frontmatter {
              categories
              title
              date(formatString: "YYYY.MM.DD")
            }
          }
        }
      }
    }
  `);

  if (result.errors || !result.data) {
    reporter.panicOnBuild(`There was an error loading your blog posts`, result.errors);
    return;
  }

  createPost({ createPage, edges: result.data.allMarkdownRemark.edges });
};

export const onCreateNode: GatsbyNode['onCreateNode'] = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `MarkdownRemark`) {
    const parent = getNode(node.parent as string);
    createNodeField({ node, name: 'isPost', value: parent?.sourceInstanceName === 'blog' });
    const slug = createFilePath({ node, getNode, basePath: `content` });
    createNodeField({ node, name: `slug`, value: slug });
  }
};

export const createSchemaCustomization: GatsbyNode['createSchemaCustomization'] = ({ actions }) => {
  actions.createTypes(`
    type MarkdownRemark implements Node { frontmatter: Frontmatter! fields: MarkdownFields! }
    type MarkdownFields { slug: String! isPost: Boolean! }
    type Frontmatter { title: String date: Date @dateformat categories: [String!] draft: Boolean featured: Boolean emoji: String }
  `);
};

export const onPreInit: GatsbyNode['onPreInit'] = () => {
  require('./scripts/content.cjs').validateAll();
};

export const createResolvers: GatsbyNode['createResolvers'] = ({ createResolvers, getNodesByType }) => {
  createResolvers({
    MarkdownRemark: {
      previewImages: {
        type: '[File!]',
        resolve(
          source: { parent: string; rawMarkdownBody?: string },
          _args: unknown,
          context: {
            nodeModel: {
              getNodeById: (args: { id: string }) => { absolutePath?: string } | undefined;
            };
          },
        ) {
          const parent = context.nodeModel.getNodeById({ id: source.parent });
          if (!parent?.absolutePath) return [];
          const directory = path.dirname(parent.absolutePath);
          const paths = [
            ...String(source.rawMarkdownBody ?? '').matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g),
          ].map((match) => path.resolve(directory, decodeURI(match[1])));
          const unique = [...new Set(paths)].slice(0, 4);
          const files = getNodesByType('File');
          const byPath = new Map([...files].map((file) => [file.absolutePath, file]));
          return unique.map((imagePath) => byPath.get(imagePath)).filter(Boolean);
        },
      },
    },
  });
};

// Keep the Activity page implementation and data for later use, without publishing its route.
export const onCreatePage: GatsbyNode['onCreatePage'] = ({ page, actions }) => {
  if (page.path.replace(/\/$/, '') === '/activity') {
    actions.deletePage(page);
  }
};

// Development persistence lives on the local server, never in browser storage.
export const onCreateDevServer: GatsbyNode['onCreateDevServer'] = ({ app }) => {
  const { installWriter } = require('./server/writer-local.cjs');
  installWriter(app, path.join(__dirname, '.writer-data'));
};

// Preserve original post-card image previews in runtime post navigation.
export const onPostBuild: GatsbyNode['onPostBuild'] = () => {
  require('node:child_process').execFileSync(process.execPath, [
    path.join(__dirname, 'scripts/prepare-published.cjs'),
    '--metadata-only',
  ]);
};
