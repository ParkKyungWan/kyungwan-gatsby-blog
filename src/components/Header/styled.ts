import styled from '@emotion/styled';
import { Link } from 'gatsby';

import { contentMaxWidth, headerHeight, hoverEffect, MOBILE_MEDIA_QUERY } from '@/src/styles/const';

export const Wrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  height: ${headerHeight};
  position: fixed;
  top: 0;
  left: 0;
  background-color: ${({ theme }) => theme.color.white100};
  z-index: 100;

  @media ${MOBILE_MEDIA_QUERY} {
    padding: 0 24px;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: ${contentMaxWidth};

  .mobile-logo {
    @media ${MOBILE_MEDIA_QUERY} {
      min-height: 28px;
      display: flex;
      align-items: center;
      a {
        font-size: 16px;
      }
    }
  }
`;

export const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const Menu = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

export const HomeLink = styled(Link)`
  font-family: GmarketSansBold;
  font-size: 18px;
  ${({ theme }) => hoverEffect(theme)};
  @media ${MOBILE_MEDIA_QUERY} {
    font-size: 13px;
  }
`;

export const MenuLink = styled(Link)`
  font-size: 14px;
  ${({ theme }) => hoverEffect(theme)};

  @media ${MOBILE_MEDIA_QUERY} {
    font-size: 14px;
  }
`;
