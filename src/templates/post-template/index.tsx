import { graphql } from 'gatsby';
import React, { useEffect, useRef } from 'react';

import PostHeader from '@/src/components/PostHeader';
import PostNavigator from '@/src/components/PostNavigator';
import Seo from '@/src/components/Seo';
import Layout from '@/src/layout';
import PostClass from '@/src/models/post';
import { Post } from '@/src/type';
import { recoverMarkdownImages } from '@/src/utils/recover-markdown-images';

import * as S from './styled';

type PostTemplateProps = {
  location: Location;
  data: { cur: Post; prev?: Post; next?: Post };
};

const PostTemplate: React.FC<PostTemplateProps> = ({ location, data }) => {
  const curPost = new PostClass(data.cur);
  const prevPost = data.prev && new PostClass(data.prev);
  const nextPost = data.next && new PostClass(data.next);
  const markdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (markdownRef.current) return recoverMarkdownImages(markdownRef.current);
  }, [curPost.html]);

  return (
    <Layout location={location}>
      <Seo title={`ruddhks.my | ${curPost?.title}`} description={curPost?.excerpt} pathname={curPost.slug} article />
      <S.Wrapper>
        <PostHeader post={curPost} />
        <S.PostContent>
          <div ref={markdownRef} className='markdown' dangerouslySetInnerHTML={{ __html: curPost.html }} />
        </S.PostContent>
        <PostNavigator prevPost={prevPost} nextPost={nextPost} />
      </S.Wrapper>
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
