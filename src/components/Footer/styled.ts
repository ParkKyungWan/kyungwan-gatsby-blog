import styled from '@emotion/styled';

import { contentMaxWidth, footerHeight, MOBILE_MEDIA_QUERY } from '@/src/styles/const';

export const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: ${footerHeight}px;
  margin-top: auto;
  position: fixed;
  bottom: 0;
  z-index: -1;
  background-color: ${({ theme }) => theme.color.white99};
  font-family: GmarketSansLight;

  @media ${MOBILE_MEDIA_QUERY} {
    font-size: 14px;
    height: ${(footerHeight / 2) * 1.5}px;
  }
`;

export const Footer = styled.p`
  text-align: center;
  width: 100%;
  max-width: ${contentMaxWidth};
`;

export const Link = styled.a`
  border-bottom: 1px solid ${({ theme }) => theme.color.black100};
`;
