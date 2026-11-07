import React from 'react';
import type { GatsbyBrowser } from 'gatsby';
import { ThemeManagerProvider } from './src/context/theme';
export const wrapRootElement: GatsbyBrowser['wrapRootElement'] = ({ element }) => (
  <ThemeManagerProvider>{element}</ThemeManagerProvider>
);
