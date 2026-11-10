import React from 'react';
import { renderToString } from 'react-dom/server';
import PublishedPost, { PublishedPageData } from './PublishedPost';
export { escapeHTML, renderBlocks } from '../utils/post-blocks';
export function renderPublishedPost(data: PublishedPageData) {
  return renderToString(<PublishedPost data={data} />);
}
