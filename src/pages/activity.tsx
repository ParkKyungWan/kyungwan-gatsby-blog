import { graphql } from 'gatsby';
import React, { useMemo } from 'react';

import ActivityTable, { ActivityTableData } from '../components/ActivityTable';
import * as ActivityTableStyled from '../components/ActivityTable/styled';
import CategoryFilter from '../components/CategoryFilter';
import Seo from '../components/Seo';
import Section from '../components/Section';
import useActivityFilter from '../hooks/useActivityFilter';
import Layout from '../layout';

type ActivityProps = {
  location: Location;
  data: {
    allMarkdownRemark: {
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
              emoji: string;
              level: number;
              summary?: string;
            }>;
          };
        };
      }>;
    };
  };
};

const Activity: React.FC<ActivityProps> = ({ location, data }) => {
  const activities = data.allMarkdownRemark.edges.map(({ node }) => node);
  const {
    years,
    months,
    filteredActivities,
    selectedMonth,
    selectedYear,
    handleMonthClick,
    handleYearChange,
  } = useActivityFilter(activities);

  // ActivityTable 형식으로 데이터 변환
  const activityTableData = useMemo<ActivityTableData | null>(() => {
    if (filteredActivities.length === 0) return null;

    const firstActivity = filteredActivities[0];
    const { year, month, day, emojis, activities: dayActivities } = firstActivity.frontmatter;

    if (!month || !day || !emojis) return null;

    // 각 이모지별로 일별 데이터 배열 생성
    const tableData: ActivityTableData['data'] = (emojis || []).map((emoji: string) => {
      const values: number[] = Array(day).fill(0); // 초기값 0으로 채움

      // dayActivities에서 해당 이모지의 데이터 찾아서 채우기
      (dayActivities || []).forEach((activity: { day: number; emoji: string; level: number }) => {
        if (activity.emoji === emoji && activity.day >= 1 && activity.day <= day) {
          values[activity.day - 1] = activity.level; // day는 1부터 시작하므로 -1
        }
      });

      return [emoji, values];
    });

    return {
      month: month,
      day: day,
      data: tableData,
    };
  }, [filteredActivities]);

  return (
    <Layout location={location} hasBanner={false}>
      <Seo title='경완 | Activity' />
      <Section
        header={{
          emoji: '📋',
          kr: '기록',
          en: 'Activity',
          more: (
            <ActivityTableStyled.YearSelect
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </ActivityTableStyled.YearSelect>
          ),
        }}
      >
        <CategoryFilter
          categories={months}
          selectedCategory={selectedMonth}
          onCategoryClick={handleMonthClick}
        />
        {activityTableData ? (
          <ActivityTable data={activityTableData} />
        ) : (
          <div>활동 데이터가 없습니다.</div>
        )}
      </Section>
    </Layout>
  );
};

export default Activity;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(
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