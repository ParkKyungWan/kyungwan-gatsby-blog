import React from 'react';
import type { GatsbySSR } from 'gatsby';
import { ThemeManagerProvider } from './src/context/theme';
import { RenderBodyArgs } from 'gatsby';

export const onRenderBody = ({ setHtmlAttributes, setHeadComponents }: RenderBodyArgs) => {
  setHtmlAttributes({ lang: `ko` });
  setHeadComponents([
    <link key='site-fonts' rel='stylesheet' href='/fonts/fonts.css' />,
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
  <ThemeManagerProvider>{element}</ThemeManagerProvider>
);
