import styled from '@emotion/styled';

import { contentMaxWidth, footerHeight, headerHeight, MOBILE_MEDIA_QUERY } from '../styles/const';

export const Wrapper = styled.div`
  overflow-y: scroll;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding-bottom: ${footerHeight}px;

  @media ${MOBILE_MEDIA_QUERY} {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    overflow: visible;
    isolation: isolate;
    background-color: ${({ theme }) => theme.color.white100};
    min-height: 100vh;
    min-height: 100dvh;
    padding-bottom: 48px;
  }
`;

export const PageSurface = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: ${({ theme }) => theme.color.white100};
  @media ${MOBILE_MEDIA_QUERY} {
    position: relative;
    z-index: 1;
  }
`;

export const HeaderPadding = styled.div`
  padding-top: ${headerHeight};
  content: '';
`;

export const ContentWrapper = styled.div<{ compactTop: boolean; headerAligned: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  flex: 1;
  word-break: keep-all;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 36px 12px;
  padding-top: ${({ compactTop }) => (compactTop ? '8px' : '36px')};
  background-color: ${({ theme }) => theme.color.white100};
  box-shadow: 0 6px 12px rgb(0, 0, 0, 0.04), 0 -6px 12px rgb(0, 0, 0, 0.04);

  @media ${MOBILE_MEDIA_QUERY} {
    box-shadow: none;
    padding-left: ${({ headerAligned }) => (headerAligned ? '24px' : '12px')};
    padding-right: ${({ headerAligned }) => (headerAligned ? '24px' : '12px')};
  }
`;

export const Content = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  gap: 36px;
  max-width: ${contentMaxWidth};
`;
