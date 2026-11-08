import React from 'react';
import type { GatsbyBrowser } from 'gatsby';
import { ThemeManagerProvider } from './src/context/theme';
import SiteFonts from './src/components/SiteFonts';
export const wrapRootElement: GatsbyBrowser['wrapRootElement'] = ({ element }) => (
  <>
    <SiteFonts />
    <ThemeManagerProvider>{element}</ThemeManagerProvider>
  </>
);
