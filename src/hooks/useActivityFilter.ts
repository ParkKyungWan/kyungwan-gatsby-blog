import { useEffect, useMemo, useState } from 'react';

const useActivityFilter = (activities: any[]) => {
  // activities에서 년도 목록 추출
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    activities.forEach((activity) => {
      if (activity.frontmatter?.year) {
        yearSet.add(activity.frontmatter.year);
      }
    });
    return [...yearSet].sort((a, b) => b - a); // 최신순
  }, [activities]);

  // 선택된 년도 (기본값: 가장 최신 년도)
  const [selectedYear, setSelectedYear] = useState<number>(years[0] || 0);

  // 선택된 년도에 해당하는 월 목록 추출
  const months = useMemo(() => {
    const monthSet = new Set<number>();
    activities.forEach((activity) => {
      if (activity.frontmatter?.year === selectedYear && activity.frontmatter?.month) {
        monthSet.add(activity.frontmatter.month);
      }
    });
    return [...monthSet].sort((a, b) => b - a); // 최신순
  }, [activities, selectedYear]);

  // 월을 "2월", "3월" 형식으로 변환
  const monthLabels = useMemo(() => {
    return months.map((month) => `${month}월`);
  }, [months]);

  // 기본값을 첫 번째 월로 설정
  const [selectedMonth, setSelectedMonth] = useState<number>(months[0] || 0);

  // selectedYear가 변경되면 첫 번째 월로 업데이트
  useEffect(() => {
    if (months.length > 0 && !months.includes(selectedMonth)) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth, selectedYear]);

  // years가 변경되면 첫 번째 년도로 업데이트
  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const filteredActivities = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    return activities.filter((activity) => {
      return (
        activity.frontmatter?.year === selectedYear && activity.frontmatter?.month === selectedMonth
      );
    });
  }, [activities, selectedYear, selectedMonth]);

  const handleMonthClick = (monthLabel: string) => {
    const month = parseInt(monthLabel.replace('월', ''));
    setSelectedMonth(month);
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  return {
    years,
    months: monthLabels,
    filteredActivities,
    selectedMonth: `${selectedMonth}월`,
    selectedYear,
    handleMonthClick,
    handleYearChange,
  };
};

export default useActivityFilter;

