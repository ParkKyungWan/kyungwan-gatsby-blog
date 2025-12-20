import { graphql } from 'gatsby';
import React from 'react';

import PostHeader from '@/src/components/PostHeader';
import Seo from '@/src/components/Seo';
import Layout from '@/src/layout';
import PostClass from '@/src/models/post';
import { Post } from '@/src/type';

import * as S from './styled';

type PostTemplateProps = {
  location: Location;
  data: { cur: Post };
};

const PostTemplate: React.FC<PostTemplateProps> = ({ location, data }) => {
  const curPost = new PostClass(data.cur);

  return (
    <Layout location={location}>
      <Seo title={`개발자 단민 | ${curPost?.title}`} description={curPost?.excerpt} />
      <PostHeader post={curPost} />
      <S.PostContent>
        <div className='markdown' dangerouslySetInnerHTML={{ __html: curPost.html }} />
      </S.PostContent>
    </Layout>
  );
};

export default PostTemplate;

export const pageQuery = graphql`
  query ($slug: String) {
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
  }
`;
