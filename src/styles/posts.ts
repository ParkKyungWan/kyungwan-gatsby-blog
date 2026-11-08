import styled from '@emotion/styled';
import { MOBILE_MEDIA_QUERY } from './const';

export const Intro = styled.div`
  text-align: center;
  padding: 20px 0 44px;

  @media ${MOBILE_MEDIA_QUERY} {
    padding: 16px 0 32px;
  }
`;

export const Heading = styled.h1`
  font-family: 'Noto Sans KR', sans-serif;
  font-size: 32px;
  font-weight: 400;
  line-height: 1.3;
  color: ${({ theme }) => theme.color.black100};
`;

export const Count = styled.p`
  margin-top: 12px;
  font-family: GmarketSansLight, sans-serif;
  font-size: 22px;
  line-height: 1.4;
  color: ${({ theme }) => theme.color.gray80};
`;
