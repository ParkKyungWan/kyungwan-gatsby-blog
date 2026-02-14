import React, { useContext, useRef, useEffect } from 'react';
import { ThemeProvider, useTheme } from '@emotion/react';
import { ThemeManagerContext } from 'gatsby-emotion-dark-mode';

import * as S from './styled';

export type ActivityDataItem = [string, number[]]; // [emoji, values array]

export type ActivityTableData = {
  month: number;
  day: number;
  data: ActivityDataItem[];
};

type ActivityTableProps = {
  data: ActivityTableData;
};

const ActivityTable: React.FC<ActivityTableProps> = ({ data }) => {
  const themeManager = useContext(ThemeManagerContext);
  const isDark = themeManager.isDark;
  const theme = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // PC에서 마우스 휠로 가로 스크롤 가능하도록
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (e: WheelEvent) => {
      // Shift 키를 누르지 않았을 때만 가로 스크롤 처리
      if (!e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        wrapper.scrollLeft += e.deltaY;
      }
    };

    wrapper.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const getColor = (value: number): string => {
    if (value === 2) {
      // 다크모드: 더 밝은 녹색, 라이트모드: 기존 녹색
      return isDark ? '#4BB550' : '#2E9217';
    }
    if (value === 1) {
      // 다크모드: 중간 밝기의 녹색, 라이트모드: 기존 투명 녹색
      return isDark ? '#576957' : '#BADBB2';
    }
    // value === 0: 다크모드에서는 더 어두운 회색, 라이트모드: 기존 회색
    return isDark ? theme.color.gray20 : '#DBDBDB';
  };

  // 배열 길이를 day로 맞추는 함수
  const padArrayToDay = (values: number[], day: number): number[] => {
    if (values.length >= day) {
      return values.slice(0, day);
    }
    return [...values, ...Array(day - values.length).fill(0)];
  };

  return (
    <S.Wrapper ref={wrapperRef}>
      {data.data.map(([emoji, values], index) => {
        const paddedValues = padArrayToDay(values, data.day);
        return (
          <S.Row key={index}>
            <S.Emoji>{emoji}</S.Emoji>
            <S.SquaresContainer>
              {paddedValues.map((value, valueIndex) => (
                <S.Square key={valueIndex} color={getColor(value)} />
              ))}
            </S.SquaresContainer>
          </S.Row>
        );
      })}
    </S.Wrapper>
  );
};

export default ActivityTable;

