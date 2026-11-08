import './style.scss';

import { ThemeProvider } from '@emotion/react';
import { graphql, useStaticQuery } from 'gatsby';
import { ThemeManagerContext } from '@/src/context/theme';
import { useContext } from 'react';

import Footer from '../components/Footer';
import Header from '../components/Header';
import { darkTheme, lightTheme } from '../styles/const';
import GlobalStyle from '../styles/GlobalStyle';
import * as S from './styled';

type LayoutProps = {
  location: Location;
  banner?: React.ReactNode;
  compactTop?: boolean;
  headerAligned?: boolean;
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ location, banner, compactTop = false, headerAligned = false, children }) => {
  const theme = useContext(ThemeManagerContext);

  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);
  const { title } = data.site.siteMetadata;

  return (
    <ThemeProvider theme={theme.isDark ? darkTheme : lightTheme}>
      <GlobalStyle />
      <S.Wrapper>
        <S.PageSurface>
          <S.HeaderPadding />
          {banner}
          <S.ContentWrapper compactTop={Boolean(banner) || compactTop} headerAligned={headerAligned}>
            {location && <Header location={location} title={title} />}
            <S.Content>{children}</S.Content>
          </S.ContentWrapper>
        </S.PageSurface>
        <Footer />
      </S.Wrapper>
    </ThemeProvider>
  );
};

export default Layout;
