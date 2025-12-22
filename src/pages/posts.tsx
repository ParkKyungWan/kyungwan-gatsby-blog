import { graphql } from 'gatsby';
import React from 'react';

import PostList from '../components/PostList';
import Section from '../components/Section';
import Seo from '../components/Seo';
import Layout from '../layout';
import PostClass from '../models/post';
import { AllMarkdownRemark } from '../type';

type PostsProps = {
  data: {
    allMarkdownRemark: AllMarkdownRemark;
  };
  location: Location;
};

const Posts: React.FC<PostsProps> = ({ location, data }) => {
  const posts = data.allMarkdownRemark.edges.map(({ node }) => new PostClass(node));

  return (
    <Layout location={location} hasBanner={false}>
      <Seo title='경완 | Posts' />
      <Section
        header={{
          emoji: '🏃‍♂️',
          kr: '게시글',
          en: 'Posts',
        }}
      >
        <PostList posts={posts} />
      </Section>
    </Layout>
  );
};

export default Posts;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(sort: { fields: frontmatter___date, order: DESC }) {
      edges {
        node {
          id
          excerpt(pruneLength: 500, truncate: true)
          frontmatter {
            categories
            title
            emoji
            date(formatString: "YYYY.MM.DD")
          }
          fields {
            slug
          }
        }
      }
    }
  }
`;
