import React from 'react';
import { ThemeManagerProvider } from '../context/theme';
import Layout from '../layout';
import PostArticle from '../components/PostArticle';
import PostClass from '../models/post';
import { MarkdownRemark } from '../type';
export type PublishedPageData = { cur: MarkdownRemark; prev?: MarkdownRemark; next?: MarkdownRemark };
export default function PublishedPost({ data }: { data: PublishedPageData }) {
  return (
    <ThemeManagerProvider>
      <Layout location={{ pathname: data.cur.fields.slug } as Location}>
        <PostArticle
          liveNavigation
          post={new PostClass(data.cur)}
          prevPost={data.prev ? new PostClass(data.prev) : undefined}
          nextPost={data.next ? new PostClass(data.next) : undefined}
        />
      </Layout>
    </ThemeManagerProvider>
  );
}
