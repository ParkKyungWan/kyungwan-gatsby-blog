import styled from '@emotion/styled';

export const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 36px;
  margin-top: 48px;
  margin-bottom: 48px;
  padding-left: 12px;
`;

export const DayGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const DayHeader = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.black100};
`;

export const SummaryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 0;
`;

export const SummaryItem = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.color.black100};
  opacity: 0.55;
`;

