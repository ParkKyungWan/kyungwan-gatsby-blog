import { useMemo } from 'react';

import ActivityTable, { ActivityTableData } from '../components/ActivityTable';

type ActivityNode = {
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

type UseLatestActivityProps = {
  activities: ActivityNode[];
};

const useLatestActivity = ({ activities }: UseLatestActivityProps): ActivityTableData | null => {
  return useMemo<ActivityTableData | null>(() => {
    if (activities.length === 0) return null;

    // 가장 최근 년/월 찾기
    const sortedActivities = activities.sort((a, b) => {
      const aYear = a.frontmatter.year || 0;
      const bYear = b.frontmatter.year || 0;
      const aMonth = a.frontmatter.month || 0;
      const bMonth = b.frontmatter.month || 0;
      if (aYear !== bYear) return bYear - aYear;
      return bMonth - bMonth;
    });

    const latestActivity = sortedActivities[0];
    const { year, month, day, emojis, activities: dayActivities } = latestActivity.frontmatter;

    if (!month || !day || !emojis) return null;

    // 각 이모지별로 일별 데이터 배열 생성
    const tableData: ActivityTableData['data'] = (emojis || []).map((emoji: string) => {
      const values: number[] = Array(day).fill(0);

      (dayActivities || []).forEach((activity: {
        day: number;
        emoji: string | string[];
        level: number | number[];
      }) => {
        const activityEmojis = Array.isArray(activity.emoji) ? activity.emoji : [activity.emoji];
        const activityLevels = Array.isArray(activity.level) ? activity.level : [activity.level];

        if (activityEmojis.length === activityLevels.length && activity.day >= 1 && activity.day <= day) {
          const dayIndex = activity.day - 1;
          
          activityEmojis.forEach((actEmoji, idx) => {
            if (actEmoji === emoji) {
              const actLevel = activityLevels[idx];
              if (actLevel > values[dayIndex]) {
                values[dayIndex] = actLevel;
              }
            }
          });
        } else if (!Array.isArray(activity.emoji) && !Array.isArray(activity.level)) {
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
  }, [activities]);
};

export default useLatestActivity;

