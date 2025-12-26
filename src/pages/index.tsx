import { graphql } from 'gatsby';
import React from 'react';

import Banner from '../components/Banner';
import CategoryFilter from '../components/CategoryFilter';
import PostList from '../components/PostList';
import Section from '../components/Section';
import Seo from '../components/Seo';
import usePostsFilter from '../hooks/usePostsFilter';
import Layout from '../layout';
import PostClass from '../models/post';
import { AllMarkdownRemark } from '../type';

type HomeProps = {
  location: Location;
  data: {
    allMarkdownRemark: AllMarkdownRemark;
  };
};

const Home: React.FC<HomeProps> = ({ location, data }) => {
  const allPosts = data.allMarkdownRemark.edges.map(({ node }) => new PostClass(node));
  const { categories, filteredPosts, selectedCategory, handleCategoryClick } = usePostsFilter(allPosts);
  const posts = filteredPosts.slice(0, 3);

  return (
    <>
      <Banner />
      <Layout location={location} hasBanner={true}>
        <Seo title='경완' description="KyungWan's Blog" />

        {/* 게시글 리스트 */}
        <Section
          header={{
            emoji: '🏃‍♂️',
            kr: '게시글',
            en: 'Posts',
            more: <a href='/posts'>전체보기</a>,
          }}
        >
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />
          <PostList posts={posts} />
        </Section>
    </Layout>
    </>
  );
};

export default Home;

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
