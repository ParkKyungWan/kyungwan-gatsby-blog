import styled from '@emotion/styled';

import { bannerHeight, contentMaxWidth, footerHeight, headerHeight, m_bannerHeight, MOBILE_MEDIA_QUERY } from '../styles/const';

export const Wrapper = styled.div`
  overflow-y: scroll;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: ${footerHeight}px;

  @media ${MOBILE_MEDIA_QUERY} {
    padding-bottom: 0;
  }
`;

export const HeaderPadding = styled.div`
  padding-top: ${headerHeight};
  content: '';
`;

export const BannerPadding = styled.div`
  padding-top: ${bannerHeight};
  content: '';
  @media ${MOBILE_MEDIA_QUERY} {
    padding-top: ${m_bannerHeight};
  }
`;

export const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  word-break: keep-all;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 24px 12px;
  background-color: ${({ theme }) => theme.color.white100};
  box-shadow: 0 6px 12px rgb(0, 0, 0, 0.04), 0 -6px 12px rgb(0, 0, 0, 0.04);

  @media ${MOBILE_MEDIA_QUERY} {
    margin-bottom: ${footerHeight/2*1.5}px;
  }
`;

export const Content = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  max-width: ${contentMaxWidth};
`;
