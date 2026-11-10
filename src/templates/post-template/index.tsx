import { graphql } from 'gatsby';
import React from 'react';

import PostArticle from '@/src/components/PostArticle';
import Seo from '@/src/components/Seo';
import Layout from '@/src/layout';
import PostClass from '@/src/models/post';
import { Post } from '@/src/type';

type PostTemplateProps = {
  location: Location;
  data: { cur: Post; prev?: Post; next?: Post };
};

const PostTemplate: React.FC<PostTemplateProps> = ({ location, data }) => {
  const curPost = new PostClass(data.cur);
  const prevPost = data.prev && new PostClass(data.prev);
  const nextPost = data.next && new PostClass(data.next);

  return (
    <Layout location={location}>
      <Seo title={`ruddhks.my | ${curPost?.title}`} description={curPost?.excerpt} pathname={curPost.slug} article />
      <PostArticle liveNavigation post={curPost} prevPost={prevPost} nextPost={nextPost} />
    </Layout>
  );
};

export default PostTemplate;

export const pageQuery = graphql`
  query ($slug: String, $prevSlug: String, $nextSlug: String) {
    cur: markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      excerpt(pruneLength: 500, truncate: true)
      frontmatter {
        date(formatString: "YYYY.MM.DD")
        title
        categories
        emoji
      }
      fields {
        slug
      }
    }
    prev: markdownRemark(fields: { slug: { eq: $prevSlug } }) {
      previewImages {
        childImageSharp {
          resize(width: 360, height: 440, fit: COVER, quality: 80) {
            src
          }
        }
      }
      id
      html
      excerpt(pruneLength: 500, truncate: true)
      frontmatter {
        date(formatString: "YYYY.MM.DD")
        title
        categories
        emoji
      }
      fields {
        slug
      }
    }
    next: markdownRemark(fields: { slug: { eq: $nextSlug } }) {
      previewImages {
        childImageSharp {
          resize(width: 360, height: 440, fit: COVER, quality: 80) {
            src
          }
        }
      }
      id
      html
      excerpt(pruneLength: 500, truncate: true)
      frontmatter {
        date(formatString: "YYYY.MM.DD")
        title
        categories
        emoji
      }
      fields {
        slug
      }
    }
  }
`;
