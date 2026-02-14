import React from 'react';

import * as S from './styled';

type ActivityItem = {
  day: number;
  emoji: string | string[];
  level: number | number[];
  summary?: string | string[];
};

type ActivitySummaryProps = {
  month: number;
  activities: ActivityItem[];
};

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ month, activities }) => {
  // 일자별로 그룹화
  const groupedByDay = React.useMemo(() => {
    const grouped: Record<number, ActivityItem[]> = {};
    activities.forEach((activity) => {
      if (!grouped[activity.day]) {
        grouped[activity.day] = [];
      }
      grouped[activity.day].push(activity);
    });
    return grouped;
  }, [activities]);

  // 일자 순서대로 정렬 (최신순)
  const sortedDays = Object.keys(groupedByDay)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <S.Wrapper>
      {sortedDays.map((day) => {
        const dayActivities = groupedByDay[day];
        
        // 그날 달성한 이모지들 (level > 0인 것들만)
        const allEmojis: string[] = [];
        dayActivities.forEach((activity) => {
          const emojis = Array.isArray(activity.emoji) ? activity.emoji : [activity.emoji];
          const levels = Array.isArray(activity.level) ? activity.level : [activity.level];
          
          // 이모지와 레벨 배열의 길이가 맞는지 확인
          if (emojis.length === levels.length) {
            emojis.forEach((emoji, idx) => {
              if (levels[idx] > 0) {
                allEmojis.push(emoji);
              }
            });
          } else if (!Array.isArray(activity.emoji) && !Array.isArray(activity.level)) {
            // 기존 형식 (단일 이모지, 단일 레벨) 지원
            if (activity.level > 0) {
              allEmojis.push(activity.emoji);
            }
          }
        });
        
        // 중복 제거
        const uniqueEmojis = Array.from(new Set(allEmojis));
        const emojis = uniqueEmojis.join('');

        // Summary 수집
        const allSummaries: string[] = [];
        dayActivities.forEach((activity) => {
          if (activity.summary) {
            const summaries = Array.isArray(activity.summary)
              ? activity.summary
              : [activity.summary];
            allSummaries.push(...summaries);
          }
        });

        return (
          <S.DayGroup key={day}>
            <S.DayHeader>
              {month}월 {day}일 {/*emojis*/}
            </S.DayHeader>
            <S.SummaryList>
              {allSummaries.map((summary, summaryIndex) => (
                <S.SummaryItem key={summaryIndex}>
                  • {summary}
                </S.SummaryItem>
              ))}
            </S.SummaryList>
          </S.DayGroup>
        );
      })}
    </S.Wrapper>
  );
};

export default ActivitySummary;

