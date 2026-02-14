import styled from '@emotion/styled';

export const Wrapper = styled.div`
  width: 100%;
  height: fit-content;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  overflow-y: visible;
  padding: 24px 24px;
  gap: 6px;
  background-color: transparent;
  border: 1px solid ${({ theme }) => 
    theme.color.black100 === '#0F1010' 
      ? 'rgba(0, 0, 0, 0.12)' 
      : 'rgba(255, 255, 255, 0.12)'};
  border-radius: 8px;
  
  /* 스크롤바 스타일 - 테마 토큰 사용 (Safari 다크모드 대응) */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.color.gray10};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.gray40};
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.color.gray60};
  }
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => theme.color.gray40} ${({ theme }) => theme.color.gray10};
`;

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  min-width: max-content;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const Emoji = styled.span`
  height: 16px;
  display: flex;
  align-items: center;
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
`;

export const SquaresContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
`;

export const Square = styled.div<{ color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 2px;
  background-color: ${({ color }) => color};
  flex-shrink: 0;
`;

export const YearSelect = styled.select`
  font-size: 16px;
  color: ${({ theme }) => theme.color.gray80};
  border: none;
  background-color: ${({ theme }) => theme.color.gray10};
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
`;

