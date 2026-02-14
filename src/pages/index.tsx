import { graphql } from 'gatsby';
import React from 'react';

import Banner from '../components/Banner';
import CategoryFilter from '../components/CategoryFilter';
import PostList from '../components/PostList';
import Section from '../components/Section';
import Seo from '../components/Seo';
import useHobbiesFilter from '../hooks/useHobbiesFilter';
import useLatestActivity from '../hooks/useLatestActivity';
import usePostsFilter from '../hooks/usePostsFilter';
import Layout from '../layout';
import PostClass from '../models/post';
import { AllMarkdownRemark } from '../type';
import ActivityTable from '../components/ActivityTable';

type HomeProps = {
  location: Location;
  data: {
    allMarkdownRemark: AllMarkdownRemark;
    activities: {
      edges: Array<{
        node: {
          id: string;
          frontmatter: {
            year?: number;
            month?: number;
            day?: number;
            emojis?: string[];
            activities?: Array<{
              day: number;
              emoji: string | string[];
              level: number | number[];
              summary?: string | string[];
            }>;
          };
        };
      }>;
    };
  };
};

const Home: React.FC<HomeProps> = ({ location, data }) => {
  const allPosts = data.allMarkdownRemark.edges.map(({ node }) => new PostClass(node));
  const { categories, filteredPosts, selectedCategory, handleCategoryClick } = usePostsFilter(allPosts);
  const { categoriesH, selectedCategoryH, handleCategoryClickH } = useHobbiesFilter();
  const posts = filteredPosts.slice(0, 3);

  // 가장 최근 월의 activity 데이터 변환
  const activities = data.activities.edges.map(({ node }) => node);
  const latestActivityData = useLatestActivity({ activities });

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
          {/*
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          /> */}
          <PostList posts={posts} />
        </Section>

        {/* 활동 리스트 */}
        <Section
          header={{
            emoji: '📋',
            kr: '활동',
            en: 'Activity',
            more: <a href='/activity'>전체보기</a>,
          }}
        >
          {latestActivityData ? (
            <ActivityTable data={latestActivityData} />
          ) : (
            <div>활동 데이터가 없습니다.</div>
          )}
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
    allMarkdownRemark(
      filter: { fileAbsolutePath: { regex: "/content/" } }
      sort: { fields: frontmatter___date, order: DESC }
    ) {
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
    activities: allMarkdownRemark(
      filter: { fileAbsolutePath: { regex: "/activities/" } }
      sort: { fields: [frontmatter___year, frontmatter___month], order: DESC }
    ) {
      edges {
        node {
          id
          frontmatter {
            year
            month
            day
            emojis
            activities {
              day
              emoji
              level
              summary
            }
          }
        }
      }
    }
  }
`;
