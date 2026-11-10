import { graphql } from 'gatsby';
import React from 'react';

import Banner from '../components/Banner';
import CategoryFilter from '../components/CategoryFilter';
import PostList from '../components/PostList';
import * as PostStyles from '../components/PostList/styled';
import Section from '../components/Section';
import Seo from '../components/Seo';
import useHobbiesFilter from '../hooks/useHobbiesFilter';
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
  const { categoriesH, selectedCategoryH, handleCategoryClickH } = useHobbiesFilter();
  const posts = filteredPosts.slice(0, 3);

  const renderContentH = () => {
    switch (selectedCategoryH) {
      case '음주':
        return <div>음주 컨텐츠</div>;
      case '클라이밍':
        return <div>클라이밍 컨텐츠</div>;
      default:
        return <div>컨텐츠를 선택해주세요</div>;
    }
  };

  return (
    <>
      <Layout location={location} banner={<Banner />}>
        <Seo pathname={location.pathname} title='ruddhks.my' description="KyungWan's Blog" />
        {/* 게시글 리스트 */}
        <Section
          header={{
            more: (
              <PostStyles.PostCount>
                <strong>{allPosts.length}</strong>개의 글
              </PostStyles.PostCount>
            ),
          }}
        >
          {/*
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          /> */}

          <PostList posts={posts} />
          <PostStyles.MoreLink to='/posts/' aria-label='모든 게시글 보기'>
            더보기
          </PostStyles.MoreLink>
        </Section>

        {/* 취미 리스트 
        <Section
          header={{
            emoji: '🍷',
            kr: '취미',
            en: 'Hobbies',
            more: <a href='/hobbies'>전체보기</a>,
          }}
        >
          <CategoryFilter
            categories={categoriesH}
            selectedCategory={selectedCategoryH}
            onCategoryClick={handleCategoryClickH}
          />
          {renderContentH()}
        </Section>
        */}
      </Layout>
    </>
  );
};

export default Home;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(filter: { fields: { isPost: { eq: true } } }, sort: { frontmatter: { date: DESC } }) {
      edges {
        node {
          id
          previewImages {
            childImageSharp {
              resize(width: 360, height: 440, fit: COVER, quality: 80) {
                src
              }
            }
          }
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
