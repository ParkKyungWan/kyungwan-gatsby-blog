import { graphql } from 'gatsby';
import React from 'react';

import PostHeader from '@/src/components/PostHeader';
import PostNavigator from '@/src/components/PostNavigator';
import Seo from '@/src/components/Seo';
import Layout from '@/src/layout';
import PostClass from '@/src/models/post';
import { Post } from '@/src/type';

import * as S from './styled';

type PostTemplateProps = {
  location: Location;
  data: { cur: Post; prev?: Post; next?: Post };
};

const PostTemplate: React.FC<PostTemplateProps> = ({ location, data }) => {
  const curPost = new PostClass(data.cur);
  const prevPost = data.prev ? new PostClass(data.prev) : undefined;
  const nextPost = data.next ? new PostClass(data.next) : undefined;

  return (
    <Layout location={location} hasBanner={false}>
      <Seo title={`경완 | ${curPost?.title}`} description={curPost?.excerpt} />
      <PostHeader post={curPost} />
      <S.PostContent>
        <div className='markdown' dangerouslySetInnerHTML={{ __html: curPost.html }} />
      </S.PostContent>
      <PostNavigator prevPost={prevPost} nextPost={nextPost} />
    </Layout>
  );
};

export default PostTemplate;

export const pageQuery = graphql`
  query ($slug: String, $prevSlug: String, $nextSlug: String, $hasPrev: Boolean!, $hasNext: Boolean!) {
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
    prev: markdownRemark(fields: { slug: { eq: $prevSlug } }) @include(if: $hasPrev) {
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
    next: markdownRemark(fields: { slug: { eq: $nextSlug } }) @include(if: $hasNext) {
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
