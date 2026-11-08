import { graphql } from 'gatsby';
import React from 'react';

import CategoryFilter from '../components/CategoryFilter';
import PostList from '../components/PostList';
import Section from '../components/Section';
import Seo from '../components/Seo';
import usePostsFilter from '../hooks/usePostsFilter';
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
  const { categories, filteredPosts, selectedCategory, handleCategoryClick } = usePostsFilter(posts);

  return (
    <Layout location={location}>
      <Seo pathname={location.pathname} title='ruddhks.my | Posts' />
      <Section
        header={{
          emoji: '🏃‍♂️',
          kr: '게시글',
          en: 'Posts',
        }}
      >
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
        />
        <PostList posts={filteredPosts} />
      </Section>
    </Layout>
  );
};

export default Posts;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(filter: { fields: { isPost: { eq: true } } }, sort: { frontmatter: { date: DESC } }) {
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
