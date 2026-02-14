import { graphql } from 'gatsby';
import React, { useMemo } from 'react';

import ActivityTable, { ActivityTableData } from '../components/ActivityTable';
import * as ActivityTableStyled from '../components/ActivityTable/styled';
import ActivitySummary from '../components/ActivitySummary';
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
      // 같은 날에 같은 이모지가 여러 번 나올 수 있으므로, 가장 높은 레벨을 사용
      (dayActivities || []).forEach((activity: {
        day: number;
        emoji: string | string[];
        level: number | number[];
      }) => {
        const activityEmojis = Array.isArray(activity.emoji) ? activity.emoji : [activity.emoji];
        const activityLevels = Array.isArray(activity.level) ? activity.level : [activity.level];

        // 이모지와 레벨 배열의 길이가 맞는지 확인
        if (activityEmojis.length === activityLevels.length && activity.day >= 1 && activity.day <= day) {
          const dayIndex = activity.day - 1; // day는 1부터 시작하므로 -1
          
          // 해당 이모지의 레벨 찾기
          activityEmojis.forEach((actEmoji, idx) => {
            if (actEmoji === emoji) {
              const actLevel = activityLevels[idx];
              // 기존 레벨보다 높은 레벨이면 업데이트
              if (actLevel > values[dayIndex]) {
                values[dayIndex] = actLevel;
              }
            }
          });
        } else if (!Array.isArray(activity.emoji) && !Array.isArray(activity.level)) {
          // 기존 형식 (단일 이모지, 단일 레벨) 지원
          if (activity.emoji === emoji && activity.day >= 1 && activity.day <= day) {
            const dayIndex = activity.day - 1;
            const actLevel = activity.level as number;
            if (actLevel > values[dayIndex]) {
              values[dayIndex] = actLevel;
            }
          }
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
          <>
            <ActivityTable data={activityTableData} />
            {filteredActivities.length > 0 && (
              <ActivitySummary
                month={activityTableData.month}
                activities={
                  filteredActivities[0].frontmatter.activities || []
                }
              />
            )}
          </>
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