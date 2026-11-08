import React from 'react';
import type { GatsbySSR } from 'gatsby';
import { ThemeManagerProvider } from './src/context/theme';
import SiteFonts from './src/components/SiteFonts';
import { RenderBodyArgs } from 'gatsby';

export const onRenderBody = ({ setHtmlAttributes, setHeadComponents }: RenderBodyArgs) => {
  setHtmlAttributes({ lang: `ko` });
  setHeadComponents([
    ...['Medium', 'Bold', 'Light'].map((weight) => (
      <link
        key={`gmarket-${weight}`}
        rel='preload'
        href={`/fonts/gmarket/GmarketSans${weight}.woff`}
        as='font'
        type='font/woff'
        crossOrigin='anonymous'
      />
    )),
  ]);
};

export const wrapRootElement: GatsbySSR['wrapRootElement'] = ({ element }) => (
  <>
    <SiteFonts />
    <ThemeManagerProvider>{element}</ThemeManagerProvider>
  </>
);
