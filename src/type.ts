export type SiteMetadata = {
  title: string;
  siteUrl: string;
  language: string;
};

export type Post = {
  id: string;
  excerpt: string;
  html: string;
  frontmatter: Frontmatter;
  fields: Fields;
};

export type AllMarkdownRemark = {
  edges: { node: MarkdownRemark }[];
};

export type MarkdownRemark = {
  id: string;
  frontmatter: Frontmatter;
  fields: Fields;
  excerpt: string;
  html: string;
};

export type Frontmatter = {
  title: string;
  author: string;
  date: string;
  emoji: string;
  categories: string;
};

export type Fields = {
  slug: string;
};
